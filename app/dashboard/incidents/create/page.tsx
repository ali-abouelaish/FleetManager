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

export default function CreateIncidentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])

  const [formData, setFormData] = useState({
    employee_id: '',
    vehicle_id: '',
    route_id: '',
    incident_type: '',
    description: '',
    resolved: false,
  })

  useEffect(() => {
    async function loadData() {
      const [employeesResult, vehiclesResult, routesResult] = await Promise.all([
        supabase.from('employees').select('id, full_name').order('full_name'),
        supabase.from('vehicles').select('id, vehicle_identifier').order('vehicle_identifier'),
        supabase.from('routes').select('id, route_number').order('route_number')
      ])

      if (employeesResult.data) setEmployees(employeesResult.data)
      if (vehiclesResult.data) setVehicles(vehiclesResult.data)
      if (routesResult.data) setRoutes(routesResult.data)
    }

    loadData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.from('incidents').insert([formData]).select()
      if (error) throw error

      if (data && data[0]) {
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table_name: 'incidents', record_id: data[0].id, action: 'CREATE' }),
        })
      }

      router.push('/dashboard/incidents')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
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
          <h1 className="text-3xl font-bold text-gray-900">Report New Incident</h1>
          <p className="mt-2 text-sm text-gray-600">Fill in the details of the incident</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Incident Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="rounded-md bg-red-50 p-4"><div className="text-sm text-red-800">{error}</div></div>}

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
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee</Label>
                <Select id="employee_id" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}>
                  <option value="">Select employee</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">Vehicle</Label>
                <Select id="vehicle_id" value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_identifier || `Vehicle ${vehicle.id}`}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="route_id">Route</Label>
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
              <input type="checkbox" id="resolved" checked={formData.resolved} onChange={(e) => setFormData({ ...formData, resolved: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <Label htmlFor="resolved">Mark as Resolved</Label>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/incidents"><Button type="button" variant="secondary">Cancel</Button></Link>
              <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Report'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

