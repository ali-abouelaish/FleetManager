import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import SchoolRouteSessionsClient from './SchoolRouteSessionsClient'

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

  // Get routes for this school
  const { data: routes, error: routesError } = await supabase
    .from('routes')
    .select('*')
    .eq('school_id', id)

  // Get crew for this school's routes
  const { data: crew, error: crewError } = await supabase
    .from('crew')
    .select(`
      *,
      driver:driver_id(employees(full_name)),
      pa:pa_id(employees(full_name)),
      route:route_id(route_number)
    `)
    .eq('school_id', id)

  // Get passengers for this school
  const { data: passengers, error: passengersError } = await supabase
    .from('passengers')
    .select('*, routes(route_number)')
    .eq('school_id', id)

  return {
    school,
    routes: routes || [],
    crew: crew || [],
    passengers: passengers || [],
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

  const { school, routes, crew, passengers } = data

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
        <Link href={`/dashboard/schools/${school.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
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
              <span className="text-2xl font-bold text-gray-900">{crew.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Passengers</span>
              <span className="text-2xl font-bold text-gray-900">{passengers.length}</span>
            </div>
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
          {crew.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No crew assignments found for this school.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Passenger Assistant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crew.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.route?.route_number || 'N/A'}</TableCell>
                    <TableCell>{member.driver?.employees?.full_name || 'N/A'}</TableCell>
                    <TableCell>{member.pa?.employees?.full_name || 'N/A'}</TableCell>
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

