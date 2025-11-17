import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Eye, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getSchools() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching schools:', error)
    return []
  }

  return data || []
}

async function getSchoolOverview(schoolId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('school_route_overview')
    .select('*')
    .eq('school_id', schoolId)

  if (error) {
    console.error('Error fetching school overview:', error)
    return []
  }

  return data || []
}

export default async function SchoolOverviewPage() {
  const schools = await getSchools()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy">School Route Overview</h1>
        <p className="mt-2 text-sm text-gray-600">
          Comprehensive view of schools with routes, crew, vehicles, and passengers
        </p>
      </div>

      {schools.map((school) => (
        <SchoolOverviewCard key={school.id} school={school} />
      ))}

      {schools.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-500">
              No schools found. Add your first school to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

async function SchoolOverviewCard({ school }: { school: any }) {
  const routes = await getSchoolOverview(school.id)

  return (
    <Card>
      <CardHeader className="bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{school.name}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{school.address || 'No address'}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
              <p className="text-xs text-gray-500">Routes</p>
            </div>
            <Link href={`/dashboard/schools/${school.id}`} prefetch={true}>
              <Button size="sm">
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {routes.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No routes assigned to this school yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>PA</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Passengers</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route: any) => {
                  const totalPassengers = route.total_passengers || 0
                  const wheelchairPassengers = route.wheelchair_passengers || 0
                  const seatsTotal = route.seats_total || 0
                  const wheelchairCapacity = route.wheelchair_capacity || 0
                  
                  const isOvercapacity = seatsTotal > 0 && totalPassengers > seatsTotal
                  const isWheelchairOvercapacity = wheelchairCapacity > 0 && wheelchairPassengers > wheelchairCapacity
                  const hasIssues = isOvercapacity || isWheelchairOvercapacity || !route.crew_id || !route.vehicle_id

                  return (
                    <TableRow key={route.route_id || route.crew_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{route.route_number || `Route ${route.route_id}`}</div>
                          {route.route_id && (
                            <Link 
                              href={`/dashboard/routes/${route.route_id}`}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View Route
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {route.driver_name ? (
                          <div>
                            <div className="font-medium text-sm">{route.driver_name}</div>
                            <div className="text-xs text-gray-500">
                              {route.driver_phone || 'No phone'}
                            </div>
                            {route.driver_dbs_expiry && (
                              <div className="text-xs text-gray-500">
                                DBS: {formatDate(route.driver_dbs_expiry)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-600 text-sm">Not Assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {route.pa_name ? (
                          <div>
                            <div className="font-medium text-sm">{route.pa_name}</div>
                            <div className="text-xs text-gray-500">
                              {route.pa_phone || 'No phone'}
                            </div>
                            {route.pa_dbs_expiry && (
                              <div className="text-xs text-gray-500">
                                DBS: {formatDate(route.pa_dbs_expiry)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-600 text-sm">Not Assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {route.vehicle_identifier ? (
                          <div>
                            <div className="font-medium text-sm">{route.vehicle_identifier}</div>
                            <div className="text-xs text-gray-500">
                              {route.vehicle_registration || 'No reg'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {route.vehicle_make} {route.vehicle_model}
                            </div>
                            {route.vehicle_off_road && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                VOR
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-orange-600 text-sm">No Vehicle</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {seatsTotal > 0 ? (
                          <div>
                            <div className="text-sm">
                              <span className={totalPassengers > seatsTotal ? 'text-red-600 font-bold' : ''}>
                                {totalPassengers}
                              </span>
                              <span className="text-gray-500"> / {seatsTotal} seats</span>
                            </div>
                            {wheelchairCapacity > 0 && (
                              <div className="text-xs text-gray-600">
                                <span className={wheelchairPassengers > wheelchairCapacity ? 'text-red-600 font-bold' : ''}>
                                  {wheelchairPassengers}
                                </span>
                                <span className="text-gray-500"> / {wheelchairCapacity} ♿</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No config</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{totalPassengers}</span>
                          {wheelchairPassengers > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {wheelchairPassengers} ♿
                            </span>
                          )}
                          {route.sen_passengers > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                              {route.sen_passengers} SEN
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasIssues ? (
                          <div className="flex items-center space-x-1 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs">
                              {!route.crew_id && 'No Crew'}
                              {!route.vehicle_id && 'No Vehicle'}
                              {isOvercapacity && 'Overcapacity'}
                              {isWheelchairOvercapacity && '♿ Overcapacity'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">OK</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}




