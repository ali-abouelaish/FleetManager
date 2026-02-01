'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { ArrowLeft, Save, Plus, Clock } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface Notification {
  id: number
  certificate_name: string
  entity_type: string
  entity_id: number
  expiry_date: string
  days_until_expiry: number
  recipient?: { full_name: string }
}

interface CaseUpdate {
  id: number
  update_type: string
  notes: string | null
  created_at: string
}

interface CaseRow {
  id: number
  notification_id: number
  application_status: string
  date_applied: string | null
  appointment_date: string | null
  notifications: Notification | null
}

interface ComplianceCaseDetailClientProps {
  caseId: number
  initialCase: CaseRow | null
  initialUpdates: CaseUpdate[]
}

export function ComplianceCaseDetailClient({
  caseId,
  initialCase: initialCaseProp,
  initialUpdates: initialUpdatesProp,
}: ComplianceCaseDetailClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [caseRow, setCaseRow] = useState<CaseRow | null>(initialCaseProp)
  const [updates, setUpdates] = useState<CaseUpdate[]>(initialUpdatesProp)
  const [applicationStatus, setApplicationStatus] = useState(initialCaseProp?.application_status || 'not_applied')
  const [dateApplied, setDateApplied] = useState(initialCaseProp?.date_applied?.split('T')[0] || '')
  const [appointmentDate, setAppointmentDate] = useState(initialCaseProp?.appointment_date?.split('T')[0] || '')
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    setApplicationStatus(caseRow?.application_status || 'not_applied')
    setDateApplied(caseRow?.date_applied?.split('T')[0] || '')
    setAppointmentDate(caseRow?.appointment_date?.split('T')[0] || '')
  }, [caseRow])

  const handleSaveTracking = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('compliance_cases')
        .update({
          application_status: applicationStatus,
          date_applied: dateApplied || null,
          appointment_date: appointmentDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId)

      if (error) throw error
      setCaseRow((prev) =>
        prev
          ? {
              ...prev,
              application_status: applicationStatus,
              date_applied: dateApplied || null,
              appointment_date: appointmentDate || null,
            }
          : null
      )
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      const { data, error } = await supabase
        .from('compliance_case_updates')
        .insert({ case_id: caseId, update_type: 'note', notes: newNote.trim() })
        .select('id, update_type, notes, created_at')
        .single()

      if (error) throw error
      setUpdates((prev) => [{ ...data }, ...prev])
      setNewNote('')
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'Failed to add update')
    } finally {
      setAddingNote(false)
    }
  }

  const notif = caseRow?.notifications
  const getEntityLink = () => {
    if (!notif) return '#'
    if (notif.entity_type === 'vehicle') return `/dashboard/vehicles/${notif.entity_id}`
    if (notif.entity_type === 'driver' || notif.entity_type === 'assistant') return `/dashboard/employees/${notif.entity_id}`
    return '#'
  }

  if (!caseRow) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-8 text-center text-slate-500">
          Case not found.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/compliance/cases">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to cases
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-lg">Notification details</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-sm text-slate-500">Certificate</span>
              <p className="font-semibold text-slate-800">{notif?.certificate_name || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">Entity</span>
              <p>
                <Link href={getEntityLink()} className="text-violet-600 hover:underline">
                  View {notif?.entity_type}
                </Link>
                {notif?.recipient && (
                  <span className="text-slate-600 ml-1">({(notif.recipient as any)?.full_name})</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-sm text-slate-500">Expiry date</span>
              <p className="text-slate-800">{notif?.expiry_date ? formatDate(notif.expiry_date) : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">Days until expiry</span>
              <p className={notif?.days_until_expiry != null && notif.days_until_expiry < 0 ? 'text-red-600 font-medium' : 'text-slate-800'}>
                {notif?.days_until_expiry != null ? notif.days_until_expiry : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-lg">Compliance tracking</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="application_status">Application status</Label>
              <Select
                id="application_status"
                value={applicationStatus}
                onChange={(e) => setApplicationStatus(e.target.value)}
              >
                <option value="not_applied">Not applied</option>
                <option value="applied">Applied</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="date_applied">Date applied</Label>
              <Input
                id="date_applied"
                type="date"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="appointment_date">Appointment date</Label>
              <Input
                id="appointment_date"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSaveTracking} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleAddUpdate} className="flex gap-2">
            <Input
              placeholder="Add an update or note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={addingNote || !newNote.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              {addingNote ? 'Adding...' : 'Add'}
            </Button>
          </form>
          <ul className="space-y-2">
            {updates.length === 0 ? (
              <li className="text-sm text-slate-500 py-4">No updates yet.</li>
            ) : (
              updates.map((u) => (
                <li key={u.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{u.notes || u.update_type}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDateTime(u.created_at)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
