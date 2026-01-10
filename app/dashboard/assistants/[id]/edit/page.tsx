'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ArrowLeft, AlertCircle } from 'lucide-react'

interface PassengerAssistant {
  id: number
  employee_id: number
  tas_badge_number: string | null
  tas_badge_expiry_date: string | null
  dbs_number: string | null
  employees: {
    id: number
    full_name: string
  }
}

export default function EditPassengerAssistantPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assistant, setAssistant] = useState<PassengerAssistant | null>(null)

  const [formData, setFormData] = useState({
    tas_badge_number: '',
    tas_badge_expiry_date: '',
    dbs_number: '',
  })
  const [badgePhotoFile, setBadgePhotoFile] = useState<File | null>(null)

  useEffect(() => {
    loadAssistant()
  }, [params.id])

  const loadAssistant = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('passenger_assistants')
      .select(`
        *,
        employees (
          id,
          full_name
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !data) {
      setError('Passenger assistant not found')
      setLoading(false)
      return
    }

    setAssistant(data as PassengerAssistant)
    setFormData({
      tas_badge_number: data.tas_badge_number || '',
      tas_badge_expiry_date: data.tas_badge_expiry_date ? data.tas_badge_expiry_date.split('T')[0] : '',
      dbs_number: data.dbs_number || '',
    })
    setLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const { error: updateError } = await supabase
        .from('passenger_assistants')
        .update({
          tas_badge_number: formData.tas_badge_number || null,
          tas_badge_expiry_date: formData.tas_badge_expiry_date || null,
          dbs_number: formData.dbs_number || null,
        })
        .eq('id', params.id)

      if (updateError) throw updateError

      // Upload badge photo if provided
      if (badgePhotoFile && assistant) {
        const fileExt = badgePhotoFile.name.split('.').pop()
        const fileName = `assistants/${assistant.employee_id}/badge_photo_${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ROUTE_DOCUMENTS')
          .upload(fileName, badgePhotoFile)

        if (uploadError) {
          console.error('Error uploading badge photo:', uploadError)
          // Continue even if upload fails
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('ROUTE_DOCUMENTS')
            .getPublicUrl(fileName)

          // Save to documents table
          const { error: docError } = await supabase.from('documents').insert({
            employee_id: assistant.employee_id,
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

      // Audit log
      try {
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: 'passenger_assistants',
            record_id: parseInt(params.id),
            action: 'UPDATE',
          }),
        })
      } catch (err) {
        console.error('Audit log error:', err)
      }

      router.push(`/dashboard/assistants/${params.id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred while updating the passenger assistant')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/assistants/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy">Edit Passenger Assistant</h1>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!assistant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/assistants">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy">Passenger Assistant Not Found</h1>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/assistants/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-navy">Edit Passenger Assistant</h1>
          <p className="mt-2 text-sm text-gray-600">{assistant.employees?.full_name || 'Unknown'}</p>
        </div>
      </div>

      {error && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Required Certificates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Required Certificates Warning */}
            <Card className="border-l-4 border-red-500 bg-red-50">
              <CardContent className="py-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">
                      ⚠️ Required Certificates Policy
                    </h3>
                    <p className="text-sm text-red-700">
                      <strong>Passenger Assistants MUST have this certificate with date set:</strong>
                    </p>
                    <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                      <li>TAS Badge expiry date</li>
                    </ul>
                    <p className="text-sm text-red-700 mt-2">
                      <strong>Without this date, the passenger assistant will be flagged as "CANNOT WORK"</strong> and will not be authorized for routes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TAS Badge */}
            <div className="space-y-4 p-4 border-2 border-red-200 rounded-lg bg-red-50">
              <h3 className="font-semibold text-navy flex items-center">
                TAS Badge
                <span className="ml-2 text-xs text-red-600 font-bold">REQUIRED</span>
              </h3>
              <div>
                <Label htmlFor="tas_badge_number">Badge Number</Label>
                <Input
                  id="tas_badge_number"
                  name="tas_badge_number"
                  value={formData.tas_badge_number}
                  onChange={handleInputChange}
                  placeholder="e.g., TAS12345"
                />
              </div>
              <div>
                <Label htmlFor="tas_badge_expiry_date">
                  Expiry Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  id="tas_badge_expiry_date"
                  name="tas_badge_expiry_date"
                  value={formData.tas_badge_expiry_date}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-red-600 mt-1">⚠️ Required for passenger assistant to work</p>
              </div>
            </div>

            {/* DBS Certificate */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-semibold text-navy">DBS Certificate</h3>
              <div>
                <Label htmlFor="dbs_number">DBS Number</Label>
                <Input
                  id="dbs_number"
                  name="dbs_number"
                  value={formData.dbs_number}
                  onChange={handleInputChange}
                  placeholder="e.g., DBS123456789"
                />
              </div>
            </div>

            {/* Badge Photo Upload */}
            <div className="space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-semibold text-navy">Badge Photo</h3>
              <div>
                <Label htmlFor="badge_photo">Upload Badge Photo</Label>
                <input
                  type="file"
                  id="badge_photo"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => setBadgePhotoFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Upload a photo for the passenger assistant's ID badge (JPG, PNG)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/assistants/${params.id}`}>
            <Button type="button" variant="ghost" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}


