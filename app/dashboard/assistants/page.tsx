import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Eye, Plus, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getAssistants() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('passenger_assistants')
    .select('*, employees(full_name, phone_number, employment_status, can_work)')
    .order('employee_id')

  if (error) {
    console.error('Error fetching assistants:', error)
    return []
  }

  return data || []
}

// Helper to get expired certificates for a PA
function getExpiredCertificates(assistant: any): string[] {
  const today = new Date()
  const expiredCerts: string[] = []
  
  const checkDate = (date: string | null, certName: string) => {
    if (!date) return
    const expiry = new Date(date)
    if (expiry < today) {
      expiredCerts.push(certName)
    }
  }
  
  checkDate(assistant.tas_badge_expiry_date, 'TAS Badge')
  checkDate(assistant.dbs_expiry_date, 'DBS')
  
  return expiredCerts
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
            <TableHead>Can Work</TableHead>
            <TableHead>TAS Badge Number</TableHead>
            <TableHead>TAS Badge Expiry</TableHead>
            <TableHead>DBS Expiry</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assistants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-gray-500">
                No passenger assistants found.
              </TableCell>
            </TableRow>
          ) : (
            assistants.map((assistant: any) => {
              const expiredCerts = getExpiredCertificates(assistant)
              
              return (
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
                  <TableCell>
                    {assistant.employees?.can_work === false ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-red-100 text-red-800">
                          CANNOT WORK
                        </span>
                        {expiredCerts.length > 0 && (
                          <div className="text-xs text-red-700 font-medium">
                            Expired: {expiredCerts.join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-green-100 text-green-800">
                        Authorized
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{assistant.tas_badge_number || 'N/A'}</TableCell>
                  <TableCell>{formatDate(assistant.tas_badge_expiry_date)}</TableCell>
                  <TableCell>{formatDate(assistant.dbs_expiry_date)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/assistants/${assistant.id}`} prefetch={true}>
                        <Button variant="ghost" size="sm" title="View PA Profile"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Link href={`/dashboard/employees/${assistant.employee_id}`} prefetch={true}>
                        <Button variant="ghost" size="sm" title="View Employee Profile"><Pencil className="h-4 w-4" /></Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
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
        <Link href="/dashboard/assistants/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Passenger Assistant
          </Button>
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={9} />}>
        <AssistantsTable />
      </Suspense>
    </div>
  )
}
