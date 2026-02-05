'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
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

  useEffect(() => {
    const sessionId = searchParams.get('route_session_id')
    if (sessionId) {
      setFormData(prev => ({ ...prev, route_session_id: sessionId }))
      loadRouteSessions()
    }
  }, [searchParams])

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
      setFormData(prev => ({
        ...prev,
        route_id: data.route_id.toString(),
      }))

      const newEmployees = [...selectedEmployees]
      if (data.driver_id && !newEmployees.includes(data.driver_id)) {
        newEmployees.push(data.driver_id)
      }
      if (data.passenger_assistant_id && !newEmployees.includes(data.passenger_assistant_id)) {
        newEmployees.push(data.passenger_assistant_id)
      }
      setSelectedEmployees(newEmployees)

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
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        throw new Error('You must be logged in to create an incident')
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.email)
        .maybeSingle()

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

      if (formData.route_session_id) {
        await supabase
          .from('incidents')
          .update({ route_session_id: parseInt(formData.route_session_id) })
          .eq('id', incidentId)
      }

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
    <div className="space-y-3">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/incidents">
          <Button variant="outline" size="sm" className="h-9 px-3 gap-2 text-slate-600 border-slate-300 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Report New Incident</h1>
          <p className="text-sm text-slate-500">Fill in the details and select involved parties</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {formData.route_session_id && (
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-2.5 text-sm text-violet-800">
          <strong>Route session pre-selected.</strong> Route, vehicle and crew will be auto-filled.
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Incident Details Section */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-700">Incident Details</h2>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {/* Row 1: Type + Route Session */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="incident_type" className="text-xs font-medium text-slate-600">Incident Type *</Label>
                <Select
                  id="incident_type"
                  required
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  className="h-9"
                >
                  <option value="">Select type</option>
                  <option value="Accident">Accident</option>
                  <option value="Breakdown">Breakdown</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Safety Issue">Safety Issue</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="route_session_id" className="text-xs font-medium text-slate-600">
                    <Calendar className="inline mr-1 h-3 w-3" />
                    Route Session
                  </Label>
                  {routeSessions.length === 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={loadRouteSessions} disabled={loadingSessions} className="h-6 text-xs px-2">
                      {loadingSessions ? 'Loading...' : 'Load Sessions'}
                    </Button>
                  )}
                </div>
                <Select
                  id="route_session_id"
                  value={formData.route_session_id}
                  onChange={(e) => setFormData({ ...formData, route_session_id: e.target.value })}
                  className="h-9"
                >
                  <option value="">Select session (optional)</option>
                  {routeSessions.map((session) => (
                    <option key={session.id} value={session.id}>{session.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Row 2: Vehicle + Route */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="vehicle_id" className="text-xs font-medium text-slate-600">
                  Vehicle {formData.route_session_id && <span className="text-slate-400">(Auto-filled)</span>}
                </Label>
                <Select id="vehicle_id" value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })} className="h-9">
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_identifier || `Vehicle ${vehicle.id}`}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="route_id" className="text-xs font-medium text-slate-600">
                  Related Route {formData.route_session_id && <span className="text-slate-400">(Auto-filled)</span>}
                </Label>
                <Select id="route_id" value={formData.route_id} onChange={(e) => setFormData({ ...formData, route_id: e.target.value })} className="h-9">
                  <option value="">Select route</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.route_number || `Route ${route.id}`}</option>)}
                </Select>
              </div>
            </div>

            {/* Row 3: Description */}
            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs font-medium text-slate-600">Description *</Label>
              <textarea
                id="description"
                required
                rows={3}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#023E8A] focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the incident..."
              />
            </div>

            {/* Row 4: Resolved checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="resolved"
                checked={formData.resolved}
                onChange={(e) => setFormData({ ...formData, resolved: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#023E8A] focus:ring-[#023E8A]"
              />
              <Label htmlFor="resolved" className="text-sm text-slate-600">Mark as Resolved</Label>
            </div>
          </div>
        </div>

        {/* Related Employees Section */}
        <div className="border-t border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center">
            <UserCog className="mr-2 h-4 w-4" />
            Related Employees ({selectedEmployees.length} selected)
          </h2>
        </div>
        <div className="p-4">
          {employees.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No employees available</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4 max-h-48 overflow-y-auto">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${selectedEmployees.includes(employee.id)
                    ? 'border-[#023E8A] bg-blue-50'
                    : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  onClick={() => toggleEmployee(employee.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#023E8A] focus:ring-[#023E8A]"
                  />
                  <span className="ml-2 text-sm text-slate-700 truncate">{employee.full_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Passengers Section */}
        <div className="border-t border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Related Passengers ({selectedPassengers.length} selected)
          </h2>
        </div>
        <div className="p-4">
          {passengers.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No passengers available</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4 max-h-48 overflow-y-auto">
              {passengers.map((passenger: any) => (
                <div
                  key={passenger.id}
                  className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${selectedPassengers.includes(passenger.id)
                    ? 'border-[#023E8A] bg-blue-50'
                    : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  onClick={() => togglePassenger(passenger.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedPassengers.includes(passenger.id)}
                    onChange={() => togglePassenger(passenger.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#023E8A] focus:ring-[#023E8A]"
                  />
                  <div className="ml-2 flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{passenger.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{passenger.schools?.name || 'No school'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
        <Link href="/dashboard/incidents">
          <Button variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-50">
            Cancel
          </Button>
        </Link>
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#023E8A] hover:bg-[#023E8A]/90 text-white">
          {loading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </div>
    </div>
  )
}
