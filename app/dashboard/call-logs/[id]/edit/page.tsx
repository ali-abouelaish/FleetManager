'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
function EditCallLogPageClient({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passengers, setPassengers] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [assistants, setAssistants] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])

  const [formData, setFormData] = useState({
    call_date: '',
    caller_name: '',
    caller_phone: '',
    caller_type: 'Parent',
    call_type: 'Inquiry',
    call_to_type: '',
    related_passenger_id: '',
    related_driver_id: '',
    related_assistant_id: '',
    related_employee_id: '',
    related_route_id: '',
    subject: '',
    notes: '',
    action_required: false,
    action_taken: '',
    follow_up_required: false,
    follow_up_date: '',
    priority: 'Medium',
    status: 'Open',
  })

  useEffect(() => {
    async function loadData() {
      const [callLogResult, passengersResult, employeesResult, driversResult, assistantsResult, routesResult] = await Promise.all([
        supabase.from('call_logs').select('*').eq('id', id).single(),
        supabase.from('passengers').select('id, full_name').order('full_name'),
        supabase.from('employees').select('id, full_name').order('full_name'),
        supabase.from('drivers').select('employee_id, employees(full_name)').order('employee_id'),
        supabase.from('passenger_assistants').select('employee_id, employees(full_name)').order('employee_id'),
        supabase.from('routes').select('id, route_number').order('route_number')
      ])

      if (callLogResult.error) {
        setError('Failed to load call log')
        return
      }

      if (callLogResult.data) {
        const data = callLogResult.data
        setFormData({
          call_date: data.call_date ? new Date(data.call_date).toISOString().slice(0, 16) : '',
          caller_name: data.caller_name || '',
          caller_phone: data.caller_phone || '',
          caller_type: data.caller_type || 'Parent',
          call_type: data.call_type || 'Inquiry',
          call_to_type: data.call_to_type || '',
          related_passenger_id: data.related_passenger_id ? String(data.related_passenger_id) : '',
          related_driver_id: data.related_driver_id ? String(data.related_driver_id) : '',
          related_assistant_id: data.related_assistant_id ? String(data.related_assistant_id) : '',
          related_employee_id: data.related_employee_id ? String(data.related_employee_id) : '',
          related_route_id: data.related_route_id ? String(data.related_route_id) : '',
          subject: data.subject || '',
          notes: data.notes || '',
          action_required: data.action_required || false,
          action_taken: data.action_taken || '',
          follow_up_required: data.follow_up_required || false,
          follow_up_date: data.follow_up_date || '',
          priority: data.priority || 'Medium',
          status: data.status || 'Open',
        })
      }

      if (passengersResult.data) setPassengers(passengersResult.data)
      if (employeesResult.data) setEmployees(employeesResult.data)
      if (routesResult.data) setRoutes(routesResult.data)
      
      // Process drivers data
      if (driversResult.data) {
        const driversList = driversResult.data.map((d: any) => ({
          employee_id: d.employee_id,
          full_name: d.employees?.full_name || 'Unknown'
        }))
        setDrivers(driversList)
      }
      
      // Process assistants data
      if (assistantsResult.data) {
        const assistantsList = assistantsResult.data.map((a: any) => ({
          employee_id: a.employee_id,
          full_name: a.employees?.full_name || 'Unknown'
        }))
        setAssistants(assistantsList)
      }
    }

    loadData()
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Convert empty strings to null for foreign key fields
      const cleanedData = {
        ...formData,
        related_passenger_id: formData.related_passenger_id === '' ? null : (formData.related_passenger_id ? parseInt(formData.related_passenger_id) : null),
        related_driver_id: formData.related_driver_id === '' ? null : (formData.related_driver_id ? parseInt(formData.related_driver_id) : null),
        related_assistant_id: formData.related_assistant_id === '' ? null : (formData.related_assistant_id ? parseInt(formData.related_assistant_id) : null),
        related_employee_id: formData.related_employee_id === '' ? null : (formData.related_employee_id ? parseInt(formData.related_employee_id) : null),
        related_route_id: formData.related_route_id === '' ? null : (formData.related_route_id ? parseInt(formData.related_route_id) : null),
        call_to_type: formData.call_to_type === '' ? null : formData.call_to_type,
        follow_up_date: formData.follow_up_date === '' ? null : formData.follow_up_date,
      }

      const { error } = await supabase.from('call_logs').update(cleanedData).eq('id', id)
      if (error) throw error

      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: 'call_logs', record_id: parseInt(id), action: 'UPDATE' }),
      })

      router.push(`/dashboard/call-logs/${id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this call log?')) return

    setDeleting(true)
    try {
      const { error } = await supabase.from('call_logs').delete().eq('id', id)
      if (error) throw error

      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: 'call_logs', record_id: parseInt(id), action: 'DELETE' }),
      })

      router.push('/dashboard/call-logs')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/call-logs/${id}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Call Log</h1>
            <p className="mt-2 text-sm text-gray-600">Update call log information</p>
          </div>
        </div>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="mr-2 h-4 w-4" />{deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Call Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="rounded-md bg-red-50 p-4"><div className="text-sm text-red-800">{error}</div></div>}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="call_date">Call Date/Time *</Label>
                <Input id="call_date" type="datetime-local" required value={formData.call_date} onChange={(e) => setFormData({ ...formData, call_date: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caller_name">Caller Name *</Label>
                <Input id="caller_name" required value={formData.caller_name} onChange={(e) => setFormData({ ...formData, caller_name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caller_phone">Caller Phone</Label>
                <Input id="caller_phone" type="tel" value={formData.caller_phone} onChange={(e) => setFormData({ ...formData, caller_phone: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caller_type">Caller Type</Label>
                <Select id="caller_type" value={formData.caller_type} onChange={(e) => setFormData({ ...formData, caller_type: e.target.value })}>
                  <option value="Parent">Parent</option>
                  <option value="School">School</option>
                  <option value="Employee">Employee</option>
                  <option value="Other">Other</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="call_to_type">Call To/From *</Label>
                <Select id="call_to_type" required value={formData.call_to_type} onChange={(e) => setFormData({ ...formData, call_to_type: e.target.value })}>
                  <option value="">Select...</option>
                  <option value="Staff">Staff</option>
                  <option value="Parent">Parent</option>
                  <option value="Admin">Admin</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="call_type">Call Type *</Label>
                <Select id="call_type" required value={formData.call_type} onChange={(e) => setFormData({ ...formData, call_type: e.target.value })}>
                  <option value="Inquiry">Inquiry</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Incident Report">Incident Report</option>
                  <option value="Schedule Change">Schedule Change</option>
                  <option value="Compliment">Compliment</option>
                  <option value="Other">Other</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select id="priority" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="related_passenger_id">Related Passenger</Label>
                <Select id="related_passenger_id" value={formData.related_passenger_id} onChange={(e) => setFormData({ ...formData, related_passenger_id: e.target.value })}>
                  <option value="">None</option>
                  {passengers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="related_driver_id">Related Driver</Label>
                <Select id="related_driver_id" value={formData.related_driver_id} onChange={(e) => setFormData({ ...formData, related_driver_id: e.target.value })}>
                  <option value="">None</option>
                  {drivers.map((d) => <option key={d.employee_id} value={d.employee_id}>{d.full_name}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="related_assistant_id">Related Assistant (PA)</Label>
                <Select id="related_assistant_id" value={formData.related_assistant_id} onChange={(e) => setFormData({ ...formData, related_assistant_id: e.target.value })}>
                  <option value="">None</option>
                  {assistants.map((a) => <option key={a.employee_id} value={a.employee_id}>{a.full_name}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="related_employee_id">Related Employee (Other)</Label>
                <Select id="related_employee_id" value={formData.related_employee_id} onChange={(e) => setFormData({ ...formData, related_employee_id: e.target.value })}>
                  <option value="">None</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="related_route_id">Related Route</Label>
                <Select id="related_route_id" value={formData.related_route_id} onChange={(e) => setFormData({ ...formData, related_route_id: e.target.value })}>
                  <option value="">None</option>
                  {routes.map((r) => <option key={r.id} value={r.id}>{r.route_number || `Route ${r.id}`}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="follow_up_date">Follow-up Date</Label>
                <Input id="follow_up_date" type="date" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Call Notes</Label>
              <textarea id="notes" rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action_taken">Action Taken</Label>
              <textarea id="action_taken" rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={formData.action_taken} onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })} />
            </div>

            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="action_required" checked={formData.action_required} onChange={(e) => setFormData({ ...formData, action_required: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <Label htmlFor="action_required">Action Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="follow_up_required" checked={formData.follow_up_required} onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <Label htmlFor="follow_up_required">Follow-up Required</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/dashboard/call-logs/${id}`}><Button type="button" variant="secondary">Cancel</Button></Link>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function EditCallLogPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditCallLogPageClient id={id} />
}


