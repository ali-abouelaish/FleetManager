import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'

async function getPassenger(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('passengers')
    .select('*, schools(name), routes(route_number)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

export default async function ViewPassengerPage({ params }: { params: { id: string } }) {
  const passenger = await getPassenger(params.id)
  if (!passenger) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/passengers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{passenger.full_name}</h1>
            <p className="mt-2 text-sm text-gray-600">Passenger Details</p>
          </div>
        </div>
        <Link href={`/dashboard/passengers/${passenger.id}/edit`}>
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
              <dt className="text-sm font-medium text-gray-500">Passenger ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.full_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(passenger.dob)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.address || 'N/A'}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transport Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">School</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.schools?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Route</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.routes?.route_number || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Mobility Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.mobility_type || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Seat Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.seat_number || 'N/A'}</dd>
            </div>
          </CardContent>
        </Card>
      </div>

      {passenger.sen_requirements && (
        <Card>
          <CardHeader>
            <CardTitle>SEN Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-900">{passenger.sen_requirements}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

