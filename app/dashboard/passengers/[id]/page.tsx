import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil, AlertCircle, ExternalLink, Users, Phone, Mail, MapPin as MapPinIcon } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'
import PassengerDetailClient from './PassengerDetailClient'
import AddParentContactSection from './AddParentContactSection'
import RemoveParentContactButton from './RemoveParentContactButton'

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

async function getPassengerIncidents(passengerId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('incident_passengers')
    .select(`
      *,
      incidents (
        id,
        incident_type,
        description,
        reported_at,
        resolved,
        vehicles (
          vehicle_identifier
        ),
        routes (
          route_number
        )
      )
    `)
    .eq('passenger_id', passengerId)
    .order('incidents(reported_at)', { ascending: false })

  if (error) {
    console.error('Error fetching passenger incidents:', error)
    return []
  }

  return data || []
}

async function getParentContacts(passengerId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('passenger_parent_contacts')
    .select('*, parent_contacts(*)')
    .eq('passenger_id', passengerId)

  if (error) {
    console.error('Error fetching parent contacts:', error)
    return []
  }

  return data || []
}

export default async function ViewPassengerPage({ params }: { params: { id: string } }) {
  const passenger = await getPassenger(params.id)
  if (!passenger) notFound()

  const incidents = await getPassengerIncidents(params.id)
  const parentContacts = await getParentContacts(params.id)

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
            <h1 className="text-3xl font-bold text-navy">{passenger.full_name}</h1>
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
          <CardHeader className="bg-navy text-white">
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Passenger ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900 font-semibold">{passenger.full_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(passenger.dob)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.address || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Personal Item</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.personal_item || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Supervision Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{passenger.supervision_type || 'N/A'}</dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle>Transport Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
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

      {/* Parent Contacts */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Parent Contacts ({parentContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {parentContacts.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No parent contacts linked yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {parentContacts.map((link: any) => (
                <div key={link.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{link.parent_contacts?.full_name}</h4>
                      <p className="text-xs text-gray-500">{link.parent_contacts?.relationship || 'N/A'}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Link href={`/dashboard/parent-contacts/${link.parent_contacts?.id}`}>
                        <Button variant="ghost" size="sm" className="text-navy">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                      <RemoveParentContactButton 
                        linkId={link.id} 
                        contactName={link.parent_contacts?.full_name || 'contact'} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-3">
                    {link.parent_contacts?.phone_number && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Phone className="h-3 w-3 mr-2 text-gray-400" />
                        {link.parent_contacts.phone_number}
                      </div>
                    )}
                    {link.parent_contacts?.email && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Mail className="h-3 w-3 mr-2 text-gray-400" />
                        {link.parent_contacts.email}
                      </div>
                    )}
                    {link.parent_contacts?.address && (
                      <div className="flex items-start text-sm text-gray-700">
                        <MapPinIcon className="h-3 w-3 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                        <span className="line-clamp-2">{link.parent_contacts.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Parent Contact Section */}
      <AddParentContactSection passengerId={passenger.id} />

      {passenger.sen_requirements && (
        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle>SEN Requirements</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{passenger.sen_requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Related Incidents */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Related Incidents ({incidents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {incidents.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No incidents recorded for this passenger.</p>
          ) : (
            <div className="space-y-3">
              {incidents.map((incidentLink: any) => {
                const incident = incidentLink.incidents
                if (!incident) return null
                
                return (
                  <div key={incidentLink.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            Incident #{incident.id} - {incident.incident_type || 'Unknown Type'}
                          </h4>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            incident.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {incident.resolved ? 'Resolved' : 'Open'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Reported: {formatDateTime(incident.reported_at)}
                        </p>
                        {incident.description && (
                          <p className="text-sm text-gray-700 line-clamp-2">{incident.description}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-600">
                          {incident.vehicles?.vehicle_identifier && (
                            <span>Vehicle: {incident.vehicles.vehicle_identifier}</span>
                          )}
                          {incident.routes?.route_number && (
                            <span>Route: {incident.routes.route_number}</span>
                          )}
                        </div>
                      </div>
                      <Link href={`/dashboard/incidents/${incident.id}`}>
                        <Button variant="ghost" size="sm" className="text-navy">
                          View Details
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passenger Updates */}
      <PassengerDetailClient passengerId={passenger.id} showOnlyUpdates={true} />
    </div>
  )
}

