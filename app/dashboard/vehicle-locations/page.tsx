import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil, MapPin, Map } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { VehicleLocationsMap } from '@/components/maps/VehicleLocationsMap'

async function getVehicleLocations() {
  const supabase = await createClient()
  
  // Only fetch locations for spare vehicles that are not off the road
  const { data, error } = await supabase
    .from('vehicle_locations')
    .select(`
      *,
      vehicles!inner (
        id,
        vehicle_identifier,
        make,
        model,
        registration,
        spare_vehicle,
        off_the_road
      )
    `)
    .eq('vehicles.spare_vehicle', true)
    .or('vehicles.off_the_road.is.null,vehicles.off_the_road.eq.false')
    .order('last_updated', { ascending: false })

  if (error) {
    console.error('Error fetching spare vehicle locations:', error)
    return []
  }

  return data || []
}

async function VehicleLocationsTable() {
  const locations = await getVehicleLocations()

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Coordinates</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-500">
                No spare vehicle locations found. Add your first spare vehicle location to get started.
              </TableCell>
            </TableRow>
          ) : (
            locations.map((location: any) => (
              <TableRow key={location.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {location.vehicles?.vehicle_identifier || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {location.vehicles?.make} {location.vehicles?.model}
                    </div>
                    <div className="text-xs text-gray-400">
                      {location.vehicles?.registration || 'No reg'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {/* Always show "Spare" since we only query spare vehicles */}
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Spare Available
                    </span>
                    {location.vehicles?.off_the_road && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        (Filtered - VOR)
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-navy" />
                    <span className="font-medium">{location.location_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate text-sm">
                    {location.address || 'No address'}
                  </div>
                </TableCell>
                <TableCell>
                  {location.latitude && location.longitude ? (
                    <div className="text-xs font-mono">
                      <div>{location.latitude}°N</div>
                      <div>{location.longitude}°E</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">No coordinates</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDateTime(location.last_updated)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/vehicle-locations/${location.id}`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/vehicle-locations/${location.id}/edit`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function VehicleLocationsPage() {
  const locations = await getVehicleLocations()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || ''
  
  // Debug: Log if key is missing (only in development)
  if (!apiKey && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set or is empty')
    console.warn('Please check your .env.local file and restart the dev server')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Spare Vehicle Locations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track and manage locations for spare vehicles in your fleet
          </p>
        </div>
        <Link href="/dashboard/vehicle-locations/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Spare Vehicle Location
          </Button>
        </Link>
      </div>

      {/* Map View */}
      {locations.length > 0 && (
        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle className="flex items-center">
              <Map className="mr-2 h-5 w-5" />
              Spare Vehicles Map View
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {apiKey ? (
              <VehicleLocationsMap locations={locations} apiKey={apiKey} />
            ) : (
              <div className="h-[600px] rounded-lg border bg-yellow-50 flex items-center justify-center">
                <div className="text-center text-yellow-800 p-4 max-w-md">
                  <p className="font-medium mb-2">⚠️ Google Maps API Key Not Found</p>
                  <p className="text-sm mb-3">
                    Please add <code className="bg-yellow-100 px-2 py-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment file.
                  </p>
                  <div className="text-xs text-left bg-yellow-100 p-3 rounded space-y-1">
                    <p className="font-semibold mb-2">Troubleshooting:</p>
                    <p>1. Ensure the variable is in <code className="font-mono">.env.local</code> in the project root</p>
                    <p>2. Variable name must be exactly: <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code></p>
                    <p>3. <strong>Restart your Next.js dev server</strong> after adding/changing env variables</p>
                    <p>4. Check for any extra spaces or quotes around the value</p>
                    <p>5. Format: <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here</code></p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle>Spare Vehicle Locations List</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Suspense fallback={
            <TableSkeleton 
              rows={8} 
              columns={7}
              headers={['Vehicle', 'Status', 'Location Name', 'Address', 'Coordinates', 'Last Updated', 'Actions']}
            />
          }>
            <VehicleLocationsTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

