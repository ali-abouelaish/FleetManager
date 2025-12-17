import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Bell, Mail, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { NotificationsClient } from './NotificationsClient'
import { RefreshNotificationsButton } from './RefreshNotificationsButton'

async function getNotifications() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      recipient:recipient_employee_id(full_name, personal_email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data || []
}

async function getPendingCount() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) {
    console.error('Error counting notifications:', error)
    return 0
  }

  return data?.length || 0
}

export default async function NotificationsPage() {
  const notifications = await getNotifications()
  const pendingCount = await getPendingCount()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-sm text-gray-600">
            Compliance certificate expiry notifications
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {pendingCount > 0 && (
            <div className="flex items-center space-x-2 text-sm text-orange-600">
              <Bell className="h-5 w-5" />
              <span>{pendingCount} pending notification{pendingCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          <RefreshNotificationsButton />
        </div>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <NotificationsClient initialNotifications={notifications} />
      </Suspense>
    </div>
  )
}

