import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Eye, Pencil, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getDrivers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drivers')
    .select(`
      *,
      employees(full_name, phone_number, employment_status, can_work)
    `)
    .order('employee_id')

  if (error) {
    console.error('Error fetching drivers:', error)
    return []
  }

  return data || []
}

// Helper to get missing and expired certificates for a driver
function getMissingAndExpiredCertificates(driver: any): string[] {
  const today = new Date()
  const issues: string[] = []
  
  // Check TAS Badge (required)
  if (!driver.tas_badge_expiry_date) {
    issues.push('Missing TAS Badge expiry date')
  } else {
    const expiry = new Date(driver.tas_badge_expiry_date)
    if (expiry < today) {
      issues.push('Expired TAS Badge')
    }
  }
  
  return issues
}

async function DriversTable() {
  const drivers = await getDrivers()

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
            <TableHead>TAS Badge Expiry</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-500">
                No drivers found.
              </TableCell>
            </TableRow>
          ) : (
            drivers.map((driver: any) => {
              const missingAndExpired = getMissingAndExpiredCertificates(driver)
              
              return (
                <TableRow key={driver.employee_id}>
                  <TableCell>{driver.employee_id}</TableCell>
                  <TableCell className="font-medium">{driver.employees?.full_name || 'N/A'}</TableCell>
                  <TableCell>{driver.employees?.phone_number || 'N/A'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      driver.employees?.employment_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {driver.employees?.employment_status || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {driver.employees?.can_work === false ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-red-100 text-red-800">
                          CANNOT WORK
                        </span>
                        {missingAndExpired.length > 0 ? (
                          <div className="text-xs text-red-700 font-medium">
                            {missingAndExpired.join(', ')}
                          </div>
                        ) : (
                          <div className="text-xs text-orange-700 font-medium">
                            Status may be out of sync. Try editing and saving the record to refresh.
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-green-100 text-green-800">
                        Authorized
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(driver.tas_badge_expiry_date)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/drivers/${driver.employee_id}`} prefetch={true}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/drivers/${driver.employee_id}/edit`} prefetch={true}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
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

export default function DriversPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Drivers</h1>
          <p className="mt-2 text-sm text-gray-600">View all drivers and their certifications</p>
        </div>
        <Link href="/dashboard/drivers/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Driver
          </Button>
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={7} />}>
        <DriversTable />
      </Suspense>
    </div>
  )
}
