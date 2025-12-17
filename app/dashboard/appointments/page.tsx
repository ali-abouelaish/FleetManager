'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatDateTime } from '@/lib/utils'

interface AppointmentBooking {
  id: number
  notification_id: number | null
  booked_by_email: string | null
  booked_by_name: string | null
  status: string | null
  booked_at: string | null
}

interface AppointmentSlot {
  id: number
  slot_start: string
  slot_end: string
  notes: string | null
  appointment_bookings?: AppointmentBooking[] | null
}

export default function AppointmentsPage() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
  })

  const loadSlots = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/appointments/slots')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load slots')
      setSlots(data.slots || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSlots()
  }, [])

  const createSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.date || !form.startTime || !form.endTime) {
      setError('Date, start time, and end time are required')
      return
    }

    const slotStart = new Date(`${form.date}T${form.startTime}`)
    const slotEnd = new Date(`${form.date}T${form.endTime}`)

    if (slotEnd <= slotStart) {
      setError('End time must be after start time')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/appointments/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          notes: form.notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create slot')
      setForm({ date: '', startTime: '', endTime: '', notes: '' })
      loadSlots()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-600">Create available slots and view bookings.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createSlot} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Location or instructions"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              {error && <span className="text-sm text-red-600">{error}</span>}
              <Button type="submit" disabled={creating}>
                {creating ? 'Saving...' : 'Add Slot'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slots & Bookings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Booking</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                    No slots yet. Create one above.
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((slot) => {
                  const booking = slot.appointment_bookings?.[0]
                  return (
                    <TableRow key={slot.id}>
                      <TableCell>
                        <div className="font-medium">{formatDateTime(slot.slot_start)}</div>
                        <div className="text-sm text-gray-500">
                          Ends {formatDateTime(slot.slot_end)}
                        </div>
                      </TableCell>
                      <TableCell>{slot.notes || '-'}</TableCell>
                      <TableCell>
                        {booking ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">Booked</div>
                            <div className="text-sm text-gray-600">
                              {booking.booked_by_name || booking.booked_by_email || 'Recipient'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.booked_at ? formatDateTime(booking.booked_at) : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-green-700">Available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

