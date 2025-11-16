import { TableSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-40 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-96 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>

      <TableSkeleton 
        rows={10} 
        columns={6}
        headers={['ID', 'Table', 'Record ID', 'Action', 'Changed By', 'Change Time']}
      />
    </div>
  )
}

