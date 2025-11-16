import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getRoutes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('routes')
    .select('*, schools(name)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching routes:', error)
    return []
  }

  return data || []
}

async function RoutesTable() {
  const routes = await getRoutes()

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Route Number</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500">
                No routes found. Add your first route to get started.
              </TableCell>
            </TableRow>
          ) : (
            routes.map((route: any) => (
              <TableRow key={route.id}>
                <TableCell>{route.id}</TableCell>
                <TableCell className="font-medium">{route.route_number || `Route ${route.id}`}</TableCell>
                <TableCell>{route.schools?.name || 'N/A'}</TableCell>
                <TableCell>{formatDate(route.created_at)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/routes/${route.id}`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/routes/${route.id}/edit`} prefetch={true}>
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

export default function RoutesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Routes</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all routes in your fleet system
          </p>
        </div>
        <Link href="/dashboard/routes/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Route
          </Button>
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
        <RoutesTable />
      </Suspense>
    </div>
  )
}

