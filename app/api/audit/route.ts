import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { table_name, record_id, action } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's ID from the users table
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Insert audit log
    const { error } = await supabase.from('audit_log').insert({
      table_name,
      record_id,
      action,
      changed_by: userData.id,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Audit log error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to log audit' },
      { status: 500 }
    )
  }
}

