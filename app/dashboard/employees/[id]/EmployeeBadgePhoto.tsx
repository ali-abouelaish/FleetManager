'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EmployeeBadgePhotoProps {
  employeeId: number
  employeeName: string
  badgeNumber?: string | null
}

export default function EmployeeBadgePhoto({ employeeId, employeeName, badgeNumber }: EmployeeBadgePhotoProps) {
  const [badgePhotoUrl, setBadgePhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBadgePhoto() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documents')
        .select('file_url, file_path')
        .eq('employee_id', employeeId)
        .eq('doc_type', 'ID Badge Photo')
        .order('uploaded_at', { ascending: false })
        .limit(1)

      if (!error && data && data.length > 0) {
        const badgePhotoDoc = data[0]
        // Use file_url if available, otherwise get public URL from file_path
        if (badgePhotoDoc.file_url) {
          setBadgePhotoUrl(badgePhotoDoc.file_url)
        } else if (badgePhotoDoc.file_path) {
          const { data: { publicUrl } } = supabase.storage
            .from('EMPLOYEE_DOCUMENTS')
            .getPublicUrl(badgePhotoDoc.file_path)
          setBadgePhotoUrl(publicUrl)
        }
      }
      setLoading(false)
    }

    fetchBadgePhoto()
  }, [employeeId])

  const initials = employeeName
    ? employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'EM'

  if (loading) {
    return (
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center border-4 border-slate-300 shadow-lg animate-pulse">
          <span className="text-slate-400 text-2xl font-bold">...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {badgePhotoUrl ? (
        <img
          src={badgePhotoUrl}
          alt={`${employeeName} - ID Badge`}
          className="h-24 w-24 rounded-full object-cover border-4 border-violet-500 shadow-lg shadow-violet-500/25"
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center border-4 border-violet-500 shadow-lg shadow-violet-500/25">
          <span className="text-white text-2xl font-bold">
            {initials}
          </span>
        </div>
      )}
      {badgeNumber && (
        <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-violet-600 to-blue-700 text-white text-xs font-semibold px-2 py-1 rounded-full border-2 border-white shadow-md shadow-violet-500/25">
          {badgeNumber}
        </div>
      )}
    </div>
  )
}
