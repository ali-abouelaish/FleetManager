import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { ArrowLeft, Pencil, Plus, UserCog } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import SchoolRouteSessionsClient from './SchoolRouteSessionsClient'
import DeleteSchoolButton from './DeleteSchoolButton'
import ExportTAS5Button from './ExportTAS5Button'

async function getSchoolDetails(id: string) {
  const supabase = await createClient()
  
  // Get school details - use maybeSingle() to handle cases where school doesn't exist
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (schoolError) {
    console.error('Error fetching school:', schoolError)
    return null
  }

  if (!school) {
    return null
  }

  // Get routes for this school with crew information
  const { data: routes, error: routesError } = await supabase
    .from('routes')
    .select(`
      *,
      driver:driver_id(employees(full_name)),
      pa:passenger_assistant_id(employees(full_name))
    `)
    .eq('school_id', id)

  const routeIds = (routes || []).map((r: any) => r.id)
  const { data: routePasData } = routeIds.length > 0
    ? await supabase
        .from('route_passenger_assistants')
        .select('route_id, employee_id, sort_order, employees(full_name)')
        .in('route_id', routeIds)
        .order('sort_order')
    : { data: [] }

  // Map route_id -> array of { id, name } for PAs
  const routePasMap: Record<number, Array<{ id: number; name: string }>> = {}
  ;(routePasData || []).forEach((r: any) => {
    if (!routePasMap[r.route_id]) routePasMap[r.route_id] = []
    const emp = Array.isArray(r.employees) ? r.employees[0] : r.employees
    routePasMap[r.route_id].push({
      id: r.employee_id,
      name: emp?.full_name || 'Unknown',
    })
  })

  // Get passengers for this school
  const { data: passengers, error: passengersError } = await supabase
    .from('passengers')
    .select('*, routes(route_number)')
    .eq('school_id', id)

  // Get coordinators assigned to this school
  const { data: coordinatorAssignments } = await supabase
    .from('coordinator_school_assignments')
    .select('employee_id, employees(id, full_name, role)')
    .eq('school_id', id)

  const coordinators: Array<{ id: number; full_name: string }> = []
  coordinatorAssignments?.forEach((row: any) => {
    const emp = row.employees
    const employee = Array.isArray(emp) ? emp[0] : emp
    if (employee && employee.id) {
      coordinators.push({ id: employee.id, full_name: employee.full_name || 'Unknown' })
    }
  })

  // Calculate crew count from routes (unique drivers and PAs)
  const uniqueCrewMembers = new Set<number>()
  const crewAssignments: Array<{
    route_id: number
    route_number: string | null
    driver_id: number | null
    driver_name: string | null
    pas: Array<{ id: number; name: string }>
  }> = []

  routes?.forEach((route: any) => {
    if (route.driver_id) {
      uniqueCrewMembers.add(route.driver_id)
    }
    const pasForRoute: Array<{ id: number; name: string }> = routePasMap[route.id]
      ? [...routePasMap[route.id]]
      : route.passenger_assistant_id
        ? (() => {
            const pa = Array.isArray(route.pa) ? route.pa[0] : route.pa
            const paEmp = Array.isArray(pa?.employees) ? pa?.employees[0] : pa?.employees
            return [{ id: route.passenger_assistant_id, name: paEmp?.full_name || 'Unknown' }]
          })()
        : []
    pasForRoute.forEach((p) => uniqueCrewMembers.add(p.id))
    const driver = Array.isArray(route.driver) ? route.driver[0] : route.driver
    const driverEmp = Array.isArray(driver?.employees) ? driver?.employees[0] : driver?.employees
    crewAssignments.push({
      route_id: route.id,
      route_number: route.route_number,
      driver_id: route.driver_id,
      driver_name: driverEmp?.full_name || null,
      pas: pasForRoute,
    })
  })

  return {
    school,
    routes: routes || [],
    crewCount: uniqueCrewMembers.size,
    crewAssignments,
    passengers: passengers || [],
    coordinators,
  }
}

export default async function ViewSchoolPage({
  params,
}: {
  params: { id: string }
}) {
  const data = await getSchoolDetails(params.id)

  if (!data) {
    notFound()
  }

  const { school, routes, crewCount, crewAssignments, passengers, coordinators } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/schools">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{school.name}</h1>
            <p className="mt-2 text-sm text-gray-600">School Details & Related Information</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ExportTAS5Button schoolId={school.id} schoolName={school.name} />
          <Link href={`/dashboard/schools/${school.id}/edit`}>
            <Button>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <DeleteSchoolButton
            schoolId={school.id}
            schoolName={school.name}
            routeCount={routes.length}
            passengerCount={passengers.length}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">School ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{school.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">School Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{school.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Ref Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{school.ref_number || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">{school.address || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(school.created_at)}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Routes</span>
              <span className="text-2xl font-bold text-gray-900">{routes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Crew</span>
              <span className="text-2xl font-bold text-gray-900">{crewCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Passengers</span>
              <span className="text-2xl font-bold text-gray-900">{passengers.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-violet-600" />
              Coordinators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coordinators.length === 0 ? (
              <p className="text-sm text-gray-500">No coordinators assigned. Assign from the employee edit page when role is Coordinator.</p>
            ) : (
              <ul className="space-y-2">
                {coordinators.map((coord) => (
                  <li key={coord.id}>
                    <Link
                      href={`/dashboard/employees/${coord.id}`}
                      className="text-sm font-medium text-violet-600 hover:underline"
                    >
                      {coord.full_name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Routes Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Routes</CardTitle>
          <Link href={`/dashboard/routes/create?school_id=${school.id}`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Route
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {routes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No routes found for this school.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route Number</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route: any) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.route_number || `Route ${route.id}`}</TableCell>
                    <TableCell>{formatDate(route.created_at)}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/routes/${route.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Crew Section */}
      <Card>
        <CardHeader>
          <CardTitle>Crew Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {crewAssignments.length === 0 || crewAssignments.every(c => !c.driver_id && c.pas.length === 0) ? (
            <p className="text-center text-gray-500 py-4">No crew assignments found for this school.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Passenger Assistant(s)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crewAssignments.map((assignment) => (
                  <TableRow key={assignment.route_id}>
                    <TableCell>{assignment.route_number || `Route ${assignment.route_id}`}</TableCell>
                    <TableCell>
                      {assignment.driver_id ? (
                        <Link href={`/dashboard/employees/${assignment.driver_id}`} className="text-blue-600 hover:underline">
                          {assignment.driver_name || 'Unknown'}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.pas.length > 0 ? (
                        <span className="flex flex-wrap gap-x-1 gap-y-0.5">
                          {assignment.pas.map((pa, idx) => (
                            <span key={pa.id}>
                              {idx > 0 && ', '}
                              <Link href={`/dashboard/employees/${pa.id}`} className="text-blue-600 hover:underline">
                                {pa.name || 'Unknown'}
                              </Link>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Passengers Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Passengers</CardTitle>
          <Link href={`/dashboard/passengers/create?school_id=${school.id}`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Passenger
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {passengers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No passengers found for this school.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Mobility Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passengers.map((passenger: any) => (
                  <TableRow key={passenger.id}>
                    <TableCell className="font-medium">{passenger.full_name}</TableCell>
                    <TableCell>{passenger.routes?.route_number || 'N/A'}</TableCell>
                    <TableCell>{passenger.mobility_type || 'N/A'}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/passengers/${passenger.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Route Sessions & Attendance Section */}
      {routes.length > 0 && (
        <SchoolRouteSessionsClient schoolId={parseInt(params.id)} routes={routes} />
      )}
    </div>
  )
}

