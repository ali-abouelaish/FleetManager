'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { CheckCircle, XCircle, Clock as ClockIcon, Car, Wrench } from 'lucide-react'
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
      return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-green-100 text-green-800">Resolved</span>
    }
    if (status === 'dismissed') {
      return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800">Dismissed</span>
    }
    return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>
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
      {/* Breakdown Notifications - Urgent Red Banner */}
      {breakdownNotifications.length > 0 && (
        <Card className="border-2 border-red-500">
          <CardContent className="p-0">
            <div className="bg-red-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <h2 className="text-lg font-bold">🚨 URGENT: Vehicle Breakdowns</h2>
                </div>
                <span className="px-3 py-1 bg-red-700 rounded-full text-sm font-semibold">
                  {breakdownNotifications.length} Active
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {breakdownNotifications.map((notification) => {
                const details = notification.details || {}
                return (
                  <div
                    key={notification.id}
                    className="p-4 bg-red-50 border-2 border-red-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-red-900">Vehicle Breakdown Reported</h3>
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                            URGENT
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p><strong>Vehicle:</strong> <Link href={`/dashboard/vehicles/${notification.entity_id}`} className="text-blue-600 hover:underline font-medium">View Vehicle {notification.entity_id}</Link></p>
                          {details.route_id && (
                            <p><strong>Route:</strong> <Link href={`/dashboard/routes/${details.route_id}`} className="text-blue-600 hover:underline font-medium">{details.route_number ? `Route ${details.route_number}` : `View Route ${details.route_id}`}</Link></p>
                          )}
                          {details.description && (
                            <p><strong>Description:</strong> {details.description}</p>
                          )}
                          {details.location && (
                            <p><strong>Location:</strong> {details.location}</p>
                          )}
                          <p><strong>Reported:</strong> {formatDateTime(details.reported_at || notification.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleFindReplacement(notification)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Car className="mr-2 h-4 w-4" />
                          Find Replacement
                        </Button>
                        <Button
                          onClick={() => handleResolve(notification.id)}
                          disabled={resolving === notification.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {resolving === notification.id ? 'Resolving...' : 'Resolve'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tardiness Notifications */}
      {tardinessNotifications.length > 0 && (
        <Card className="border-2 border-orange-500">
          <CardContent className="p-0">
            <div className="bg-orange-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-5 w-5" />
                  <h2 className="text-lg font-bold">Driver Tardiness Reports</h2>
                </div>
                <span className="px-3 py-1 bg-orange-700 rounded-full text-sm font-semibold">
                  {tardinessNotifications.length} Pending
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {tardinessNotifications.map((notification) => {
                const details = notification.details || {}
                const tardinessReportId = parseInt(notification.certificate_type)
                return (
                  <div
                    key={notification.id}
                    className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-orange-900">Driver Tardiness Report</h3>
                          <span className="px-2 py-1 bg-orange-600 text-white text-xs font-semibold rounded">
                            PENDING REVIEW
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p><strong>Driver:</strong> <Link href={`/dashboard/drivers/${notification.entity_id}`} className="text-blue-600 hover:underline font-medium">{details.driver_name || 'View Driver'}</Link></p>
                          {details.route_id && (
                            <p><strong>Route:</strong> <Link href={`/dashboard/routes/${details.route_id}`} className="text-blue-600 hover:underline font-medium">{details.route_number ? `Route ${details.route_number}` : `View Route ${details.route_id}`}</Link></p>
                          )}
                          {details.route_number && !details.route_id && (
                            <p><strong>Route:</strong> {details.route_number}</p>
                          )}
                          <p><strong>Session:</strong> {details.session_type || 'N/A'} - {formatDate(notification.expiry_date)}</p>
                          <p><strong>Reason:</strong> {notification.certificate_name}</p>
                          {details.reported_at && (
                            <p><strong>Reported:</strong> {formatDateTime(details.reported_at)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {showTardinessModal === notification.id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <textarea
                              rows={3}
                              value={tardinessNotes[notification.id] || ''}
                              onChange={(e) => setTardinessNotes(prev => ({ ...prev, [notification.id]: e.target.value }))}
                              placeholder="Add notes (optional)..."
                              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApproveTardiness(notification)}
                                disabled={approvingTardiness === notification.id}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                size="sm"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {approvingTardiness === notification.id ? 'Approving...' : 'Approve'}
                              </Button>
                              <Button
                                onClick={() => handleDeclineTardiness(notification)}
                                disabled={decliningTardiness === notification.id}
                                className="bg-red-600 hover:bg-red-700 text-white flex-1"
                                size="sm"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                {decliningTardiness === notification.id ? 'Declining...' : 'Decline'}
                              </Button>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setShowTardinessModal(null)
                                setTardinessNotes(prev => {
                                  const updated = { ...prev }
                                  delete updated[notification.id]
                                  return updated
                                })
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setShowTardinessModal(notification.id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            size="sm"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {breakdownNotifications.length === 0 && tardinessNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No pending route activity notifications</p>
          </CardContent>
        </Card>
      ) : null}

      {routeActivityResolved.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
            Show resolved/dismissed route activity notifications ({routeActivityResolved.length})
          </summary>
          <Card className="mt-4">
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
                    <TableRow key={notification.id}>
                      <TableCell>
                        {notification.notification_type === 'vehicle_breakdown' ? '🚨 Breakdown' : '⏰ Tardiness'}
                      </TableCell>
                      <TableCell>{getStatusBadge(notification.status)}</TableCell>
                      <TableCell>
                        {notification.notification_type === 'vehicle_breakdown' ? (
                          <Link href={`/dashboard/vehicles/${notification.entity_id}`} className="text-blue-600 hover:underline font-medium">
                            Vehicle {notification.entity_id}
                          </Link>
                        ) : (
                          <Link href={`/dashboard/drivers/${notification.entity_id}`} className="text-blue-600 hover:underline font-medium">
                            Driver {notification.entity_id}
                          </Link>
                        )}
                        {notification.details?.route_id && (
                          <span className="ml-2">
                            {' • '}
                            <Link href={`/dashboard/routes/${notification.details.route_id}`} className="text-blue-600 hover:underline font-medium">
                              Route {notification.details.route_number || notification.details.route_id}
                            </Link>
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
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

