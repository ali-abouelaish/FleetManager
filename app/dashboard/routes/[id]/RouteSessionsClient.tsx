'use client'

import React, { useState, useEffect, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import {
  RouteServiceHistory,
  Passenger,
  AttendanceStatus,
} from '@/lib/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  Play,
  Square,
  MapPin,
  FileText,
  Eye,
  Upload,
  Search,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface RouteSessionsClientProps {
  routeId: number
  passengers: Passenger[]
}

export default function RouteSessionsClient({ routeId, passengers }: RouteSessionsClientProps) {
  const [sessions, setSessions] = useState<RouteServiceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [attendanceData, setAttendanceData] = useState<Record<number, AttendanceStatus>>({})
  const [sessionDocuments, setSessionDocuments] = useState<Record<number, any[]>>({})
  const [sessionIncidents, setSessionIncidents] = useState<Record<number, any[]>>({})
  const [uploadingDocForSession, setUploadingDocForSession] = useState<number | null>(null)
  const [docUploadError, setDocUploadError] = useState<string | null>(null)
  const [sessionSearch, setSessionSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId])

  useEffect(() => {
    if (selectedSession) {
      loadAttendanceForSession(selectedSession)
      loadDocumentsForSession(selectedSession)
      loadIncidentsForSession(selectedSession)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession])

  const loadSessions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('route_service_history')
      .select('*')
      .eq('route_id', routeId)
      .order('session_date', { ascending: false })
      .order('session_type', { ascending: true })
      .limit(50)

    if (!error && data) {
      setSessions(data as RouteServiceHistory[])
      const sessionIds = data.map((s: any) => s.session_id)
      await Promise.all([
        ...sessionIds.map((id: number) => loadDocumentsForSession(id)),
        ...sessionIds.map((id: number) => loadIncidentsForSession(id)),
      ])
    }
    setLoading(false)
  }

  const loadAttendanceForSession = async (sessionId: number) => {
    const { data } = await supabase
      .from('route_passenger_attendance')
      .select('passenger_id, attendance_status')
      .eq('route_session_id', sessionId)

    if (data) {
      const attendanceMap: Record<number, AttendanceStatus> = {}
      data.forEach((record: any) => {
        attendanceMap[record.passenger_id] = record.attendance_status
      })
      setAttendanceData(attendanceMap)
    }
  }

  const loadDocumentsForSession = async (sessionId: number) => {
    const { data } = await supabase
      .from('documents')
      .select('id, doc_type, file_name, file_url, uploaded_at, owner_type')
      .eq('route_session_id', sessionId)
      .order('uploaded_at', { ascending: false })

    setSessionDocuments((prev) => ({
      ...prev,
      [sessionId]: data || [],
    }))
  }

  const loadIncidentsForSession = async (sessionId: number) => {
    const { data, error } = await supabase
      .from('incidents')
      .select('id, incident_type, description, reported_at, resolved, reference_number')
      .eq('route_session_id', sessionId)
      .order('reported_at', { ascending: false })

    if (error) {
      console.error('Error loading incidents for session:', sessionId, error)
      setSessionIncidents((prev) => ({ ...prev, [sessionId]: [] }))
      return
    }

    setSessionIncidents((prev) => ({ ...prev, [sessionId]: data || [] }))
  }

  const handleAddDocumentToSession = async (sessionId: number, file: File, docType: string) => {
    setUploadingDocForSession(sessionId)
    setDocUploadError(null)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('You must be logged in to upload documents')
      }
      const fileExt = file.name.split('.').pop() || 'bin'
      const storagePath = `route_sessions/${sessionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const bucketName = 'DOCUMENTS'
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          throw new Error(`Storage bucket "${bucketName}" not found. Create a public bucket named "${bucketName}" in Supabase Storage.`)
        }
        throw uploadError
      }
      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(storagePath)
      const { data: userData } = await supabase.from('users').select('id').eq('email', authUser.email).maybeSingle()
      const { error: docError } = await supabase.from('documents').insert({
        route_session_id: sessionId,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_path: storagePath,
        doc_type: docType || 'Session Document',
        uploaded_by: userData?.id ?? null,
      })
      if (docError) throw docError
      await loadDocumentsForSession(sessionId)
    } catch (err: any) {
      setDocUploadError(err.message || 'Upload failed')
    } finally {
      setUploadingDocForSession(null)
    }
  }

  const handleEndSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to end this session?')) return

    const { error } = await supabase
      .from('route_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (!error) {
      await Promise.all([loadDocumentsForSession(sessionId), loadIncidentsForSession(sessionId)])
      await loadSessions()
    } else {
      alert('Error ending session: ' + error.message)
    }
  }

  const handleMarkAttendance = async (sessionId: number, passengerId: number, status: AttendanceStatus) => {
    const { data: auth } = await supabase.auth.getUser()
    const authUser = auth?.user
    let markedBy: number | null = null

    if (authUser?.email) {
      const { data: userData } = await supabase
        .from('users')
        .select('employee_id')
        .eq('email', authUser.email)
        .single()

      if (userData?.employee_id) markedBy = userData.employee_id
    }

    const { error } = await supabase.rpc('mark_passenger_attendance', {
      p_route_session_id: sessionId,
      p_passenger_id: passengerId,
      p_status: status,
      p_notes: null,
      p_marked_by: markedBy,
    })

    if (!error) {
      setAttendanceData((prev) => ({ ...prev, [passengerId]: status }))
      loadSessions()
    } else {
      alert('Error marking attendance: ' + error.message)
    }
  }

  const activeSessions = sessions.filter((s) => s.started_at && !s.ended_at)
  const completedSessions = sessions.filter((s) => s.ended_at !== null || (!s.started_at && !s.ended_at))

  const filteredCompletedSessions = useMemo(() => {
    if (!sessionSearch.trim()) return completedSessions
    const term = sessionSearch.trim().toLowerCase()
    return completedSessions.filter((session) => {
      const dateStr = formatDate(session.session_date).toLowerCase()
      const type = (session.session_type || '').toLowerCase()
      const status = session.ended_at ? 'completed' : !session.started_at && !session.ended_at ? 'not started' : ''
      return dateStr.includes(term) || type.includes(term) || status.includes(term)
    })
  }, [completedSessions, sessionSearch])

  const getStatusIcon = (status: AttendanceStatus) => {
    const icons: Record<AttendanceStatus, ReactNode> = {
      present: <CheckCircle className="h-4 w-4 text-green-600" />,
      absent: <XCircle className="h-4 w-4 text-red-600" />,
      late: <AlertCircle className="h-4 w-4 text-yellow-600" />,
      excused: <UserCheck className="h-4 w-4 text-blue-600" />,
    }
    return icons[status] ?? null
  }

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800'
      case 'absent':
        return 'bg-red-100 text-red-800'
      case 'late':
        return 'bg-yellow-100 text-yellow-800'
      case 'excused':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Current session — always show: running session or "No session currently running" */}
      <Card className={activeSessions.length > 0 ? 'border-l-4 border-l-green-500' : 'border-slate-200'}>
        <CardHeader className={activeSessions.length > 0 ? 'bg-green-600 text-white' : 'bg-slate-100 border-b border-slate-200'}>
          <div className="flex items-center justify-between">
            <CardTitle className={activeSessions.length > 0 ? 'text-white flex items-center' : 'text-slate-800 flex items-center'}>
              <MapPin className={`mr-2 h-5 w-5 ${activeSessions.length > 0 ? 'text-white' : 'text-slate-500'}`} />
              {activeSessions.length > 0 ? 'Session currently running' : 'Current session'}
            </CardTitle>
            {activeSessions.length > 0 && (
              <span className="px-3 py-1 bg-green-700 rounded-full text-sm font-medium">
                {activeSessions.length} Active
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className={activeSessions.length > 0 ? '' : 'py-10'}>
          {activeSessions.length === 0 ? (
            <p className="text-center text-slate-500 text-base">No session currently running.</p>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <Card key={session.session_id} className="border-l-4 border-l-green-500 bg-green-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-green-100 rounded-full">
                          <Play className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <span>
                              {formatDate(session.session_date)} - {session.session_type}
                            </span>
                            <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                              En Route
                            </span>
                          </CardTitle>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            {session.driver_name && <span>Driver: {session.driver_name}</span>}
                            {session.passenger_assistant_name && <span>PA: {session.passenger_assistant_name}</span>}
                            {session.started_at && (
                              <span className="text-green-700 font-medium">
                                Started: {formatDateTime(session.started_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dashboard/incidents/create?route_session_id=${session.session_id}`}>
                          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 border border-rose-200">
                            <AlertCircle className="mr-1 h-3.5 w-3.5" />
                            Add Incident
                          </Button>
                        </Link>

                        <Link href={`/dashboard/incidents?route_session_id=${session.session_id}`} title="View incidents for this session">
                          <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-slate-100 border border-slate-200">
                            View incidents
                          </Button>
                        </Link>

                        <Button variant="danger" size="sm" onClick={() => handleEndSession(session.session_id)}>
                          <Square className="mr-2 h-4 w-4" />
                          End Session
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSession(selectedSession === session.session_id ? null : session.session_id)}
                        >
                          {selectedSession === session.session_id ? 'Hide' : 'Mark Attendance'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Upload TR5 / TR6 / TR7 and documents for this running session */}
                    <div className="p-3 bg-white rounded-lg border border-green-200">
                      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        Upload document (TR5, TR6, TR7 or other)
                      </h4>
                      {docUploadError && (
                        <p className="text-xs text-red-600 mb-2">{docUploadError}</p>
                      )}
                      <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(e) => {
                          e.preventDefault()
                          const form = e.currentTarget
                          const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]')
                          const typeSelect = form.querySelector<HTMLSelectElement>('select[name="doc_type"]')
                          const file = fileInput?.files?.[0]
                          if (!file) {
                            setDocUploadError('Please select a file.')
                            return
                          }
                          const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
                          if (!allowed.includes(file.type)) {
                            setDocUploadError('Only images (JPEG, PNG, GIF) and PDF are allowed.')
                            return
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            setDocUploadError('File must be under 10 MB.')
                            return
                          }
                          handleAddDocumentToSession(session.session_id, file, typeSelect?.value || 'Session Document')
                          fileInput.value = ''
                        }}
                      >
                        <div className="flex-1 min-w-[140px]">
                          <Label htmlFor={`active-doc-file-${session.session_id}`} className="text-xs">File</Label>
                          <Input
                            id={`active-doc-file-${session.session_id}`}
                            type="file"
                            accept=".pdf,image/jpeg,image/jpg,image/png,image/gif"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="w-36">
                          <Label htmlFor={`active-doc-type-${session.session_id}`} className="text-xs">Type</Label>
                          <Select id={`active-doc-type-${session.session_id}`} name="doc_type" className="h-9 text-sm">
                            <option value="Session Document">Session Document</option>
                            <option value="TR5">TR5</option>
                            <option value="TR6">TR6</option>
                            <option value="TR7">TR7</option>
                            <option value="Other">Other</option>
                          </Select>
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={uploadingDocForSession === session.session_id}
                          className="shrink-0"
                        >
                          {uploadingDocForSession === session.session_id ? 'Uploading…' : (<><Upload className="h-3.5 w-3.5 mr-1" /> Upload</>)}
                        </Button>
                      </form>
                    </div>

                    {/* Attendance list */}
                    {selectedSession === session.session_id && (
                      <div className="mt-4 border-t border-green-300 pt-4">
                        <h4 className="font-semibold mb-3 flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          Mark Attendance ({passengers.length} passengers)
                        </h4>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {passengers.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No passengers on this route.</p>
                          ) : (
                            passengers.map((passenger) => {
                              const currentStatus = attendanceData[passenger.id] || 'absent'
                              return (
                                <div
                                  key={passenger.id}
                                  className="flex items-center justify-between p-3 bg-white rounded border border-green-200 hover:bg-green-50 transition-colors"
                                >
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <span className="font-medium truncate">{passenger.full_name}</span>
                                    {passenger.seat_number && (
                                      <span className="text-sm text-gray-500 whitespace-nowrap">Seat: {passenger.seat_number}</span>
                                    )}
                                    <span className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 whitespace-nowrap ${getStatusColor(currentStatus)}`}>
                                      {getStatusIcon(currentStatus)}
                                      <span className="capitalize">{currentStatus}</span>
                                    </span>
                                  </div>

                                  <div className="flex space-x-1 ml-4">
                                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => (
                                      <Button
                                        key={status}
                                        variant={currentStatus === status ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => handleMarkAttendance(session.session_id, passenger.id, status)}
                                        className="text-xs px-2"
                                        title={`Mark as ${status}`}
                                      >
                                        {getStatusIcon(status)}
                                        <span className="ml-1 capitalize hidden md:inline">{status}</span>
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card className="border-slate-200 overflow-hidden rounded-2xl">
        <div className="bg-white border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-600" />
              Session History
            </h2>

            {!loading && completedSessions.length > 0 && (
              <span className="px-3 py-1 bg-slate-50 text-slate-700 rounded-full text-sm font-semibold border border-slate-100">
                {filteredCompletedSessions.length} of {completedSessions.length} Session{completedSessions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!loading && completedSessions.length > 0 && (
            <div className="mt-3 relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by date, AM/PM or completed..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm"
              />
              {sessionSearch && (
                <button
                  type="button"
                  onClick={() => setSessionSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-slate-500 py-8">Loading sessions...</p>
          ) : completedSessions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No completed sessions recorded yet.</p>
          ) : filteredCompletedSessions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No sessions match your search.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCompletedSessions.map((session) => {
                const isCompleted = session.ended_at !== null

                return (
                  <div key={session.session_id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-slate-100 text-slate-600">
                          <Calendar className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-slate-800">
                              {formatDate(session.session_date)} — {session.session_type}
                            </span>

                            {isCompleted && (
                              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Completed
                              </span>
                            )}

                            {!session.started_at && !session.ended_at && (
                              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                Not Started
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSession(selectedSession === session.session_id ? null : session.session_id)}
                        className="text-violet-600 hover:bg-violet-50 hover:text-violet-700 border border-violet-200"
                      >
                        {selectedSession === session.session_id ? 'Hide details' : 'View details'}
                      </Button>
                    </div>

                    {selectedSession === session.session_id && (
                      <div className="mt-4 border-t border-slate-200 pt-4 space-y-4">
                        {/* Documents */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            Documents
                          </h4>
                          {(sessionDocuments[session.session_id]?.length ?? 0) === 0 ? (
                            <p className="text-sm text-slate-500">No documents for this session.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {sessionDocuments[session.session_id]?.map((doc: any) => (
                                <li key={doc.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-2 border border-slate-100">
                                  <span className="font-medium text-slate-800 truncate">{doc.file_name || doc.doc_type || 'Document'}</span>
                                  {doc.file_url ? (
                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline flex items-center gap-1">
                                      <Eye className="h-3.5 w-3.5" /> View
                                    </a>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs font-medium text-slate-600 mb-2">Add document to this session</p>
                            {docUploadError && selectedSession === session.session_id && (
                              <p className="text-xs text-red-600 mb-2">{docUploadError}</p>
                            )}
                            <form
                              className="flex flex-wrap items-end gap-2"
                              onSubmit={(e) => {
                                e.preventDefault()
                                const form = e.currentTarget
                                const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]')
                                const typeSelect = form.querySelector<HTMLSelectElement>('select[name="doc_type"]')
                                const file = fileInput?.files?.[0]
                                if (!file) {
                                  setDocUploadError('Please select a file.')
                                  return
                                }
                                const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
                                if (!allowed.includes(file.type)) {
                                  setDocUploadError('Only images (JPEG, PNG, GIF) and PDF are allowed.')
                                  return
                                }
                                if (file.size > 10 * 1024 * 1024) {
                                  setDocUploadError('File must be under 10 MB.')
                                  return
                                }
                                handleAddDocumentToSession(session.session_id, file, typeSelect?.value || 'Session Document')
                                fileInput.value = ''
                              }}
                            >
                              <div className="flex-1 min-w-[140px]">
                                <Label htmlFor={`doc-file-${session.session_id}`} className="text-xs">File</Label>
                                <Input
                                  id={`doc-file-${session.session_id}`}
                                  type="file"
                                  accept=".pdf,image/jpeg,image/jpg,image/png,image/gif"
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div className="w-36">
                                <Label htmlFor={`doc-type-${session.session_id}`} className="text-xs">Type</Label>
                                <Select id={`doc-type-${session.session_id}`} name="doc_type" className="h-9 text-sm">
                                  <option value="Session Document">Session Document</option>
                                  <option value="TR5">TR5</option>
                                  <option value="TR6">TR6</option>
                                  <option value="TR7">TR7</option>
                                  <option value="Other">Other</option>
                                </Select>
                              </div>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={uploadingDocForSession === session.session_id}
                                className="shrink-0"
                              >
                                {uploadingDocForSession === session.session_id ? (
                                  'Uploading…'
                                ) : (
                                  <>
                                    <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                                  </>
                                )}
                              </Button>
                            </form>
                          </div>
                        </div>

                        {/* Incidents (TR5, TR6, TR7 completed on incident page) */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-slate-500" />
                            Incidents
                          </h4>
                          {(sessionIncidents[session.session_id]?.length ?? 0) === 0 ? (
                            <p className="text-sm text-slate-500">No incidents for this session.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {sessionIncidents[session.session_id]?.map((incident: any) => (
                                <li key={incident.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-2 border border-slate-100">
                                  <span className="text-slate-800">
                                    {incident.reference_number ? `${incident.reference_number} — ` : ''}
                                    {incident.incident_type || 'Incident'}
                                    {incident.description ? `: ${incident.description.slice(0, 60)}${incident.description.length > 60 ? '…' : ''}` : ''}
                                  </span>
                                  <Link href={`/dashboard/incidents/${incident.id}`} className="text-violet-600 hover:underline flex items-center gap-1">
                                    <Eye className="h-3.5 w-3.5" /> View (TR5/TR6/TR7)
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Passenger attendance */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                            <UserCheck className="h-4 w-4 text-slate-500" />
                            Passenger attendance
                          </h4>
                          {passengers.length === 0 ? (
                            <p className="text-sm text-slate-500">No passengers on this route.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {passengers.map((passenger) => {
                                const status = attendanceData[passenger.id] ?? 'absent'
                                return (
                                  <li key={passenger.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-2 border border-slate-100">
                                    <span className="font-medium text-slate-800 truncate">{passenger.full_name}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${status === 'present' ? 'bg-emerald-100 text-emerald-700' : status === 'absent' ? 'bg-red-100 text-red-700' : status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                      {status}
                                    </span>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}