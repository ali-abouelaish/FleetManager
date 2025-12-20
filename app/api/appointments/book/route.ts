import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

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

    // Get slot details for admin summary
    const { data: slot } = await supabase
      .from('appointment_slots')
      .select('slot_start, slot_end')
      .eq('id', slotId)
      .single()

    // Get entity name for admin summary
    let entityName = ''
    if (notification.entity_type === 'vehicle') {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('vehicle_identifier, registration')
        .eq('id', notification.entity_id)
        .single()
      entityName = vehicle?.vehicle_identifier || vehicle?.registration || `Vehicle #${notification.entity_id}`
    } else if (notification.entity_type === 'driver' || notification.entity_type === 'assistant') {
      const { data: employee } = await supabase
        .from('employees')
        .select('full_name')
        .eq('id', notification.entity_id)
        .single()
      entityName = employee?.full_name || `${notification.entity_type} #${notification.entity_id}`
    }

    // Send admin summary email
    try {
      // Get admin emails
      const adminEmails: string[] = []
      if (process.env.ADMIN_EMAIL) {
        const emails = process.env.ADMIN_EMAIL.split(',').map(e => e.trim())
        adminEmails.push(...emails)
      }

      const { data: adminUsers } = await supabase
        .from('users')
        .select('email')
        .or('role.eq.admin,role.eq.Admin,role.eq.ADMIN')
      
      if (adminUsers) {
        adminUsers.forEach(user => {
          if (user.email && !adminEmails.includes(user.email)) {
            adminEmails.push(user.email)
          }
        })
      }

      if (adminEmails.length > 0) {
        const smtpHost = process.env.SMTP_HOST
        const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
        const smtpUser = process.env.SMTP_USER
        const smtpPass = process.env.SMTP_PASS
        const smtpFrom = process.env.SMTP_FROM || smtpUser

        if (smtpHost && smtpUser && smtpPass && smtpFrom) {
          const requestOrigin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/')
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.SITE_URL ||
            requestOrigin ||
            'https://senfleetmanager.com'

          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          })

          const slotDate = slot?.slot_start ? new Date(slot.slot_start).toLocaleString() : 'N/A'
          const slotTime = slot?.slot_start && slot?.slot_end 
            ? `${new Date(slot.slot_start).toLocaleTimeString()} - ${new Date(slot.slot_end).toLocaleTimeString()}`
            : 'N/A'

          const subject = `[Appointment Booked] ${notification.certificate_name} - ${entityName}`
          const emailBody = `An appointment has been booked for compliance certificate review.

**Details:**
- Certificate: ${notification.certificate_name}
- Entity: ${entityName} (${notification.entity_type})
- Recipient: ${name || notification.recipient_email || 'Unknown'}
- Email: ${email || notification.recipient_email || 'N/A'}
- Appointment Date: ${slotDate}
- Slot Time: ${slotTime}

**View Details:**
${baseUrl}/dashboard/appointments

**Notification:**
${baseUrl}/dashboard/notifications`

          const htmlBody = emailBody
            .replace(/\n/g, '<br>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color: #2563eb; text-decoration: underline;">$1</a>')

          await Promise.all(
            adminEmails.map(adminEmail =>
              transporter.sendMail({
                from: smtpFrom,
                to: adminEmail,
                subject: subject,
                text: emailBody,
                html: htmlBody,
              })
            )
          )
        }
      }
    } catch (summaryError) {
      console.error('Failed to send admin summary email:', summaryError)
      // Don't fail the booking if summary email fails
    }

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('Error booking appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to book appointment' },
      { status: 500 }
    )
  }
}

