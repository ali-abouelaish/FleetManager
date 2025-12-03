import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { ArrowLeft, Pencil, FileDown } from 'lucide-react'
import RoutePDFExport from './RoutePDFExport'
import TR1Export from './TR1Export'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import RouteSessionsClient from './RouteSessionsClient'

// Helper function to format time (HH:MM:SS to HH:MM)
function formatTime(time: string | null): string {
  if (!time) return 'N/A'
  // If time is in HH:MM:SS format, extract HH:MM
  if (time.includes(':')) {
    const parts = time.split(':')
    return `${parts[0]}:${parts[1]}`
  }
  return time
}

async function getRouteDetails(id: string) {
  const supabase = await createClient()
  
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select(`
      *,
      schools(name, address),
      driver:driver_id(employees(full_name)),
      pa:passenger_assistant_id(employees(full_name)),
      vehicles (
        id,
        vehicle_identifier,
        registration,
        make,
        model,
        plate_number,
        vehicle_type
      )
    `)
    .eq('id', id)
    .single()

  if (routeError || !route) {
    return null
  }

  // Get passengers on this route
  const { data: passengers } = await supabase
    .from('passengers')
    .select('*')
    .eq('route_id', id)

  // Get route points
  const { data: routePoints } = await supabase
    .from('route_points')
    .select('*')
    .eq('route_id', id)
    .order('stop_order')

  // Get vehicle directly from route
  const vehicle = route.vehicles 
    ? (Array.isArray(route.vehicles) ? route.vehicles[0] : route.vehicles)
    : null

  return {
    route,
    passengers: passengers || [],
    routePoints: routePoints || [],
    vehicle,
  }
}

export default async function ViewRoutePage({
  params,
}: {
  params: { id: string }
}) {
  const data = await getRouteDetails(params.id)

  if (!data) {
    notFound()
  }

  const { route, passengers, routePoints, vehicle } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/routes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {route.route_number || `Route ${route.id}`}
            </h1>
            <p className="mt-2 text-sm text-gray-600">Route Details & Assignments</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <TR1Export routeId={route.id} routeNumber={route.route_number} />
          <RoutePDFExport routeId={route.id} routeNumber={route.route_number} />
          <Link href={`/dashboard/routes/${route.id}/edit`}>
            <Button>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Route ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{route.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Route Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{route.route_number || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">School</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {route.schools ? (
                  <Link href={`/dashboard/schools/${route.school_id}`} className="text-blue-600 hover:underline">
                    {route.schools.name}
                  </Link>
                ) : (
                  'N/A'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">AM Start Time</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatTime(route.am_start_time)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">PM Start Time</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatTime(route.pm_start_time)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Days of Week</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {route.days_of_week && Array.isArray(route.days_of_week) && route.days_of_week.length > 0
                  ? route.days_of_week.join(', ')
                  : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(route.created_at)}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Passengers</span>
              <span className="text-2xl font-bold text-gray-900">{passengers.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Crew Members</span>
              <span className="text-2xl font-bold text-gray-900">
                {((route.driver_id ? 1 : 0) + (route.passenger_assistant_id ? 1 : 0))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Route Points</span>
              <span className="text-2xl font-bold text-gray-900">{routePoints.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Crew Section */}
      <Card>
        <CardHeader>
          <CardTitle>Crew Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {!route.driver_id && !route.passenger_assistant_id ? (
            <p className="text-center text-gray-500 py-4">No crew assigned to this route.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Passenger Assistant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    {route.driver_id ? (() => {
                      const driver = Array.isArray(route.driver) ? route.driver[0] : route.driver
                      const driverName = Array.isArray(driver?.employees) ? driver.employees[0]?.full_name : driver?.employees?.full_name
                      return driverName ? (
                        <Link href={`/dashboard/employees/${route.driver_id}`} className="text-blue-600 hover:underline">
                          {driverName}
                        </Link>
                      ) : 'Unknown'
                    })() : (
                      <span className="text-gray-400">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {route.passenger_assistant_id ? (() => {
                      const pa = Array.isArray(route.pa) ? route.pa[0] : route.pa
                      const paName = Array.isArray(pa?.employees) ? pa.employees[0]?.full_name : pa?.employees?.full_name
                      return paName ? (
                        <Link href={`/dashboard/employees/${route.passenger_assistant_id}`} className="text-blue-600 hover:underline">
                          {paName}
                        </Link>
                      ) : 'Unknown'
                    })() : (
                      <span className="text-gray-400">Not assigned</span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Section */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          {!vehicle ? (
            <p className="text-center text-gray-500 py-4">
              No vehicle assigned to this route.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Vehicle Identifier</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <Link href={`/dashboard/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline font-semibold">
                    {vehicle.vehicle_identifier || 'N/A'}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Registration</dt>
                <dd className="mt-1 text-sm text-gray-900">{vehicle.registration || vehicle.plate_number || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Make & Model</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {vehicle.make && vehicle.model 
                    ? `${vehicle.make} ${vehicle.model}` 
                    : vehicle.make || vehicle.model || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Vehicle Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{vehicle.vehicle_type || 'N/A'}</dd>
              </div>
              <div className="pt-2">
                <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                  <Button variant="ghost" size="sm">
                    View Vehicle Details
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passengers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Passengers</CardTitle>
        </CardHeader>
        <CardContent>
          {passengers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No passengers on this route.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Seat Number</TableHead>
                  <TableHead>Mobility Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passengers.map((passenger: any) => (
                  <TableRow key={passenger.id}>
                    <TableCell className="font-medium">{passenger.full_name}</TableCell>
                    <TableCell>{passenger.seat_number || 'N/A'}</TableCell>
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

      {/* Route Points Section */}
      <Card>
        <CardHeader>
          <CardTitle>Route Points</CardTitle>
        </CardHeader>
        <CardContent>
          {routePoints.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No route points defined.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Point Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Coordinates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routePoints.map((point: any) => (
                  <TableRow key={point.id}>
                    <TableCell>{point.stop_order || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{point.point_name || 'N/A'}</TableCell>
                    <TableCell>{point.address || 'N/A'}</TableCell>
                    <TableCell>
                      {point.latitude && point.longitude
                        ? `${point.latitude}, ${point.longitude}`
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Route Sessions & Attendance Section */}
      <RouteSessionsClient routeId={parseInt(params.id)} passengers={passengers} />
    </div>
  )
}

