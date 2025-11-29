'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default function EditIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [incident, setIncident] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [passengers, setPassengers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [routeSessions, setRouteSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

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

  useEffect(() => {
    async function loadData() {
      const { id } = await params
      
      // Check permissions first
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setUnauthorized(true)
        setCheckingPermissions(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', authUser.email)
        .maybeSingle()

      if (!userData) {
        setUnauthorized(true)
        setCheckingPermissions(false)
        return
      }

      // Load incident
      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single()

      if (incidentError || !incidentData) {
        setError('Incident not found')
        setCheckingPermissions(false)
        return
      }

      // Check if user is the creator
      if (incidentData.created_by !== userData.id) {
        setUnauthorized(true)
        setCheckingPermissions(false)
        return
      }

      setIncident(incidentData)
      setFormData({
        vehicle_id: incidentData.vehicle_id?.toString() || '',
        route_id: incidentData.route_id?.toString() || '',
        route_session_id: incidentData.route_session_id?.toString() || '',
        incident_type: incidentData.incident_type || '',
        description: incidentData.description || '',
        resolved: incidentData.resolved || false,
      })

      // Load related data
      const [employeesResult, passengersResult, vehiclesResult, routesResult, employeesLinks, passengersLinks] = await Promise.all([
        supabase.from('employees').select('id, full_name').order('full_name'),
        supabase.from('passengers').select('id, full_name').order('full_name'),
        supabase.from('vehicles').select('id, vehicle_identifier, make, model').order('vehicle_identifier'),
        supabase.from('routes').select('id, route_number').order('route_number'),
        supabase.from('incident_employees').select('employee_id').eq('incident_id', id),
        supabase.from('incident_passengers').select('passenger_id').eq('incident_id', id),
      ])

      if (employeesResult.data) setEmployees(employeesResult.data)
      if (passengersResult.data) setPassengers(passengersResult.data)
      if (vehiclesResult.data) setVehicles(vehiclesResult.data)
      if (routesResult.data) setRoutes(routesResult.data)
      if (employeesLinks.data) setSelectedEmployees(employeesLinks.data.map((e: any) => e.employee_id))
      if (passengersLinks.data) setSelectedPassengers(passengersLinks.data.map((p: any) => p.passenger_id))

      setCheckingPermissions(false)
    }

    loadData()
  }, [params, supabase])

  const loadRouteSessions = async (routeId: number) => {
    setLoadingSessions(true)
    const { data } = await supabase
      .from('route_sessions')
      .select(`
        id,
        session_date,
        session_type,
        routes(route_number)
      `)
      .eq('route_id', routeId)
      .order('session_date', { ascending: false })
      .order('session_type', { ascending: true })

    if (data) {
      setRouteSessions(data.map((s: any) => ({
        id: s.id,
        session_date: s.session_date,
        session_type: s.session_type,
        route_name: s.routes?.route_number || null,
      })))
    }
    setLoadingSessions(false)
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { id } = await params
      
      // Update the incident
      const { error: updateError } = await supabase
        .from('incidents')
        .update({
          vehicle_id: formData.vehicle_id ? parseInt(formData.vehicle_id) : null,
          route_id: formData.route_id ? parseInt(formData.route_id) : null,
          route_session_id: formData.route_session_id ? parseInt(formData.route_session_id) : null,
          incident_type: formData.incident_type,
          description: formData.description,
          resolved: formData.resolved,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Update employee links
      await supabase.from('incident_employees').delete().eq('incident_id', id)
      if (selectedEmployees.length > 0) {
        const employeeLinks = selectedEmployees.map(employeeId => ({
          incident_id: parseInt(id),
          employee_id: employeeId,
        }))
        await supabase.from('incident_employees').insert(employeeLinks)
      }

      // Update passenger links
      await supabase.from('incident_passengers').delete().eq('incident_id', id)
      if (selectedPassengers.length > 0) {
        const passengerLinks = selectedPassengers.map(passengerId => ({
          incident_id: parseInt(id),
          passenger_id: passengerId,
        }))
        await supabase.from('incident_passengers').insert(passengerLinks)
      }

      router.push(`/dashboard/incidents/${id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checkingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/incidents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-gray-600">You can only edit incidents that you created.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Incident not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/incidents/${incident.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-navy">Edit Incident #{incident.id}</h1>
          <p className="mt-2 text-sm text-gray-600">Update incident information</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle>Incident Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incident_type">Incident Type *</Label>
                <Input
                  id="incident_type"
                  required
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolved">Status</Label>
                <Select
                  id="resolved"
                  value={formData.resolved ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, resolved: e.target.value === 'true' })}
                >
                  <option value="false">Open</option>
                  <option value="true">Resolved</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                required
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">Vehicle</Label>
                <Select
                  id="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_identifier || `${vehicle.make} ${vehicle.model}`}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="route_id">Route</Label>
                <Select
                  id="route_id"
                  value={formData.route_id}
                  onChange={(e) => {
                    setFormData({ ...formData, route_id: e.target.value, route_session_id: '' })
                    if (e.target.value) {
                      loadRouteSessions(parseInt(e.target.value))
                    } else {
                      setRouteSessions([])
                    }
                  }}
                >
                  <option value="">Select a route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.route_number || `Route ${route.id}`}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {formData.route_id && (
              <div className="space-y-2">
                <Label htmlFor="route_session_id">Route Session</Label>
                <Select
                  id="route_session_id"
                  value={formData.route_session_id}
                  onChange={(e) => setFormData({ ...formData, route_session_id: e.target.value })}
                  disabled={loadingSessions}
                >
                  <option value="">Select a session (optional)</option>
                  {routeSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.route_name} - {session.session_date} ({session.session_type})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Related Employees</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-4">
                {employees.length === 0 ? (
                  <p className="text-sm text-gray-500">No employees available</p>
                ) : (
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <label key={employee.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => toggleEmployee(employee.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{employee.full_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Related Passengers</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-4">
                {passengers.length === 0 ? (
                  <p className="text-sm text-gray-500">No passengers available</p>
                ) : (
                  <div className="space-y-2">
                    {passengers.map((passenger) => (
                      <label key={passenger.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPassengers.includes(passenger.id)}
                          onChange={() => togglePassenger(passenger.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{passenger.full_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/dashboard/incidents/${incident.id}`}>
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

