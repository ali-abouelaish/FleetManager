import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { VehicleSearchFilters } from './VehicleSearchFilters'
import { getVehicles, VehicleFilters } from '@/lib/supabase/vehicles'

async function VehiclesTable({ 
  filters 
}: { 
  filters: VehicleFilters 
}) {
  const vehicles = await getVehicles(filters)

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Vehicle Identifier</TableHead>
            <TableHead>Registration</TableHead>
            <TableHead>Make/Model</TableHead>
            <TableHead>Vehicle Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>MOT Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-gray-500">
                No vehicles found. Add your first vehicle to get started.
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>{vehicle.id}</TableCell>
                <TableCell className="font-medium">{vehicle.vehicle_identifier || 'N/A'}</TableCell>
                <TableCell>{vehicle.registration || 'N/A'}</TableCell>
                <TableCell>{`${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'N/A'}</TableCell>
                <TableCell>{vehicle.vehicle_type || 'N/A'}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      vehicle.off_the_road
                        ? 'bg-red-100 text-red-800'
                        : vehicle.spare_vehicle
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {vehicle.off_the_road ? 'VOR' : vehicle.spare_vehicle ? 'Spare' : 'Active'}
                  </span>
                </TableCell>
                <TableCell>{formatDate(vehicle.mot_date)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/vehicles/${vehicle.id}`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/vehicles/${vehicle.id}/edit`} prefetch={true}>
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

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: { 
    search?: string
    is_spare?: string
    is_vor?: string
    has_lift?: string
  }
}) {
  // Build filters from search params
  const filters: VehicleFilters = {
    search: searchParams.search || undefined,
    is_spare: (searchParams.is_spare as 'all' | 'yes' | 'no') || 'all',
    is_vor: (searchParams.is_vor as 'all' | 'yes' | 'no') || 'all',
    has_lift: (searchParams.has_lift as 'all' | 'yes' | 'no') || 'all',
  }

  // Create a unique key for Suspense based on all filter params
  const suspenseKey = JSON.stringify(filters)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Vehicles</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all vehicles in your fleet
          </p>
        </div>
        <Link href="/dashboard/vehicles/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Search and Filter Controls */}
      <VehicleSearchFilters />

      <Suspense key={suspenseKey} fallback={<TableSkeleton rows={5} columns={8} />}>
        <VehiclesTable filters={filters} />
      </Suspense>
    </div>
  )
}

