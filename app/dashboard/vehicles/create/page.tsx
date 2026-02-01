'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type TabType = 'basic' | 'certificates' | 'documents' | 'maintenance' | 'seating' | 'notes'

export default function CreateVehiclePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string }>>([])
  const [activeTab, setActiveTab] = useState<TabType>('basic')

  // File uploads state
  const [fileUploads, setFileUploads] = useState<{[key: string]: File | null}>({
    registration_file: null,
    mot_file: null,
    insurance_file: null,
    taxi_badge_file: null,
    loler_file: null,
    first_aid_file: null,
    fire_extinguisher_file: null,
    tax_file: null,
    plate_file: null,
    logbook_file: null,
    service_record_file: null,
  })

  const [formData, setFormData] = useState({
    vehicle_identifier: '',
    registration: '',
    registration_expiry_date: '',
    make: '',
    model: '',
    plate_number: '',
    colour: '',
    plate_expiry_date: '',
    vehicle_type: '',
    ownership_type: '',
    council_assignment: '',
    mot_date: '',
    tax_date: '',
    insurance_expiry_date: '',
    taxi_badge_number: '',
    taxi_badge_expiry_date: '',
    tail_lift: false,
    loler_expiry_date: '',
    last_serviced: '',
    service_booked_day: '',
    first_aid_expiry: '',
    fire_extinguisher_expiry: '',
    taxi_license: '',
    taxi_registration_driver: '',
    spare_vehicle: false,
    off_the_road: false,
    assigned_to: '',
    notes: '',
    // Seating plan fields
    seating_plan_name: '',
    total_capacity: '',
    rows: '',
    seats_per_row: '',
    wheelchair_spaces: '',
    seating_notes: '',
  })

  useEffect(() => {
    async function loadDrivers() {
      const { data, error } = await supabase
        .from('drivers')
        .select('employee_id, employees(full_name, employment_status, can_work)')
        .order('employee_id')

      if (!error && data) {
        const driverList = data
          .filter((d: any) => d.employees?.employment_status === 'Active' && d.employees?.can_work !== false)
          .map((d: any) => ({
            id: d.employee_id,
            name: d.employees?.full_name || 'Unknown',
          }))
        setDrivers(driverList)
      }
    }

    loadDrivers()
  }, [supabase])

  const handleFileChange = (fieldName: string, file: File | null) => {
    setFileUploads(prev => ({
      ...prev,
      [fieldName]: file
    }))
  }

  const handleNext = () => {
    const tabs: TabType[] = ['basic', 'certificates', 'documents', 'maintenance', 'seating', 'notes']
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1])
    }
  }

  const handlePrevious = () => {
    const tabs: TabType[] = ['basic', 'certificates', 'documents', 'maintenance', 'seating', 'notes']
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Convert empty date strings to null
      // Exclude seating plan fields and file uploads from vehicle insert
      const {
        seating_plan_name,
        total_capacity,
        rows,
        seats_per_row,
        wheelchair_spaces,
        seating_notes,
        ...vehicleFields
      } = formData

      const dataToInsert = {
        ...vehicleFields,
        registration_expiry_date: formData.registration_expiry_date || null,
        plate_expiry_date: formData.plate_expiry_date || null,
        mot_date: formData.mot_date || null,
        tax_date: formData.tax_date || null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        taxi_badge_expiry_date: formData.taxi_badge_expiry_date || null,
        loler_expiry_date: formData.loler_expiry_date || null,
        last_serviced: formData.last_serviced || null,
        service_booked_day: formData.service_booked_day || null,
        first_aid_expiry: formData.first_aid_expiry || null,
        fire_extinguisher_expiry: formData.fire_extinguisher_expiry || null,
        ownership_type: formData.ownership_type || null,
        council_assignment: formData.council_assignment || null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
      }

      const { data, error } = await supabase
        .from('vehicles')
        .insert([dataToInsert])
        .select()

      if (error) throw error

      if (data && data[0]) {
        const vehicleId = data[0].id

        // Upload files to Supabase Storage
        const uploadedDocuments: Array<{
          fileUrl: string
          fileName: string
          fileType: string
          docType: string
          filePath: string
        }> = []
        
        // Map file keys to document types
        const fileKeyToDocType: {[key: string]: string} = {
          registration_file: 'Plate Certificate',
          mot_file: 'MOT Certificate',
          insurance_file: 'Vehicle Insurance',
          taxi_badge_file: 'Taxi Badge',
          loler_file: 'LOLER Certificate',
          first_aid_file: 'First Aid Certificate',
          fire_extinguisher_file: 'Fire Extinguisher Certificate',
          tax_file: 'Tax Certificate',
          plate_file: 'Plate Certificate',
          logbook_file: 'Logbook',
          service_record_file: 'Service Record',
        }
        
        for (const [key, file] of Object.entries(fileUploads)) {
          if (file) {
            const fileExt = file.name.split('.').pop()
            const fileName = `vehicles/${vehicleId}/${key}_${Date.now()}.${fileExt}`
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('VEHICLE_DOCUMENTS')
              .upload(fileName, file)

            if (uploadError) {
              console.error(`Error uploading file ${file.name}:`, uploadError)
              // Continue with other files even if one fails
              continue
            }

            if (uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from('VEHICLE_DOCUMENTS')
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

        // Create document records in the documents table
        if (uploadedDocuments.length > 0) {
          const documentRecords = uploadedDocuments.map(doc => ({
            vehicle_id: vehicleId,
            file_url: JSON.stringify([doc.fileUrl]),
            file_name: doc.fileName,
            file_type: doc.fileType,
            file_path: doc.filePath,
            doc_type: doc.docType,
            uploaded_at: new Date().toISOString(),
          }))

          const { error: documentsError } = await supabase
            .from('documents')
            .insert(documentRecords)

          if (documentsError) {
            console.error('Error creating document records:', documentsError)
            // Don't throw - vehicle was created successfully, documents just won't show up
          }
        }

        // Create seating plan if provided
        if (formData.seating_plan_name && formData.total_capacity && formData.rows && formData.seats_per_row) {
          try {
            await fetch(`/api/vehicles/${vehicleId}/seating`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: formData.seating_plan_name,
                total_capacity: parseInt(formData.total_capacity),
                rows: parseInt(formData.rows),
                seats_per_row: parseInt(formData.seats_per_row),
                wheelchair_spaces: parseInt(formData.wheelchair_spaces) || 0,
                notes: formData.seating_notes || null,
              }),
            })
          } catch (seatingError) {
            console.error('Error creating seating plan:', seatingError)
            // Don't fail the vehicle creation if seating plan fails
          }
        }

        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: 'vehicles',
            record_id: vehicleId,
            action: 'CREATE',
          }),
        })
      }

      router.push('/dashboard/vehicles')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/vehicles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy">Add New Vehicle</h1>
            <p className="mt-2 text-sm text-gray-600">
              Fill in the information below to create a new vehicle
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
            { id: 'basic', label: '🚗 Basic Info', icon: '🚗' },
            { id: 'certificates', label: '📜 Certificates', icon: '📜' },
            { id: 'documents', label: '📄 Documents', icon: '📄' },
            { id: 'maintenance', label: '🔧 Maintenance & Status', icon: '🔧' },
            { id: 'seating', label: '🪑 Seating Plan', icon: '🪑' },
            { id: 'notes', label: '📝 Notes', icon: '📝' },
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
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_identifier">Vehicle Identifier</Label>
                  <Input
                    id="vehicle_identifier"
                    value={formData.vehicle_identifier}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_identifier: e.target.value })
                    }
                    placeholder="e.g., VEH-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registration">Registration</Label>
                  <Input
                    id="registration"
                    value={formData.registration}
                    onChange={(e) =>
                      setFormData({ ...formData, registration: e.target.value })
                    }
                    placeholder="e.g., AB12 CDE"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plate_number">Plate Number</Label>
                  <Input
                    id="plate_number"
                    value={formData.plate_number}
                    onChange={(e) =>
                      setFormData({ ...formData, plate_number: e.target.value })
                    }
                    placeholder="e.g., AB12 CDE"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    placeholder="e.g., Ford, Mercedes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="e.g., Transit, Sprinter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colour">Colour</Label>
                  <Input
                    id="colour"
                    value={formData.colour}
                    onChange={(e) =>
                      setFormData({ ...formData, colour: e.target.value })
                    }
                    placeholder="e.g., Red, Blue, White"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Vehicle Type</Label>
                  <Select
                    id="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_type: e.target.value })
                    }
                  >
                    <option value="">Select type</option>
                    <option value="Minibus">Minibus</option>
                    <option value="Van">Van</option>
                    <option value="Car">Car</option>
                    <option value="Coach">Coach</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownership_type">Ownership Type</Label>
                  <Select
                    id="ownership_type"
                    value={formData.ownership_type}
                    onChange={(e) =>
                      setFormData({ ...formData, ownership_type: e.target.value })
                    }
                  >
                    <option value="">Select type</option>
                    <option value="County Cars">County Cars</option>
                    <option value="NBT">NBT</option>
                    <option value="Privately Owned">Privately Owned</option>
                    <option value="Leased">Leased</option>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="council_assignment">Council Assignment</Label>
                  <Input
                    id="council_assignment"
                    value={formData.council_assignment}
                    onChange={(e) =>
                      setFormData({ ...formData, council_assignment: e.target.value })
                    }
                    placeholder="e.g., Council name or reference"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons for Basic Info */}
        {activeTab === 'basic' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end space-x-4">
                <Link href="/dashboard/vehicles">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
                <Button type="button" onClick={handleNext}>
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
              <div className="grid gap-6 md:grid-cols-2">
                {/* Plate */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Plate</h3>
                  <div>
                    <Label htmlFor="registration_expiry_date">Plate Expiry Date</Label>
                    <Input
                      id="registration_expiry_date"
                      type="date"
                      value={formData.registration_expiry_date}
                      onChange={(e) =>
                        setFormData({ ...formData, registration_expiry_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="registration_file">Upload Plate Certificate</Label>
                    <input
                      type="file"
                      id="registration_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('registration_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* Plate */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Plate</h3>
                  <div>
                    <Label htmlFor="plate_expiry_date">Expiry Date</Label>
                    <Input
                      id="plate_expiry_date"
                      type="date"
                      value={formData.plate_expiry_date}
                      onChange={(e) =>
                        setFormData({ ...formData, plate_expiry_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="plate_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="plate_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('plate_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* MOT */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">MOT Certificate</h3>
                  <div>
                    <Label htmlFor="mot_date">Expiry Date</Label>
                    <Input
                      id="mot_date"
                      type="date"
                      value={formData.mot_date}
                      onChange={(e) =>
                        setFormData({ ...formData, mot_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="mot_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="mot_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('mot_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* Tax */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Tax Certificate</h3>
                  <div>
                    <Label htmlFor="tax_date">Tax Date</Label>
                    <Input
                      id="tax_date"
                      type="date"
                      value={formData.tax_date}
                      onChange={(e) =>
                        setFormData({ ...formData, tax_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="tax_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('tax_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* Insurance */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Vehicle Insurance</h3>
                  <div>
                    <Label htmlFor="insurance_expiry_date">Expiry Date</Label>
                    <Input
                      id="insurance_expiry_date"
                      type="date"
                      value={formData.insurance_expiry_date}
                      onChange={(e) =>
                        setFormData({ ...formData, insurance_expiry_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="insurance_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="insurance_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('insurance_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* Taxi Badge */}
                <div className="space-y-4 p-4 border-2 border-red-200 rounded-lg bg-red-50">
                  <h3 className="font-semibold text-navy flex items-center">
                    Taxi Badge
                    <span className="ml-2 text-xs text-red-600 font-bold">REQUIRED</span>
                  </h3>
                  <div>
                    <Label htmlFor="taxi_badge_number">Badge Number</Label>
                    <Input
                      id="taxi_badge_number"
                      value={formData.taxi_badge_number}
                      onChange={(e) =>
                        setFormData({ ...formData, taxi_badge_number: e.target.value })
                      }
                      placeholder="e.g., TAXI67890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxi_badge_expiry_date">
                      Expiry Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="taxi_badge_expiry_date"
                      type="date"
                      value={formData.taxi_badge_expiry_date}
                      onChange={(e) =>
                        setFormData({ ...formData, taxi_badge_expiry_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxi_badge_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="taxi_badge_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('taxi_badge_file', e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                    />
                  </div>
                </div>

                {/* First Aid */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">First Aid Certificate</h3>
                  <div>
                    <Label htmlFor="first_aid_expiry">Expiry Date</Label>
                    <Input
                      id="first_aid_expiry"
                      type="date"
                      value={formData.first_aid_expiry}
                      onChange={(e) =>
                        setFormData({ ...formData, first_aid_expiry: e.target.value })
                      }
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

                {/* Fire Extinguisher */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-navy">Fire Extinguisher Certificate</h3>
                  <div>
                    <Label htmlFor="fire_extinguisher_expiry">Expiry Date</Label>
                    <Input
                      id="fire_extinguisher_expiry"
                      type="date"
                      value={formData.fire_extinguisher_expiry}
                      onChange={(e) =>
                        setFormData({ ...formData, fire_extinguisher_expiry: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="fire_extinguisher_file">Upload Certificate</Label>
                    <input
                      type="file"
                      id="fire_extinguisher_file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('fire_extinguisher_file', e.target.files?.[0] || null)}
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
                  <Link href="/dashboard/vehicles">
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="button" onClick={handleNext}>
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
              <CardTitle>Additional Documents</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <p className="text-sm text-gray-600">
                Upload additional vehicle documents such as logbook, service records, and other relevant paperwork.
              </p>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="logbook_file">Logbook</Label>
                  <input
                    type="file"
                    id="logbook_file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('logbook_file', e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                  />
                  <p className="text-xs text-gray-500">Upload vehicle logbook (PDF, JPG, PNG)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_record_file">Service Record</Label>
                  <input
                    type="file"
                    id="service_record_file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('service_record_file', e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                  />
                  <p className="text-xs text-gray-500">Upload service history records (PDF, JPG, PNG)</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  <Link href="/dashboard/vehicles">
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance & Status Tab */}
        {activeTab === 'maintenance' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Maintenance & Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="last_serviced">Last Serviced</Label>
                  <Input
                    id="last_serviced"
                    type="date"
                    value={formData.last_serviced}
                    onChange={(e) =>
                      setFormData({ ...formData, last_serviced: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_booked_day">Service Booked Day</Label>
                  <Input
                    id="service_booked_day"
                    type="date"
                    value={formData.service_booked_day}
                    onChange={(e) =>
                      setFormData({ ...formData, service_booked_day: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="tail_lift"
                      checked={formData.tail_lift}
                      onChange={(e) =>
                        setFormData({ ...formData, tail_lift: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <Label htmlFor="tail_lift">Tail Lift</Label>
                  </div>
                </div>

                {formData.tail_lift && (
                  <div className="space-y-4 p-4 border rounded-lg md:col-span-2">
                    <h3 className="font-semibold text-navy">LOLER Certificate</h3>
                    <div>
                      <Label htmlFor="loler_expiry_date">
                        Expiry Date
                      </Label>
                      <Input
                        id="loler_expiry_date"
                        type="date"
                        value={formData.loler_expiry_date}
                        onChange={(e) =>
                          setFormData({ ...formData, loler_expiry_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="loler_file">Upload Certificate</Label>
                      <input
                        type="file"
                        id="loler_file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('loler_file', e.target.files?.[0] || null)}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="spare_vehicle"
                      checked={formData.spare_vehicle}
                      onChange={(e) =>
                        setFormData({ ...formData, spare_vehicle: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <Label htmlFor="spare_vehicle">Spare Vehicle</Label>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="off_the_road"
                      checked={formData.off_the_road}
                      onChange={(e) =>
                        setFormData({ ...formData, off_the_road: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                    <Label htmlFor="off_the_road">Off the Road</Label>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <SearchableSelect
                    id="assigned_to"
                    label="Assigned To (MOT & Service Follow-up)"
                    value={formData.assigned_to}
                    onChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    options={drivers.map(driver => ({
                      value: driver.id.toString(),
                      label: driver.name,
                    }))}
                    placeholder="Select driver for MOT & service follow-up..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons for Maintenance */}
        {activeTab === 'maintenance' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between space-x-4">
                <Button type="button" variant="secondary" onClick={handlePrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex space-x-4">
                  <Link href="/dashboard/vehicles">
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seating Plan Tab */}
        {activeTab === 'seating' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Seating Plan (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <p className="text-sm text-gray-600">
                Configure the seating layout for this vehicle. You can also add this later from the vehicle detail page.
              </p>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="seating_plan_name">Plan Name</Label>
                  <Input
                    id="seating_plan_name"
                    value={formData.seating_plan_name}
                    onChange={(e) =>
                      setFormData({ ...formData, seating_plan_name: e.target.value })
                    }
                    placeholder="e.g., Standard Coach (45 passengers)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_capacity">Total Capacity</Label>
                  <Input
                    id="total_capacity"
                    type="number"
                    min="1"
                    value={formData.total_capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, total_capacity: e.target.value })
                    }
                    placeholder="e.g., 45"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wheelchair_spaces">Wheelchair Spaces</Label>
                  <Input
                    id="wheelchair_spaces"
                    type="number"
                    min="0"
                    value={formData.wheelchair_spaces}
                    onChange={(e) =>
                      setFormData({ ...formData, wheelchair_spaces: e.target.value })
                    }
                    placeholder="e.g., 2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rows">Number of Rows</Label>
                  <Input
                    id="rows"
                    type="number"
                    min="1"
                    value={formData.rows}
                    onChange={(e) =>
                      setFormData({ ...formData, rows: e.target.value })
                    }
                    placeholder="e.g., 12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seats_per_row">Seats per Row</Label>
                  <Input
                    id="seats_per_row"
                    type="number"
                    min="1"
                    value={formData.seats_per_row}
                    onChange={(e) =>
                      setFormData({ ...formData, seats_per_row: e.target.value })
                    }
                    placeholder="e.g., 4"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="seating_notes">Seating Notes</Label>
                  <textarea
                    id="seating_notes"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.seating_notes}
                    onChange={(e) =>
                      setFormData({ ...formData, seating_notes: e.target.value })
                    }
                    placeholder="e.g., 2 wheelchair lifts, emergency exit row 5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons for Seating */}
        {activeTab === 'seating' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between space-x-4">
                <Button type="button" variant="secondary" onClick={handlePrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex space-x-4">
                  <Link href="/dashboard/vehicles">
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional information about the vehicle..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons for Notes (Final Tab) */}
        {activeTab === 'notes' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between space-x-4">
                <Button type="button" variant="secondary" onClick={handlePrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex space-x-4">
                  <Link href="/dashboard/vehicles">
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Vehicle'}
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
