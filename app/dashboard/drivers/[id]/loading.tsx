import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-20 animate-pulse rounded-md bg-gray-200" />
          <div className="space-y-2">
            <div className="h-9 w-64 animate-pulse rounded-md bg-gray-200" />
            <div className="h-5 w-48 animate-pulse rounded-md bg-gray-200" />
          </div>
        </div>
        <div className="h-10 w-24 animate-pulse rounded-md bg-gray-200" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex space-x-8 border-b border-gray-200">
        <div className="h-10 w-24 animate-pulse rounded-md bg-gray-200" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-gray-200" />
        <div className="h-10 w-40 animate-pulse rounded-md bg-gray-200" />
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-6 w-40 animate-pulse rounded-md bg-gray-200" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-gray-200" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-6 w-40 animate-pulse rounded-md bg-gray-200" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
          </CardContent>
        </Card>
      </div>

      <Card className="md:col-span-2">
        <CardHeader>
          <div className="h-6 w-48 animate-pulse rounded-md bg-gray-200" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

