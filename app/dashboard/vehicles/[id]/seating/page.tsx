import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import VehicleSeatingClient from './VehicleSeatingClient'
import { getVehicleSeatingPlan } from '@/lib/supabase/vehicleSeating'

interface VehicleSeatingPageProps {
  params: {
    id: string
  }
}

async function getVehicle(id: string) {
  const supabase = await createClient()
  
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('id, registration, make, model, vehicle_identifier')
    .eq('id', id)
    .single()

  if (error || !vehicle) {
    return null
  }

  return vehicle
}

export default async function VehicleSeatingPage({ params }: VehicleSeatingPageProps) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get vehicle details
  const vehicle = await getVehicle(params.id)
  if (!vehicle) {
    notFound()
  }

  // Get seating plan
  const seatingPlan = await getVehicleSeatingPlan(params.id)

  return (
    <div className="space-y-6">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/vehicles" className="hover:text-gray-900 transition-colors">
            Vehicles
          </Link>
          <span>/</span>
          <Link 
            href={`/dashboard/vehicles/${params.id}`} 
            className="hover:text-gray-900 transition-colors"
          >
            {vehicle.registration || vehicle.vehicle_identifier || 'Vehicle'}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Seating Plan</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Seating Plan</h1>
          <p className="text-gray-600 mt-1">
            {vehicle.make} {vehicle.model} • {vehicle.registration}
          </p>
        </div>

        {/* Client component for interactive features */}
        <VehicleSeatingClient 
          vehicleId={params.id}
          vehicle={vehicle}
          initialSeatingPlan={seatingPlan}
        />
      </div>
    </div>
  )
}

