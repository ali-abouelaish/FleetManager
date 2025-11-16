import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { ArrowLeft, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'

async function getRouteDetails(id: string) {
  const supabase = await createClient()
  
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select('*, schools(name, address)')
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

  // Get crew for this route
  const { data: crew } = await supabase
    .from('crew')
    .select(`
      *,
      driver:driver_id(employees(full_name)),
      pa:pa_id(employees(full_name))
    `)
    .eq('route_id', id)

  // Get route points
  const { data: routePoints } = await supabase
    .from('route_points')
    .select('*')
    .eq('route_id', id)
    .order('stop_order')

  return {
    route,
    passengers: passengers || [],
    crew: crew || [],
    routePoints: routePoints || [],
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

  const { route, passengers, crew, routePoints } = data

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
        <Link href={`/dashboard/routes/${route.id}/edit`}>
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
              <span className="text-2xl font-bold text-gray-900">{crew.length}</span>
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
          {crew.length === 0 ? (
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
                {crew.map((member: any) => (
                  <TableRow key={member.id}>
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
    </div>
  )
}

