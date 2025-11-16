import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getAssistants() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('passenger_assistants')
    .select('*, employees(full_name, phone_number, employment_status)')
    .order('employee_id')

  if (error) {
    console.error('Error fetching assistants:', error)
    return []
  }

  return data || []
}

async function AssistantsTable() {
  const assistants = await getAssistants()

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee ID</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>TAS Badge Number</TableHead>
            <TableHead>TAS Badge Expiry</TableHead>
            <TableHead>DBS Expiry</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assistants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-gray-500">
                No passenger assistants found.
              </TableCell>
            </TableRow>
          ) : (
            assistants.map((assistant: any) => (
              <TableRow key={assistant.employee_id}>
                <TableCell>{assistant.employee_id}</TableCell>
                <TableCell className="font-medium">{assistant.employees?.full_name || 'N/A'}</TableCell>
                <TableCell>{assistant.employees?.phone_number || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    assistant.employees?.employment_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {assistant.employees?.employment_status || 'N/A'}
                  </span>
                </TableCell>
                <TableCell>{assistant.tas_badge_number || 'N/A'}</TableCell>
                <TableCell>{formatDate(assistant.tas_badge_expiry_date)}</TableCell>
                <TableCell>{formatDate(assistant.dbs_expiry_date)}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/employees/${assistant.employee_id}`} prefetch={true}>
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default function AssistantsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Passenger Assistants</h1>
          <p className="mt-2 text-sm text-gray-600">View all passenger assistants and their certifications</p>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={8} />}>
        <AssistantsTable />
      </Suspense>
    </div>
  )
}
