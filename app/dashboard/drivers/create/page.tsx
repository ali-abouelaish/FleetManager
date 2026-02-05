'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Upload, Save, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface Employee {
  id: number
  full_name: string
  role: string
  employment_status: string
}

export default function CreateDriverPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({})
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeTab, setActiveTab] = useState<'basic' | 'certificates' | 'documents' | 'training'>('basic')

  const [formData, setFormData] = useState({
    employee_id: '',
    spare_driver: false,
    tas_badge_number: '',
    tas_badge_expiry_date: '',
    dbs_number: '',
    psv_license: false,
    first_aid_certificate_expiry_date: '',
    passport_expiry_date: '',
    driving_license_expiry_date: '',
    cpc_expiry_date: '',
    utility_bill_date: '',
    birth_certificate: false,
    marriage_certificate: false,
    photo_taken: false,
    private_hire_badge: false,
    paper_licence: false,
    taxi_plate_photo: false,
    logbook: false,
    safeguarding_training_completed: false,
    safeguarding_training_date: '',
    tas_pats_training_completed: false,
    tas_pats_training_date: '',
    psa_training_completed: false,
    psa_training_date: '',
    additional_notes: '',
  })

  // File uploads state
  const [fileUploads, setFileUploads] = useState<{[key: string]: File | null}>({
    tas_badge_file: null,
    dbs_file: null,
    first_aid_file: null,
    passport_file: null,
    driving_license_file: null,
    cpc_file: null,
    utility_bill_file: null,
    birth_cert_file: null,
    marriage_cert_file: null,
    photo_file: null,
    private_hire_badge_file: null,
    paper_licence_file: null,
    taxi_plate_photo_file: null,
    logbook_file: null,
    badge_photo_file: null,
  })

  useEffect(() => {
    async function loadEmployees() {
      // Fetch employees who are not already drivers
      const { data: existingDrivers } = await supabase
        .from('drivers')
        .select('employee_id')

      const driverIds = existingDrivers?.map(d => d.employee_id) || []

      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, role, employment_status')
        .eq('employment_status', 'Active')
        .order('full_name')

      if (!error && data) {
        // Filter out employees who are already drivers
        const availableEmployees = data.filter(emp => !driverIds.includes(emp.id))
        setEmployees(availableEmployees)
      }
    }
    loadEmployees()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    // Clear general error when user makes changes
    if (error) {
      setError(null)
    }
  }

  const handleFileChange = (fieldName: string, file: File | null) => {
    setFileUploads(prev => ({
      ...prev,
      [fieldName]: file
    }))
  }

  // Validation function for each tab
  const validateTab = (tab: typeof activeTab): { isValid: boolean; errors: {[key: string]: string} } => {
    const errors: {[key: string]: string} = {}
    
    if (tab === 'basic') {
      if (!formData.employee_id || formData.employee_id.trim() === '') {
        errors.employee_id = 'Please select an employee'
      }
    }
    
    if (tab === 'certificates') {
      if (!formData.tas_badge_expiry_date || formData.tas_badge_expiry_date.trim() === '') {
        errors.tas_badge_expiry_date = 'TAS Badge expiry date is required'
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  const handleNext = () => {
    // Validate current tab before allowing navigation
    const validation = validateTab(activeTab)
    
    if (!validation.isValid) {
      setFieldErrors(validation.errors)
      setError('Please fill in all required fields before proceeding')
      return
    }
    
    // Clear errors if validation passes
    setFieldErrors({})
    setError(null)
    
    const tabs: typeof activeTab[] = ['basic', 'certificates', 'documents', 'training']
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1])
    }
  }
  
  // Check if current tab is valid (for enabling/disabling Next button)
  const isCurrentTabValid = () => {
    const validation = validateTab(activeTab)
    return validation.isValid
  }

  const handlePrevious = () => {
    const tabs: typeof activeTab[] = ['basic', 'certificates', 'documents', 'training']
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required fields before submission
    const allTabs: typeof activeTab[] = ['basic', 'certificates']
    const allErrors: {[key: string]: string} = {}
    
    for (const tab of allTabs) {
      const validation = validateTab(tab)
      Object.assign(allErrors, validation.errors)
    }
    
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors)
      setError('Please fill in all required fields before submitting')
      // Switch to the first tab with errors
      if (allErrors.employee_id) {
        setActiveTab('basic')
      } else if (allErrors.tas_badge_expiry_date) {
        setActiveTab('certificates')
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Upload files to Supabase Storage if needed
      // Using DRIVER_DOCUMENTS bucket (same as passenger assistants)
      const uploadedDocuments: Array<{
        fileUrl: string
        fileName: string
        fileType: string
        docType: string
        filePath: string
      }> = []
      
      // Map file keys to document types
      const fileKeyToDocType: {[key: string]: string} = {
        tas_badge_file: 'TAS Badge',
        dbs_file: 'DBS Certificate',
        first_aid_file: 'First Aid Certificate',
        passport_file: 'Passport',
        driving_license_file: 'Driving License',
        cpc_file: 'CPC Certificate',
        utility_bill_file: 'Utility Bill',
        birth_cert_file: 'Birth Certificate',
        marriage_cert_file: 'Marriage Certificate',
        photo_file: 'Photo',
        private_hire_badge_file: 'Private Hire Badge',
        paper_licence_file: 'Paper Licence',
        taxi_plate_photo_file: 'Taxi Plate Photo',
        logbook_file: 'Logbook',
        badge_photo_file: 'ID Badge Photo',
      }
      
      for (const [key, file] of Object.entries(fileUploads)) {
        if (file) {
          const fileExt = file.name.split('.').pop()
          const fileName = `drivers/${formData.employee_id}/${key}_${Date.now()}.${fileExt}`
          
          const { data, error } = await supabase.storage
            .from('DRIVER_DOCUMENTS')
            .upload(fileName, file)

          if (error) {
            console.error(`Error uploading file ${file.name}:`, error)
            // Provide helpful error message for bucket not found
            if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
              throw new Error('Storage bucket "DRIVER_DOCUMENTS" not found. Please create a public bucket named "DRIVER_DOCUMENTS" in your Supabase Storage settings.')
            }
            throw error
          }

          if (data) {
            const { data: { publicUrl } } = supabase.storage
              .from('DRIVER_DOCUMENTS')
              .getPublicUrl(fileName)
            
            uploadedDocuments.push({
              fileUrl: publicUrl,
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              docType: fileKeyToDocType[key] || 'Certificate',
              filePath: fileName,
            })
          }
        }
      }

      // Insert driver record
      const driverData = {
        employee_id: parseInt(formData.employee_id),
        tas_badge_number: formData.tas_badge_number || null,
        tas_badge_expiry_date: formData.tas_badge_expiry_date || null,
        dbs_number: formData.dbs_number || null,
        psv_license: formData.psv_license,
        first_aid_certificate_expiry_date: formData.first_aid_certificate_expiry_date || null,
        passport_expiry_date: formData.passport_expiry_date || null,
        driving_license_expiry_date: formData.driving_license_expiry_date || null,
        cpc_expiry_date: formData.cpc_expiry_date || null,
        utility_bill_date: formData.utility_bill_date || null,
        birth_certificate: formData.birth_certificate,
        marriage_certificate: formData.marriage_certificate,
        photo_taken: formData.photo_taken,
        private_hire_badge: formData.private_hire_badge,
        paper_licence: formData.paper_licence,
        taxi_plate_photo: formData.taxi_plate_photo,
        logbook: formData.logbook,
        safeguarding_training_completed: formData.safeguarding_training_completed,
        safeguarding_training_date: formData.safeguarding_training_date || null,
        tas_pats_training_completed: formData.tas_pats_training_completed,
        tas_pats_training_date: formData.tas_pats_training_date || null,
        psa_training_completed: formData.psa_training_completed,
        psa_training_date: formData.psa_training_date || null,
        additional_notes: formData.additional_notes || null,
        spare_driver: formData.spare_driver,
      }

      // Verify employee exists before insert
      const { data: employeeCheck, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', parseInt(formData.employee_id))
        .single()

      if (employeeError || !employeeCheck) {
        throw new Error(`Employee with ID ${formData.employee_id} does not exist`)
      }

      // Check if employee is already a driver
      const { data: existingDriver, error: driverCheckError } = await supabase
        .from('drivers')
        .select('employee_id')
        .eq('employee_id', parseInt(formData.employee_id))
        .maybeSingle()

      if (existingDriver) {
        throw new Error('This employee is already registered as a driver')
      }

      const { data: driverResult, error: insertError } = await supabase
        .from('drivers')
        .insert([driverData])
        .select()

      if (insertError) throw insertError

      // Audit log
      if (driverResult && driverResult[0]) {
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: 'drivers',
            record_id: driverResult[0].employee_id,
            action: 'CREATE',
          }),
        }).catch(err => console.error('Audit log error:', err))
      }

      // Create document records in the documents table (match working employee/vehicle document inserts)
      if (uploadedDocuments.length > 0) {
        const documentRecords = uploadedDocuments.map(doc => ({
          employee_id: parseInt(formData.employee_id),
          file_name: doc.fileName,
          file_type: doc.fileType,
          file_path: doc.filePath,
          file_url: doc.fileUrl,
          doc_type: doc.docType,
          uploaded_by: null,
        }))

        const { error: documentsError } = await supabase
          .from('documents')
          .insert(documentRecords)

        if (documentsError) {
          console.error('Error creating document records:', documentsError)
          setError(`Driver created but failed to save documents: ${documentsError.message}`)
        }
      }

      router.push('/dashboard/drivers')
    } catch (err: any) {
      console.error('Error creating driver:', err)
      setError(err.message || 'Failed to create driver')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/drivers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy">Add New Driver</h1>
            <p className="mt-2 text-sm text-gray-600">
              Register a new driver with all required certifications
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 mb-1">{error}</p>
                {Object.keys(fieldErrors).length > 0 && (
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                    {Object.values(fieldErrors).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Form sections">
          {[
            { id: 'basic', label: '👤 Basic Info', icon: '👤' },
            { id: 'certificates', label: '📜 Certificates', icon: '📜' },
            { id: 'documents', label: '📄 Documents', icon: '📄' },
            { id: 'training', label: '🎓 Training', icon: '🎓' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                border-b-2 px-1 py-4 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <Label htmlFor="employee_id">
                  Select Employee <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="employee_id"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleInputChange}
                  required
                  error={!!fieldErrors.employee_id}
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.role})
                    </option>
                  ))}
                </Select>
                {fieldErrors.employee_id && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {fieldErrors.employee_id}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Only active employees who are not already drivers are shown
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="spare_driver"
                  name="spare_driver"
                  checked={formData.spare_driver}
                  onChange={(e) => setFormData({ ...formData, spare_driver: e.target.checked })}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <Label htmlFor="spare_driver" className="cursor-pointer font-medium">
                  Mark as spare
                </Label>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Spare drivers are not assigned to a route and can be used when needed (e.g. for sessions). View them under Spares → Spare Drivers.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="psv_license">PSV License</Label>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="psv_license"
                      name="psv_license"
                      checked={formData.psv_license}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <label htmlFor="psv_license" className="ml-2 text-sm text-gray-700">
                      Employee has PSV License
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="additional_notes">Additional Notes / HR Comments</Label>
                <textarea
                  id="additional_notes"
                  name="additional_notes"
                  value={formData.additional_notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-navy focus:outline-none focus:ring-navy sm:text-sm"
                  placeholder="Any additional information about the driver..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons for Basic Info */}
        {activeTab === 'basic' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end space-x-4">
                <Link href="/dashboard/drivers">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="button" 
                  onClick={handleNext}
                  disabled={!isCurrentTabValid()}
                  className={!isCurrentTabValid() ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Certificates & Expiry Dates</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
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
                        <strong>Drivers MUST have this certificate with date set:</strong>
                      </p>
                      <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                        <li>TAS Badge expiry date</li>
                      </ul>
                      <p className="text-sm text-red-700 mt-2">
                        <strong>Without this date, the driver will be flagged as "CANNOT WORK"</strong> and will not be authorized for routes.
                      </p>
                      <p className="text-sm text-red-600 mt-2 italic">
                        Note: Taxi Badge is now tracked on vehicles, not drivers.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
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
                      className={fieldErrors.tas_badge_expiry_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {fieldErrors.tas_badge_expiry_date && (
                      <p className="text-xs text-red-600 mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {fieldErrors.tas_badge_expiry_date}
                      </p>
                    )}
                    <p className="text-xs text-red-600 mt-1">⚠️ Required for driver to work</p>
                  </div>
                  <div>
                    <Label htmlFor="tas_badge_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="tas_badge_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('tas_badge_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
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
                  <div>
                    <Label htmlFor="dbs_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="dbs_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('dbs_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* First Aid */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">First Aid Certificate</h3>
                  <div>
                    <Label htmlFor="first_aid_certificate_expiry_date">Expiry Date</Label>
                    <Input
                      type="date"
                      id="first_aid_certificate_expiry_date"
                      name="first_aid_certificate_expiry_date"
                      value={formData.first_aid_certificate_expiry_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="first_aid_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="first_aid_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('first_aid_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* Passport */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Passport</h3>
                  <div>
                    <Label htmlFor="passport_expiry_date">Expiry Date</Label>
                    <Input
                      type="date"
                      id="passport_expiry_date"
                      name="passport_expiry_date"
                      value={formData.passport_expiry_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passport_file">Upload Copy</Label>
                    <input
                      type="file"
                      id="passport_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('passport_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* Driving License */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Driving License</h3>
                  <div>
                    <Label htmlFor="driving_license_expiry_date">Expiry Date</Label>
                    <Input
                      type="date"
                      id="driving_license_expiry_date"
                      name="driving_license_expiry_date"
                      value={formData.driving_license_expiry_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="driving_license_file">Upload License</Label>
                    <input
                      type="file"
                      id="driving_license_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('driving_license_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* CPC Certificate */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">CPC Certificate</h3>
                  <div>
                    <Label htmlFor="cpc_expiry_date">Expiry Date</Label>
                    <Input
                      type="date"
                      id="cpc_expiry_date"
                      name="cpc_expiry_date"
                      value={formData.cpc_expiry_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpc_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="cpc_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('cpc_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* Utility Bill */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Utility Bill</h3>
                  <div>
                    <Label htmlFor="utility_bill_date">Date</Label>
                    <Input
                      type="date"
                      id="utility_bill_date"
                      name="utility_bill_date"
                      value={formData.utility_bill_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="utility_bill_file">Upload Bill</Label>
                    <input
                      type="file"
                      id="utility_bill_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('utility_bill_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons for Certificates */}
        {activeTab === 'certificates' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between space-x-4">
                <Button type="button" variant="secondary" onClick={handlePrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex space-x-4">
                  <Link href="/dashboard/drivers">
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="button" 
                    onClick={handleNext}
                    disabled={!isCurrentTabValid()}
                    className={!isCurrentTabValid() ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Document Checklist</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="birth_certificate"
                    name="birth_certificate"
                    checked={formData.birth_certificate}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <label htmlFor="birth_certificate" className="ml-2 text-sm text-gray-700">
                    Birth Certificate
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="marriage_certificate"
                    name="marriage_certificate"
                    checked={formData.marriage_certificate}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <label htmlFor="marriage_certificate" className="ml-2 text-sm text-gray-700">
                    Marriage Certificate
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="photo_taken"
                    name="photo_taken"
                    checked={formData.photo_taken}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <label htmlFor="photo_taken" className="ml-2 text-sm text-gray-700">
                    Photo Taken
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="private_hire_badge"
                    name="private_hire_badge"
                    checked={formData.private_hire_badge}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <label htmlFor="private_hire_badge" className="ml-2 text-sm text-gray-700">
                    Private Hire Badge
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="paper_licence"
                    name="paper_licence"
                    checked={formData.paper_licence}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <label htmlFor="paper_licence" className="ml-2 text-sm text-gray-700">
                    Paper Licence
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="taxi_plate_photo"
                    name="taxi_plate_photo"
                    checked={formData.taxi_plate_photo}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <label htmlFor="taxi_plate_photo" className="ml-2 text-sm text-gray-700">
                    Taxi Plate Photo
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="logbook"
                    name="logbook"
                    checked={formData.logbook}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                  <label htmlFor="logbook" className="ml-2 text-sm text-gray-700">
                    Logbook
                  </label>
                </div>
              </div>

              {/* Badge Photo Upload */}
              <div className="mt-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-navy mb-4">Badge Photo</h3>
                <div>
                  <Label htmlFor="badge_photo_file">Upload Badge Photo</Label>
                  <input
                    type="file"
                    id="badge_photo_file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('badge_photo_file', e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload a photo for the driver's ID badge (JPG, PNG)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Tab - OLD */}
        {false && activeTab === 'documents' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Document Checklist</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  { name: 'birth_certificate', label: 'Birth Certificate', fileKey: 'birth_cert_file' },
                  { name: 'marriage_certificate', label: 'Marriage Certificate', fileKey: 'marriage_cert_file' },
                  { name: 'photo_taken', label: 'Photo Taken', fileKey: 'photo_file' },
                  { name: 'private_hire_badge', label: 'Private Hire Badge', fileKey: 'private_hire_badge_file' },
                  { name: 'paper_licence', label: 'Paper Licence', fileKey: 'paper_licence_file' },
                  { name: 'taxi_plate_photo', label: 'Taxi Plate Photo', fileKey: 'taxi_plate_photo_file' },
                  { name: 'logbook', label: 'Logbook', fileKey: 'logbook_file' },
                ].map((doc) => (
                  <div key={doc.name} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={doc.name}
                        name={doc.name}
                        checked={(formData as any)[doc.name]}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                      />
                      <label htmlFor={doc.name} className="ml-2 text-sm font-medium text-gray-900">
                        {doc.label}
                      </label>
                    </div>
                    {doc.fileKey && (
                      <div>
                        <input
                          type="file"
                          id={doc.fileKey}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(doc.fileKey!, e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Badge Photo Upload */}
              <div className="mt-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-navy mb-4">Badge Photo</h3>
                <div>
                  <Label htmlFor="badge_photo_file">Upload Badge Photo</Label>
                  <input
                    type="file"
                    id="badge_photo_file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('badge_photo_file', e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload a photo for the driver's ID badge (JPG, PNG)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Tab - OLD */}
        {false && activeTab === 'documents' && (
          <div></div>
        )}

        {/* Navigation Buttons for Documents */}
        {activeTab === 'documents' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between space-x-4">
                <Button type="button" variant="secondary" onClick={handlePrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex space-x-4">
                  <Link href="/dashboard/drivers">
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="button" 
                    onClick={handleNext}
                    disabled={!isCurrentTabValid()}
                    className={!isCurrentTabValid() ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Training & Compliance</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-1">
                {/* Safeguarding Training */}
                <div className="space-y-4 p-6 border rounded-lg">
                  <h3 className="text-lg font-semibold text-navy">Safeguarding Training</h3>
                  <p className="text-sm text-gray-600">Mandatory child protection training</p>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="safeguarding_training_completed"
                      name="safeguarding_training_completed"
                      checked={formData.safeguarding_training_completed}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <label htmlFor="safeguarding_training_completed" className="ml-2 text-sm font-medium text-gray-900">
                      Training Completed
                    </label>
                  </div>
                  {formData.safeguarding_training_completed && (
                    <div>
                      <Label htmlFor="safeguarding_training_date">Completion Date</Label>
                      <Input
                        type="date"
                        id="safeguarding_training_date"
                        name="safeguarding_training_date"
                        value={formData.safeguarding_training_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>

                {/* TAS PATS Training */}
                <div className="space-y-4 p-6 border rounded-lg">
                  <h3 className="text-lg font-semibold text-navy">TAS PATS Training</h3>
                  <p className="text-sm text-gray-600">Passenger Assistant Training Scheme</p>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="tas_pats_training_completed"
                      name="tas_pats_training_completed"
                      checked={formData.tas_pats_training_completed}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <label htmlFor="tas_pats_training_completed" className="ml-2 text-sm font-medium text-gray-900">
                      Training Completed
                    </label>
                  </div>
                  {formData.tas_pats_training_completed && (
                    <div>
                      <Label htmlFor="tas_pats_training_date">Completion Date</Label>
                      <Input
                        type="date"
                        id="tas_pats_training_date"
                        name="tas_pats_training_date"
                        value={formData.tas_pats_training_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>

                {/* PSA Training */}
                <div className="space-y-4 p-6 border rounded-lg">
                  <h3 className="text-lg font-semibold text-navy">PSA Training</h3>
                  <p className="text-sm text-gray-600">Passenger Safety & Assistance</p>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="psa_training_completed"
                      name="psa_training_completed"
                      checked={formData.psa_training_completed}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <label htmlFor="psa_training_completed" className="ml-2 text-sm font-medium text-gray-900">
                      Training Completed
                    </label>
                  </div>
                  {formData.psa_training_completed && (
                    <div>
                      <Label htmlFor="psa_training_date">Completion Date</Label>
                      <Input
                        type="date"
                        id="psa_training_date"
                        name="psa_training_date"
                        value={formData.psa_training_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button - Only show on Training tab */}
        {activeTab === 'training' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between space-x-4">
                <Button type="button" variant="secondary" onClick={handlePrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex space-x-4">
                  <Link href="/dashboard/drivers">
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading || !formData.employee_id}>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'Creating...' : 'Create Driver'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  )
}

