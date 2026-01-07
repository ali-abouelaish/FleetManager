import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Pencil, Car } from 'lucide-react'
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
        <div className="flex items-center gap-4">
          <Link href="/dashboard/vehicles">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-violet-600 hover:bg-violet-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {vehicle.vehicle_identifier || `Vehicle ${vehicle.id}`}
            </h1>
            <p className="text-sm text-slate-500">Vehicle Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <VORToggleButton vehicleId={vehicle.id} currentVORStatus={vehicle.off_the_road || false} />
          <Link href={`/dashboard/vehicles/${vehicle.id}/seating`}>
            <Button variant="secondary" className="border-slate-200 hover:bg-slate-50">
              🪑 Seating Plan
            </Button>
          </Link>
          <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>
            <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25">
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


