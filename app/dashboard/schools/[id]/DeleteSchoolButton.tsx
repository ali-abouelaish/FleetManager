'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

interface DeleteSchoolButtonProps {
  schoolId: number
  schoolName: string
  routeCount: number
  passengerCount: number
}

export default function DeleteSchoolButton({
  schoolId,
  schoolName,
  routeCount,
  passengerCount,
}: DeleteSchoolButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      // Delete the school - this will cascade delete routes, passengers, and crew
      const { error: deleteError } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolId)

      if (deleteError) throw deleteError

      // Audit log (non-blocking)
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'schools',
          record_id: schoolId,
          action: 'DELETE',
        }),
      }).catch(err => console.error('Audit log error:', err))

      router.push('/dashboard/schools')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the school')
      setDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <Card className="border-l-4 border-red-500 bg-red-50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  Confirm Deletion
                </h3>
                <p className="text-sm text-red-700 mb-3">
                  Are you sure you want to delete <strong>{schoolName}</strong>?
                </p>
                <div className="bg-red-100 border border-red-200 rounded p-3 mb-3">
                  <p className="text-xs font-semibold text-red-900 mb-1">This will permanently delete:</p>
                  <ul className="text-xs text-red-800 list-disc list-inside space-y-1">
                    <li>The school record</li>
                    <li><strong>{routeCount} route{routeCount !== 1 ? 's' : ''}</strong> and all associated data</li>
                    <li><strong>{passengerCount} passenger{passengerCount !== 1 ? 's' : ''}</strong></li>
                    <li>All crew assignments for this school</li>
                    <li>All route points, sessions, and attendance records</li>
                  </ul>
                  <p className="text-xs font-bold text-red-900 mt-2">This action cannot be undone!</p>
                </div>
                {error && (
                  <div className="mb-3 p-2 bg-red-200 border border-red-300 rounded text-xs text-red-900">
                    {error}
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowConfirm(false)
                      setError(null)
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete School'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Button
      variant="danger"
      onClick={() => setShowConfirm(true)}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete School
    </Button>
  )
}

