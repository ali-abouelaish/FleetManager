import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

async function getIncidents(routeSessionId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('incidents')
    .select('*, employees(full_name), vehicles(vehicle_identifier), routes(route_number), route_sessions(id, session_date, session_type, routes(route_number))')
    .order('reported_at', { ascending: false })

  if (routeSessionId) {
    query = query.eq('route_session_id', parseInt(routeSessionId))
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching incidents:', error)
    return []
  }

  return data || []
}

async function IncidentsTable({ routeSessionId }: { routeSessionId?: string }) {
  const incidents = await getIncidents(routeSessionId)

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Route Session</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reported At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-gray-500">
                No incidents found.
              </TableCell>
            </TableRow>
          ) : (
            incidents.map((incident: any) => (
              <TableRow key={incident.id}>
                <TableCell>{incident.id}</TableCell>
                <TableCell className="font-medium">{incident.incident_type || 'N/A'}</TableCell>
                <TableCell>{incident.employees?.full_name || 'N/A'}</TableCell>
                <TableCell>{incident.vehicles?.vehicle_identifier || 'N/A'}</TableCell>
                <TableCell>{incident.routes?.route_number || 'N/A'}</TableCell>
                <TableCell>
                  {incident.route_sessions ? (
                    Array.isArray(incident.route_sessions) && incident.route_sessions.length > 0 ? (
                      <div className="space-y-1">
                        {incident.route_sessions.map((session: any) => (
                          <div key={session.id} className="text-xs">
                            {formatDateTime(session.session_date)} - {session.session_type}
                            {session.routes?.route_number && ` (${session.routes.route_number})`}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs">
                        {formatDateTime((incident.route_sessions as any).session_date)} - {(incident.route_sessions as any).session_type}
                        {(incident.route_sessions as any).routes?.route_number && ` (${(incident.route_sessions as any).routes.route_number})`}
                      </div>
                    )
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    incident.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {incident.resolved ? 'Resolved' : 'Open'}
                  </span>
                </TableCell>
                <TableCell>{formatDateTime(incident.reported_at)}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/incidents/${incident.id}`} prefetch={true}>
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ route_session_id?: string }>
}) {
  const params = await searchParams
  const routeSessionId = params.route_session_id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Incidents</h1>
          <p className="mt-2 text-sm text-gray-600">
            {routeSessionId ? 'Incidents for Route Session' : 'Track and manage all incidents'}
          </p>
        </div>
        <Link href="/dashboard/incidents/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Report Incident
          </Button>
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={8} />}>
        <IncidentsTable routeSessionId={routeSessionId} />
      </Suspense>
    </div>
  )
}
