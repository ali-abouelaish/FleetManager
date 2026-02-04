'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ArrowLeft, Trash2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function EditSchoolPageClient({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    ref_number: '',
    phone_number: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
  })

  useEffect(() => {
    async function loadSchool() {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching school:', error)
        setError('Failed to load school')
        return
      }

      if (!data) {
        setError('School not found')
        return
      }

      if (data) {
        setFormData({
          name: data.name || '',
          address: data.address || '',
          ref_number: data.ref_number || '',
          phone_number: data.phone_number || '',
          contact_name: data.contact_name || '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
        })
      }
    }

    loadSchool()
  }, [id, supabase])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase
        .from('schools')
        .update(formData)
        .eq('id', id)

      if (error) throw error

      // Audit log (non-blocking)
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'schools',
          record_id: parseInt(id),
          action: 'UPDATE',
        }),
      }).catch(err => console.error('Audit log error:', err))

      router.push(`/dashboard/schools/${id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this school? This will affect related routes and passengers.')) {
      return
    }

    setDeleting(true)

    try {
      const { error } = await supabase.from('schools').delete().eq('id', id)

      if (error) throw error

      // Audit log (non-blocking)
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'schools',
          record_id: parseInt(id),
          action: 'DELETE',
        }),
      }).catch(err => console.error('Audit log error:', err))

      router.push('/dashboard/schools')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/schools/${id}`}>
          <Button variant="outline" size="sm" className="h-9 px-3 gap-2 text-slate-600 border-slate-300 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Edit School</h1>
          <p className="text-sm text-slate-500">Update school information</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* School Details Section */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">School Information</h2>
        </div>
        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Name + Ref Number */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-medium text-slate-600">School Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Hamilton School"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ref_number" className="text-xs font-medium text-slate-600">Reference Number</Label>
                <Input
                  id="ref_number"
                  value={formData.ref_number}
                  onChange={(e) => setFormData({ ...formData, ref_number: e.target.value })}
                  placeholder="e.g., SCH001"
                  className="h-9"
                />
              </div>
            </div>

            {/* Row 2: Address */}
            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs font-medium text-slate-600">School Address</Label>
              <textarea
                id="address"
                rows={2}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#023E8A] focus:border-transparent"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full school address..."
              />
            </div>

            {/* Row 3: Phone */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="phone_number" className="text-xs font-medium text-slate-600">School Phone</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="e.g., 0121 464 1676"
                  className="h-9"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Contact Information Section */}
        <div className="border-t border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Contact Information</h2>
        </div>
        <div className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="contact_name" className="text-xs font-medium text-slate-600">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="e.g., Sarah Eaton"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact_phone" className="text-xs font-medium text-slate-600">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="e.g., 0121 464 1676"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact_email" className="text-xs font-medium text-slate-600">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="e.g., contact@school.edu"
                className="h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
        <Link href={`/dashboard/schools/${id}`}>
          <Button variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-50">
            Cancel
          </Button>
        </Link>
        <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete School'}
        </Button>
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#023E8A] hover:bg-[#023E8A]/90 text-white">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

export default async function EditSchoolPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditSchoolPageClient id={id} />
}
