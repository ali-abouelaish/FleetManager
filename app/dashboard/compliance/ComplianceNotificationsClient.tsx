'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Mail, CheckCircle, XCircle, AlertTriangle, Clock, ExternalLink, X } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
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

interface ComplianceNotificationsClientProps {
  initialNotifications: Notification[]
}

export function ComplianceNotificationsClient({ initialNotifications }: ComplianceNotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [sendingEmail, setSendingEmail] = useState<number | null>(null)
  const [dismissing, setDismissing] = useState<number | null>(null)
  const [resolving, setResolving] = useState<number | null>(null)
  const [emailEditorOpen, setEmailEditorOpen] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [holdOnSend, setHoldOnSend] = useState(true)
  const [includeAppointmentLink, setIncludeAppointmentLink] = useState(true)
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

    const title = 'New Compliance Notification'
    const body = notification.certificate_name 
      ? `${notification.certificate_name} expires in ${notification.days_until_expiry} days`
      : 'New compliance notification received'

    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `compliance-${notification.id}`,
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
      .eq('notification_type', 'certificate_expiry')
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
      .channel('compliance_notifications_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: 'notification_type=eq.certificate_expiry'
        },
        (payload) => {
          console.log('Compliance notification change detected:', payload.eventType)
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleOpenEmailEditor = async (notification: Notification) => {
    setEditingNotification(notification)
    setLoadingTemplate(true)
    setEmailEditorOpen(true)
    setHoldOnSend(true)
    setIncludeAppointmentLink(true)

    try {
      const response = await fetch('/api/notifications/get-email-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load email template')
      }

      setEmailSubject(data.subject || '')
      setEmailBody(data.body || '')
    } catch (error: any) {
      alert('Error loading email template: ' + error.message)
    } finally {
      setLoadingTemplate(false)
    }
  }

  const handleSendEmail = async () => {
    if (!editingNotification) return

    setSendingEmail(editingNotification.id)
    try {
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: editingNotification.id,
          subject: emailSubject,
          emailBody: emailBody,
          hold: holdOnSend,
          includeAppointmentLink: includeAppointmentLink,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === editingNotification.id
            ? { ...n, status: 'sent' as const, email_sent_at: new Date().toISOString() }
            : n
        )
      )

      setEmailEditorOpen(false)
      setEditingNotification(null)
      setEmailSubject('')
      setEmailBody('')
      window.dispatchEvent(new CustomEvent('notificationResolved'))
      alert('Email sent successfully!')
    } catch (error: any) {
      alert('Error sending email: ' + error.message)
    } finally {
      setSendingEmail(null)
    }
  }

  const handleDismiss = async (notificationId: number) => {
    setDismissing(notificationId)
    try {
      const response = await fetch('/api/notifications/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to dismiss notification')
      }

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, status: 'dismissed' as const } : n
        )
      )

      window.dispatchEvent(new CustomEvent('notificationResolved'))
    } catch (error: any) {
      alert('Error dismissing notification: ' + error.message)
    } finally {
      setDismissing(null)
    }
  }

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

  const getStatusIcon = (status: string, daysUntil: number) => {
    if (status === 'resolved' || status === 'dismissed') {
      return <CheckCircle className="h-5 w-5 text-gray-400" />
    }
    if (daysUntil < 0) {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    if (daysUntil <= 7) {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />
    }
    return <Clock className="h-5 w-5 text-yellow-500" />
  }

  const getStatusBadge = (status: string, daysUntil: number) => {
    if (status === 'resolved') {
      return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-green-100 text-green-800">Resolved</span>
    }
    if (status === 'dismissed') {
      return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800">Dismissed</span>
    }
    if (status === 'sent') {
      return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800">Email Sent</span>
    }
    if (daysUntil < 0) {
      return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-red-100 text-red-800">Expired</span>
    }
    if (daysUntil <= 7) {
      return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800">Urgent</span>
    }
    return <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>
  }

  const getEntityLink = (entityType: string, entityId: number) => {
    if (entityType === 'vehicle') {
      return `/dashboard/vehicles/${entityId}`
    }
    if (entityType === 'driver' || entityType === 'assistant') {
      return `/dashboard/employees/${entityId}`
    }
    return '#'
  }

  const complianceNotifications = notifications.filter(n => 
    n.status !== 'resolved' && 
    n.status !== 'dismissed'
  )
  const complianceResolved = notifications.filter(n => 
    n.status === 'resolved' || n.status === 'dismissed'
  )

  return (
    <div className="space-y-6">
      {complianceNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No pending compliance notifications</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Until</TableHead>
                  <TableHead>Employee Response</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceNotifications.map((notification) => (
                  <TableRow 
                    key={notification.id}
                    className={notification.admin_response_required ? 'bg-orange-50 border-l-4 border-orange-500' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(notification.status, notification.days_until_expiry)}
                        {getStatusBadge(notification.status, notification.days_until_expiry)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{notification.certificate_name}</div>
                        <div className="text-sm text-gray-500">{notification.entity_type}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={getEntityLink(notification.entity_type, notification.entity_id)}
                        className="text-blue-600 hover:underline flex items-center space-x-1"
                      >
                        <span>View {notification.entity_type}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{notification.recipient?.full_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{notification.recipient_email || 'No email'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(notification.expiry_date)}</TableCell>
                    <TableCell>
                      <span className={notification.days_until_expiry < 0 ? 'text-red-600 font-semibold' : notification.days_until_expiry <= 7 ? 'text-orange-600 font-semibold' : ''}>
                        {notification.days_until_expiry < 0
                          ? `Expired ${Math.abs(notification.days_until_expiry)} days ago`
                          : `${notification.days_until_expiry} days`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {notification.admin_response_required && notification.employee_response_type ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              ⚠️ Response Required
                            </span>
                          </div>
                          {notification.employee_response_type === 'document_uploaded' && notification.employee_response_details && (
                            <div className="text-xs text-gray-600">
                              <div>📄 {notification.employee_response_details.filesUploaded || 0} file(s) uploaded</div>
                              {notification.employee_response_details.fileNames && notification.employee_response_details.fileNames.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {notification.employee_response_details.fileNames.slice(0, 2).join(', ')}
                                  {notification.employee_response_details.fileNames.length > 2 && ` +${notification.employee_response_details.fileNames.length - 2} more`}
                                </div>
                              )}
                              {notification.employee_response_received_at && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {formatDateTime(notification.employee_response_received_at)}
                                </div>
                              )}
                            </div>
                          )}
                          {notification.employee_response_type === 'appointment_booked' && notification.employee_response_details && (
                            <div className="text-xs text-gray-600">
                              <div>📅 Appointment booked</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {notification.employee_response_details.appointmentDate || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {notification.employee_response_details.appointmentTime || 'N/A'}
                              </div>
                              {notification.employee_response_received_at && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {formatDateTime(notification.employee_response_received_at)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : notification.employee_response_type ? (
                        <div className="text-xs text-gray-500">
                          {notification.employee_response_type === 'document_uploaded' ? '📄 Documents uploaded' : '📅 Appointment booked'}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">No response yet</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        {notification.status === 'pending' && notification.recipient_email && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenEmailEditor(notification)}
                            disabled={sendingEmail === notification.id}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Send Email
                          </Button>
                        )}
                        {notification.status === 'sent' && notification.recipient_email && (
                          <>
                            <span className="text-sm text-gray-500">
                              Sent {notification.email_sent_at ? formatDateTime(notification.email_sent_at) : ''}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleOpenEmailEditor(notification)}
                              disabled={sendingEmail === notification.id}
                              variant="secondary"
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Resend Email
                            </Button>
                          </>
                        )}
                        {notification.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDismiss(notification.id)}
                            disabled={dismissing === notification.id}
                          >
                            {dismissing === notification.id ? 'Dismissing...' : 'Ignore'}
                          </Button>
                        )}
                        {notification.admin_response_required && (
                          <Button
                            size="sm"
                            onClick={() => handleResolve(notification.id)}
                            disabled={resolving === notification.id}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {resolving === notification.id ? 'Resolving...' : 'Approve & Resolve'}
                          </Button>
                        )}
                        {(notification.status === 'pending' || notification.status === 'sent') && !notification.admin_response_required && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleResolve(notification.id)}
                            disabled={resolving === notification.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {resolving === notification.id ? 'Resolving...' : 'Mark Resolved'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {complianceResolved.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
            Show resolved/dismissed compliance notifications ({complianceResolved.length})
          </summary>
          <Card className="mt-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Resolved At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceResolved.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>{getStatusBadge(notification.status, notification.days_until_expiry)}</TableCell>
                      <TableCell>{notification.certificate_name}</TableCell>
                      <TableCell>
                        <Link
                          href={getEntityLink(notification.entity_type, notification.entity_id)}
                          className="text-blue-600 hover:underline"
                        >
                          View {notification.entity_type}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(notification.expiry_date)}</TableCell>
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

      {/* Email Editor Modal */}
      {emailEditorOpen && editingNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Edit Email</h2>
                <button
                  onClick={() => {
                    setEmailEditorOpen(false)
                    setEditingNotification(null)
                    setEmailSubject('')
                    setEmailBody('')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingTemplate ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading email template...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-start space-x-2">
                      <input
                        id="hold-on-send"
                        type="checkbox"
                        checked={holdOnSend}
                        onChange={(e) => setHoldOnSend(e.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <Label htmlFor="hold-on-send">Put on hold until admin clears</Label>
                        <p className="text-xs text-gray-500">
                          Flags the recipient, vehicle, and related routes as ON HOLD after sending.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <input
                        id="include-appointment-link"
                        type="checkbox"
                        checked={includeAppointmentLink}
                        onChange={(e) => setIncludeAppointmentLink(e.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <Label htmlFor="include-appointment-link">Include appointment booking link</Label>
                        <p className="text-xs text-gray-500">
                          Adds a link so the recipient can book an available slot.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email-to">To</Label>
                    <Input
                      id="email-to"
                      value={editingNotification.recipient_email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email-subject">Subject *</Label>
                    <Input
                      id="email-subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email-body">Message *</Label>
                    <textarea
                      id="email-body"
                      rows={15}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      required
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can edit the email content above. The upload link will be automatically included.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEmailEditorOpen(false)
                        setEditingNotification(null)
                        setEmailSubject('')
                        setEmailBody('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendEmail}
                      disabled={sendingEmail === editingNotification.id || !emailSubject.trim() || !emailBody.trim()}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendingEmail === editingNotification.id ? 'Sending...' : 'Send Email'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

