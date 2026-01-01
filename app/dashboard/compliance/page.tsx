import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { Bell } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ComplianceNotificationsClient } from './ComplianceNotificationsClient'
import { RefreshNotificationsButton } from '../notifications/RefreshNotificationsButton'

async function getComplianceNotifications() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      recipient:recipient_employee_id(full_name, personal_email)
    `)
    .eq('notification_type', 'certificate_expiry')
    .order('created_at', { ascending: false })
    .limit(100)
  
  // Parse details JSONB field if it exists
  if (data) {
    data.forEach((notification: any) => {
      if (notification.details && typeof notification.details === 'string') {
        try {
          notification.details = JSON.parse(notification.details)
        } catch (e) {
          // Keep as is if not valid JSON
        }
      }
    })
  }

  if (error) {
    console.error('Error fetching compliance notifications:', error)
    return []
  }

  return data || []
}

async function getPendingCount() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('notification_type', 'certificate_expiry')
    .or('status.eq.pending,admin_response_required.eq.true')

  if (error) {
    console.error('Error counting notifications:', error)
    return 0
  }

  return data?.length || 0
}

export default async function CompliancePage() {
  const notifications = await getComplianceNotifications()
  const pendingCount = await getPendingCount()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Notifications</h1>
          <p className="mt-2 text-sm text-gray-600">
            Certificate expiry notifications for employees, drivers, and vehicles
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
        <ComplianceNotificationsClient initialNotifications={notifications} />
      </Suspense>
    </div>
  )
}

