import { TableSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-64 animate-pulse rounded-md bg-gray-200" />
        <div className="h-5 w-96 animate-pulse rounded-md bg-gray-200" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex space-x-8 px-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-4">
              <div className="h-10 w-32 animate-pulse rounded-md bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Tables skeleton */}
      <div className="space-y-6">
        <TableSkeleton
          rows={5}
          columns={5}
          headers={['Name', 'Identifier', 'Certificate Type', 'Expiry Date', 'Days Remaining']}
        />
      </div>
    </div>
  )
}

