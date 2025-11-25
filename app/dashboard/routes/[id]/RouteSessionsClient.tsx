'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { 
  RouteServiceHistory, 
  RouteSession, 
  Passenger, 
  AttendanceStatus,
  SessionType 
} from '@/lib/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, UserCheck, Plus, Play, Square, MapPin, FileText, Eye } from 'lucide-react'
import Link from 'next/link'

interface RouteSessionsClientProps {
  routeId: number
  passengers: Passenger[]
}

export default function RouteSessionsClient({ routeId, passengers }: RouteSessionsClientProps) {
  const [sessions, setSessions] = useState<RouteServiceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [attendanceData, setAttendanceData] = useState<Record<number, AttendanceStatus>>({})
  const [sessionDocuments, setSessionDocuments] = useState<Record<number, any[]>>({})
  const [sessionIncidents, setSessionIncidents] = useState<Record<number, any[]>>({})
  
  // Assigned crew for this route
  const [assignedCrew, setAssignedCrew] = useState<{
    driver_id: number | null
    driver_name: string | null
    pa_id: number | null
    pa_name: string | null
  } | null>(null)

  // Create session form state
  const [newSession, setNewSession] = useState({
    session_date: new Date().toISOString().split('T')[0],
    session_type: 'AM' as SessionType,
    driver_id: '',
    passenger_assistant_id: '',
    notes: '',
    useSpareDriver: false,
    useSparePA: false,
  })

  // Drivers and PAs for dropdowns (for spare selection)
  const [drivers, setDrivers] = useState<any[]>([])
  const [passengerAssistants, setPassengerAssistants] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadSessions()
    loadAssignedCrew()
    loadDrivers()
    loadPassengerAssistants()
  }, [routeId])

  useEffect(() => {
    if (selectedSession) {
      loadAttendanceForSession(selectedSession)
      loadDocumentsForSession(selectedSession)
      loadIncidentsForSession(selectedSession)
    }
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
      // Load documents and incidents for all sessions
      const sessionIds = data.map((s: any) => s.session_id)
      // Load all documents and incidents in parallel
      await Promise.all([
        ...sessionIds.map((id: number) => loadDocumentsForSession(id)),
        ...sessionIds.map((id: number) => loadIncidentsForSession(id))
      ])
    }
    setLoading(false)
  }

  const loadDrivers = async () => {
    const { data } = await supabase
      .from('drivers')
      .select('employee_id, employees(full_name)')
    
    if (data) {
      setDrivers(data.map((d: any) => ({
        id: d.employee_id,
        name: d.employees?.full_name || 'Unknown'
      })))
    }
  }

  const loadAssignedCrew = async () => {
    const { data } = await supabase
      .from('crew')
      .select(`
        driver_id,
        pa_id,
        driver:driver_id(employees(full_name)),
        pa:pa_id(employees(full_name))
      `)
      .eq('route_id', routeId)
      .maybeSingle()

    if (data) {
      // Supabase returns nested relations as arrays
      const driver = Array.isArray(data.driver) ? data.driver[0] : data.driver
      const pa = Array.isArray(data.pa) ? data.pa[0] : data.pa
      const driverEmployees = Array.isArray(driver?.employees) ? driver.employees[0] : driver?.employees
      const paEmployees = Array.isArray(pa?.employees) ? pa.employees[0] : pa?.employees
      
      const crew = {
        driver_id: data.driver_id,
        driver_name: driverEmployees?.full_name || null,
        pa_id: data.pa_id,
        pa_name: paEmployees?.full_name || null,
      }
      setAssignedCrew(crew)
      // Pre-populate form with assigned crew
      setNewSession(prev => ({
        ...prev,
        driver_id: crew.driver_id ? crew.driver_id.toString() : '',
        passenger_assistant_id: crew.pa_id ? crew.pa_id.toString() : '',
      }))
    } else {
      setAssignedCrew(null)
    }
  }

  const loadPassengerAssistants = async () => {
    const { data } = await supabase
      .from('passenger_assistants')
      .select('employee_id, employees(full_name)')
    
    if (data) {
      setPassengerAssistants(data.map((pa: any) => ({
        id: pa.employee_id,
        name: pa.employees?.full_name || 'Unknown'
      })))
    }
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

    if (data) {
      setSessionDocuments(prev => ({
        ...prev,
        [sessionId]: data
      }))
    } else {
      // Ensure empty array is set if no documents
      setSessionDocuments(prev => ({
        ...prev,
        [sessionId]: []
      }))
    }
  }

  const loadIncidentsForSession = async (sessionId: number) => {
    const { data, error } = await supabase
      .from('incidents')
      .select('id, incident_type, description, reported_at, resolved, reference_number')
      .eq('route_session_id', sessionId)
      .order('reported_at', { ascending: false })

    if (error) {
      console.error('Error loading incidents for session:', sessionId, error)
      // Ensure empty array is set on error
      setSessionIncidents(prev => ({
        ...prev,
        [sessionId]: []
      }))
      return
    }

    // Always set the incidents (even if empty array)
    setSessionIncidents(prev => ({
      ...prev,
      [sessionId]: data || []
    }))
  }

  const handleCreateSession = async () => {
    // Determine driver and PA to use
    let driverId: number | null = null
    let paId: number | null = null

    if (newSession.useSpareDriver) {
      // Use selected spare driver
      driverId = newSession.driver_id ? parseInt(newSession.driver_id) : null
    } else {
      // Use assigned driver
      driverId = assignedCrew?.driver_id || null
    }

    if (newSession.useSparePA) {
      // Use selected spare PA
      paId = newSession.passenger_assistant_id ? parseInt(newSession.passenger_assistant_id) : null
    } else {
      // Use assigned PA
      paId = assignedCrew?.pa_id || null
    }

    const { data, error } = await supabase
      .from('route_sessions')
      .insert({
        route_id: routeId,
        session_date: newSession.session_date,
        session_type: newSession.session_type,
        driver_id: driverId,
        passenger_assistant_id: paId,
        notes: newSession.notes || null,
      })
      .select()
      .single()

    if (!error && data) {
      setShowCreateSession(false)
      // Reset form but keep assigned crew
      setNewSession({
        session_date: new Date().toISOString().split('T')[0],
        session_type: 'AM',
        driver_id: assignedCrew?.driver_id ? assignedCrew.driver_id.toString() : '',
        passenger_assistant_id: assignedCrew?.pa_id ? assignedCrew.pa_id.toString() : '',
        notes: '',
        useSpareDriver: false,
        useSparePA: false,
      })
      loadSessions()
    } else {
      alert('Error creating session: ' + (error?.message || 'Unknown error'))
    }
  }

  const handleEndSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to end this session?')) {
      return
    }

    const { error } = await supabase
      .from('route_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (!error) {
      // First, explicitly reload documents and incidents for this session
      await Promise.all([
        loadDocumentsForSession(sessionId),
        loadIncidentsForSession(sessionId)
      ])
      // Then reload all sessions to update the UI
      await loadSessions()
    } else {
      alert('Error ending session: ' + error.message)
    }
  }

  const handleMarkAttendance = async (sessionId: number, passengerId: number, status: AttendanceStatus) => {
    // Get current user's employee ID
    const { data: { user: authUser } } = await supabase.auth.getUser()
    let markedBy: number | null = null
    
    if (authUser?.email) {
      const { data: userData } = await supabase
        .from('users')
        .select('employee_id')
        .eq('email', authUser.email)
        .single()
      
      if (userData?.employee_id) {
        markedBy = userData.employee_id
      }
    }

    const { error } = await supabase.rpc('mark_passenger_attendance', {
      p_route_session_id: sessionId,
      p_passenger_id: passengerId,
      p_status: status,
      p_notes: null,
      p_marked_by: markedBy,
    })

    if (!error) {
      setAttendanceData(prev => ({
        ...prev,
        [passengerId]: status
      }))
      loadSessions()
    } else {
      alert('Error marking attendance: ' + error.message)
    }
  }

  // Separate active (en route) and completed sessions
  // Active: started_at is set but ended_at is null (en route)
  // Completed/History: ended_at is set (session ended) OR not started yet
  const activeSessions = sessions.filter(s => s.started_at && !s.ended_at)
  const completedSessions = sessions.filter(s => s.ended_at !== null || (!s.started_at && !s.ended_at))

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
      {/* Create Session Section */}
      <Card>
        <CardHeader className="bg-blue-900 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Route Sessions & Attendance</CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (showCreateSession) {
                  // Reset form when closing
                  setNewSession({
                    session_date: new Date().toISOString().split('T')[0],
                    session_type: 'AM',
                    driver_id: assignedCrew?.driver_id ? assignedCrew.driver_id.toString() : '',
                    passenger_assistant_id: assignedCrew?.pa_id ? assignedCrew.pa_id.toString() : '',
                    notes: '',
                    useSpareDriver: false,
                    useSparePA: false,
                  })
                }
                setShowCreateSession(!showCreateSession)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {showCreateSession ? 'Cancel' : 'New Session'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateSession && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="session_date">Session Date</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={newSession.session_date}
                    onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="session_type">Session Type</Label>
                  <Select
                    id="session_type"
                    value={newSession.session_type}
                    onChange={(e) => setNewSession({ ...newSession, session_type: e.target.value as SessionType })}
                  >
                    <option value="AM">AM (Morning)</option>
                    <option value="PM">PM (Afternoon)</option>
                  </Select>
                </div>
              </div>
              {/* Assigned Crew Display */}
              {assignedCrew ? (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm font-medium text-blue-900 mb-2">Assigned Crew (will be used unless spare is selected)</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Driver: </span>
                      <span className="font-medium text-gray-900">
                        {assignedCrew.driver_name || 'Not assigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Passenger Assistant: </span>
                      <span className="font-medium text-gray-900">
                        {assignedCrew.pa_name || 'Not assigned'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-sm font-medium text-yellow-900 mb-2">No crew assigned to this route</div>
                  <div className="text-sm text-yellow-700">
                    You can manually select a driver and PA below, or assign crew to this route first.
                  </div>
                </div>
              )}

              {/* Spare Options */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSession.useSpareDriver}
                      onChange={(e) => setNewSession({ 
                        ...newSession, 
                        useSpareDriver: e.target.checked,
                        driver_id: e.target.checked ? '' : (assignedCrew?.driver_id?.toString() || '')
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Use Spare Driver</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSession.useSparePA}
                      onChange={(e) => setNewSession({ 
                        ...newSession, 
                        useSparePA: e.target.checked,
                        passenger_assistant_id: e.target.checked ? '' : (assignedCrew?.pa_id?.toString() || '')
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Use Spare PA</span>
                  </label>
                </div>

                {/* Manual selection when no crew assigned or using spares */}
                {(!assignedCrew || newSession.useSpareDriver || newSession.useSparePA) && (
                  <div className="grid grid-cols-2 gap-4">
                    {(!assignedCrew || newSession.useSpareDriver) && (
                      <div>
                        <Label htmlFor="spare_driver_id">
                          {newSession.useSpareDriver ? 'Select Spare Driver' : 'Select Driver'}
                        </Label>
                        <Select
                          id="spare_driver_id"
                          value={newSession.driver_id}
                          onChange={(e) => setNewSession({ ...newSession, driver_id: e.target.value })}
                          required={!assignedCrew || newSession.useSpareDriver}
                        >
                          <option value="">Select Driver</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                    {(!assignedCrew || newSession.useSparePA) && (
                      <div>
                        <Label htmlFor="spare_pa_id">
                          {newSession.useSparePA ? 'Select Spare PA' : 'Select Passenger Assistant'}
                        </Label>
                        <Select
                          id="spare_pa_id"
                          value={newSession.passenger_assistant_id}
                          onChange={(e) => setNewSession({ ...newSession, passenger_assistant_id: e.target.value })}
                          required={!assignedCrew || newSession.useSparePA}
                        >
                          <option value="">Select PA</option>
                          {passengerAssistants.map((pa) => (
                            <option key={pa.id} value={pa.id}>
                              {pa.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>
                )}

              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={newSession.notes}
                  onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                  placeholder="Add any notes about this session..."
                />
              </div>
              <Button onClick={handleCreateSession}>Create Session</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions (En Route) */}
      {activeSessions.length > 0 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="bg-green-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Active Sessions (En Route)
              </CardTitle>
              <span className="px-3 py-1 bg-green-700 rounded-full text-sm font-medium">
                {activeSessions.length} Active
              </span>
            </div>
          </CardHeader>
          <CardContent>
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
                            <span>{formatDate(session.session_date)} - {session.session_type}</span>
                            <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                              En Route
                            </span>
                          </CardTitle>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            {session.driver_name && (
                              <span>Driver: {session.driver_name}</span>
                            )}
                            {session.passenger_assistant_name && (
                              <span>PA: {session.passenger_assistant_name}</span>
                            )}
                            {session.started_at && (
                              <span className="text-green-700 font-medium">
                                Started: {formatDateTime(session.started_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleEndSession(session.session_id)}
                        >
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
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-white rounded border border-green-200">
                        <div className="text-2xl font-bold text-gray-900">{session.total_passengers}</div>
                        <div className="text-sm text-gray-600">Total Passengers</div>
                      </div>
                      <div className="text-center p-3 bg-green-100 rounded border border-green-200">
                        <div className="text-2xl font-bold text-green-700">{session.present_count}</div>
                        <div className="text-sm text-gray-600">Present</div>
                      </div>
                      <div className="text-center p-3 bg-red-100 rounded border border-red-200">
                        <div className="text-2xl font-bold text-red-700">{session.absent_count}</div>
                        <div className="text-sm text-gray-600">Absent</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-100 rounded border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-700">{session.late_count + session.excused_count}</div>
                        <div className="text-sm text-gray-600">Late/Excused</div>
                      </div>
                    </div>
                    
                    {session.notes && (
                      <div className="mb-4 p-3 bg-white rounded border border-green-200 text-sm">
                        <strong>Notes:</strong> {session.notes}
                      </div>
                    )}

                    {/* Documents and Incidents for Active Sessions */}
                    {(sessionDocuments[session.session_id]?.length > 0 || sessionIncidents[session.session_id]?.length > 0) && (
                      <div className="mt-4 border-t border-green-300 pt-4 space-y-4">
                        {/* Documents */}
                        {sessionDocuments[session.session_id]?.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center text-sm">
                              <FileText className="mr-2 h-4 w-4" />
                              Documents ({sessionDocuments[session.session_id].length})
                            </h4>
                            <div className="space-y-2">
                              {sessionDocuments[session.session_id].map((doc: any) => {
                                let fileUrls: string[] = []
                                try {
                                  const parsed = JSON.parse(doc.file_url)
                                  fileUrls = Array.isArray(parsed) ? parsed : [doc.file_url]
                                } catch {
                                  fileUrls = [doc.file_url]
                                }
                                return (
                                  <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded text-sm border border-green-200">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="h-4 w-4 text-gray-500" />
                                      <span className="font-medium">{doc.doc_type}</span>
                                      <span className="text-gray-500">- {doc.file_name}</span>
                                      {fileUrls.length > 1 && (
                                        <span className="text-xs text-gray-400">({fileUrls.length} files)</span>
                                      )}
                                    </div>
                                    <div className="flex space-x-1">
                                      {fileUrls.map((url, idx) => (
                                        <a
                                          key={idx}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 text-blue-600 hover:text-blue-800"
                                          title="View file"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Incidents */}
                        {sessionIncidents[session.session_id]?.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold flex items-center text-sm">
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Incidents ({sessionIncidents[session.session_id].length})
                              </h4>
                              <Link href={`/dashboard/incidents?route_session_id=${session.session_id}`}>
                                <Button variant="ghost" size="sm" className="text-xs">
                                  View All
                                </Button>
                              </Link>
                            </div>
                            <div className="space-y-2">
                              {sessionIncidents[session.session_id].map((incident: any) => (
                                <div key={incident.id} className="flex items-start justify-between p-2 bg-red-50 rounded text-sm border border-red-200 hover:bg-red-100 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 flex-wrap">
                                      <span className="font-medium">{incident.incident_type || 'Incident'}</span>
                                      {incident.reference_number && (
                                        <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded font-medium">
                                          {incident.reference_number}
                                        </span>
                                      )}
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        incident.resolved 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {incident.resolved ? 'Resolved' : 'Open'}
                                      </span>
                                    </div>
                                    {incident.description && (
                                      <p className="text-gray-600 mt-1 text-xs line-clamp-2">{incident.description}</p>
                                    )}
                                    <p className="text-gray-500 mt-1 text-xs">
                                      Reported: {formatDateTime(incident.reported_at)}
                                    </p>
                                  </div>
                                  <Link href={`/dashboard/incidents/${incident.id}`}>
                                    <Button variant="ghost" size="sm" className="ml-2">
                                      View Details
                                    </Button>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
          </CardContent>
        </Card>
      )}

      {/* Completed Sessions History */}
      <Card>
        <CardHeader className="bg-blue-900 text-white">
          <CardTitle className="text-white">Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-4">Loading sessions...</p>
          ) : completedSessions.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No completed sessions recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {completedSessions.map((session) => {
                const isCompleted = session.ended_at !== null
                return (
                  <Card key={session.session_id} className={`border-l-4 ${isCompleted ? 'border-l-gray-400' : 'border-l-blue-600'}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-lg flex items-center space-x-2 flex-wrap">
                              <span>{formatDate(session.session_date)} - {session.session_type}</span>
                              {isCompleted && (
                                <span className="px-2 py-1 bg-gray-600 text-white text-xs font-medium rounded-full">
                                  Completed
                                </span>
                              )}
                              {!session.started_at && !session.ended_at && (
                                <span className="px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded-full">
                                  Not Started
                                </span>
                              )}
                              {sessionIncidents[session.session_id]?.length > 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center">
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  {sessionIncidents[session.session_id].length} Incident{sessionIncidents[session.session_id].length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {sessionDocuments[session.session_id]?.length > 0 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center">
                                  <FileText className="mr-1 h-3 w-3" />
                                  {sessionDocuments[session.session_id].length} Document{sessionDocuments[session.session_id].length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </CardTitle>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                              {session.driver_name && (
                                <span>Driver: {session.driver_name}</span>
                              )}
                              {session.passenger_assistant_name && (
                                <span>PA: {session.passenger_assistant_name}</span>
                              )}
                              {session.started_at && (
                                <span>Started: {formatDateTime(session.started_at)}</span>
                              )}
                              {session.ended_at && (
                                <span className="text-gray-700 font-medium">
                                  Ended: {formatDateTime(session.ended_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSession(selectedSession === session.session_id ? null : session.session_id)}
                        >
                          {selectedSession === session.session_id ? 'Hide' : 'View Details'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-2xl font-bold text-gray-900">{session.total_passengers}</div>
                          <div className="text-sm text-gray-600">Total Passengers</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded">
                          <div className="text-2xl font-bold text-green-700">{session.present_count}</div>
                          <div className="text-sm text-gray-600">Present</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded">
                          <div className="text-2xl font-bold text-red-700">{session.absent_count}</div>
                          <div className="text-sm text-gray-600">Absent</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded">
                          <div className="text-2xl font-bold text-yellow-700">{session.late_count + session.excused_count}</div>
                          <div className="text-sm text-gray-600">Late/Excused</div>
                        </div>
                      </div>
                      
                      {session.notes && (
                        <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
                          <strong>Notes:</strong> {session.notes}
                        </div>
                      )}

                      {/* Documents and Incidents for Completed Sessions */}
                      <div className="mt-4 border-t pt-4 space-y-4">
                        {/* Documents */}
                        {sessionDocuments[session.session_id]?.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center text-sm">
                              <FileText className="mr-2 h-4 w-4" />
                              Documents ({sessionDocuments[session.session_id].length})
                            </h4>
                            <div className="space-y-2">
                              {sessionDocuments[session.session_id].map((doc: any) => {
                                let fileUrls: string[] = []
                                try {
                                  const parsed = JSON.parse(doc.file_url)
                                  fileUrls = Array.isArray(parsed) ? parsed : [doc.file_url]
                                } catch {
                                  fileUrls = [doc.file_url]
                                }
                                return (
                                  <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border border-gray-200">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="h-4 w-4 text-gray-500" />
                                      <span className="font-medium">{doc.doc_type}</span>
                                      <span className="text-gray-500">- {doc.file_name}</span>
                                      {fileUrls.length > 1 && (
                                        <span className="text-xs text-gray-400">({fileUrls.length} files)</span>
                                      )}
                                    </div>
                                    <div className="flex space-x-1">
                                      {fileUrls.map((url, idx) => (
                                        <a
                                          key={idx}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 text-blue-600 hover:text-blue-800"
                                          title="View file"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Incidents - Always show section for completed sessions */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold flex items-center text-sm">
                              <AlertCircle className="mr-2 h-4 w-4" />
                              Incidents ({sessionIncidents[session.session_id]?.length || 0})
                            </h4>
                            {sessionIncidents[session.session_id]?.length > 0 && (
                              <Link href={`/dashboard/incidents?route_session_id=${session.session_id}`}>
                                <Button variant="ghost" size="sm" className="text-xs">
                                  View All
                                </Button>
                              </Link>
                            )}
                          </div>
                          {sessionIncidents[session.session_id]?.length > 0 ? (
                            <div className="space-y-2">
                              {sessionIncidents[session.session_id].map((incident: any) => (
                                <div key={incident.id} className="flex items-start justify-between p-2 bg-red-50 rounded text-sm border border-red-200 hover:bg-red-100 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 flex-wrap">
                                      <span className="font-medium">{incident.incident_type || 'Incident'}</span>
                                      {incident.reference_number && (
                                        <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded font-medium">
                                          {incident.reference_number}
                                        </span>
                                      )}
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        incident.resolved 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {incident.resolved ? 'Resolved' : 'Open'}
                                      </span>
                                    </div>
                                    {incident.description && (
                                      <p className="text-gray-600 mt-1 text-xs line-clamp-2">{incident.description}</p>
                                    )}
                                    <p className="text-gray-500 mt-1 text-xs">
                                      Reported: {formatDateTime(incident.reported_at)}
                                    </p>
                                  </div>
                                  <Link href={`/dashboard/incidents/${incident.id}`}>
                                    <Button variant="ghost" size="sm" className="ml-2">
                                      View Details
                                    </Button>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic py-2">No incidents reported for this session.</p>
                          )}
                        </div>
                      </div>

                      {selectedSession === session.session_id && (
                        <div className="mt-4 border-t pt-4">
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
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
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
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

