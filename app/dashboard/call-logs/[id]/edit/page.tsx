'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { ConfirmDeleteCard } from '@/components/ui/ConfirmDeleteCard'
import { ArrowLeft, Trash2, AlertCircle, Phone, Users, FileText } from 'lucide-react'
import Link from 'next/link'

function EditCallLogPageClient({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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
          follow_up_date: data.follow_up_date
            ? (() => {
              const d = new Date(data.follow_up_date)
              if (isNaN(d.getTime())) return ''
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              const h = String(d.getHours()).padStart(2, '0')
              const min = String(d.getMinutes()).padStart(2, '0')
              return `${y}-${m}-${day}T${h}:${min}`
            })()
            : '',
          priority: data.priority || 'Medium',
          status: data.status || 'Open',
        })
      }

      if (passengersResult.data) setPassengers(passengersResult.data)
      if (employeesResult.data) setEmployees(employeesResult.data)
      if (routesResult.data) setRoutes(routesResult.data)
      if (driversResult.data) {
        setDrivers(driversResult.data.map((d: any) => ({
          employee_id: d.employee_id,
          full_name: d.employees?.full_name || 'Unknown'
        })))
      }
      if (assistantsResult.data) {
        setAssistants(assistantsResult.data.map((a: any) => ({
          employee_id: a.employee_id,
          full_name: a.employees?.full_name || 'Unknown'
        })))
      }
    }
    loadData()
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const cleanedData = {
        ...formData,
        related_passenger_id: formData.related_passenger_id === '' ? null : parseInt(formData.related_passenger_id),
        related_driver_id: formData.related_driver_id === '' ? null : parseInt(formData.related_driver_id),
        related_assistant_id: formData.related_assistant_id === '' ? null : parseInt(formData.related_assistant_id),
        related_employee_id: formData.related_employee_id === '' ? null : parseInt(formData.related_employee_id),
        related_route_id: formData.related_route_id === '' ? null : parseInt(formData.related_route_id),
        call_to_type: formData.call_to_type === '' ? null : formData.call_to_type,
        follow_up_date: formData.follow_up_date === '' ? null : formData.follow_up_date.replace('T', ' '),
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
    setDeleting(true)
    setError(null)
    try {
      const { error: deleteErr } = await supabase.from('call_logs').delete().eq('id', id)
      if (deleteErr) throw deleteErr

      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: 'call_logs', record_id: parseInt(id), action: 'DELETE' }),
      })

      router.push('/dashboard/call-logs')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      {showDeleteConfirm && (
        <ConfirmDeleteCard
          entityName={formData.subject ? `Call log: ${formData.subject}` : 'this call log'}
          items={[
            'The call log record',
            'All linked passenger, driver, and route references',
            'Subject, notes, and follow-up data',
          ]}
          confirmLabel="Yes, Delete Call Log"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setError(null)
          }}
          loading={deleting}
          error={error}
        />
      )}

      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/call-logs/${id}`}>
          <Button variant="outline" size="sm" className="h-9 px-3 gap-2 text-slate-600 border-slate-300 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Edit Call Log</h1>
          <p className="text-sm text-slate-500">Update call log information</p>
        </div>
      </div>

      {error && !showDeleteConfirm && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Caller Information Section */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center">
            <Phone className="mr-2 h-4 w-4" />
            Caller Information
          </h2>
        </div>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="call_date" className="text-xs font-medium text-slate-600">Date/Time *</Label>
              <Input id="call_date" type="datetime-local" required value={formData.call_date} onChange={(e) => setFormData({ ...formData, call_date: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="caller_name" className="text-xs font-medium text-slate-600">Caller Name *</Label>
              <Input id="caller_name" required value={formData.caller_name} onChange={(e) => setFormData({ ...formData, caller_name: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="caller_phone" className="text-xs font-medium text-slate-600">Phone</Label>
              <Input id="caller_phone" type="tel" value={formData.caller_phone} onChange={(e) => setFormData({ ...formData, caller_phone: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="caller_type" className="text-xs font-medium text-slate-600">Caller Type</Label>
              <Select id="caller_type" value={formData.caller_type} onChange={(e) => setFormData({ ...formData, caller_type: e.target.value })} className="h-9">
                <option value="Parent">Parent</option>
                <option value="School">School</option>
                <option value="Employee">Employee</option>
                <option value="Other">Other</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Call Details Section */}
        <div className="border-t border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Call Details
          </h2>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="call_to_type" className="text-xs font-medium text-slate-600">Call To/From *</Label>
                <Select id="call_to_type" required value={formData.call_to_type} onChange={(e) => setFormData({ ...formData, call_to_type: e.target.value })} className="h-9">
                  <option value="">Select...</option>
                  <option value="Staff">Staff</option>
                  <option value="Parent">Parent</option>
                  <option value="Admin">Admin</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="call_type" className="text-xs font-medium text-slate-600">Call Type *</Label>
                <Select id="call_type" required value={formData.call_type} onChange={(e) => setFormData({ ...formData, call_type: e.target.value })} className="h-9">
                  <option value="Inquiry">Inquiry</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Incident Report">Incident Report</option>
                  <option value="Schedule Change">Schedule Change</option>
                  <option value="Compliment">Compliment</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="priority" className="text-xs font-medium text-slate-600">Priority</Label>
                <Select id="priority" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="h-9">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="status" className="text-xs font-medium text-slate-600">Status</Label>
                <Select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="h-9">
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="subject" className="text-xs font-medium text-slate-600">Subject *</Label>
              <Input id="subject" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="h-9" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs font-medium text-slate-600">Call Notes</Label>
                <textarea id="notes" rows={2} className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#023E8A] focus:border-transparent" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="action_taken" className="text-xs font-medium text-slate-600">Action Taken</Label>
                <textarea id="action_taken" rows={2} className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#023E8A] focus:border-transparent" value={formData.action_taken} onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="action_required" checked={formData.action_required} onChange={(e) => setFormData({ ...formData, action_required: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#023E8A] focus:ring-[#023E8A]" />
                <Label htmlFor="action_required" className="text-sm text-slate-600">Action Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="follow_up_required" checked={formData.follow_up_required} onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#023E8A] focus:ring-[#023E8A]" />
                <Label htmlFor="follow_up_required" className="text-sm text-slate-600">Follow-up Required</Label>
              </div>
              {formData.follow_up_required && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="follow_up_date" className="text-xs text-slate-600">Follow-up Date:</Label>
                  <Input id="follow_up_date" type="datetime-local" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} className="h-8 w-48" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Entities Section */}
        <div className="border-t border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Related Entities
          </h2>
        </div>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="related_passenger_id" className="text-xs font-medium text-slate-600">Passenger</Label>
              <Select id="related_passenger_id" value={formData.related_passenger_id} onChange={(e) => setFormData({ ...formData, related_passenger_id: e.target.value })} className="h-9">
                <option value="">None</option>
                {passengers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="related_driver_id" className="text-xs font-medium text-slate-600">Driver</Label>
              <Select id="related_driver_id" value={formData.related_driver_id} onChange={(e) => setFormData({ ...formData, related_driver_id: e.target.value })} className="h-9">
                <option value="">None</option>
                {drivers.map((d) => <option key={d.employee_id} value={d.employee_id}>{d.full_name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="related_assistant_id" className="text-xs font-medium text-slate-600">Assistant (PA)</Label>
              <Select id="related_assistant_id" value={formData.related_assistant_id} onChange={(e) => setFormData({ ...formData, related_assistant_id: e.target.value })} className="h-9">
                <option value="">None</option>
                {assistants.map((a) => <option key={a.employee_id} value={a.employee_id}>{a.full_name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="related_employee_id" className="text-xs font-medium text-slate-600">Other Employee</Label>
              <Select id="related_employee_id" value={formData.related_employee_id} onChange={(e) => setFormData({ ...formData, related_employee_id: e.target.value })} className="h-9">
                <option value="">None</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="related_route_id" className="text-xs font-medium text-slate-600">Route</Label>
              <Select id="related_route_id" value={formData.related_route_id} onChange={(e) => setFormData({ ...formData, related_route_id: e.target.value })} className="h-9">
                <option value="">None</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.route_number || `Route ${r.id}`}</option>)}
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
        <Link href={`/dashboard/call-logs/${id}`}>
          <Button variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-50">
            Cancel
          </Button>
        </Link>
        <Button onClick={() => setShowDeleteConfirm(true)} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#023E8A] hover:bg-[#023E8A]/90 text-white">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
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
