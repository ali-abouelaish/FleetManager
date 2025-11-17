import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'

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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.full_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.role || 'N/A'}</dd>
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
                      Cannot Work (Expired Certificates)
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Authorized to Work
                    </>
                  )}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Wheelchair Access</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {employee.wheelchair_access ? 'Yes' : 'No'}
              </dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        <Card>
          <CardHeader>
            <CardTitle>Employment Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(employee.start_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(employee.end_date)}
              </dd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(employee.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Updated At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(employee.updated_at)}
              </dd>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Passenger Assistant Certificates */}
      {employee.passenger_assistants && Array.isArray(employee.passenger_assistants) && employee.passenger_assistants.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="bg-navy text-white">
            <CardTitle className="flex items-center">
              👥 Passenger Assistant Certificates
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              {employee.passenger_assistants.map((pa: any, idx: number) => {
                const tasBadgeDays = getDaysRemaining(pa.tas_badge_expiry_date)
                const dbsDays = getDaysRemaining(pa.dbs_expiry_date)
                
                const tasBadgeStatus = getStatusBadge(tasBadgeDays)
                const dbsStatus = getStatusBadge(dbsDays)
                
                return (
                  <div key={idx} className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">TAS Badge</p>
                      <p className="text-xs text-gray-500 mb-1">
                        {pa.tas_badge_number || 'No badge number'}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        Expires: {formatDate(pa.tas_badge_expiry_date)}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${tasBadgeStatus.color}`}>
                        {tasBadgeStatus.icon && <tasBadgeStatus.icon className="mr-1 h-3 w-3" />}
                        {tasBadgeStatus.label}
                      </span>
                    </div>
                    
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">DBS Certificate</p>
                      <p className="text-xs text-gray-500 mb-2">
                        Expires: {formatDate(pa.dbs_expiry_date)}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${dbsStatus.color}`}>
                        {dbsStatus.icon && <dbsStatus.icon className="mr-1 h-3 w-3" />}
                        {dbsStatus.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
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

