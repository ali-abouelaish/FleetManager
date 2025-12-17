'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function DeleteIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [incident, setIncident] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      const { id } = await params
      
      // Check permissions first - only super admin can delete
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setUnauthorized(true)
        setCheckingPermissions(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', authUser.email)
        .maybeSingle()

      if (!userData || userData.role !== 'super_admin') {
        setUnauthorized(true)
        setCheckingPermissions(false)
        return
      }

      // Load incident
      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single()

      if (incidentError || !incidentData) {
        setError('Incident not found')
        setCheckingPermissions(false)
        return
      }

      setIncident(incidentData)
      setCheckingPermissions(false)
    }

    loadData()
  }, [params, supabase])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    const { id } = await params

    try {
      // Delete related records first
      await supabase.from('incident_employees').delete().eq('incident_id', id)
      await supabase.from('incident_passengers').delete().eq('incident_id', id)

      // Delete the incident
      const { error: deleteError } = await supabase
        .from('incidents')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Audit log
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'incidents',
          record_id: parseInt(id),
          action: 'DELETE',
        }),
      }).catch(err => console.error('Audit log error:', err))

      router.push('/dashboard/incidents')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred while deleting the incident')
    } finally {
      setLoading(false)
    }
  }

  if (checkingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/incidents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-gray-600">Only super administrators can delete incidents.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Incident not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/incidents/${incident.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-red-600">Delete Incident #{incident.id}</h1>
          <p className="mt-2 text-sm text-gray-600">This action cannot be undone</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-red-600 text-white">
          <CardTitle>Confirm Deletion</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete incident <strong>#{incident.id}</strong>?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm font-medium text-gray-900 mb-2">Incident Details:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Type:</strong> {incident.incident_type || 'N/A'}</li>
                <li><strong>Status:</strong> {incident.resolved ? 'Resolved' : 'Open'}</li>
                <li><strong>Reported:</strong> {new Date(incident.reported_at).toLocaleString()}</li>
              </ul>
            </div>
            <p className="text-sm text-red-600 font-medium">
              ⚠️ This will permanently delete the incident and all related records. This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <Link href={`/dashboard/incidents/${incident.id}`}>
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {loading ? 'Deleting...' : 'Delete Incident'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

