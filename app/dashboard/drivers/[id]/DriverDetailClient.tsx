'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil, AlertTriangle, CheckCircle, Clock, XCircle, FileText, GraduationCap } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import DriverQRCode from './DriverQRCode'

interface Driver {
  employee_id: number
  tas_badge_number: string | null
  tas_badge_expiry_date: string | null
  taxi_badge_number: string | null
  taxi_badge_expiry_date: string | null
  dbs_expiry_date: string | null
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
  vehicle_insurance_expiry_date: string | null
  mot_expiry_date: string | null
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

type TabType = 'overview' | 'documentation' | 'training'

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

export function DriverDetailClient({ id }: { id: string }) {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

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
    }

    fetchDriver()
  }, [id])

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

          {/* Key Certificates Summary */}
          <Card className="md:col-span-2">
            <CardHeader className="bg-navy text-white">
              <CardTitle>Key Certificates Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'TAS Badge', date: driver.tas_badge_expiry_date, badge: driver.tas_badge_number },
                  { label: 'Taxi Badge', date: driver.taxi_badge_expiry_date, badge: driver.taxi_badge_number },
                  { label: 'DBS', date: driver.dbs_expiry_date },
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
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'TAS Badge', date: driver.tas_badge_expiry_date, ref: driver.tas_badge_number },
                      { label: 'Taxi Badge', date: driver.taxi_badge_expiry_date, ref: driver.taxi_badge_number },
                      { label: 'DBS Certificate', date: driver.dbs_expiry_date, ref: null },
                      { label: 'First Aid Certificate', date: driver.first_aid_certificate_expiry_date, ref: null },
                      { label: 'Passport', date: driver.passport_expiry_date, ref: null },
                      { label: 'Driving License', date: driver.driving_license_expiry_date, ref: null },
                      { label: 'CPC Certificate', date: driver.cpc_expiry_date, ref: null },
                      { label: 'Vehicle Insurance', date: driver.vehicle_insurance_expiry_date, ref: null },
                      { label: 'MOT', date: driver.mot_expiry_date, ref: null },
                      { label: 'Utility Bill', date: driver.utility_bill_date, ref: null },
                    ].map((item, idx) => {
                      const daysRemaining = getDaysRemaining(item.date)
                      const badge = getExpiryBadge(daysRemaining)
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
    </div>
  )
}

