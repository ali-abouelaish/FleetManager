import { TableSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-44 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-64 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>

      <TableSkeleton 
        rows={8} 
        columns={6}
        headers={['ID', 'File Name', 'File Type', 'Employee', 'Uploaded By', 'Uploaded At']}
      />
    </div>
  )
}

