import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      role="status"
      aria-label="Loading..."
      {...props}
    />
  )
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 5,
  headers 
}: { 
  rows?: number
  columns?: number
  headers?: string[]
}) {
  return (
    <div className="rounded-md border bg-white shadow-sm" role="status" aria-label="Loading table...">
      <div className="w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          {/* Static headers - NEVER animated, always visible */}
          <thead className="bg-navy">
            <tr className="border-b">
              {headers ? (
                headers.map((header, i) => (
                  <th 
                    key={i} 
                    className="h-12 px-4 text-left align-middle font-semibold text-white"
                  >
                    {header}
                  </th>
                ))
              ) : (
                Array.from({ length: columns }).map((_, i) => (
                  <th 
                    key={i} 
                    className="h-12 px-4 text-left align-middle font-semibold text-white"
                  >
                    <div className="h-4 w-24 rounded bg-blue-800" />
                  </th>
                ))
              )}
            </tr>
          </thead>
          {/* Animated body rows only */}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'border-b transition-opacity',
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                )}
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="p-4 align-middle">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm" role="status" aria-label="Loading card...">
      <Skeleton className="mb-4 h-6 w-1/3" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm" role="status" aria-label="Loading form...">
      <Skeleton className="mb-6 h-8 w-1/4" />
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex justify-end space-x-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-white p-6 shadow-sm">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="mb-2 h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export function DetailViewSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading details...">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <CardSkeleton />
    </div>
  )
}

