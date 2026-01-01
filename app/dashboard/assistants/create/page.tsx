'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Employee {
  id: number
  full_name: string
  role: string
  employment_status: string
}

export default function CreatePassengerAssistantPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])

  const [formData, setFormData] = useState({
    employee_id: '',
    tas_badge_number: '',
    tas_badge_expiry_date: '',
    dbs_number: '',
  })
  const [badgePhotoFile, setBadgePhotoFile] = useState<File | null>(null)

  useEffect(() => {
    async function loadEmployees() {
      // Fetch employees who are not already passenger assistants or drivers
      const [existingPAs, existingDrivers] = await Promise.all([
        supabase.from('passenger_assistants').select('employee_id'),
        supabase.from('drivers').select('employee_id'),
      ])

      const paIds = existingPAs.data?.map(pa => pa.employee_id) || []
      const driverIds = existingDrivers.data?.map(d => d.employee_id) || []
      const excludedIds = Array.from(new Set([...paIds, ...driverIds]))

      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, role, employment_status')
        .eq('employment_status', 'Active')
        .order('full_name')

      if (!error && data) {
        // Filter out employees who are already PAs or drivers
        const availableEmployees = data.filter(emp => !excludedIds.includes(emp.id))
        setEmployees(availableEmployees)
      }
    }
    loadEmployees()
  }, [supabase])

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

    if (!formData.employee_id) {
      setError('Please select an employee')
      return
    }

    setLoading(true)

    try {
      // Verify employee exists
      const { data: employeeCheck, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', parseInt(formData.employee_id))
        .single()

      if (employeeError || !employeeCheck) {
        throw new Error(`Employee with ID ${formData.employee_id} does not exist`)
      }

      // Check if employee is already a PA
      const { data: existingPA } = await supabase
        .from('passenger_assistants')
        .select('employee_id')
        .eq('employee_id', parseInt(formData.employee_id))
        .maybeSingle()

      if (existingPA) {
        throw new Error('This employee is already registered as a passenger assistant')
      }

      // Insert passenger assistant record
      const { data: assistantResult, error: insertError } = await supabase
        .from('passenger_assistants')
        .insert([{
          employee_id: parseInt(formData.employee_id),
          tas_badge_number: formData.tas_badge_number || null,
          tas_badge_expiry_date: formData.tas_badge_expiry_date || null,
          dbs_number: formData.dbs_number || null,
        }])
        .select()

      if (insertError) throw insertError

      // Upload badge photo if provided
      if (badgePhotoFile && assistantResult && assistantResult[0]) {
        const employeeId = parseInt(formData.employee_id)
        const fileExt = badgePhotoFile.name.split('.').pop()
        const fileName = `assistants/${employeeId}/badge_photo_${Date.now()}.${fileExt}`
        
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
            employee_id: employeeId,
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
      if (assistantResult && assistantResult[0]) {
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: 'passenger_assistants',
            record_id: assistantResult[0].id,
            action: 'CREATE',
          }),
        }).catch(err => console.error('Audit log error:', err))
      }

      router.push('/dashboard/assistants')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred while creating the passenger assistant')
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-navy">Create Passenger Assistant</h1>
          <p className="mt-2 text-sm text-gray-600">Register a new passenger assistant</p>
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
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employee_id">
                Employee <span className="text-red-500">*</span>
              </Label>
              <select
                id="employee_id"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select an employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.role || 'N/A'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Only active employees who are not already registered as drivers or passenger assistants are shown.
              </p>
            </div>
          </CardContent>
        </Card>

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
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
                />
                <p className="text-xs text-gray-500 mt-1">Upload a photo for the passenger assistant's ID badge (JPG, PNG)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link href="/dashboard/assistants">
            <Button type="button" variant="ghost" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !formData.employee_id}>
            {loading ? 'Creating...' : 'Create Passenger Assistant'}
          </Button>
        </div>
      </form>
    </div>
  )
}

