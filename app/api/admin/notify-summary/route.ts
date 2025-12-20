import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

interface SummaryData {
  type: 'document_upload' | 'appointment_booking'
  notificationId: number
  recipientName?: string
  recipientEmail?: string
  entityType: string
  entityName: string
  certificateName: string
  details?: {
    filesUploaded?: number
    fileNames?: string[]
    appointmentSlot?: string
    appointmentDate?: string
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const summaryData: SummaryData = body

    const supabase = await createClient()

    // Get admin email addresses
    // Option 1: Get from users table with admin role (if you have a role column)
    // Option 2: Use environment variable
    // Option 3: Get all users (if all users are admins)
    const adminEmails: string[] = []

    // Check for admin emails in environment variable
    if (process.env.ADMIN_EMAIL) {
      const emails = process.env.ADMIN_EMAIL.split(',').map(e => e.trim())
      adminEmails.push(...emails)
    }

    // Also try to get from users table (if you have admin role)
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

    // If no admin emails found, get all users as fallback
    if (adminEmails.length === 0) {
      const { data: allUsers } = await supabase
        .from('users')
        .select('email')
        .limit(10)
      
      if (allUsers) {
        allUsers.forEach(user => {
          if (user.email && !adminEmails.includes(user.email)) {
            adminEmails.push(user.email)
          }
        })
      }
    }

    if (adminEmails.length === 0) {
      console.warn('No admin emails found. Set ADMIN_EMAIL environment variable or ensure users table has admin role.')
      return NextResponse.json({ success: false, message: 'No admin emails configured' })
    }

    // Get notification details for context
    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', summaryData.notificationId)
      .single()

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Generate base URL
    const requestOrigin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/')
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.SITE_URL ||
      requestOrigin ||
      'https://senfleetmanager.com'

    // Generate entity link
    let entityLink = ''
    if (summaryData.entityType === 'vehicle') {
      entityLink = `${baseUrl}/dashboard/vehicles/${notification.entity_id}`
    } else if (summaryData.entityType === 'driver' || summaryData.entityType === 'assistant') {
      entityLink = `${baseUrl}/dashboard/employees/${notification.entity_id}`
    }

    // Generate email content
    let subject = ''
    let emailBody = ''

    if (summaryData.type === 'document_upload') {
      subject = `[Document Upload] ${summaryData.certificateName} - ${summaryData.entityName}`
      emailBody = `A compliance document has been uploaded.

**Details:**
- Certificate: ${summaryData.certificateName}
- Entity: ${summaryData.entityName} (${summaryData.entityType})
- Recipient: ${summaryData.recipientName || summaryData.recipientEmail || 'Unknown'}
- Files Uploaded: ${summaryData.details?.filesUploaded || 0}
${summaryData.details?.fileNames ? `- File Names: ${summaryData.details.fileNames.join(', ')}` : ''}

**View Details:**
${entityLink}

**Notification:**
${baseUrl}/dashboard/notifications

This notification has been automatically marked as resolved.`
    } else if (summaryData.type === 'appointment_booking') {
      subject = `[Appointment Booked] ${summaryData.certificateName} - ${summaryData.entityName}`
      emailBody = `An appointment has been booked for compliance certificate review.

**Details:**
- Certificate: ${summaryData.certificateName}
- Entity: ${summaryData.entityName} (${summaryData.entityType})
- Recipient: ${summaryData.recipientName || summaryData.recipientEmail || 'Unknown'}
- Appointment Date: ${summaryData.details?.appointmentDate || 'N/A'}
- Slot: ${summaryData.details?.appointmentSlot || 'N/A'}

**View Details:**
${entityLink}

**Appointments:**
${baseUrl}/dashboard/appointments

**Notification:**
${baseUrl}/dashboard/notifications`
    }

    // Send email to all admins
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || smtpUser

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      console.warn('SMTP not configured; cannot send admin summary email')
      return NextResponse.json({ 
        success: false, 
        message: 'SMTP not configured',
        adminEmails 
      })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Convert to HTML
    let htmlBody = emailBody
      .replace(/\n/g, '<br>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color: #2563eb; text-decoration: underline;">$1</a>')

    // Send to all admin emails
    const emailPromises = adminEmails.map(adminEmail =>
      transporter.sendMail({
        from: smtpFrom,
        to: adminEmail,
        subject: subject,
        text: emailBody,
        html: htmlBody,
      })
    )

    await Promise.all(emailPromises)

    return NextResponse.json({ 
      success: true, 
      message: `Summary sent to ${adminEmails.length} admin(s)`,
      adminEmails 
    })
  } catch (error: any) {
    console.error('Error sending admin summary:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send admin summary' },
      { status: 500 }
    )
  }
}

