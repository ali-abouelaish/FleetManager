'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { 
  RouteServiceHistory, 
  AttendanceStatus,
  SessionType 
} from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Calendar, Users, CheckCircle, XCircle, AlertCircle, UserCheck, Eye } from 'lucide-react'
import Link from 'next/link'

interface SchoolRouteSessionsClientProps {
  schoolId: number
  routes: Array<{ id: number; route_number: string | null }>
}

export default function SchoolRouteSessionsClient({ schoolId, routes }: SchoolRouteSessionsClientProps) {
  const [sessions, setSessions] = useState<RouteServiceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadSessions()
  }, [schoolId])

  const loadSessions = async () => {
    setLoading(true)
    // Get all route IDs for this school
    const routeIds = routes.map(r => r.id)
    
    if (routeIds.length === 0) {
      setSessions([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('route_service_history')
      .select('*')
      .in('route_id', routeIds)
      .order('session_date', { ascending: false })
      .order('session_type', { ascending: true })
      .limit(100)

    if (!error && data) {
      setSessions(data as RouteServiceHistory[])
    }
    setLoading(false)
  }

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'excused':
        return <UserCheck className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const filteredSessions = selectedRoute 
    ? sessions.filter(s => s.route_id === selectedRoute)
    : sessions

  // Group sessions by route
  const sessionsByRoute = routes.map(route => {
    const routeSessions = sessions.filter(s => s.route_id === route.id)
    const recentSessions = routeSessions.slice(0, 5) // Last 5 sessions
    const totalPresent = routeSessions.reduce((sum, s) => sum + s.present_count, 0)
    const totalAbsent = routeSessions.reduce((sum, s) => sum + s.absent_count, 0)
    const totalLate = routeSessions.reduce((sum, s) => sum + s.late_count, 0)
    const totalExcused = routeSessions.reduce((sum, s) => sum + s.excused_count, 0)
    
    return {
      route,
      sessions: recentSessions,
      totalSessions: routeSessions.length,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
    }
  })

  return (
    <div className="space-y-6">
      {/* Route Sessions Summary */}
      <Card>
        <CardHeader className="bg-blue-900 text-white">
          <CardTitle className="text-white">Route Sessions & Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-4">Loading sessions...</p>
          ) : routes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No routes found for this school.</p>
          ) : (
            <div className="space-y-4">
              {sessionsByRoute.map(({ route, sessions: routeSessions, totalSessions, totalPresent, totalAbsent, totalLate, totalExcused }) => (
                <Card key={route.id} className="border-l-4 border-l-blue-600">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <CardTitle className="text-lg">
                            {route.route_number || `Route ${route.id}`}
                          </CardTitle>
                          <div className="text-sm text-gray-600 mt-1">
                            {totalSessions} total session{totalSessions !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRoute(selectedRoute === route.id ? null : route.id)}
                        >
                          {selectedRoute === route.id ? 'Hide Details' : 'Show Details'}
                        </Button>
                        <Link href={`/dashboard/routes/${route.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Route
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-green-50 rounded">
                        <div className="text-2xl font-bold text-green-700">{totalPresent}</div>
                        <div className="text-sm text-gray-600">Total Present</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded">
                        <div className="text-2xl font-bold text-red-700">{totalAbsent}</div>
                        <div className="text-sm text-gray-600">Total Absent</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded">
                        <div className="text-2xl font-bold text-yellow-700">{totalLate}</div>
                        <div className="text-sm text-gray-600">Total Late</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <div className="text-2xl font-bold text-blue-700">{totalExcused}</div>
                        <div className="text-sm text-gray-600">Total Excused</div>
                      </div>
                    </div>

                    {selectedRoute === route.id && routeSessions.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold mb-3 flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Recent Sessions
                        </h4>
                        <div className="space-y-2">
                          {routeSessions.map((session) => (
                            <div
                              key={session.session_id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100"
                            >
                              <div className="flex items-center space-x-4">
                                <div>
                                  <div className="font-medium">
                                    {formatDate(session.session_date)} - {session.session_type}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {session.driver_name && `Driver: ${session.driver_name}`}
                                    {session.driver_name && session.passenger_assistant_name && ' • '}
                                    {session.passenger_assistant_name && `PA: ${session.passenger_assistant_name}`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2 text-sm">
                                  <span className="text-green-700 font-medium">{session.present_count} present</span>
                                  <span className="text-red-700 font-medium">{session.absent_count} absent</span>
                                  {session.late_count > 0 && (
                                    <span className="text-yellow-700 font-medium">{session.late_count} late</span>
                                  )}
                                  {session.excused_count > 0 && (
                                    <span className="text-blue-700 font-medium">{session.excused_count} excused</span>
                                  )}
                                </div>
                                <Link href={`/dashboard/routes/${route.id}`}>
                                  <Button variant="ghost" size="sm">
                                    View Details
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ))}
                          {totalSessions > routeSessions.length && (
                            <div className="text-center pt-2">
                              <Link href={`/dashboard/routes/${route.id}`}>
                                <Button variant="ghost" size="sm">
                                  View all {totalSessions} sessions
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedRoute === route.id && routeSessions.length === 0 && (
                      <div className="mt-4 border-t pt-4 text-center text-gray-500">
                        No sessions recorded for this route yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Sessions Table View */}
      {filteredSessions.length > 0 && (
        <Card>
          <CardHeader className="bg-blue-900 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">
                All Route Sessions
                {selectedRoute && ` - ${routes.find(r => r.id === selectedRoute)?.route_number || `Route ${selectedRoute}`}`}
              </CardTitle>
              {selectedRoute && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedRoute(null)}
                >
                  Show All Routes
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>PA</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Excused</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.session_id}>
                      <TableCell>{formatDate(session.session_date)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          session.session_type === 'AM' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {session.session_type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {session.route_name || `Route ${session.route_id}`}
                      </TableCell>
                      <TableCell>{session.driver_name || 'N/A'}</TableCell>
                      <TableCell>{session.passenger_assistant_name || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="text-green-700 font-medium">{session.present_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-700 font-medium">{session.absent_count}</span>
                      </TableCell>
                      <TableCell>
                        {session.late_count > 0 && (
                          <span className="text-yellow-700 font-medium">{session.late_count}</span>
                        )}
                        {session.late_count === 0 && <span className="text-gray-400">0</span>}
                      </TableCell>
                      <TableCell>
                        {session.excused_count > 0 && (
                          <span className="text-blue-700 font-medium">{session.excused_count}</span>
                        )}
                        {session.excused_count === 0 && <span className="text-gray-400">0</span>}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/routes/${session.route_id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

