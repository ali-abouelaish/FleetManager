import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { TableSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="bg-navy text-white">
            <div className="h-6 w-48 bg-blue-800 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent className="pt-6">
            <TableSkeleton rows={7} columns={1} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="bg-navy text-white">
            <div className="h-6 w-48 bg-blue-800 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent className="pt-6">
            <TableSkeleton rows={3} columns={1} />
          </CardContent>
        </Card>
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="bg-blue-900 text-white">
              <div className="h-6 w-48 bg-blue-800 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

