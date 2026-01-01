import { createClient } from '@/lib/supabase/server'
import VehiclePreChecksClient from './VehiclePreChecksClient'

async function getVehiclePreChecks(date: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('vehicle_pre_checks')
    .select(`
      *,
      driver:driver_id(
        employees(full_name)
      ),
      vehicle:vehicle_id(
        vehicle_identifier,
        registration,
        plate_number,
        make,
        model
      ),
      route_session:route_session_id(
        routes(route_number)
      )
    `)
    .eq('check_date', date)
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching vehicle pre-checks:', error)
    return []
  }

  return data || []
}

export default async function VehiclePreChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const selectedDate = params.date || new Date().toISOString().split('T')[0]
  const preChecks = await getVehiclePreChecks(selectedDate)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Daily Vehicle Pre-Checks</h1>
          <p className="mt-2 text-sm text-gray-600">
            View all vehicle pre-check reports completed by drivers
          </p>
        </div>
      </div>

      <VehiclePreChecksClient initialDate={selectedDate} initialPreChecks={preChecks} />
    </div>
  )
}

