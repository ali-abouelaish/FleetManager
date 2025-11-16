import { StatsSkeleton, CardSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-48 animate-pulse rounded-md bg-gray-200" />
        <div className="h-5 w-80 animate-pulse rounded-md bg-gray-200" />
      </div>

      <StatsSkeleton />

      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}

