import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getDrivers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drivers')
    .select('*, employees(full_name, phone_number, employment_status)')
    .order('employee_id')

  if (error) {
    console.error('Error fetching drivers:', error)
    return []
  }

  return data || []
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
            <TableHead>TAS Badge Expiry</TableHead>
            <TableHead>Taxi Badge Expiry</TableHead>
            <TableHead>DBS Expiry</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-gray-500">
                No drivers found.
              </TableCell>
            </TableRow>
          ) : (
            drivers.map((driver: any) => (
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
                <TableCell>{formatDate(driver.tas_badge_expiry_date)}</TableCell>
                <TableCell>{formatDate(driver.taxi_badge_expiry_date)}</TableCell>
                <TableCell>{formatDate(driver.dbs_expiry_date)}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/employees/${driver.employee_id}`} prefetch={true}>
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

export default function DriversPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Drivers</h1>
          <p className="mt-2 text-sm text-gray-600">View all drivers and their certifications</p>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={8} />}>
        <DriversTable />
      </Suspense>
    </div>
  )
}
