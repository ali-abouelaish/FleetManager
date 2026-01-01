import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil, Map } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SchoolsMap } from '@/components/maps/SchoolsMap'
import { SchoolSearchFilters } from './SchoolSearchFilters'

async function getSchools(filters?: { search?: string }) {
  const supabase = await createClient()
  let query = supabase
    .from('schools')
    .select('*')

  // Apply search filter (name or ref_number)
  if (filters?.search && filters.search.trim()) {
    const searchTerm = filters.search.trim()
    query = query.or(`name.ilike.%${searchTerm}%,ref_number.ilike.%${searchTerm}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching schools:', error)
    return []
  }

  return data || []
}

async function SchoolsTable(filters?: { search?: string }) {
  const schools = await getSchools(filters)

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>School Name</TableHead>
            <TableHead>Ref Number</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schools.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500">
                No schools found. Add your first school to get started.
              </TableCell>
            </TableRow>
          ) : (
            schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell>{school.id}</TableCell>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell>{school.ref_number || 'N/A'}</TableCell>
                <TableCell>{school.address || 'N/A'}</TableCell>
                <TableCell>{formatDate(school.created_at)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/schools/${school.id}`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/schools/${school.id}/edit`} prefetch={true}>
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

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const filters = { search: params?.search }
  const schools = await getSchools(filters)
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
          <h1 className="text-3xl font-bold text-navy">Schools</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all schools in your fleet system
          </p>
        </div>
        <Link href="/dashboard/schools/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Button>
        </Link>
      </div>

      {/* Map View */}
      {schools.length > 0 && (
        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle className="flex items-center">
              <Map className="mr-2 h-5 w-5" />
              Schools Map View
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {apiKey ? (
              <Suspense fallback={
                <div className="h-[500px] rounded-lg border bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              }>
                <SchoolsMap schools={schools} apiKey={apiKey} />
              </Suspense>
            ) : (
              <div className="h-[500px] rounded-lg border bg-yellow-50 flex items-center justify-center">
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

      {/* Search and Filter Controls */}
      <SchoolSearchFilters />

      {/* Table View */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle>Schools List</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Suspense key={JSON.stringify(filters)} fallback={<TableSkeleton rows={5} columns={6} />}>
            <SchoolsTable search={filters.search} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

