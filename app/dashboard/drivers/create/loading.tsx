import { FormSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-64 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-96 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>

      <div className="h-12 w-full animate-pulse rounded-md bg-gray-200" />

      <FormSkeleton fields={12} />
    </div>
  )
}

