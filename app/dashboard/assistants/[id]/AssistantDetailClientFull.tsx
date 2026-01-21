'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil, AlertTriangle, CheckCircle, Clock, XCircle, FileText, GraduationCap, Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

const PassengerAssistantQRCodeWrapper = dynamic(
  () => import('@/components/dashboard/PassengerAssistantQRCode'),
  { ssr: false }
)

interface PassengerAssistant {
  id: number
  employee_id: number
  tas_badge_number: string | null
  tas_badge_expiry_date: string | null
  dbs_number: string | null
  first_aid_certificate_expiry_date: string | null
  passport_expiry_date: string | null
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

interface Document {
  id: number
  file_name: string | null
  file_url: string | null
  file_type: string | null
  doc_type: string | null
  uploaded_at: string
  file_path: string | null
}

export function AssistantDetailClientFull({ id }: { id: string }) {
  const [assistant, setAssistant] = useState<PassengerAssistant | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [idBadgePhotoUrl, setIdBadgePhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAssistant() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('passenger_assistants')
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
        .eq('id', parseInt(id))
        .single()

      if (error) {
        console.error('Error fetching passenger assistant:', error)
        setLoading(false)
        return
      }

      if (!data) {
        setLoading(false)
        return
      }

      setAssistant(data as PassengerAssistant)
      setLoading(false)
      
      // Load documents for this PA
      if (data) {
        loadDocuments(data.employee_id)
      }
    }

    fetchAssistant()
  }, [id])

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
            .from('DRIVER_DOCUMENTS')
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

  if (!assistant) {
    notFound()
  }

  const employee = assistant.employees

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/assistants">
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
                className="h-24 w-24 rounded-full object-cover border-4 border-violet-500 shadow-lg shadow-violet-500/25"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center border-4 border-violet-500 shadow-lg shadow-violet-500/25">
                <span className="text-white text-2xl font-bold">
                  {employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            {assistant.tas_badge_number && (
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-violet-600 to-blue-700 text-white text-xs font-semibold px-2 py-1 rounded-full border-2 border-white shadow-md shadow-violet-500/25">
                {assistant.tas_badge_number}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{employee.full_name}</h1>
            <p className="mt-2 text-sm text-gray-600">Passenger Assistant Details & Compliance</p>
          </div>
        </div>
        <Link href={`/dashboard/assistants/${id}/edit`}>
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
                  Passenger Assistant Cannot Work
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  This passenger assistant has expired certificates and is flagged as unable to work. Please review and renew certificates below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="PA sections">
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
            Training
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Assistant ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{assistant.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">{employee.full_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{assistant.employee_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    employee.employment_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {employee.employment_status || 'N/A'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.phone_number || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{employee.personal_email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Can Work</dt>
                <dd className="mt-1">
                  {employee.can_work === false ? (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-red-100 text-red-800">
                      CANNOT WORK
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-green-100 text-green-800">
                      Authorized
                    </span>
                  )}
                </dd>
              </div>
            </CardContent>
          </Card>

          {/* Key Certificates Summary */}
          <Card>
            <CardHeader className="bg-navy text-white">
              <CardTitle>Key Certificates Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: 'TAS Badge', date: assistant.tas_badge_expiry_date, badge: assistant.tas_badge_number },
                  { label: 'First Aid', date: assistant.first_aid_certificate_expiry_date },
                  { label: 'Passport', date: assistant.passport_expiry_date },
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
        <PassengerAssistantQRCodeWrapper assistantId={assistant.id} />
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
                      { label: 'TAS Badge', date: assistant.tas_badge_expiry_date, ref: assistant.tas_badge_number, docType: 'TAS Badge' },
                      { label: 'DBS Certificate', date: null, ref: assistant.dbs_number, docType: 'DBS Certificate' },
                      { label: 'First Aid Certificate', date: assistant.first_aid_certificate_expiry_date, ref: null, docType: 'First Aid Certificate' },
                      { label: 'Passport', date: assistant.passport_expiry_date, ref: null, docType: 'Passport' },
                      { label: 'Utility Bill', date: assistant.utility_bill_date, ref: null, docType: 'Utility Bill' },
                    ].map((item, idx) => {
                      const daysRemaining = getDaysRemaining(item.date)
                      const badge = getExpiryBadge(daysRemaining)
                      // Find matching document for this certificate
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
                  { label: 'Birth Certificate', value: assistant.birth_certificate },
                  { label: 'Marriage Certificate', value: assistant.marriage_certificate },
                  { label: 'Photo Taken', value: assistant.photo_taken },
                  { label: 'Private Hire Badge', value: assistant.private_hire_badge },
                  { label: 'Paper Licence', value: assistant.paper_licence },
                  { label: 'Taxi Plate Photo', value: assistant.taxi_plate_photo },
                  { label: 'Logbook', value: assistant.logbook },
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
                        assistant.safeguarding_training_completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {assistant.safeguarding_training_completed ? (
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
                  {assistant.safeguarding_training_date && (
                    <p className="text-sm text-gray-600">
                      Completion Date: <span className="font-medium">{formatDate(assistant.safeguarding_training_date)}</span>
                    </p>
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
                        assistant.tas_pats_training_completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {assistant.tas_pats_training_completed ? (
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
                  {assistant.tas_pats_training_date && (
                    <p className="text-sm text-gray-600">
                      Completion Date: <span className="font-medium">{formatDate(assistant.tas_pats_training_date)}</span>
                    </p>
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
                        assistant.psa_training_completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {assistant.psa_training_completed ? (
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
                  {assistant.psa_training_date && (
                    <p className="text-sm text-gray-600">
                      Completion Date: <span className="font-medium">{formatDate(assistant.psa_training_date)}</span>
                    </p>
                  )}
                </div>

                {/* Additional Notes */}
                {assistant.additional_notes && (
                  <div className="rounded-lg border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Notes</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{assistant.additional_notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
