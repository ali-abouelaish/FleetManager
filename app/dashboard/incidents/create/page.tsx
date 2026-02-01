'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Users, UserCog, AlertCircle, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function CreateIncidentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [passengers, setPassengers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])

  const [formData, setFormData] = useState({
    vehicle_id: '',
    route_id: '',
    route_session_id: '',
    incident_type: '',
    description: '',
    resolved: false,
  })

  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])
  const [selectedPassengers, setSelectedPassengers] = useState<number[]>([])
  const [routeSessions, setRouteSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const toggleEmployee = (employeeId: number) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const togglePassenger = (passengerId: number) => {
    setSelectedPassengers(prev =>
      prev.includes(passengerId)
        ? prev.filter(id => id !== passengerId)
        : [...prev, passengerId]
    )
  }

  useEffect(() => {
    async function loadData() {
      const [employeesResult, passengersResult, vehiclesResult, routesResult] = await Promise.all([
        supabase.from('employees').select('id, full_name').order('full_name'),
        supabase.from('passengers').select('id, full_name, schools(name)').order('full_name'),
        supabase.from('vehicles').select('id, vehicle_identifier').order('vehicle_identifier'),
        supabase.from('routes').select('id, route_number').order('route_number')
      ])

      if (employeesResult.data) setEmployees(employeesResult.data)
      if (passengersResult.data) setPassengers(passengersResult.data)
      if (vehiclesResult.data) setVehicles(vehiclesResult.data)
      if (routesResult.data) setRoutes(routesResult.data)
    }

    loadData()
  }, [supabase])

  // Pre-fill route_session_id from URL when present and load sessions list
  useEffect(() => {
    const sessionId = searchParams.get('route_session_id')
    if (sessionId) {
      setFormData(prev => ({ ...prev, route_session_id: sessionId }))
      loadRouteSessions()
    }
  }, [searchParams])

  // Load route session details when route_session_id changes (auto-fill route, vehicle, crew)
  useEffect(() => {
    if (formData.route_session_id) {
      loadRouteSessionDetails(parseInt(formData.route_session_id))
    }
  }, [formData.route_session_id])

  const loadRouteSessions = async () => {
    setLoadingSessions(true)
    const { data, error } = await supabase
      .from('route_sessions')
      .select(`
        id,
        session_date,
        session_type,
        route_id,
        driver_id,
        passenger_assistant_id,
        routes(route_number)
      `)
      .order('session_date', { ascending: false })
      .order('session_type', { ascending: true })
      .limit(100)

    if (!error && data) {
      setRouteSessions(data.map((s: any) => ({
        id: s.id,
        label: `${formatDate(s.session_date)} - ${s.session_type} (${s.routes?.route_number || `Route ${s.route_id}`})`,
        route_id: s.route_id,
        driver_id: s.driver_id,
        passenger_assistant_id: s.passenger_assistant_id,
      })))
    }
    setLoadingSessions(false)
  }

  const loadRouteSessionDetails = async (sessionId: number) => {
    const { data, error } = await supabase
      .from('route_sessions')
      .select(`
        id,
        route_id,
        driver_id,
        passenger_assistant_id,
        routes(route_number)
      `)
      .eq('id', sessionId)
      .single()

    if (!error && data) {
      // Auto-populate route_id
      setFormData(prev => ({
        ...prev,
        route_id: data.route_id.toString(),
      }))

      // Auto-populate driver and PA in selected employees
      const newEmployees = [...selectedEmployees]
      if (data.driver_id && !newEmployees.includes(data.driver_id)) {
        newEmployees.push(data.driver_id)
      }
      if (data.passenger_assistant_id && !newEmployees.includes(data.passenger_assistant_id)) {
        newEmployees.push(data.passenger_assistant_id)
      }
      setSelectedEmployees(newEmployees)

      // Get vehicle from vehicle_assignments for the driver
      if (data.driver_id) {
        const { data: vehicleData } = await supabase
          .from('vehicle_assignments')
          .select('vehicle_id')
          .eq('employee_id', data.driver_id)
          .maybeSingle()

        if (vehicleData?.vehicle_id) {
          setFormData(prev => ({
            ...prev,
            vehicle_id: vehicleData.vehicle_id.toString(),
          }))
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('You must be logged in to create an incident')
      }

      // Get user ID from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.email)
        .maybeSingle()

      // Step 1: Create the incident with created_by
      const incidentDataToInsert = {
        ...formData,
        created_by: userData?.id || null,
      }

      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .insert([incidentDataToInsert])
        .select()
        .single()

      if (incidentError) throw incidentError

      const incidentId = incidentData.id

      // If route_session_id is set, update the incident with it
      if (formData.route_session_id) {
        await supabase
          .from('incidents')
          .update({ route_session_id: parseInt(formData.route_session_id) })
          .eq('id', incidentId)
      }

      // Step 2: Link selected employees
      if (selectedEmployees.length > 0) {
        const employeeLinks = selectedEmployees.map(employeeId => ({
          incident_id: incidentId,
          employee_id: employeeId,
        }))

        const { error: employeesError } = await supabase
          .from('incident_employees')
          .insert(employeeLinks)

        if (employeesError) {
          console.error('Error linking employees:', employeesError)
        }
      }

      // Step 3: Link selected passengers
      if (selectedPassengers.length > 0) {
        const passengerLinks = selectedPassengers.map(passengerId => ({
          incident_id: incidentId,
          passenger_id: passengerId,
        }))

        const { error: passengersError } = await supabase
          .from('incident_passengers')
          .insert(passengerLinks)

        if (passengersError) {
          console.error('Error linking passengers:', passengersError)
        }
      }

      // Step 4: Audit log
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'incidents',
          record_id: incidentId,
          action: 'CREATE',
        }),
      })

      router.push('/dashboard/incidents')
      router.refresh()
    } catch (error: any) {
      console.error('Error creating incident:', error)
      setError(error.message || 'An error occurred while creating the incident')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/incidents">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-navy">Report New Incident</h1>
          <p className="mt-2 text-sm text-gray-600">Fill in the details and select involved parties</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-navy text-white"><CardTitle>Incident Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="rounded-md bg-red-50 p-4"><div className="text-sm text-red-800">{error}</div></div>}
            {formData.route_session_id && (
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
                <strong>Route session pre-selected.</strong> Route, vehicle and crew will be auto-filled. After creating the incident, open it to complete TR5, TR6 or TR7 forms.
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incident_type">Incident Type *</Label>
                <Select id="incident_type" required value={formData.incident_type} onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}>
                  <option value="">Select type</option>
                  <option value="Accident">Accident</option>
                  <option value="Breakdown">Breakdown</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Safety Issue">Safety Issue</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="route_session_id">
                    <Calendar className="inline mr-2 h-4 w-4" />
                    Route Session (Optional - Auto-fills route, vehicle, and crew)
                  </Label>
                  {routeSessions.length === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={loadRouteSessions}
                      disabled={loadingSessions}
                    >
                      {loadingSessions ? 'Loading...' : 'Load Sessions'}
                    </Button>
                  )}
                </div>
                <Select 
                  id="route_session_id" 
                  value={formData.route_session_id} 
                  onChange={(e) => setFormData({ ...formData, route_session_id: e.target.value })}
                >
                  <option value="">Select route session (optional)</option>
                  {routeSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecting a route session will automatically populate the route, vehicle, and crew members
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">Vehicle {formData.route_session_id && <span className="text-xs text-gray-500">(Auto-filled from session)</span>}</Label>
                <Select id="vehicle_id" value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_identifier || `Vehicle ${vehicle.id}`}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="route_id">Related Route {formData.route_session_id && <span className="text-xs text-gray-500">(Auto-filled from session)</span>}</Label>
                <Select id="route_id" value={formData.route_id} onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}>
                  <option value="">Select route</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.route_number || `Route ${route.id}`}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea id="description" required rows={5} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="resolved" checked={formData.resolved} onChange={(e) => setFormData({ ...formData, resolved: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy" />
              <Label htmlFor="resolved">Mark as Resolved</Label>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Related Employees Section */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle className="flex items-center">
            <UserCog className="mr-2 h-5 w-5" />
            Related Employees ({selectedEmployees.length} selected)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2 mb-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Select all employees involved in or related to this incident (drivers, assistants, staff).
              </p>
            </div>
          </div>

          {employees.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No employees available</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEmployees.includes(employee.id)
                      ? 'border-navy bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleEmployee(employee.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {employee.full_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Passengers Section */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Related Passengers ({selectedPassengers.length} selected)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2 mb-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Select all passengers involved in or affected by this incident.
              </p>
            </div>
          </div>

          {passengers.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No passengers available</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
              {passengers.map((passenger: any) => (
                <div
                  key={passenger.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPassengers.includes(passenger.id)
                      ? 'border-navy bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => togglePassenger(passenger.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPassengers.includes(passenger.id)}
                    onChange={() => togglePassenger(passenger.id)}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {passenger.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {passenger.schools?.name || 'No school assigned'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end space-x-4">
            <Link href="/dashboard/incidents">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

