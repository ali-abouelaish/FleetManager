import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, slotId, name, email } = body

    if (!token || !slotId) {
      return NextResponse.json({ error: 'token and slotId are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find notification by email token
    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('email_token', token)
      .maybeSingle()

    if (!notification) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Check if slot already booked
    const { data: existingBooking } = await supabase
      .from('appointment_bookings')
      .select('id')
      .eq('appointment_slot_id', slotId)
      .maybeSingle()

    if (existingBooking) {
      return NextResponse.json({ error: 'Slot already booked' }, { status: 409 })
    }

    const { data: booking, error: bookingError } = await supabase
      .from('appointment_bookings')
      .insert({
        appointment_slot_id: slotId,
        notification_id: notification.id,
        booked_by_email: email || notification.recipient_email,
        booked_by_name: name || null,
      })
      .select()
      .single()

    if (bookingError) throw bookingError

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('Error booking appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to book appointment' },
      { status: 500 }
    )
  }
}

