'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil, AlertTriangle, CheckCircle, Clock, XCircle, FileText, GraduationCap, Download, ExternalLink, Eye, Car, Timer } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import DriverQRCode from './DriverQRCode'
import DriverUpdatesClient from './DriverUpdatesClient'
import BadgePhotoUpload from './BadgePhotoUpload'
import DriverPreChecks from './DriverPreChecks'

interface Driver {
  employee_id: number
  tas_badge_number: string | null
  tas_badge_expiry_date: string | null
  dbs_number: string | null
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
    can_work: boolean
    employment_status: string
    phone_number: string | null
    personal_email: string | null
  }
}

type TabType = 'overview' | 'documentation' | 'training' | 'documents' | 'tardiness' | 'daily-checks'

// Helper to calculate days remaining
function getDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Helper to get status badge for expiry dates
function getExpiryBadge(daysRemaining: number | null) {
  if (daysRemaining === null) {
    return { icon: null, label: 'Not Set', color: 'bg-gray-100 text-gray-600', textColor: 'text-gray-600' }
  }
  if (daysRemaining < 0) {
    return { 
      icon: XCircle, 
      label: `Expired (${Math.abs(daysRemaining)} days overdue)`, 
      color: 'bg-red-100 text-red-800',
      textColor: 'text-red-800'
    }
  }
  if (daysRemaining <= 14) {
    return { 
      icon: AlertTriangle, 
      label: `${daysRemaining} days remaining`, 
      color: 'bg-orange-100 text-orange-800',
      textColor: 'text-orange-800'
    }
  }
  if (daysRemaining <= 30) {
    return { 
      icon: Clock, 
      label: `${daysRemaining} days remaining`, 
      color: 'bg-yellow-100 text-yellow-800',
      textColor: 'text-yellow-800'
    }
  }
  return { 
    icon: CheckCircle, 
    label: `${daysRemaining} days remaining`, 
    color: 'bg-green-100 text-green-800',
    textColor: 'text-green-800'
  }
}

interface Document {
  id: number
  file_name: string | null
  file_url: string | null
  file_type: string | null
  doc_type: string | null
  uploaded_at: string
  file_path: string | null
}

interface VehicleAssignment {
  id: number
  vehicle_id: number
  assigned_from: string | null
  assigned_to: string | null
  active: boolean
  vehicles: {
    id: number
    vehicle_identifier: string | null
    registration: string | null
    make: string | null
    model: string | null
    vehicle_type: string | null
    off_the_road: boolean | null
  } | null
}

export function DriverDetailClient({ id }: { id: string }) {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [vehicleAssignments, setVehicleAssignments] = useState<VehicleAssignment[]>([])
  const [idBadgePhotoUrl, setIdBadgePhotoUrl] = useState<string | null>(null)
  const [tardinessReports, setTardinessReports] = useState<any[]>([])
  const [loadingTardiness, setLoadingTardiness] = useState(false)

  useEffect(() => {
    async function fetchDriver() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          employees (
            id,
            full_name,
            can_work,
            employment_status,
            phone_number,
            personal_email
          )
        `)
        .eq('employee_id', id)
        .single()

      if (error) {
        console.error('Error fetching driver:', error)
        setLoading(false)
        return
      }

      if (!data) {
        setLoading(false)
        return
      }

      setDriver(data as Driver)
      setLoading(false)
      
      // Load documents for this driver
      if (data) {
        loadDocuments(data.employee_id)
        loadVehicleAssignments(data.employee_id)
        loadTardinessReports(data.employee_id)
      }
    }

    fetchDriver()
  }, [id])

  const loadVehicleAssignments = async (employeeId: number) => {
    const supabase = createClient()
    
    // Get active vehicle assignments from vehicle_assignments table
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('vehicle_assignments')
      .select(`
        id,
        vehicle_id,
        assigned_from,
        assigned_to,
        active,
        vehicles (
          id,
          vehicle_identifier,
          registration,
          make,
          model,
          vehicle_type,
          off_the_road
        )
      `)
      .eq('employee_id', employeeId)
      .or('active.eq.true,active.is.null')
      .not('vehicle_id', 'is', null)
      .order('assigned_from', { ascending: false })

    // Also check for vehicles where this driver is assigned for MOT/service follow-up
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        vehicle_identifier,
        registration,
        make,
        model,
        vehicle_type,
        off_the_road,
        assigned_to
      `)
      .eq('assigned_to', employeeId)


    // Combine both sources
    const allAssignments: VehicleAssignment[] = []

    // Add vehicle_assignments
    if (assignmentsData) {
      assignmentsData.forEach((assignment: any) => {
        if (assignment.vehicles) {
          allAssignments.push({
            id: assignment.id,
            vehicle_id: assignment.vehicle_id,
            assigned_from: assignment.assigned_from,
            assigned_to: assignment.assigned_to,
            active: assignment.active,
            vehicles: assignment.vehicles,
          })
        }
      })
    }

    // Add vehicles from assigned_to field (if not already in assignments)
    if (vehiclesData) {
      vehiclesData.forEach((vehicle: any) => {
        // Check if this vehicle is already in assignments
        const exists = allAssignments.some(a => a.vehicle_id === vehicle.id)
        if (!exists) {
          allAssignments.push({
            id: 0, // No assignment ID for this case
            vehicle_id: vehicle.id,
            assigned_from: null,
            assigned_to: null,
            active: true,
            vehicles: vehicle,
          })
        }
      })
    }

    setVehicleAssignments(allAssignments)
  }

  const loadDocuments = async (employeeId: number) => {
    setLoadingDocuments(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, file_url, file_type, doc_type, uploaded_at, file_path')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      setDocuments([])
    } else {
      setDocuments(data || [])
      
      // Find ID Badge photo for profile picture
      const idBadgeDoc = data?.find(doc => {
        if (!doc.doc_type) return false
        const docTypeLower = doc.doc_type.toLowerCase()
        return docTypeLower === 'id badge' || 
               (docTypeLower.includes('id') && docTypeLower.includes('badge'))
      })
      
      if (idBadgeDoc) {
        const urls = parseFileUrls(idBadgeDoc.file_url || idBadgeDoc.file_path)
        // Find first image URL
        let imageUrl = urls.find(url => 
          url && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif'))
        ) || urls[0]
        
        // If we have a file_path but no public URL, try to get it from storage
        if (!imageUrl && idBadgeDoc.file_path) {
          const supabase = createClient()
          const { data: { publicUrl } } = supabase.storage
            .from('ROUTE_DOCUMENTS')
            .getPublicUrl(idBadgeDoc.file_path)
          imageUrl = publicUrl
        }
        
        if (imageUrl) {
          setIdBadgePhotoUrl(imageUrl)
        }
      }
    }
    setLoadingDocuments(false)
  }

  const parseFileUrls = (fileUrl: string | null): string[] => {
    if (!fileUrl) return []
    try {
      const parsed = JSON.parse(fileUrl)
      return Array.isArray(parsed) ? parsed : [fileUrl]
    } catch {
      return [fileUrl]
    }
  }

  const loadTardinessReports = async (employeeId: number) => {
    setLoadingTardiness(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tardiness_reports')
      .select(`
        *,
        route:route_id(id, route_number),
        coordinator:coordinator_id(id, full_name),
        route_session:route_session_id(id, session_type, session_date)
      `)
      .eq('driver_id', employeeId)
      .order('reported_at', { ascending: false })

    if (error) {
      console.error('Error fetching tardiness reports:', error)
      setTardinessReports([])
    } else {
      setTardinessReports(data || [])
    }
    setLoadingTardiness(false)
  }

  // Reload tardiness reports when tardiness tab is opened
  useEffect(() => {
    if (activeTab === 'tardiness' && driver) {
      loadTardinessReports(driver.employee_id)
    }
  }, [activeTab, driver?.employee_id])

  // Set up real-time subscription for tardiness reports
  useEffect(() => {
    if (!driver) return

    const supabase = createClient()
    const channel = supabase
      .channel('tardiness-reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tardiness_reports',
          filter: `driver_id=eq.${driver.employee_id}`
        },
        (payload) => {
          console.log('Tardiness report changed:', payload)
          // Reload tardiness reports when any change occurs
          loadTardinessReports(driver.employee_id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [driver?.employee_id])

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
    notFound()
  }

  const employee = driver.employees

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/drivers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          {/* Profile Picture - ID Badge */}
          <div className="relative">
            {idBadgePhotoUrl ? (
              <img
                src={idBadgePhotoUrl}
                alt={`${employee.full_name} - ID Badge`}
                className="h-24 w-24 rounded-full object-cover border-4 border-navy shadow-lg"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-navy flex items-center justify-center border-4 border-navy shadow-lg">
                <span className="text-white text-2xl font-bold">
                  {employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            {driver.tas_badge_number && (
              <div className="absolute -bottom-1 -right-1 bg-navy text-white text-xs font-semibold px-2 py-1 rounded-full border-2 border-white">
                {driver.tas_badge_number}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-navy">{employee.full_name}</h1>
            <p className="mt-2 text-sm text-gray-600">Driver Details & Compliance</p>
          </div>
        </div>
        <Link href={`/dashboard/drivers/${id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Warning Banner */}
      {employee.can_work === false && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Driver Cannot Work
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  This driver has expired certificates and is flagged as unable to work. Please review and renew certificates below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Driver sections">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${activeTab === 'overview' 
                ? 'border-navy text-navy' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
          >
            📋 Overview
          </button>
          <button
            onClick={() => setActiveTab('documentation')}
            className={`
              border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${activeTab === 'documentation' 
                ? 'border-navy text-navy' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
          >
            <FileText className="inline mr-2 h-4 w-4" />
            Documentation
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`
              border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${activeTab === 'training' 
                ? 'border-navy text-navy' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
          >
            <GraduationCap className="inline mr-2 h-4 w-4" />
            Training & Checks
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`
              border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${activeTab === 'documents' 
                ? 'border-navy text-navy' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
          >
            <FileText className="inline mr-2 h-4 w-4" />
            Uploaded Documents
          </button>
          <button
            onClick={() => setActiveTab('tardiness')}
            className={`
              border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${activeTab === 'tardiness' 
                ? 'border-navy text-navy' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
          >
            <Timer className="inline mr-2 h-4 w-4" />
            Tardiness Reports
            {tardinessReports.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                {tardinessReports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('daily-checks')}
            className={`
              border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${activeTab === 'daily-checks' 
                ? 'border-navy text-navy' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
          >
            <CheckCircle className="inline mr-2 h-4 w-4" />
            Daily Vehicle Checks
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.full_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      employee.employment_status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {employee.employment_status || 'N/A'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Work Authorization</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 text-xs font-semibold leading-5 ${
                      employee.can_work === false
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {employee.can_work === false ? (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Cannot Work
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Authorized
                      </>
                    )}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">PSV License</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      driver.psv_license ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {driver.psv_license ? 'Yes' : 'No'}
                  </span>
                </dd>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.phone_number || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Personal Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {employee.personal_email || 'N/A'}
                </dd>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Assignment */}
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle className="flex items-center">
                <Car className="mr-2 h-5 w-5" />
                Assigned Vehicle(s)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {vehicleAssignments.length === 0 ? (
                <div>
                  <p className="text-sm text-gray-500">No vehicle assigned</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Vehicle assignments are managed through the vehicle_assignments table
                  </p>
                </div>
              ) : (
                vehicleAssignments.map((assignment) => {
                  const vehicle = assignment.vehicles
                  if (!vehicle) return null
                  
                  return (
                    <div key={assignment.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link 
                            href={`/dashboard/vehicles/${vehicle.id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {vehicle.vehicle_identifier || vehicle.registration || `Vehicle ${vehicle.id}`}
                          </Link>
                          {vehicle.make && vehicle.model && (
                            <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model}</p>
                          )}
                        </div>
                        {vehicle.off_the_road && (
                          <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-red-100 text-red-800">
                            VOR
                          </span>
                        )}
                      </div>
                      {vehicle.registration && (
                        <p className="text-xs text-gray-500">Registration: {vehicle.registration}</p>
                      )}
                      {vehicle.vehicle_type && (
                        <p className="text-xs text-gray-500">Type: {vehicle.vehicle_type}</p>
                      )}
                      {assignment.assigned_from && (
                        <p className="text-xs text-gray-500">
                          Assigned from: {formatDate(assignment.assigned_from)}
                        </p>
                      )}
                      {assignment.assigned_to && (
                        <p className="text-xs text-gray-500">
                          Assigned until: {formatDate(assignment.assigned_to)}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Key Certificates Summary */}
          <Card className="md:col-span-2">
            <CardHeader className="bg-navy text-white">
              <CardTitle>Key Certificates Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'TAS Badge', date: driver.tas_badge_expiry_date, badge: driver.tas_badge_number },
                  { label: 'Driving License', date: driver.driving_license_expiry_date },
                  { label: 'CPC', date: driver.cpc_expiry_date },
                  { label: 'First Aid', date: driver.first_aid_certificate_expiry_date },
                ].map((cert, idx) => {
                  const daysRemaining = getDaysRemaining(cert.date)
                  const badge = getExpiryBadge(daysRemaining)
                  return (
                    <div key={idx} className="rounded-lg border p-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">{cert.label}</p>
                      {cert.badge && (
                        <p className="text-xs text-gray-500 mb-2">{cert.badge}</p>
                      )}
                      <p className="text-xs text-gray-500 mb-2">
                        {cert.date ? formatDate(cert.date) : 'Not set'}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${badge.color}`}>
                        {badge.icon && <badge.icon className="mr-1 h-3 w-3" />}
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code Section */}
        <DriverQRCode driverId={parseInt(id)} />
      </>
      )}

      {/* Documentation Tab */}
      {activeTab === 'documentation' && (
        <div className="space-y-6">
          {/* Expiry Certificates */}
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>📅 Certificates with Expiry Dates</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-navy">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Certificate Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Badge/Reference</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Expiry Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'TAS Badge', date: driver.tas_badge_expiry_date, ref: driver.tas_badge_number, docType: 'TAS Badge' },
                      { label: 'DBS Certificate', date: null, ref: driver.dbs_number, docType: 'DBS Certificate' },
                      { label: 'First Aid Certificate', date: driver.first_aid_certificate_expiry_date, ref: null, docType: 'First Aid Certificate' },
                      { label: 'Passport', date: driver.passport_expiry_date, ref: null, docType: 'Passport' },
                      { label: 'Driving License', date: driver.driving_license_expiry_date, ref: null, docType: 'Driving License' },
                      { label: 'CPC Certificate', date: driver.cpc_expiry_date, ref: null, docType: 'CPC Certificate' },
                      { label: 'Utility Bill', date: driver.utility_bill_date, ref: null, docType: 'Utility Bill' },
                    ].map((item, idx) => {
                      const daysRemaining = getDaysRemaining(item.date)
                      const badge = getExpiryBadge(daysRemaining)
                      // Find matching document for this certificate
                      // Try exact match first, then case-insensitive match, then partial match
                      const matchingDoc = item.docType 
                        ? documents.find(doc => {
                            if (!doc.doc_type) return false
                            const docTypeLower = doc.doc_type.toLowerCase()
                            const searchTypeLower = item.docType.toLowerCase()
                            return doc.doc_type === item.docType || 
                                   docTypeLower === searchTypeLower ||
                                   docTypeLower.includes(searchTypeLower) ||
                                   searchTypeLower.includes(docTypeLower)
                          })
                        : null
                      const docFileUrls = matchingDoc ? parseFileUrls(matchingDoc.file_url || matchingDoc.file_path) : []
                      
                      return (
                        <tr key={idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.label}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.ref || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.date ? formatDate(item.date) : 'Not set'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${badge.color}`}>
                              {badge.icon && <badge.icon className="mr-1 h-3 w-3" />}
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {docFileUrls.length > 0 ? (
                              <div className="flex space-x-2">
                                {docFileUrls.map((url, urlIdx) => (
                                  <a
                                    key={urlIdx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-navy text-white hover:bg-blue-800 transition-colors"
                                    title={`View ${docFileUrls.length > 1 ? `file ${urlIdx + 1}` : 'document'}`}
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    {docFileUrls.length > 1 ? `View ${urlIdx + 1}` : 'View Document'}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No document</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Document Checklist (Boolean Fields) */}
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>✅ Document Checklist</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Birth Certificate', value: driver.birth_certificate },
                  { label: 'Marriage Certificate', value: driver.marriage_certificate },
                  { label: 'Photo Taken', value: driver.photo_taken },
                  { label: 'Private Hire Badge', value: driver.private_hire_badge },
                  { label: 'Paper Licence', value: driver.paper_licence },
                  { label: 'Taxi Plate Photo', value: driver.taxi_plate_photo },
                  { label: 'Logbook', value: driver.logbook },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border p-4">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        item.value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.value ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Training & Checks Tab */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>🎓 Training & Compliance</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Safeguarding Training */}
                <div className="rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Safeguarding Training</h3>
                      <p className="text-sm text-gray-500">Mandatory child protection training</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
                        driver.safeguarding_training_completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {driver.safeguarding_training_completed ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Not Completed
                        </>
                      )}
                    </span>
                  </div>
                  {driver.safeguarding_training_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="mr-2 h-4 w-4" />
                      Completed on: {formatDate(driver.safeguarding_training_date)}
                    </div>
                  )}
                </div>

                {/* TAS PATS Training */}
                <div className="rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">TAS PATS Training</h3>
                      <p className="text-sm text-gray-500">Passenger Assistant Training Scheme</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
                        driver.tas_pats_training_completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {driver.tas_pats_training_completed ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Not Completed
                        </>
                      )}
                    </span>
                  </div>
                  {driver.tas_pats_training_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="mr-2 h-4 w-4" />
                      Completed on: {formatDate(driver.tas_pats_training_date)}
                    </div>
                  )}
                </div>

                {/* PSA Training */}
                <div className="rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">PSA Training</h3>
                      <p className="text-sm text-gray-500">Passenger Safety & Assistance</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
                        driver.psa_training_completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {driver.psa_training_completed ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Not Completed
                        </>
                      )}
                    </span>
                  </div>
                  {driver.psa_training_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="mr-2 h-4 w-4" />
                      Completed on: {formatDate(driver.psa_training_date)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Badge Photo Upload Section */}
          {driver && (
            <Card>
              <CardHeader className="bg-navy text-white">
                <CardTitle>Badge Photo</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <BadgePhotoUpload employeeId={driver.employee_id} onUpload={() => {
                  if (driver) {
                    loadDocuments(driver.employee_id)
                  }
                }} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>📄 Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingDocuments ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-navy">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Document Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">File Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Document Category</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Uploaded</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc, idx) => {
                        const fileUrls = parseFileUrls(doc.file_url || doc.file_path)
                        return (
                          <tr key={doc.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {doc.file_name || 'Untitled Document'}
                              {fileUrls.length > 1 && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({fileUrls.length} files)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {doc.file_type || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {doc.doc_type || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(doc.uploaded_at)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                {fileUrls.map((url, urlIdx) => (
                                  <a
                                    key={urlIdx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-navy text-white hover:bg-blue-800 transition-colors"
                                    title={`View ${fileUrls.length > 1 ? `file ${urlIdx + 1}` : 'document'}`}
                                  >
                                    {fileUrls.length > 1 ? (
                                      <>
                                        <ExternalLink className="mr-1 h-3 w-3" />
                                        File {urlIdx + 1}
                                      </>
                                    ) : (
                                      <>
                                        <ExternalLink className="mr-1 h-3 w-3" />
                                        View
                                      </>
                                    )}
                                  </a>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Checks Tab */}
      {activeTab === 'daily-checks' && driver && (
        <DriverPreChecks driverId={driver.employee_id} />
      )}

      {/* Tardiness Tab */}
      {activeTab === 'tardiness' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle className="flex items-center">
                <Timer className="mr-2 h-5 w-5" />
                Tardiness Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingTardiness ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading tardiness reports...</p>
                </div>
              ) : tardinessReports.length === 0 ? (
                <div className="text-center py-8">
                  <Timer className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No tardiness reports found</p>
                </div>
              ) : (
                <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-navy">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Session</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Route</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Reason</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Reviewed By</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tardinessReports.map((report, idx) => {
                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case 'pending':
                              return {
                                icon: Clock,
                                label: 'Pending',
                                color: 'bg-yellow-100 text-yellow-800'
                              }
                            case 'approved':
                              return {
                                icon: CheckCircle,
                                label: 'Approved',
                                color: 'bg-green-100 text-green-800'
                              }
                            case 'declined':
                              return {
                                icon: XCircle,
                                label: 'Declined',
                                color: 'bg-red-100 text-red-800'
                              }
                            default:
                              return {
                                icon: Clock,
                                label: status,
                                color: 'bg-gray-100 text-gray-800'
                              }
                          }
                        }
                        const statusBadge = getStatusBadge(report.status)
                        const StatusIcon = statusBadge.icon
                        
                        return (
                          <tr key={report.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(report.session_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {report.session_type || report.route_session?.session_type || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {report.route?.route_number ? (
                                <Link 
                                  href={`/dashboard/routes/${report.route_id}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {report.route.route_number}
                                </Link>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {report.reason}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusBadge.color}`}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {report.coordinator?.full_name || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div className="max-w-xs">
                                {report.additional_notes && (
                                  <p className="text-xs text-gray-500 mb-1">
                                    <strong>Driver:</strong> {report.additional_notes}
                                  </p>
                                )}
                                {report.coordinator_notes && (
                                  <p className="text-xs text-gray-500">
                                    <strong>Coordinator:</strong> {report.coordinator_notes}
                                  </p>
                                )}
                                {!report.additional_notes && !report.coordinator_notes && '—'}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Notes (shown on all tabs) */}
      {driver.additional_notes && (
        <Card className="border-l-4 border-navy">
          <CardHeader>
            <CardTitle className="text-navy">📝 Additional Notes (HR Comments)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{driver.additional_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Link to Certificate Expiry Dashboard */}
      <Card className="border-navy">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-navy mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  View All Certificate Expiries
                </p>
                <p className="text-xs text-gray-500">
                  Check all expiring certificates across drivers, PAs, and vehicles
                </p>
              </div>
            </div>
            <Link href="/dashboard/certificates-expiry" prefetch={true}>
              <Button variant="secondary">
                View Dashboard →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Driver Updates */}
      <DriverUpdatesClient driverId={driver.employee_id} />
    </div>
  )
}

