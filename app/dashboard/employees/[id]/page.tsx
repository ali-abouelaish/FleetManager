import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import the QR code component (client component)
const PassengerAssistantQRCodeWrapper = dynamic(
  () => import('@/components/dashboard/PassengerAssistantQRCode'),
  { ssr: false }
)

// Dynamically import the employee detail client component (for field audit)
const EmployeeDetailClient = dynamic(
  () => import('./EmployeeDetailClient'),
  { ssr: false }
)

async function getEmployee(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      drivers (
        tas_badge_number,
        tas_badge_expiry_date,
        taxi_badge_number,
        taxi_badge_expiry_date,
        dbs_expiry_date,
        psv_license,
        first_aid_certificate_expiry_date,
        passport_expiry_date,
        driving_license_expiry_date,
        cpc_expiry_date,
        utility_bill_date,
        vehicle_insurance_expiry_date,
        mot_expiry_date,
        birth_certificate,
        marriage_certificate,
        photo_taken,
        private_hire_badge,
        paper_licence,
        taxi_plate_photo,
        logbook,
        safeguarding_training_completed,
        safeguarding_training_date,
        tas_pats_training_completed,
        tas_pats_training_date,
        psa_training_completed,
        psa_training_date,
        additional_notes
      ),
      passenger_assistants (
        id,
        tas_badge_number,
        tas_badge_expiry_date,
        dbs_expiry_date
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

// Helper to calculate days remaining
function getDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Helper to get status badge
function getStatusBadge(daysRemaining: number | null) {
  if (daysRemaining === null) {
    return { icon: null, label: 'Not Set', color: 'bg-gray-100 text-gray-600' }
  }
  if (daysRemaining < 0) {
    return { icon: XCircle, label: `${Math.abs(daysRemaining)} days overdue`, color: 'bg-red-100 text-red-800' }
  }
  if (daysRemaining <= 14) {
    return { icon: AlertTriangle, label: `${daysRemaining} days remaining`, color: 'bg-orange-100 text-orange-800' }
  }
  if (daysRemaining <= 30) {
    return { icon: Clock, label: `${daysRemaining} days remaining`, color: 'bg-yellow-100 text-yellow-800' }
  }
  return { icon: CheckCircle, label: `${daysRemaining} days remaining`, color: 'bg-green-100 text-green-800' }
}

export default async function ViewEmployeePage({
  params,
}: {
  params: { id: string }
}) {
  const employee = await getEmployee(params.id)

  if (!employee) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/employees">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{employee.full_name}</h1>
            <p className="mt-2 text-sm text-gray-600">Employee Details</p>
          </div>
        </div>
        <Link href={`/dashboard/employees/${employee.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Certificate Status Warning Banner */}
      {employee.can_work === false && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Employee Cannot Work
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  This employee has expired certificates and is flagged as unable to work. Please renew certificates below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired & Expiring Certificates Summary */}
      {(() => {
        const expiredCerts: Array<{ type: string; expiryDate: string; daysOverdue: number; badge?: string }> = []
        const expiringCerts: Array<{ type: string; expiryDate: string; daysRemaining: number; badge?: string }> = []

        const checkCert = (type: string, date: string | null, badge?: string) => {
          if (!date) return
          const daysRemaining = getDaysRemaining(date)
          if (daysRemaining !== null) {
            if (daysRemaining < 0) {
              expiredCerts.push({ type, expiryDate: date, daysOverdue: Math.abs(daysRemaining), badge })
            } else if (daysRemaining <= 30) {
              expiringCerts.push({ type, expiryDate: date, daysRemaining, badge })
            }
          }
        }

        // Check driver certificates (handle both array and single object)
        if (employee.drivers) {
          const driver = Array.isArray(employee.drivers) ? employee.drivers[0] : employee.drivers
          if (driver) {
            checkCert('TAS Badge', driver.tas_badge_expiry_date, driver.tas_badge_number)
            checkCert('Taxi Badge', driver.taxi_badge_expiry_date, driver.taxi_badge_number)
            checkCert('DBS', driver.dbs_expiry_date)
            checkCert('First Aid Certificate', driver.first_aid_certificate_expiry_date)
            checkCert('Passport', driver.passport_expiry_date)
            checkCert('Driving License', driver.driving_license_expiry_date)
            checkCert('CPC', driver.cpc_expiry_date)
            checkCert('Vehicle Insurance', driver.vehicle_insurance_expiry_date)
            checkCert('MOT', driver.mot_expiry_date)
          }
        }

        // Check PA certificates (handle both array and single object)
        if (employee.passenger_assistants) {
          const pa = Array.isArray(employee.passenger_assistants) ? employee.passenger_assistants[0] : employee.passenger_assistants
          if (pa) {
            checkCert('TAS Badge', pa.tas_badge_expiry_date, pa.tas_badge_number)
            checkCert('DBS', pa.dbs_expiry_date)
          }
        }

        // Debug: Log to see what we found (remove in production)
        // console.log('Expired certs:', expiredCerts.length, 'Expiring certs:', expiringCerts.length)

        if (expiredCerts.length === 0 && expiringCerts.length === 0) {
          return null
        }

        return (
          <div className="space-y-4">
            {/* Expired Certificates */}
            {expiredCerts.length > 0 && (
              <Card className="border-l-4 border-red-500">
                <CardHeader className="bg-red-50">
                  <CardTitle className="flex items-center text-red-800">
                    <XCircle className="mr-2 h-5 w-5" />
                    Expired Certificates ({expiredCerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {expiredCerts.map((cert, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-900">{cert.type}</p>
                          {cert.badge && (
                            <p className="text-xs text-red-700 mt-1">Badge: {cert.badge}</p>
                          )}
                          <p className="text-xs text-red-600 mt-1">Expired: {formatDate(cert.expiryDate)}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-red-200 text-red-900">
                          {cert.daysOverdue} days overdue
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expiring Certificates */}
            {expiringCerts.length > 0 && (
              <Card className="border-l-4 border-orange-500">
                <CardHeader className="bg-orange-50">
                  <CardTitle className="flex items-center text-orange-800">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Expiring Certificates ({expiringCerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {expiringCerts.map((cert, idx) => {
                      const isCritical = cert.daysRemaining <= 14
                      return (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                          isCritical ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${isCritical ? 'text-orange-900' : 'text-yellow-900'}`}>
                              {cert.type}
                            </p>
                            {cert.badge && (
                              <p className={`text-xs mt-1 ${isCritical ? 'text-orange-700' : 'text-yellow-700'}`}>
                                Badge: {cert.badge}
                              </p>
                            )}
                            <p className={`text-xs mt-1 ${isCritical ? 'text-orange-600' : 'text-yellow-600'}`}>
                              Expires: {formatDate(cert.expiryDate)}
                            </p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            isCritical 
                              ? 'bg-orange-200 text-orange-900' 
                              : 'bg-yellow-200 text-yellow-900'
                          }`}>
                            {cert.daysRemaining} days remaining
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
      })()}

      {/* Employee Details with Field Audit */}
      <EmployeeDetailClient employee={employee} employeeId={employee.id.toString()} />

      {/* Driver Certificates - Comprehensive View */}
      {employee.drivers && Array.isArray(employee.drivers) && employee.drivers.length > 0 && (
        <>
          {employee.drivers.map((driver: any, idx: number) => (
            <div key={idx} className="space-y-6 md:col-span-2">
              {/* All Driver Certificates with Expiry Dates */}
              <Card>
                <CardHeader className="bg-navy text-white">
                  <CardTitle className="flex items-center">
                    🚗 Driver Certificates & Expiry Dates
                  </CardTitle>
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
                        ].map((item, itemIdx) => {
                          const daysRemaining = getDaysRemaining(item.date)
                          const badge = getStatusBadge(daysRemaining)
                          return (
                            <tr key={itemIdx} className={`border-b ${itemIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
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
                  
                  {/* PSV License */}
                  <div className="mt-4 p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">PSV License</span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                        driver.psv_license ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {driver.psv_license ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document Checklist */}
              <Card>
                <CardHeader className="bg-navy text-white">
                  <CardTitle className="flex items-center">
                    ✅ Driver Document Checklist
                  </CardTitle>
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
                    ].map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center justify-between rounded-lg border p-4">
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

              {/* Training & Checks */}
              <Card>
                <CardHeader className="bg-navy text-white">
                  <CardTitle className="flex items-center">
                    🎓 Driver Training & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Safeguarding Training */}
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Safeguarding Training</h3>
                          <p className="text-xs text-gray-500">Mandatory child protection training</p>
                          {driver.safeguarding_training_date && (
                            <p className="text-xs text-gray-600 mt-1">
                              Completed: {formatDate(driver.safeguarding_training_date)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            driver.safeguarding_training_completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {driver.safeguarding_training_completed ? (
                            <>
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Completed
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-4 w-4" />
                              Not Completed
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* TAS PATS Training */}
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">TAS PATS Training</h3>
                          <p className="text-xs text-gray-500">Passenger Assistant Training Scheme</p>
                          {driver.tas_pats_training_date && (
                            <p className="text-xs text-gray-600 mt-1">
                              Completed: {formatDate(driver.tas_pats_training_date)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            driver.tas_pats_training_completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {driver.tas_pats_training_completed ? (
                            <>
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Completed
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-4 w-4" />
                              Not Completed
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* PSA Training */}
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">PSA Training</h3>
                          <p className="text-xs text-gray-500">Passenger Safety & Assistance</p>
                          {driver.psa_training_date && (
                            <p className="text-xs text-gray-600 mt-1">
                              Completed: {formatDate(driver.psa_training_date)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            driver.psa_training_completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {driver.psa_training_completed ? (
                            <>
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Completed
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-4 w-4" />
                              Not Completed
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Notes */}
              {driver.additional_notes && (
                <Card className="border-l-4 border-navy">
                  <CardHeader>
                    <CardTitle className="text-navy">📝 Driver Notes (HR Comments)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{driver.additional_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </>
      )}

      {/* Passenger Assistant Certificates - Comprehensive View */}
      {employee.passenger_assistants && Array.isArray(employee.passenger_assistants) && employee.passenger_assistants.length > 0 && (
        <>
          {employee.passenger_assistants.map((pa: any, idx: number) => (
            <div key={idx} className="md:col-span-2 space-y-6">
              <Card className="md:col-span-2">
                <CardHeader className="bg-navy text-white">
                  <CardTitle className="flex items-center">
                    👥 Passenger Assistant Certificates & Expiry Dates
                  </CardTitle>
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
                          { label: 'TAS Badge', date: pa.tas_badge_expiry_date, ref: pa.tas_badge_number },
                          { label: 'DBS Certificate', date: pa.dbs_expiry_date, ref: null },
                        ].map((item, itemIdx) => {
                          const daysRemaining = getDaysRemaining(item.date)
                          const badge = getStatusBadge(daysRemaining)
                          return (
                            <tr key={itemIdx} className={`border-b ${itemIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
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
              {/* QR Code for Document Upload */}
              {pa.id && (
                <PassengerAssistantQRCodeWrapper assistantId={pa.id} />
              )}
            </div>
          ))}
        </>
      )}

    </div>
  )
}

