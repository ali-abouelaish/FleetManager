'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { CheckCircle, XCircle, Clock, Car, AlertTriangle, Eye, Wrench } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import ReplacementVehicleFinder from '@/components/ReplacementVehicleFinder'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: number
  notification_type: string
  entity_type: string
  entity_id: number
  certificate_type: string
  certificate_name: string
  expiry_date: string
  days_until_expiry: number
  recipient_employee_id: number | null
  recipient_email: string | null
  status: 'pending' | 'sent' | 'resolved' | 'dismissed'
  email_sent_at: string | null
  email_token: string
  resolved_at: string | null
  created_at: string
  employee_response_type?: string | null
  employee_response_details?: any
  employee_response_received_at?: string | null
  admin_response_required?: boolean
  admin_response_notes?: string | null
  details?: any
  recipient?: {
    full_name: string
    personal_email: string
  }
}

interface RouteActivityNotificationsClientProps {
  initialNotifications: Notification[]
}

export function RouteActivityNotificationsClient({ initialNotifications }: RouteActivityNotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [resolving, setResolving] = useState<number | null>(null)
  const [showReplacementFinder, setShowReplacementFinder] = useState(false)
  const [selectedBreakdownId, setSelectedBreakdownId] = useState<number | null>(null)
  const [approvingTardiness, setApprovingTardiness] = useState<number | null>(null)
  const [decliningTardiness, setDecliningTardiness] = useState<number | null>(null)
  const [tardinessNotes, setTardinessNotes] = useState<{ [key: number]: string }>({})
  const [showTardinessModal, setShowTardinessModal] = useState<number | null>(null)
  const previousNotificationIds = useRef<Set<number>>(new Set(initialNotifications.map(n => n.id)))
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize AudioContext
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  // Play sound notification
  const playNotificationSound = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const audioContext = audioContextRef.current

      // Resume AudioContext if suspended (happens when tab is in background)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800 // Frequency in Hz
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    let title = ''
    let body = ''

    if (notification.notification_type === 'vehicle_breakdown') {
      title = 'Vehicle Breakdown Reported'
      const details = notification.details
      if (details && typeof details === 'object') {
        const vehicleId = details.vehicle_identifier || details.vehicle_id || 'Unknown'
        const routeNum = details.route_number || details.route_id || 'Unknown'
        body = `Vehicle: ${vehicleId} on Route: ${routeNum}`
      } else {
        body = 'A vehicle breakdown has been reported'
      }
    } else if (notification.notification_type === 'driver_tardiness') {
      title = 'Driver Tardiness Reported'
      const details = notification.details
      if (details && typeof details === 'object') {
        const driverName = details.driver_name || 'Unknown Driver'
        const routeNum = details.route_number || details.route_id || 'Unknown'
        const reason = details.reason || 'No reason provided'
        body = `${driverName} - Route: ${routeNum} - ${reason}`
      } else {
        body = 'A driver tardiness report has been submitted'
      }
    } else {
      title = 'New Route Activity Notification'
      body = 'New route activity notification received'
    }

    new Notification(title, {
      body: body.substring(0, 150),
      icon: '/favicon.ico',
      tag: `route-activity-${notification.id}`,
      requireInteraction: false
    })
  }

  // Fetch notifications function
  const fetchNotifications = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        recipient:recipient_employee_id(full_name, personal_email)
      `)
      .in('notification_type', ['vehicle_breakdown', 'driver_tardiness'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      // Parse details JSONB field if it exists
      data.forEach((notification: any) => {
        if (notification.details && typeof notification.details === 'string') {
          try {
            notification.details = JSON.parse(notification.details)
          } catch (e) {
            // Keep as is if not valid JSON
          }
        }
      })

      // Check for new notifications
      const currentIds = new Set(data.map((n: Notification) => n.id))
      const newNotifications = data.filter((n: Notification) => !previousNotificationIds.current.has(n.id))

      if (newNotifications.length > 0) {
        // Play sound for new notifications
        playNotificationSound()

        // Show browser notification for each new notification
        newNotifications.forEach(notification => {
          showBrowserNotification(notification)
        })
      }

      previousNotificationIds.current = currentIds
      setNotifications(data)
    }
  }

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 20000) // 20 seconds

    return () => clearInterval(interval)
  }, [])

  // Real-time subscription for notifications
  useEffect(() => {
    const supabase = createClient()

    // Initial fetch
    fetchNotifications()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('route_activity_notifications_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: 'notification_type=in.(vehicle_breakdown,driver_tardiness)'
        },
        (payload) => {
          console.log('Route activity notification change detected:', payload.eventType)
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleResolve = async (notificationId: number) => {
    setResolving(notificationId)
    try {
      const response = await fetch('/api/notifications/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to resolve notification')
      }

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, status: 'resolved' as const, resolved_at: new Date().toISOString(), admin_response_required: false }
            : n
        )
      )

      window.dispatchEvent(new CustomEvent('notificationResolved'))
    } catch (error: any) {
      alert('Error resolving notification: ' + error.message)
    } finally {
      setResolving(null)
    }
  }

  const handleFindReplacement = (notification: Notification) => {
    const breakdownId = notification.details?.breakdown_id
    if (breakdownId) {
      setSelectedBreakdownId(breakdownId)
      setShowReplacementFinder(true)
    }
  }

  const handleReplacementAssigned = () => {
    setShowReplacementFinder(false)
    setSelectedBreakdownId(null)
    window.location.reload()
  }

  const handleApproveTardiness = async (notification: Notification) => {
    const tardinessReportId = parseInt(notification.certificate_type)
    if (!tardinessReportId) return

    setApprovingTardiness(notification.id)
    try {
      const response = await fetch('/api/tardiness/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tardinessReportId,
          coordinatorNotes: tardinessNotes[notification.id] || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve tardiness report')
      }

      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, status: 'resolved' as const, resolved_at: new Date().toISOString() }
            : n
        )
      )

      setTardinessNotes(prev => {
        const updated = { ...prev }
        delete updated[notification.id]
        return updated
      })
      setShowTardinessModal(null)

      window.dispatchEvent(new CustomEvent('notificationResolved'))
    } catch (error: any) {
      alert('Error approving tardiness: ' + error.message)
    } finally {
      setApprovingTardiness(null)
    }
  }

  const handleDeclineTardiness = async (notification: Notification) => {
    const tardinessReportId = parseInt(notification.certificate_type)
    if (!tardinessReportId) return

    setDecliningTardiness(notification.id)
    try {
      const response = await fetch('/api/tardiness/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tardinessReportId,
          coordinatorNotes: tardinessNotes[notification.id] || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline tardiness report')
      }

      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, status: 'resolved' as const, resolved_at: new Date().toISOString() }
            : n
        )
      )

      setTardinessNotes(prev => {
        const updated = { ...prev }
        delete updated[notification.id]
        return updated
      })
      setShowTardinessModal(null)

      window.dispatchEvent(new CustomEvent('notificationResolved'))
    } catch (error: any) {
      alert('Error declining tardiness: ' + error.message)
    } finally {
      setDecliningTardiness(null)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'resolved') {
      return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">Resolved</span>
    }
    if (status === 'dismissed') {
      return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600">Dismissed</span>
    }
    return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>
  }

  const breakdownNotifications = notifications.filter(n =>
    n.notification_type === 'vehicle_breakdown' &&
    n.status !== 'resolved' &&
    n.status !== 'dismissed'
  )
  const tardinessNotifications = notifications.filter(n =>
    n.notification_type === 'driver_tardiness' &&
    n.status !== 'resolved' &&
    n.status !== 'dismissed'
  )
  const routeActivityResolved = notifications.filter(n =>
    (n.notification_type === 'vehicle_breakdown' || n.notification_type === 'driver_tardiness') &&
    (n.status === 'resolved' || n.status === 'dismissed')
  )

  return (
    <div className="space-y-6">
      {/* Breakdown Notifications - Clean Table */}
      {breakdownNotifications.length > 0 && (
        <Card className="border-slate-200 overflow-hidden rounded-2xl">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Vehicle Breakdowns</h2>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-sm font-semibold border border-rose-100">
              {breakdownNotifications.length} Active
            </span>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownNotifications.map((notification) => {
                  const details = notification.details || {}
                  return (
                    <TableRow key={notification.id} className="hover:bg-slate-50">
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                          <AlertTriangle className="h-3 w-3" />
                          URGENT
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/vehicles/${notification.entity_id}`} className="font-medium text-slate-900 hover:text-violet-600">
                          Vehicle {notification.entity_id}
                        </Link>
                        <div className="text-xs text-slate-500">{details.location || 'No location'}</div>
                      </TableCell>
                      <TableCell>
                        {details.route_id ? (
                          <Link href={`/dashboard/routes/${details.route_id}`} className="text-sm text-slate-600 hover:text-violet-600 hover:underline">
                            Route {details.route_number || details.route_id}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700 line-clamp-2" title={details.description}>
                          {details.description || 'No description provided'}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDateTime(details.reported_at || notification.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFindReplacement(notification)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                            title="Find Replacement Vehicle"
                          >
                            <Car className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResolve(notification.id)}
                            disabled={resolving === notification.id}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title={resolving === notification.id ? 'Resolving...' : 'Resolve Breakdown'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tardiness Notifications - Clean Table */}
      {tardinessNotifications.length > 0 && (
        <Card className="border-slate-200 overflow-hidden rounded-2xl">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Driver Tardiness</h2>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold border border-amber-100">
              {tardinessNotifications.length} Pending
            </span>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tardinessNotifications.map((notification) => {
                  const details = notification.details || {}
                  return (
                    <TableRow key={notification.id} className="hover:bg-slate-50">
                      <TableCell>
                        <Link href={`/dashboard/drivers/${notification.entity_id}`} className="font-medium text-slate-900 hover:text-violet-600">
                          {details.driver_name || 'Unknown Driver'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {details.route_id ? (
                          <Link href={`/dashboard/routes/${details.route_id}`} className="text-sm text-slate-600 hover:text-violet-600 hover:underline">
                            Route {details.route_number || details.route_id}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">{details.route_number || 'N/A'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-700">
                          {details.session_type || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(notification.expiry_date)}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">
                          {notification.certificate_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {details.reported_at ? formatDateTime(details.reported_at) : formatDateTime(notification.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {showTardinessModal === notification.id ? (
                          <div className="absolute right-4 mt-2 z-10 bg-white shadow-xl border border-slate-200 rounded-lg p-3 w-64">
                            <textarea
                              rows={2}
                              value={tardinessNotes[notification.id] || ''}
                              onChange={(e) => setTardinessNotes(prev => ({ ...prev, [notification.id]: e.target.value }))}
                              placeholder="Add notes..."
                              className="w-full text-sm border rounded p-2 mb-2 focus:ring-2 focus:ring-violet-500 outline-none"
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowTardinessModal(null)}
                                className="h-7 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDeclineTardiness(notification)}
                                disabled={decliningTardiness === notification.id}
                                className="h-7 px-2 text-xs bg-rose-100 text-rose-700 hover:bg-rose-200 hover:text-rose-800"
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApproveTardiness(notification)}
                                disabled={approvingTardiness === notification.id}
                                className="h-7 px-2 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800"
                              >
                                Approve
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowTardinessModal(notification.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                            title="Review Report"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {breakdownNotifications.length === 0 && tardinessNotifications.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No pending route activity</p>
            <p className="text-sm text-slate-400">Everything is running smoothly</p>
          </CardContent>
        </Card>
      ) : null}

      {routeActivityResolved.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700 font-medium">
            ▶ Show resolved/dismissed activity ({routeActivityResolved.length})
          </summary>
          <Card className="mt-4 border-slate-200 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Resolved At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routeActivityResolved.map((notification) => (
                    <TableRow key={notification.id} className="hover:bg-slate-50">
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${notification.notification_type === 'vehicle_breakdown' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {notification.notification_type === 'vehicle_breakdown' ? <Wrench className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {notification.notification_type === 'vehicle_breakdown' ? 'Breakdown' : 'Tardiness'}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(notification.status)}</TableCell>
                      <TableCell>
                        {notification.notification_type === 'vehicle_breakdown' ? (
                          <Link href={`/dashboard/vehicles/${notification.entity_id}`} className="text-slate-700 hover:text-violet-600 hover:underline font-medium">
                            Vehicle {notification.entity_id}
                          </Link>
                        ) : (
                          <Link href={`/dashboard/drivers/${notification.entity_id}`} className="text-slate-700 hover:text-violet-600 hover:underline font-medium">
                            Driver {notification.entity_id}
                          </Link>
                        )}
                        {notification.details?.route_id && (
                          <span className="ml-2 text-slate-500">
                            {' • '}
                            <Link href={`/dashboard/routes/${notification.details.route_id}`} className="hover:text-violet-600 hover:underline">
                              Route {notification.details.route_number || notification.details.route_id}
                            </Link>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {notification.resolved_at ? formatDateTime(notification.resolved_at) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </details>
      )}

      {/* Replacement Vehicle Finder Modal */}
      {showReplacementFinder && selectedBreakdownId && (
        <ReplacementVehicleFinder
          breakdownId={selectedBreakdownId}
          onClose={() => {
            setShowReplacementFinder(false)
            setSelectedBreakdownId(null)
          }}
          onAssign={handleReplacementAssigned}
        />
      )}
    </div>
  )
}

