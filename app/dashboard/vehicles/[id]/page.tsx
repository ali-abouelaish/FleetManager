import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'

async function getVehicle(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
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
        <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Vehicle ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Vehicle Identifier</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.vehicle_identifier || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Registration</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.registration || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Make</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.make || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Model</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.model || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Vehicle Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.vehicle_type || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Ownership Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.ownership_type || 'N/A'}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
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
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tail Lift</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.tail_lift ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Spare Vehicle</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.spare_vehicle ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Off the Road</dt>
              <dd className="mt-1 text-sm text-gray-900">{vehicle.off_the_road ? 'Yes' : 'No'}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance & Expiry Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">MOT Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.mot_date)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tax Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.tax_date)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Insurance Expiry</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.insurance_expiry_date)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">LOLER Expiry</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.loler_expiry_date)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Plate Expiry</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.plate_expiry_date)}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance & Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Serviced</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.last_serviced)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Service Booked</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.service_booked_day)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">First Aid Expiry</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.first_aid_expiry)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Fire Extinguisher Expiry</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.fire_extinguisher_expiry)}</dd>
            </div>
          </CardContent>
        </Card>
      </div>

      {vehicle.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-900">{vehicle.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

