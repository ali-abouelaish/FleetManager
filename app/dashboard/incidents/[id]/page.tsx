import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'

async function getIncident(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('incidents')
    .select('*, employees(full_name), vehicles(vehicle_identifier), routes(route_number)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

export default async function ViewIncidentPage({ params }: { params: { id: string } }) {
  const incident = await getIncident(params.id)
  if (!incident) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/incidents">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Incident #{incident.id}</h1>
            <p className="mt-2 text-sm text-gray-600">Incident Details</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Incident Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Incident ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{incident.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{incident.incident_type || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  incident.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {incident.resolved ? 'Resolved' : 'Open'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Reported At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateTime(incident.reported_at)}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Related Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Employee</dt>
              <dd className="mt-1 text-sm text-gray-900">{incident.employees?.full_name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Vehicle</dt>
              <dd className="mt-1 text-sm text-gray-900">{incident.vehicles?.vehicle_identifier || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Route</dt>
              <dd className="mt-1 text-sm text-gray-900">{incident.routes?.route_number || 'N/A'}</dd>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-900">{incident.description || 'No description provided.'}</p>
        </CardContent>
      </Card>
    </div>
  )
}

