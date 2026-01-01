import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Mail } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import EmailSummariesClient from './EmailSummariesClient'

async function getEmailSummaries() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('email_summaries')
    .select('*')
    .order('received_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (error) {
    console.error('Error fetching email summaries:', error)
    return []
  }

  return data || []
}

export default async function EmailSummariesPage() {
  const emailSummaries = await getEmailSummaries()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Email Summaries</h1>
          <p className="mt-2 text-sm text-gray-600">
            View email summaries and notifications sent to employees
          </p>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <EmailSummariesClient initialSummaries={emailSummaries} />
      </Suspense>
    </div>
  )
}

