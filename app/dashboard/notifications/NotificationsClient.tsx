'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Mail, CheckCircle, XCircle, AlertTriangle, Clock, ExternalLink, CheckCircle2, X } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

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
  recipient?: {
    full_name: string
    personal_email: string
  }
}

interface NotificationsClientProps {
  initialNotifications: Notification[]
}

export function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
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

  const handleOpenEmailEditor = async (notification: Notification) => {
    setEditingNotification(notification)
    setLoadingTemplate(true)
    setEmailEditorOpen(true)
    setHoldOnSend(true)
    setIncludeAppointmentLink(true)

    try {
      // Fetch email template
      const response = await fetch('/api/notifications/get-email-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load email template')
      }

      if (data.emailTemplate) {
        setEmailSubject(data.emailTemplate.subject)
        setEmailBody(data.emailTemplate.body)
      }
    } catch (error: any) {
      alert('Error loading email template: ' + error.message)
      setEmailEditorOpen(false)
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
          includeAppointmentLink,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      // Update notification status
      setNotifications(prev =>
        prev.map(n =>
          n.id === editingNotification.id
            ? { ...n, status: 'sent' as const, email_sent_at: new Date().toISOString() }
            : n
        )
      )

      // Close editor
      setEmailEditorOpen(false)
      setEditingNotification(null)
      setEmailSubject('')
      setEmailBody('')

      // In development, show email content
      if (data.emailContent && process.env.NODE_ENV === 'development') {
        alert(`Email sent! (Dev mode)\n\nTo: ${data.emailContent.to}\nSubject: ${data.emailContent.subject}`)
      } else {
        alert('Email sent successfully!')
      }
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
            ? { ...n, status: 'resolved' as const, resolved_at: new Date().toISOString() } 
            : n
        )
      )
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

  const filteredNotifications = notifications.filter(n => n.status !== 'resolved' && n.status !== 'dismissed')
  const otherNotifications = notifications.filter(n => n.status === 'resolved' || n.status === 'dismissed')

  return (
    <div className="space-y-6">
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No pending notifications</p>
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.map((notification) => (
                  <TableRow key={notification.id}>
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
                        {(notification.status === 'pending' || notification.status === 'sent') && (
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

      {otherNotifications.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
            Show resolved/dismissed notifications ({otherNotifications.length})
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
                  {otherNotifications.map((notification) => (
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

