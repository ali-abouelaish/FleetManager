import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getPassengers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('passengers')
    .select('*, schools(name), routes(route_number)')
    .order('id', { ascending: false })

  if (error) {
    console.error('Error fetching passengers:', error)
    return []
  }

  return data || []
}

async function PassengersTable() {
  const passengers = await getPassengers()

  return (
    <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Mobility Type</TableHead>
              <TableHead>Seat Number</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passengers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500">
                  No passengers found. Add your first passenger to get started.
                </TableCell>
              </TableRow>
            ) : (
              passengers.map((passenger: any) => (
                <TableRow key={passenger.id}>
                  <TableCell>{passenger.id}</TableCell>
                  <TableCell className="font-medium">{passenger.full_name}</TableCell>
                  <TableCell>{passenger.schools?.name || 'N/A'}</TableCell>
                  <TableCell>{passenger.routes?.route_number || 'N/A'}</TableCell>
                  <TableCell>{passenger.mobility_type || 'N/A'}</TableCell>
                  <TableCell>{passenger.seat_number || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                    <Link href={`/dashboard/passengers/${passenger.id}`} prefetch={true}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    <Link href={`/dashboard/passengers/${passenger.id}/edit`} prefetch={true}>
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

export default function PassengersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Passengers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all passengers in your fleet system
          </p>
        </div>
        <Link href="/dashboard/passengers/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Passenger
          </Button>
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={7} />}>
        <PassengersTable />
      </Suspense>
    </div>
  )
}

