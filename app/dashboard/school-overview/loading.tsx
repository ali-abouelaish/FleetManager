import { CardSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-64 animate-pulse rounded-md bg-gray-200" />
        <div className="h-5 w-96 animate-pulse rounded-md bg-gray-200" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-48 animate-pulse rounded-md bg-gray-200" />
                <div className="h-4 w-64 animate-pulse rounded-md bg-gray-200" />
              </div>
              <div className="h-10 w-32 animate-pulse rounded-md bg-gray-200" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-16 w-full animate-pulse rounded-md bg-gray-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

