import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'

async function getCallLog(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('call_logs')
    .select(`
      *,
      passengers(full_name, id),
      employees(full_name, id),
      routes(route_number, id)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

export default async function ViewCallLogPage({ params }: { params: { id: string } }) {
  const callLog = await getCallLog(params.id)
  if (!callLog) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/call-logs">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Call Log #{callLog.id}</h1>
            <p className="mt-2 text-sm text-gray-600">{formatDateTime(callLog.call_date)}</p>
          </div>
        </div>
        <Link href={`/dashboard/call-logs/${callLog.id}/edit`}>
          <Button><Pencil className="mr-2 h-4 w-4" />Edit</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Caller Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Caller Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{callLog.caller_name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{callLog.caller_phone || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Caller Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{callLog.caller_type || 'N/A'}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Call Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Call Type</dt>
              <dd className="mt-1"><span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800">{callLog.call_type || 'N/A'}</span></dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Priority</dt>
              <dd className="mt-1">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  callLog.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                  callLog.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                  callLog.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>{callLog.priority || 'Low'}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  callLog.status === 'Resolved' || callLog.status === 'Closed' ? 'bg-green-100 text-green-800' :
                  callLog.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>{callLog.status || 'Open'}</span>
              </dd>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Subject & Notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Subject</dt>
            <dd className="mt-1 text-sm text-gray-900">{callLog.subject}</dd>
          </div>
          {callLog.notes && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Call Notes</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{callLog.notes}</dd>
            </div>
          )}
          {callLog.action_taken && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Action Taken</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{callLog.action_taken}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Related Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {callLog.passengers && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Related Passenger</dt>
              <dd className="mt-1">
                <Link href={`/dashboard/passengers/${callLog.passengers.id}`} className="text-blue-600 hover:underline">
                  {callLog.passengers.full_name}
                </Link>
              </dd>
            </div>
          )}
          {callLog.employees && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Related Employee</dt>
              <dd className="mt-1">
                <Link href={`/dashboard/employees/${callLog.employees.id}`} className="text-blue-600 hover:underline">
                  {callLog.employees.full_name}
                </Link>
              </dd>
            </div>
          )}
          {callLog.routes && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Related Route</dt>
              <dd className="mt-1">
                <Link href={`/dashboard/routes/${callLog.routes.id}`} className="text-blue-600 hover:underline">
                  {callLog.routes.route_number}
                </Link>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Action Required</dt>
            <dd className="mt-1 text-sm text-gray-900">{callLog.action_required ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Follow-up Required</dt>
            <dd className="mt-1 text-sm text-gray-900">{callLog.follow_up_required ? `Yes - ${callLog.follow_up_date || 'No date set'}` : 'No'}</dd>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}









