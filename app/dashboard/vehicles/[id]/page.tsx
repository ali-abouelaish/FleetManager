import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import VORToggleButton from './VORToggleButton'
import dynamic from 'next/dynamic'

const VehicleDetailClient = dynamic(() => import('./VehicleDetailClient'), { ssr: false })

async function getVehicle(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      assigned_employee:assigned_to (
        id,
        full_name
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export default async function ViewVehiclePage({
  params,
}: {
  params: { id: string }
}) {
  const vehicle = await getVehicle(params.id)

  if (!vehicle) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/vehicles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {vehicle.vehicle_identifier || `Vehicle ${vehicle.id}`}
            </h1>
            <p className="mt-2 text-sm text-gray-600">Vehicle Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <VORToggleButton vehicleId={vehicle.id} currentVORStatus={vehicle.off_the_road || false} />
          <Link href={`/dashboard/vehicles/${vehicle.id}/seating`}>
            <Button variant="secondary">
              🪑 Seating Plan
            </Button>
          </Link>
          <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>
            <Button>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <VehicleDetailClient vehicle={vehicle} vehicleId={vehicle.id} />
    </div>
  )
}

