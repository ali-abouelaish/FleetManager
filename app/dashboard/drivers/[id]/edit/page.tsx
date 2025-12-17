'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { ArrowLeft, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Driver {
  employee_id: number
  tas_badge_number: string | null
  tas_badge_expiry_date: string | null
  psv_license: boolean
  first_aid_certificate_expiry_date: string | null
  passport_expiry_date: string | null
  driving_license_expiry_date: string | null
  cpc_expiry_date: string | null
  utility_bill_date: string | null
  birth_certificate: boolean
  marriage_certificate: boolean
  photo_taken: boolean
  private_hire_badge: boolean
  paper_licence: boolean
  taxi_plate_photo: boolean
  logbook: boolean
  safeguarding_training_completed: boolean
  safeguarding_training_date: string | null
  tas_pats_training_completed: boolean
  tas_pats_training_date: string | null
  psa_training_completed: boolean
  psa_training_date: string | null
  additional_notes: string | null
  employees: {
    id: number
    full_name: string
  }
}

type TabType = 'basic' | 'certificates' | 'documents' | 'training'

export default function EditDriverPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [driver, setDriver] = useState<Driver | null>(null)

  const [formData, setFormData] = useState({
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
  })

  useEffect(() => {
    loadDriver()
  }, [params.id])

  const loadDriver = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        employees (
          id,
          full_name
        )
      `)
      .eq('employee_id', params.id)
      .single()

    if (error || !data) {
      setError('Driver not found')
      setLoading(false)
      return
    }

    setDriver(data as Driver)
    setFormData({
      tas_badge_number: data.tas_badge_number || '',
      tas_badge_expiry_date: data.tas_badge_expiry_date ? data.tas_badge_expiry_date.split('T')[0] : '',
      dbs_number: data.dbs_number || '',
      psv_license: data.psv_license || false,
      first_aid_certificate_expiry_date: data.first_aid_certificate_expiry_date ? data.first_aid_certificate_expiry_date.split('T')[0] : '',
      passport_expiry_date: data.passport_expiry_date ? data.passport_expiry_date.split('T')[0] : '',
      driving_license_expiry_date: data.driving_license_expiry_date ? data.driving_license_expiry_date.split('T')[0] : '',
      cpc_expiry_date: data.cpc_expiry_date ? data.cpc_expiry_date.split('T')[0] : '',
      utility_bill_date: data.utility_bill_date ? data.utility_bill_date.split('T')[0] : '',
      birth_certificate: data.birth_certificate || false,
      marriage_certificate: data.marriage_certificate || false,
      photo_taken: data.photo_taken || false,
      private_hire_badge: data.private_hire_badge || false,
      paper_licence: data.paper_licence || false,
      taxi_plate_photo: data.taxi_plate_photo || false,
      logbook: data.logbook || false,
      safeguarding_training_completed: data.safeguarding_training_completed || false,
      safeguarding_training_date: data.safeguarding_training_date ? data.safeguarding_training_date.split('T')[0] : '',
      tas_pats_training_completed: data.tas_pats_training_completed || false,
      tas_pats_training_date: data.tas_pats_training_date ? data.tas_pats_training_date.split('T')[0] : '',
      psa_training_completed: data.psa_training_completed || false,
      psa_training_date: data.psa_training_date ? data.psa_training_date.split('T')[0] : '',
      additional_notes: data.additional_notes || '',
    })
    setLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleFileChange = (fieldName: string, file: File | null) => {
    setFileUploads(prev => ({
      ...prev,
      [fieldName]: file
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Upload files to Supabase Storage if needed
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
      }
      
      for (const [key, file] of Object.entries(fileUploads)) {
        if (file && driver) {
          const fileExt = file.name.split('.').pop()
          const fileName = `drivers/${driver.employee_id}/${key}_${Date.now()}.${fileExt}`
          
          const { data, error } = await supabase.storage
            .from('ROUTE_DOCUMENTS')
            .upload(fileName, file)

          if (error) {
            console.error(`Error uploading file ${file.name}:`, error)
            // Provide helpful error message for bucket not found
            if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
              setError('Storage bucket "ROUTE_DOCUMENTS" not found. Please create a public bucket named "ROUTE_DOCUMENTS" in your Supabase Storage settings.')
            } else {
              setError(`Failed to upload ${file.name}: ${error.message}`)
            }
            continue
          }

          if (data) {
            const { data: { publicUrl } } = supabase.storage
              .from('ROUTE_DOCUMENTS')
              .getPublicUrl(fileName)
            
            const docType = fileKeyToDocType[key] || 'Certificate'
            console.log(`Uploaded file: ${file.name} as ${docType}`)
            
            uploadedDocuments.push({
              fileUrl: publicUrl,
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              docType: docType,
              filePath: fileName,
            })
          }
        }
      }

      const { error: updateError } = await supabase
        .from('drivers')
        .update({
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
        })
        .eq('employee_id', params.id)

      if (updateError) throw updateError

      // Audit log
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'drivers',
          record_id: parseInt(params.id),
          action: 'UPDATE',
        }),
      }).catch(err => console.error('Audit log error:', err))

      // Create document records in the documents table
      if (uploadedDocuments.length > 0 && driver) {
        const documentRecords = uploadedDocuments.map(doc => {
          const record = {
            employee_id: driver.employee_id,
            owner_type: 'employee',
            owner_id: driver.employee_id,
            file_url: JSON.stringify([doc.fileUrl]), // Store as JSON array for consistency
            file_name: doc.fileName,
            file_type: doc.fileType,
            file_path: doc.fileUrl, // Store URL for backward compatibility
            doc_type: doc.docType,
            uploaded_at: new Date().toISOString(),
          }
          console.log(`Creating document record for ${doc.docType}:`, record)
          return record
        })

        const { data: insertedDocs, error: documentsError } = await supabase
          .from('documents')
          .insert(documentRecords)
          .select()

        if (documentsError) {
          console.error('Error creating document records:', documentsError)
          setError(`Driver updated but failed to save documents: ${documentsError.message}`)
        } else {
          console.log(`Successfully inserted ${insertedDocs?.length || 0} document(s):`, insertedDocs)
        }
      } else if (uploadedDocuments.length > 0 && !driver) {
        console.error('Cannot create documents: driver data is missing')
        setError('Driver data is missing. Cannot save documents.')
      }

      router.push(`/dashboard/drivers/${params.id}`)
    } catch (err: any) {
      console.error('Error updating driver:', err)
      setError(err.message || 'Failed to update driver')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-md bg-gray-200" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-md bg-gray-200" />
          <div className="h-64 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="space-y-6">
        <Card className="border-l-4 border-red-500 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm text-red-700">Driver not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/drivers/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy">Edit Driver</h1>
            <p className="mt-2 text-sm text-gray-600">
              {driver.employees?.full_name || 'Driver'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
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
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Employee:</strong> {driver.employees?.full_name}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  To edit employee information, go to{' '}
                  <Link href={`/dashboard/employees/${driver.employees?.id}/edit`} className="underline">
                    Employee Profile
                  </Link>
                </p>
              </div>

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
                    />
                  </div>
                  <div>
                    <Label htmlFor="tas_badge_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="tas_badge_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('tas_badge_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
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
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
                    />
                  </div>
                </div>

                {/* First Aid Certificate */}
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
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
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
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
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
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
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
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-navy file:text-white hover:file:bg-blue-800"
                    />
                  </div>
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
            </CardContent>
          </Card>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Training Records</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Safeguarding Training */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Safeguarding Training</h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="safeguarding_training_completed"
                      name="safeguarding_training_completed"
                      checked={formData.safeguarding_training_completed}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <label htmlFor="safeguarding_training_completed" className="ml-2 text-sm text-gray-700">
                      Training Completed
                    </label>
                  </div>
                  <div>
                    <Label htmlFor="safeguarding_training_date">Training Date</Label>
                    <Input
                      type="date"
                      id="safeguarding_training_date"
                      name="safeguarding_training_date"
                      value={formData.safeguarding_training_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* TAS/PATS Training */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">TAS/PATS Training</h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="tas_pats_training_completed"
                      name="tas_pats_training_completed"
                      checked={formData.tas_pats_training_completed}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <label htmlFor="tas_pats_training_completed" className="ml-2 text-sm text-gray-700">
                      Training Completed
                    </label>
                  </div>
                  <div>
                    <Label htmlFor="tas_pats_training_date">Training Date</Label>
                    <Input
                      type="date"
                      id="tas_pats_training_date"
                      name="tas_pats_training_date"
                      value={formData.tas_pats_training_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* PSA Training */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">PSA Training</h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="psa_training_completed"
                      name="psa_training_completed"
                      checked={formData.psa_training_completed}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <label htmlFor="psa_training_completed" className="ml-2 text-sm text-gray-700">
                      Training Completed
                    </label>
                  </div>
                  <div>
                    <Label htmlFor="psa_training_date">Training Date</Label>
                    <Input
                      type="date"
                      id="psa_training_date"
                      name="psa_training_date"
                      value={formData.psa_training_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <Label htmlFor="additional_notes">Additional Notes</Label>
                <textarea
                  id="additional_notes"
                  name="additional_notes"
                  value={formData.additional_notes}
                  onChange={handleInputChange}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy focus:ring-navy sm:text-sm"
                  placeholder="Add any additional notes or comments about this driver..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/drivers/${params.id}`}>
            <Button type="button" variant="secondary">
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

