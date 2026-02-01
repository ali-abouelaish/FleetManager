'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const defaultDriverForm = {
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
}

const defaultPAForm = {
  spare_pa: false,
  tas_badge_number: '',
  tas_badge_expiry_date: '',
  dbs_number: '',
  first_aid_certificate_expiry_date: '',
  passport_expiry_date: '',
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
}

const driverFileKeys = ['tas_badge_file', 'dbs_file', 'first_aid_file', 'passport_file', 'driving_license_file', 'cpc_file', 'utility_bill_file', 'birth_cert_file', 'marriage_cert_file', 'photo_file', 'private_hire_badge_file', 'paper_licence_file', 'taxi_plate_photo_file', 'logbook_file', 'badge_photo_file'] as const
const paFileKeys = ['tas_badge_file', 'dbs_file', 'first_aid_file', 'passport_file', 'utility_bill_file', 'birth_cert_file', 'marriage_cert_file', 'photo_file', 'private_hire_badge_file', 'paper_licence_file', 'taxi_plate_photo_file', 'logbook_file', 'badge_photo_file'] as const

export default function CreateEmployeePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    employment_status: 'Active',
    phone_number: '',
    personal_email: '',
    address: '',
    next_of_kin: '',
    date_of_birth: '',
    start_date: '',
    end_date: '',
  })
  const [schools, setSchools] = useState<{ id: number; name: string }[]>([])
  const [assignedSchoolIds, setAssignedSchoolIds] = useState<number[]>([])

  const [driverForm, setDriverForm] = useState(defaultDriverForm)
  const [paForm, setPAForm] = useState(defaultPAForm)
  const [roleDetailsTab, setRoleDetailsTab] = useState<'basic' | 'certificates' | 'documents' | 'training'>('basic')
  const [driverFiles, setDriverFiles] = useState<Record<string, File | null>>(Object.fromEntries(driverFileKeys.map(k => [k, null])))
  const [paFiles, setPAFiles] = useState<Record<string, File | null>>(Object.fromEntries(paFileKeys.map(k => [k, null])))

  const handleDriverInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setDriverForm(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }
  const handlePAInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setPAForm(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }
  const setDriverFile = (key: string, file: File | null) => setDriverFiles(prev => ({ ...prev, [key]: file }))
  const setPAFile = (key: string, file: File | null) => setPAFiles(prev => ({ ...prev, [key]: file }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setLoading(true)

    try {
      const role = formData.role
      if (role === 'Driver' && (!driverForm.tas_badge_expiry_date || !driverForm.tas_badge_expiry_date.trim())) {
        setFieldErrors({ tas_badge_expiry_date: 'TAS Badge expiry date is required for drivers' })
        setError('Please fill in required driver details (TAS Badge expiry date).')
        setLoading(false)
        return
      }
      if (role === 'PA' && (!paForm.tas_badge_expiry_date || !paForm.tas_badge_expiry_date.trim())) {
        setFieldErrors({ tas_badge_expiry_date: 'TAS Badge expiry date is required for passenger assistants' })
        setError('Please fill in required PA details (TAS Badge expiry date).')
        setLoading(false)
        return
      }

      let startDate: string | null = formData.start_date.trim() || null
      let endDate: string | null = formData.end_date.trim() || null
      if (startDate) {
        const startDateObj = new Date(startDate)
        if (isNaN(startDateObj.getTime())) throw new Error('Start Date: Please enter a valid date (YYYY-MM-DD format)')
      }
      if (endDate) {
        const endDateObj = new Date(endDate)
        if (isNaN(endDateObj.getTime())) throw new Error('End Date: Please enter a valid date (YYYY-MM-DD format)')
        if (startDate && new Date(endDate) < new Date(startDate)) throw new Error('End Date must be after or equal to Start Date')
      }
      const dateOfBirth = formData.date_of_birth.trim() || null
      if (dateOfBirth) {
        if (isNaN(new Date(dateOfBirth).getTime())) throw new Error('Date of Birth: Please enter a valid date (YYYY-MM-DD format)')
      }

      const insertData: any = {
        full_name: formData.full_name,
        role: formData.role || null,
        employment_status: formData.employment_status,
        phone_number: formData.phone_number || null,
        personal_email: formData.personal_email || null,
        address: formData.address || null,
        next_of_kin: formData.next_of_kin.trim() || null,
        date_of_birth: dateOfBirth,
        start_date: startDate,
        end_date: endDate,
      }

      const { data: empData, error: empError } = await supabase.from('employees').insert([insertData]).select()
      if (empError) throw empError
      const employeeId = empData?.[0]?.id
      if (!employeeId) throw new Error('Failed to create employee')

      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: 'employees', record_id: employeeId, action: 'CREATE' }),
      })

      if (role === 'Driver') {
        const fileKeyToDocType: Record<string, string> = {
          tas_badge_file: 'TAS Badge', dbs_file: 'DBS Certificate', first_aid_file: 'First Aid Certificate',
          passport_file: 'Passport', driving_license_file: 'Driving License', cpc_file: 'CPC Certificate',
          utility_bill_file: 'Utility Bill', birth_cert_file: 'Birth Certificate', marriage_cert_file: 'Marriage Certificate',
          photo_file: 'Photo', private_hire_badge_file: 'Private Hire Badge', paper_licence_file: 'Paper Licence',
          taxi_plate_photo_file: 'Taxi Plate Photo', logbook_file: 'Logbook', badge_photo_file: 'ID Badge Photo',
        }
        const uploadedDocs: Array<{ fileUrl: string; fileName: string; fileType: string; docType: string; filePath: string }> = []
        for (const [key, file] of Object.entries(driverFiles)) {
          if (file) {
            const ext = file.name.split('.').pop()
            const path = `drivers/${employeeId}/${key}_${Date.now()}.${ext}`
            const { data: up, error: upErr } = await supabase.storage.from('DRIVER_DOCUMENTS').upload(path, file)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('DRIVER_DOCUMENTS').getPublicUrl(path)
            uploadedDocs.push({ fileUrl: publicUrl, fileName: file.name, fileType: file.type || 'application/octet-stream', docType: fileKeyToDocType[key] || 'Certificate', filePath: path })
          }
        }
        const driverData = {
          employee_id: employeeId,
          tas_badge_number: driverForm.tas_badge_number || null,
          tas_badge_expiry_date: driverForm.tas_badge_expiry_date || null,
          dbs_number: driverForm.dbs_number || null,
          psv_license: driverForm.psv_license,
          first_aid_certificate_expiry_date: driverForm.first_aid_certificate_expiry_date || null,
          passport_expiry_date: driverForm.passport_expiry_date || null,
          driving_license_expiry_date: driverForm.driving_license_expiry_date || null,
          cpc_expiry_date: driverForm.cpc_expiry_date || null,
          utility_bill_date: driverForm.utility_bill_date || null,
          birth_certificate: driverForm.birth_certificate,
          marriage_certificate: driverForm.marriage_certificate,
          photo_taken: driverForm.photo_taken,
          private_hire_badge: driverForm.private_hire_badge,
          paper_licence: driverForm.paper_licence,
          taxi_plate_photo: driverForm.taxi_plate_photo,
          logbook: driverForm.logbook,
          safeguarding_training_completed: driverForm.safeguarding_training_completed,
          safeguarding_training_date: driverForm.safeguarding_training_date || null,
          tas_pats_training_completed: driverForm.tas_pats_training_completed,
          tas_pats_training_date: driverForm.tas_pats_training_date || null,
          psa_training_completed: driverForm.psa_training_completed,
          psa_training_date: driverForm.psa_training_date || null,
          additional_notes: driverForm.additional_notes || null,
          spare_driver: driverForm.spare_driver,
        }
        const { error: driverErr } = await supabase.from('drivers').insert([driverData])
        if (driverErr) throw driverErr
        await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table_name: 'drivers', record_id: employeeId, action: 'CREATE' }) })
        if (uploadedDocs.length > 0) {
          await supabase.from('documents').insert(uploadedDocs.map(doc => ({
            employee_id: employeeId, owner_type: 'employee', owner_id: employeeId,
            file_url: JSON.stringify([doc.fileUrl]), file_name: doc.fileName, file_type: doc.fileType, file_path: doc.fileUrl, doc_type: doc.docType, uploaded_at: new Date().toISOString(),
          })))
        }
        router.push('/dashboard/drivers')
      } else if (role === 'PA') {
        const fileKeyToDocType: Record<string, string> = {
          tas_badge_file: 'TAS Badge', dbs_file: 'DBS Certificate', first_aid_file: 'First Aid Certificate',
          passport_file: 'Passport', utility_bill_file: 'Utility Bill', birth_cert_file: 'Birth Certificate', marriage_cert_file: 'Marriage Certificate',
          photo_file: 'Photo', private_hire_badge_file: 'Private Hire Badge', paper_licence_file: 'Paper Licence',
          taxi_plate_photo_file: 'Taxi Plate Photo', logbook_file: 'Logbook', badge_photo_file: 'ID Badge Photo',
        }
        const uploadedDocs: Array<{ fileUrl: string; fileName: string; fileType: string; docType: string; filePath: string }> = []
        for (const [key, file] of Object.entries(paFiles)) {
          if (file) {
            const ext = file.name.split('.').pop()
            const path = `assistants/${employeeId}/${key}_${Date.now()}.${ext}`
            const { data: up, error: upErr } = await supabase.storage.from('DRIVER_DOCUMENTS').upload(path, file)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('DRIVER_DOCUMENTS').getPublicUrl(path)
            uploadedDocs.push({ fileUrl: publicUrl, fileName: file.name, fileType: file.type || 'application/octet-stream', docType: fileKeyToDocType[key] || 'Certificate', filePath: path })
          }
        }
        const paData = {
          employee_id: employeeId,
          tas_badge_number: paForm.tas_badge_number || null,
          tas_badge_expiry_date: paForm.tas_badge_expiry_date || null,
          dbs_number: paForm.dbs_number || null,
          first_aid_certificate_expiry_date: paForm.first_aid_certificate_expiry_date || null,
          passport_expiry_date: paForm.passport_expiry_date || null,
          utility_bill_date: paForm.utility_bill_date || null,
          birth_certificate: paForm.birth_certificate,
          marriage_certificate: paForm.marriage_certificate,
          photo_taken: paForm.photo_taken,
          private_hire_badge: paForm.private_hire_badge,
          paper_licence: paForm.paper_licence,
          taxi_plate_photo: paForm.taxi_plate_photo,
          logbook: paForm.logbook,
          safeguarding_training_completed: paForm.safeguarding_training_completed,
          safeguarding_training_date: paForm.safeguarding_training_date || null,
          tas_pats_training_completed: paForm.tas_pats_training_completed,
          tas_pats_training_date: paForm.tas_pats_training_date || null,
          psa_training_completed: paForm.psa_training_completed,
          psa_training_date: paForm.psa_training_date || null,
          additional_notes: paForm.additional_notes || null,
          spare_pa: paForm.spare_pa,
        }
        const { data: paResult, error: paErr } = await supabase.from('passenger_assistants').insert([paData]).select()
        if (paErr) throw paErr
        await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table_name: 'passenger_assistants', record_id: paResult?.[0]?.id ?? employeeId, action: 'CREATE' }) })
        if (uploadedDocs.length > 0) {
          await supabase.from('documents').insert(uploadedDocs.map(doc => ({
            employee_id: employeeId, owner_type: 'employee', owner_id: employeeId,
            file_url: JSON.stringify([doc.fileUrl]), file_name: doc.fileName, file_type: doc.fileType, file_path: doc.fileUrl, doc_type: doc.docType, uploaded_at: new Date().toISOString(),
          })))
        }
        router.push('/dashboard/assistants')
      } else {
        if (role === 'Coordinator' && assignedSchoolIds.length > 0) {
          await supabase.from('coordinator_school_assignments').insert(
            assignedSchoolIds.map((schoolId) => ({ employee_id: employeeId, school_id: schoolId }))
          )
        }
        router.push('/dashboard/employees')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the employee')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function loadSchools() {
      const sb = createClient()
      const { data } = await sb.from('schools').select('id, name').order('name')
      if (data) setSchools(data)
    }
    loadSchools()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/employees">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
          <p className="mt-2 text-sm text-gray-600">
            Select role first, then fill in employee details and any role-specific details below in one form.
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" id="create-employee-form">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="">Select role first</option>
                  <option value="Driver">Driver</option>
                  <option value="PA">Passenger Assistant</option>
                  <option value="Coordinator">Coordinator</option>
                  <option value="Admin">Admin</option>
                  <option value="Other">Other</option>
                </Select>
                <p className="text-xs text-gray-500">Choosing Driver or PA will show role-specific details below.</p>
              </div>

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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="next_of_kin">Next of Kin</Label>
                <Input
                  id="next_of_kin"
                  value={formData.next_of_kin}
                  onChange={(e) =>
                    setFormData({ ...formData, next_of_kin: e.target.value })
                  }
                  placeholder="Name and/or contact details..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">Optional</p>
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
                <p className="text-xs text-gray-500">Optional - Leave blank if not applicable</p>
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
                <p className="text-xs text-gray-500">Optional - Leave blank if employee is still active</p>
              </div>

              {formData.role === 'Coordinator' && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Assigned Schools</Label>
                  <p className="text-xs text-gray-500 mb-2">Select the school(s) this coordinator is responsible for. A coordinator can be assigned to multiple schools.</p>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-gray-50">
                    {schools.length === 0 ? (
                      <p className="text-sm text-gray-500">No schools found. Create schools first.</p>
                    ) : (
                      schools.map((school) => (
                        <label key={school.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignedSchoolIds.includes(school.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignedSchoolIds((prev) => [...prev, school.id])
                              } else {
                                setAssignedSchoolIds((prev) => prev.filter((id) => id !== school.id))
                              }
                            }}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-sm text-gray-900">{school.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Driver details – shown when role is Driver */}
            {formData.role === 'Driver' && (
              <div className="space-y-4 border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-900">Driver details</h2>
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex gap-4">
                    {(['basic', 'certificates', 'documents', 'training'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setRoleDetailsTab(tab)}
                        className={`py-2 px-1 text-sm font-medium border-b-2 ${roleDetailsTab === tab ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      >
                        {tab === 'basic' && 'Basic'}
                        {tab === 'certificates' && 'Certificates'}
                        {tab === 'documents' && 'Documents'}
                        {tab === 'training' && 'Training'}
                      </button>
                    ))}
                  </nav>
                </div>
                {roleDetailsTab === 'basic' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="spare_driver" name="spare_driver" checked={driverForm.spare_driver} onChange={handleDriverInput} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                      <Label htmlFor="spare_driver">Mark as spare driver</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="psv_license" name="psv_license" checked={driverForm.psv_license} onChange={handleDriverInput} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                      <Label htmlFor="psv_license">PSV License</Label>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="driver_additional_notes">Additional notes</Label>
                      <textarea id="driver_additional_notes" name="additional_notes" value={driverForm.additional_notes} onChange={handleDriverInput} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                )}
                {roleDetailsTab === 'certificates' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 p-4 border rounded-lg bg-red-50 border-red-200">
                      <Label htmlFor="driver_tas_badge_expiry_date">TAS Badge expiry date *</Label>
                      <Input type="date" id="driver_tas_badge_expiry_date" name="tas_badge_expiry_date" value={driverForm.tas_badge_expiry_date} onChange={handleDriverInput} className={fieldErrors.tas_badge_expiry_date ? 'border-red-500' : ''} />
                      {fieldErrors.tas_badge_expiry_date && <p className="text-xs text-red-600">{fieldErrors.tas_badge_expiry_date}</p>}
                      <Input placeholder="TAS Badge number" name="tas_badge_number" value={driverForm.tas_badge_number} onChange={handleDriverInput} className="mt-2" />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDriverFile('tas_badge_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>DBS</Label>
                      <Input placeholder="DBS number" name="dbs_number" value={driverForm.dbs_number} onChange={handleDriverInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDriverFile('dbs_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>First Aid expiry</Label>
                      <Input type="date" name="first_aid_certificate_expiry_date" value={driverForm.first_aid_certificate_expiry_date} onChange={handleDriverInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDriverFile('first_aid_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>Passport expiry</Label>
                      <Input type="date" name="passport_expiry_date" value={driverForm.passport_expiry_date} onChange={handleDriverInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDriverFile('passport_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>Driving licence expiry</Label>
                      <Input type="date" name="driving_license_expiry_date" value={driverForm.driving_license_expiry_date} onChange={handleDriverInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDriverFile('driving_license_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>CPC expiry</Label>
                      <Input type="date" name="cpc_expiry_date" value={driverForm.cpc_expiry_date} onChange={handleDriverInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDriverFile('cpc_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>Utility bill date</Label>
                      <Input type="date" name="utility_bill_date" value={driverForm.utility_bill_date} onChange={handleDriverInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDriverFile('utility_bill_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                  </div>
                )}
                {roleDetailsTab === 'documents' && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      { name: 'birth_certificate', label: 'Birth Certificate' },
                      { name: 'marriage_certificate', label: 'Marriage Certificate' },
                      { name: 'photo_taken', label: 'Photo Taken' },
                      { name: 'private_hire_badge', label: 'Private Hire Badge' },
                      { name: 'paper_licence', label: 'Paper Licence' },
                      { name: 'taxi_plate_photo', label: 'Taxi Plate Photo' },
                      { name: 'logbook', label: 'Logbook' },
                    ].map(({ name, label }) => (
                      <label key={name} className="flex items-center gap-2">
                        <input type="checkbox" name={name} checked={(driverForm as Record<string, unknown>)[name] as boolean} onChange={handleDriverInput} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                    <div className="md:col-span-2">
                      <Label>Badge photo</Label>
                      <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setDriverFile('badge_photo_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                  </div>
                )}
                {roleDetailsTab === 'training' && (
                  <div className="space-y-4">
                    {[
                      { key: 'safeguarding', label: 'Safeguarding', completed: 'safeguarding_training_completed', date: 'safeguarding_training_date' },
                      { key: 'tas_pats', label: 'TAS PATS', completed: 'tas_pats_training_completed', date: 'tas_pats_training_date' },
                      { key: 'psa', label: 'PSA', completed: 'psa_training_completed', date: 'psa_training_date' },
                    ].map(({ label, completed, date }) => (
                      <div key={label} className="flex flex-wrap items-center gap-4 p-4 border rounded-lg">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name={completed} checked={(driverForm as Record<string, unknown>)[completed] as boolean} onChange={handleDriverInput} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                          <span className="text-sm font-medium">{label} completed</span>
                        </label>
                        {(driverForm as Record<string, unknown>)[completed] && (
                          <Input type="date" name={date} value={(driverForm as Record<string, string>)[date]} onChange={handleDriverInput} className="w-40" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Passenger Assistant details – shown when role is PA */}
            {formData.role === 'PA' && (
              <div className="space-y-4 border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-900">Passenger Assistant details</h2>
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex gap-4">
                    {(['basic', 'certificates', 'documents', 'training'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setRoleDetailsTab(tab)}
                        className={`py-2 px-1 text-sm font-medium border-b-2 ${roleDetailsTab === tab ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      >
                        {tab === 'basic' && 'Basic'}
                        {tab === 'certificates' && 'Certificates'}
                        {tab === 'documents' && 'Documents'}
                        {tab === 'training' && 'Training'}
                      </button>
                    ))}
                  </nav>
                </div>
                {roleDetailsTab === 'basic' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="spare_pa" name="spare_pa" checked={paForm.spare_pa} onChange={handlePAInput} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                      <Label htmlFor="spare_pa">Mark as spare PA</Label>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="pa_additional_notes">Additional notes</Label>
                      <textarea id="pa_additional_notes" name="additional_notes" value={paForm.additional_notes} onChange={handlePAInput} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                )}
                {roleDetailsTab === 'certificates' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 p-4 border rounded-lg bg-red-50 border-red-200">
                      <Label htmlFor="pa_tas_badge_expiry_date">TAS Badge expiry date *</Label>
                      <Input type="date" id="pa_tas_badge_expiry_date" name="tas_badge_expiry_date" value={paForm.tas_badge_expiry_date} onChange={handlePAInput} className={fieldErrors.tas_badge_expiry_date ? 'border-red-500' : ''} />
                      {fieldErrors.tas_badge_expiry_date && <p className="text-xs text-red-600">{fieldErrors.tas_badge_expiry_date}</p>}
                      <Input placeholder="TAS Badge number" name="tas_badge_number" value={paForm.tas_badge_number} onChange={handlePAInput} className="mt-2" />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPAFile('tas_badge_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>DBS</Label>
                      <Input placeholder="DBS number" name="dbs_number" value={paForm.dbs_number} onChange={handlePAInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPAFile('dbs_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>First Aid expiry</Label>
                      <Input type="date" name="first_aid_certificate_expiry_date" value={paForm.first_aid_certificate_expiry_date} onChange={handlePAInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPAFile('first_aid_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>Passport expiry</Label>
                      <Input type="date" name="passport_expiry_date" value={paForm.passport_expiry_date} onChange={handlePAInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPAFile('passport_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>Utility bill date</Label>
                      <Input type="date" name="utility_bill_date" value={paForm.utility_bill_date} onChange={handlePAInput} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPAFile('utility_bill_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                  </div>
                )}
                {roleDetailsTab === 'documents' && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      { name: 'birth_certificate', label: 'Birth Certificate' },
                      { name: 'marriage_certificate', label: 'Marriage Certificate' },
                      { name: 'photo_taken', label: 'Photo Taken' },
                      { name: 'private_hire_badge', label: 'Private Hire Badge' },
                      { name: 'paper_licence', label: 'Paper Licence' },
                      { name: 'taxi_plate_photo', label: 'Taxi Plate Photo' },
                      { name: 'logbook', label: 'Logbook' },
                    ].map(({ name, label }) => (
                      <label key={name} className="flex items-center gap-2">
                        <input type="checkbox" name={name} checked={(paForm as Record<string, unknown>)[name] as boolean} onChange={handlePAInput} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                    <div className="md:col-span-2">
                      <Label>Badge photo</Label>
                      <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPAFile('badge_photo_file', e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0" />
                    </div>
                  </div>
                )}
                {roleDetailsTab === 'training' && (
                  <div className="space-y-4">
                    {[
                      { key: 'safeguarding', label: 'Safeguarding', completed: 'safeguarding_training_completed', date: 'safeguarding_training_date' },
                      { key: 'tas_pats', label: 'TAS PATS', completed: 'tas_pats_training_completed', date: 'tas_pats_training_date' },
                      { key: 'psa', label: 'PSA', completed: 'psa_training_completed', date: 'psa_training_date' },
                    ].map(({ label, completed, date }) => (
                      <div key={label} className="flex flex-wrap items-center gap-4 p-4 border rounded-lg">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name={completed} checked={(paForm as Record<string, unknown>)[completed] as boolean} onChange={handlePAInput} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                          <span className="text-sm font-medium">{label} completed</span>
                        </label>
                        {(paForm as Record<string, unknown>)[completed] && (
                          <Input type="date" name={date} value={(paForm as Record<string, string>)[date]} onChange={handlePAInput} className="w-40" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/employees">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading
                  ? 'Creating...'
                  : formData.role === 'Driver'
                    ? 'Create Employee & Driver'
                    : formData.role === 'PA'
                      ? 'Create Employee & Passenger Assistant'
                      : 'Create Employee'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

