import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

async function getCallLogs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('call_logs')
    .select(`
      *,
      passengers(full_name),
      employees(full_name),
      routes(route_number)
    `)
    .order('call_date', { ascending: false })

  if (error) {
    console.error('Error fetching call logs:', error)
    return []
  }

  return data || []
}

async function CallLogsTable() {
  const callLogs = await getCallLogs()

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date/Time</TableHead>
            <TableHead>Caller</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Related To</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {callLogs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-gray-500">
                No call logs found. Log your first call to get started.
              </TableCell>
            </TableRow>
          ) : (
            callLogs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{formatDateTime(log.call_date)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{log.caller_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{log.caller_phone || 'No phone'}</div>
                    <div className="text-xs text-gray-500">{log.caller_type || 'N/A'}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800">
                    {log.call_type || 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate font-medium">{log.subject}</div>
                  {log.notes && (
                    <div className="text-xs text-gray-500 truncate">{log.notes}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-1">
                    {log.passengers && (
                      <div>
                        <span className="text-gray-500">Passenger: </span>
                        <Link href={`/dashboard/passengers/${log.related_passenger_id}`} className="text-blue-600 hover:underline">
                          {log.passengers.full_name}
                        </Link>
                      </div>
                    )}
                    {log.employees && (
                      <div>
                        <span className="text-gray-500">Employee: </span>
                        <span className="font-medium">{log.employees.full_name}</span>
                      </div>
                    )}
                    {log.routes && (
                      <div>
                        <span className="text-gray-500">Route: </span>
                        <span className="font-medium">{log.routes.route_number}</span>
                      </div>
                    )}
                    {!log.passengers && !log.employees && !log.routes && (
                      <span className="text-gray-400">None</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      log.priority === 'Urgent'
                        ? 'bg-red-100 text-red-800'
                        : log.priority === 'High'
                        ? 'bg-orange-100 text-orange-800'
                        : log.priority === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {log.priority || 'Low'}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      log.status === 'Resolved' || log.status === 'Closed'
                        ? 'bg-green-100 text-green-800'
                        : log.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {log.status || 'Open'}
                  </span>
                  {log.action_required && (
                    <div className="mt-1">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        Action Required
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/call-logs/${log.id}`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/call-logs/${log.id}/edit`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default function CallLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Call Logs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track all phone calls and communications
          </p>
        </div>
        <Link href="/dashboard/call-logs/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Log Call
          </Button>
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={8} />}>
        <CallLogsTable />
      </Suspense>
    </div>
  )
}
