import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { VehicleStatusFilter } from './VehicleStatusFilter'

type VehicleStatus = 'all' | 'active' | 'spare' | 'off-road'

async function getVehicleCounts() {
  const supabase = await createClient()
  
  const [
    { count: totalCount },
    { count: activeCount },
    { count: spareCount },
    { count: offRoadCount },
  ] = await Promise.all([
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('vehicles').select('*', { count: 'exact', head: true })
      .eq('spare_vehicle', false)
      .or('off_the_road.is.null,off_the_road.eq.false'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true })
      .eq('spare_vehicle', true),
    supabase.from('vehicles').select('*', { count: 'exact', head: true })
      .eq('off_the_road', true),
  ])

  return {
    all: totalCount || 0,
    active: activeCount || 0,
    spare: spareCount || 0,
    'off-road': offRoadCount || 0,
  }
}

async function getVehicles(status: VehicleStatus = 'all') {
  const supabase = await createClient()
  let query = supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  // Apply filters based on status
  if (status === 'active') {
    query = query
      .eq('spare_vehicle', false)
      .or('off_the_road.is.null,off_the_road.eq.false')
  } else if (status === 'spare') {
    query = query.eq('spare_vehicle', true)
  } else if (status === 'off-road') {
    query = query.eq('off_the_road', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching vehicles:', error)
    return []
  }

  return data || []
}

async function VehiclesTable({ status }: { status: VehicleStatus }) {
  const vehicles = await getVehicles(status)

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
  searchParams: { status?: string }
}) {
  const status = (searchParams.status as VehicleStatus) || 'all'
  const counts = await getVehicleCounts()

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

      {/* Status Filter Tabs */}
      <VehicleStatusFilter currentStatus={status} counts={counts} />

      <Suspense key={status} fallback={<TableSkeleton rows={5} columns={8} />}>
        <VehiclesTable status={status} />
      </Suspense>
    </div>
  )
}

