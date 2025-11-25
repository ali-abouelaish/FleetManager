'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Clock, CheckCircle, XCircle, AlertCircle, Square, MapPin } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function StartSessionPage() {
  const params = useParams()
  const qrToken = params?.qrToken as string
  const [loading, setLoading] = useState(false)
  const [loadingActive, setLoadingActive] = useState(true)
  const [driverInfo, setDriverInfo] = useState<{
    name: string
    routeName: string | null
    driverId: number | null
    routeId: number | null
  } | null>(null)
  const [activeSessions, setActiveSessions] = useState<Array<{
    id: number
    session_date: string
    session_type: string
    started_at: string
    route_name: string | null
  }>>([])
  const [sessionResult, setSessionResult] = useState<{
    success: boolean
    message: string
    sessionId?: number
    routeName?: string
    sessionType?: string
    sessionDate?: string
  } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadDriverInfo()
  }, [qrToken])

  useEffect(() => {
    if (driverInfo?.driverId) {
      loadActiveSessions()
    }
  }, [driverInfo])

  const loadDriverInfo = async () => {
    if (!qrToken) return

    const { data, error } = await supabase
      .from('drivers')
      .select(`
        employee_id,
        employees(full_name),
        crew!inner(
          route_id,
          routes(route_number)
        )
      `)
      .eq('qr_token', qrToken)
      .single()

    if (!error && data) {
      const crew = Array.isArray(data.crew) ? data.crew[0] : data.crew
      setDriverInfo({
        name: data.employees?.full_name || 'Unknown Driver',
        routeName: crew?.routes?.route_number || null,
        driverId: data.employee_id,
        routeId: crew?.route_id || null,
      })
    }
    setLoadingActive(false)
  }

  const loadActiveSessions = async () => {
    if (!driverInfo?.driverId) return

    const { data, error } = await supabase
      .from('route_sessions')
      .select(`
        id,
        session_date,
        session_type,
        started_at,
        routes(route_number)
      `)
      .eq('driver_id', driverInfo.driverId)
      .is('ended_at', null)
      .not('started_at', 'is', null)
      .order('session_date', { ascending: false })
      .order('session_type', { ascending: true })

    if (!error && data) {
      setActiveSessions(data.map((s: any) => ({
        id: s.id,
        session_date: s.session_date,
        session_type: s.session_type,
        started_at: s.started_at,
        route_name: s.routes?.route_number || null,
      })))
    }
    setLoadingActive(false)
  }

  const handleEndSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to end this session?')) {
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('route_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)

    setLoading(false)

    if (!error) {
      await loadActiveSessions()
      setSessionResult({
        success: true,
        message: 'Session ended successfully',
      })
      setTimeout(() => setSessionResult(null), 3000)
    } else {
      setSessionResult({
        success: false,
        message: 'Error ending session: ' + error.message,
      })
    }
  }

  const handleStartSession = async (sessionType: 'AM' | 'PM') => {
    if (!qrToken) return

    setLoading(true)
    setSessionResult(null)

    const { data, error } = await supabase.rpc('start_route_session_from_qr', {
      p_qr_token: qrToken,
      p_session_type: sessionType,
    })

    setLoading(false)

    if (error) {
      setSessionResult({
        success: false,
        message: error.message || 'Failed to start session',
      })
      return
    }

    if (data) {
      const result = data as any
      if (result.success) {
        setSessionResult({
          success: true,
          message: result.message || 'Session started successfully',
          sessionId: result.session_id,
          routeName: result.route_name,
          sessionType: result.session_type,
          sessionDate: result.session_date,
        })
        // Reload active sessions to show the newly started session
        await loadActiveSessions()
      } else {
        setSessionResult({
          success: false,
          message: result.error || 'Failed to start session',
        })
      }
    }
  }

  if (!qrToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="bg-red-600 text-white">
            <CardTitle className="text-white">Invalid QR Code</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              The QR code is invalid or missing. Please scan a valid driver QR code.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-blue-900 text-white">
          <CardTitle className="text-white flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Start Route Session
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {driverInfo ? (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Driver</p>
                <p className="text-lg font-semibold text-gray-900">{driverInfo.name}</p>
                {driverInfo.routeName && (
                  <>
                    <p className="text-sm text-gray-600 mt-2">Assigned Route</p>
                    <p className="text-lg font-semibold text-blue-900">{driverInfo.routeName}</p>
                  </>
                )}
              </div>

              {/* Active Sessions */}
              {loadingActive ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading active sessions...</p>
                </div>
              ) : activeSessions.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-500">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-900">Active Sessions (En Route)</h3>
                    </div>
                    <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                      {activeSessions.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-3 bg-white rounded border border-green-300"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatDate(session.session_date)} - {session.session_type}
                            </p>
                            <p className="text-sm text-gray-600">
                              Route: {session.route_name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Started: {formatDateTime(session.started_at)}
                            </p>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleEndSession(session.id)}
                            disabled={loading}
                          >
                            <Square className="mr-2 h-4 w-4" />
                            End Session
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sessionResult ? (
                <div className={`p-4 rounded-lg ${
                  sessionResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    {sessionResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        sessionResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {sessionResult.message}
                      </p>
                      {sessionResult.success && sessionResult.routeName && (
                        <div className="mt-2 text-sm text-green-700">
                          <p>Route: {sessionResult.routeName}</p>
                          <p>Session: {sessionResult.sessionType} - {sessionResult.sessionDate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => setSessionResult(null)}
                  >
                    Start Another Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-gray-600 text-sm">
                    Select the session type to start:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleStartSession('AM')}
                      disabled={loading}
                      className="h-20 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Clock className="h-6 w-6" />
                      <span className="text-lg font-semibold">AM</span>
                      <span className="text-xs">Morning</span>
                    </Button>
                    
                    <Button
                      onClick={() => handleStartSession('PM')}
                      disabled={loading}
                      className="h-20 flex flex-col items-center justify-center space-y-2 bg-purple-600 hover:bg-purple-700"
                    >
                      <Clock className="h-6 w-6" />
                      <span className="text-lg font-semibold">PM</span>
                      <span className="text-xs">Afternoon</span>
                    </Button>
                  </div>

                  {loading && (
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
                      <p className="mt-2 text-sm text-gray-600">Starting session...</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
              <p className="mt-4 text-gray-600">Loading driver information...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

