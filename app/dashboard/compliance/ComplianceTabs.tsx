'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardCheck, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ComplianceTabs() {
  const pathname = usePathname()
  const isCases = pathname?.startsWith('/dashboard/compliance/cases')

  return (
    <div className="border-b border-slate-200">
      <nav className="flex gap-1" aria-label="Compliance tabs">
        <Link
          href="/dashboard/compliance"
          prefetch={true}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
            !isCases
              ? 'border-violet-500 text-violet-700 bg-violet-50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <ClipboardCheck className="h-4 w-4" />
          Notifications
        </Link>
        <Link
          href="/dashboard/compliance/cases"
          prefetch={true}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
            isCases
              ? 'border-violet-500 text-violet-700 bg-violet-50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <FolderOpen className="h-4 w-4" />
          Cases
        </Link>
      </nav>
    </div>
  )
}
