import { TableSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-40 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-72 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-md bg-gray-200" />
      </div>

      <TableSkeleton 
        rows={8} 
        columns={8}
        headers={['Date/Time', 'Caller', 'Type', 'Subject', 'Related To', 'Priority', 'Status', 'Actions']}
      />
    </div>
  )
}

