'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
function EditEmployeePageClient({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [badgePhotoFile, setBadgePhotoFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    employment_status: 'Active',
    phone_number: '',
    personal_email: '',
    address: '',
    start_date: '',
    end_date: '',
    wheelchair_access: false,
  })

  useEffect(() => {
    async function loadEmployee() {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError('Failed to load employee')
        return
      }

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          role: data.role || '',
          employment_status: data.employment_status || 'Active',
          phone_number: data.phone_number || '',
          personal_email: data.personal_email || '',
          address: data.address || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          wheelchair_access: data.wheelchair_access || false,
        })
      }
    }

    loadEmployee()
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          ...formData,
          end_date: formData.end_date || null, // Set to null if empty
        })
        .eq('id', id)

      if (error) throw error

      // Upload badge photo if provided
      if (badgePhotoFile) {
        const fileExt = badgePhotoFile.name.split('.').pop()
        const fileName = `employees/${id}/badge_photo_${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('EMPLOYEE_DOCUMENTS')
          .upload(fileName, badgePhotoFile)

        if (uploadError) {
          console.error('Error uploading badge photo:', uploadError)
          // Continue even if upload fails
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('EMPLOYEE_DOCUMENTS')
            .getPublicUrl(fileName)

          // Save to documents table
          const { error: docError } = await supabase.from('documents').insert({
            employee_id: parseInt(id),
            file_name: badgePhotoFile.name,
            file_type: badgePhotoFile.type || 'image/jpeg',
            file_path: fileName,
            file_url: publicUrl,
            doc_type: 'ID Badge Photo',
            uploaded_by: null,
          })
          if (docError) {
            console.error('Error saving badge photo document:', docError)
          }
        }
      }

      // Log audit
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'employees',
          record_id: parseInt(id),
          action: 'UPDATE',
        }),
      })

      router.push(`/dashboard/employees/${id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this employee?')) {
      return
    }

    setDeleting(true)

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id)

      if (error) throw error

      // Log audit
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'employees',
          record_id: parseInt(id),
          action: 'DELETE',
        }),
      })

      router.push('/dashboard/employees')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/employees/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
            <p className="mt-2 text-sm text-gray-600">
              Update employee information
            </p>
          </div>
        </div>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="">Select role</option>
                  <option value="Driver">Driver</option>
                  <option value="PA">Passenger Assistant</option>
                  <option value="Coordinator">Coordinator</option>
                  <option value="Admin">Admin</option>
                  <option value="Other">Other</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employment_status">Employment Status</Label>
                <Select
                  id="employment_status"
                  value={formData.employment_status}
                  onChange={(e) =>
                    setFormData({ ...formData, employment_status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal_email">Personal Email</Label>
                <Input
                  id="personal_email"
                  type="email"
                  value={formData.personal_email}
                  onChange={(e) =>
                    setFormData({ ...formData, personal_email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Full address..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="wheelchair_access"
                  checked={formData.wheelchair_access}
                  onChange={(e) =>
                    setFormData({ ...formData, wheelchair_access: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="wheelchair_access">Wheelchair Access</Label>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="badge_photo">Badge Photo</Label>
                <input
                  type="file"
                  id="badge_photo"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => setBadgePhotoFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
                />
                <p className="text-xs text-gray-500">Upload a photo for the employee's ID badge (JPG, PNG)</p>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/dashboard/employees/${id}`}>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditEmployeePageClient id={id} />
}

