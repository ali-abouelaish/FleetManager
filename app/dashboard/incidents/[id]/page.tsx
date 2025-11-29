import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, ExternalLink, Users, UserCog, Car, MapPin } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'
import IncidentToggleButton from './IncidentToggleButton'

async function getIncident(id: string) {
  const supabase = await createClient()
  
  // Fetch main incident with related entities
  const { data: incident, error } = await supabase
    .from('incidents')
    .select(`
      *,
      vehicles(id, vehicle_identifier, make, model),
      routes(id, route_number),
      route_sessions(
        id,
        session_date,
        session_type,
        routes(route_number)
      ),
      created_by_user:created_by(id, email, role)
    `)
    .eq('id', id)
    .single()

  if (error || !incident) return null

  // Fetch related employees
  const { data: relatedEmployees } = await supabase
    .from('incident_employees')
    .select('*, employees(id, full_name, role)')
    .eq('incident_id', id)

  // Fetch related passengers
  const { data: relatedPassengers } = await supabase
    .from('incident_passengers')
    .select('*, passengers(id, full_name, schools(name))')
    .eq('incident_id', id)

  return {
    ...incident,
    incident_employees: relatedEmployees || [],
    incident_passengers: relatedPassengers || [],
  }
}

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) return null

  const { data: userData } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', authUser.email)
    .maybeSingle()

  return userData
}

export default async function ViewIncidentPage({ params }: { params: { id: string } }) {
  const incident = await getIncident(params.id)
  if (!incident) notFound()

  const currentUser = await getCurrentUser()
  const canEdit = currentUser && incident.created_by === currentUser.id
  const canDelete = currentUser && currentUser.role === 'super_admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/incidents">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy">Incident #{incident.id}</h1>
            <p className="mt-2 text-sm text-gray-600">Incident Details & Related Entities</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <IncidentToggleButton incidentId={incident.id} initialResolved={incident.resolved} />
          {canEdit && (
            <Link href={`/dashboard/incidents/${incident.id}/edit`}>
              <Button variant="secondary">
                Edit
              </Button>
            </Link>
          )}
          {canDelete && (
            <Link href={`/dashboard/incidents/${incident.id}/delete`}>
              <Button variant="danger">
                Delete
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="bg-navy text-white"><CardTitle>Incident Information</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Incident ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{incident.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900 font-semibold">{incident.incident_type || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
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
            {incident.created_by_user && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Created By</dt>
                <dd className="mt-1 text-sm text-gray-900">{incident.created_by_user.email}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle className="flex items-center">
              <Car className="mr-2 h-5 w-5" />
              Vehicle & Route
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Vehicle</dt>
              <dd className="mt-1">
                {incident.vehicles ? (
                  <Link href={`/dashboard/vehicles/${incident.vehicles.id}`} className="text-navy hover:underline inline-flex items-center">
                    {incident.vehicles.vehicle_identifier || `${incident.vehicles.make} ${incident.vehicles.model}`}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500">N/A</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Route</dt>
              <dd className="mt-1">
                {incident.routes ? (
                  <Link href={`/dashboard/routes/${incident.routes.id}`} className="text-navy hover:underline inline-flex items-center">
                    <MapPin className="mr-1 h-3 w-3" />
                    {incident.routes.route_number || `Route ${incident.routes.id}`}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500">N/A</span>
                )}
              </dd>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="bg-navy text-white"><CardTitle>Description</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{incident.description || 'No description provided.'}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Related Employees */}
        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle className="flex items-center">
              <UserCog className="mr-2 h-5 w-5" />
              Related Employees ({incident.incident_employees?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {incident.incident_employees && incident.incident_employees.length > 0 ? (
              <div className="space-y-3">
                {incident.incident_employees.map((ie: any) => (
                  <div key={ie.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ie.employees?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{ie.employees?.role || 'No role specified'}</p>
                    </div>
                    <Link href={`/dashboard/employees/${ie.employees?.id}`}>
                      <Button variant="ghost" size="sm" className="text-navy">
                        View Profile
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No employees associated with this incident.</p>
            )}
          </CardContent>
        </Card>

        {/* Related Passengers */}
        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Related Passengers ({incident.incident_passengers?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {incident.incident_passengers && incident.incident_passengers.length > 0 ? (
              <div className="space-y-3">
                {incident.incident_passengers.map((ip: any) => (
                  <div key={ip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ip.passengers?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{ip.passengers?.schools?.name || 'No school assigned'}</p>
                    </div>
                    <Link href={`/dashboard/passengers/${ip.passengers?.id}`}>
                      <Button variant="ghost" size="sm" className="text-navy">
                        View Profile
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No passengers associated with this incident.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

