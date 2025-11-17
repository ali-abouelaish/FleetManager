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

async function getSchools() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching schools:', error)
    return []
  }

  return data || []
}

async function SchoolsTable() {
  const schools = await getSchools()

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>School Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schools.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500">
                No schools found. Add your first school to get started.
              </TableCell>
            </TableRow>
          ) : (
            schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell>{school.id}</TableCell>
                <TableCell className="font-medium">{school.name}</TableCell>
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

export default async function SchoolsPage() {
  const schools = await getSchools()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

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
              <SchoolsMap schools={schools} apiKey={apiKey} />
            ) : (
              <div className="h-[500px] rounded-lg border bg-yellow-50 flex items-center justify-center">
                <div className="text-center text-yellow-800 p-4">
                  <p className="font-medium mb-2">⚠️ Google Maps API Key Required</p>
                  <p className="text-sm">Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle>Schools List</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
            <SchoolsTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

