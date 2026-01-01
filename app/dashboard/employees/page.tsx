import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { EmployeeSearchFilters } from './EmployeeSearchFilters'

async function getEmployees(filters?: {
  search?: string
  role?: string
  status?: string
  can_work?: string
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('employees')
    .select(`
      *,
      drivers (
        tas_badge_expiry_date,
        taxi_badge_expiry_date,
        dbs_expiry_date,
        first_aid_certificate_expiry_date,
        passport_expiry_date,
        driving_license_expiry_date,
        cpc_expiry_date,
        vehicle_insurance_expiry_date,
        mot_expiry_date
      ),
      passenger_assistants (
        tas_badge_expiry_date,
        dbs_expiry_date
      )
    `)

  // Apply search filter (case-insensitive name search)
  if (filters?.search && filters.search.trim()) {
    const searchTerm = filters.search.trim()
    query = query.ilike('full_name', `%${searchTerm}%`)
  }

  // Apply role filter
  if (filters?.role && filters.role !== 'all') {
    query = query.eq('role', filters.role)
  }

  // Apply status filter
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('employment_status', filters.status)
  }

  // Apply can_work filter
  if (filters?.can_work === 'yes') {
    query = query.eq('can_work', true)
  } else if (filters?.can_work === 'no') {
    query = query.eq('can_work', false)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching employees:', error)
    return []
  }

  let result = data || []

  // Fallback: If search filter didn't work in query, filter in memory
  if (filters?.search && filters.search.trim()) {
    const searchTerm = filters.search.trim().toLowerCase()
    result = result.filter((emp: any) => 
      emp.full_name?.toLowerCase().includes(searchTerm)
    )
  }

  return result
}

// Helper to get expired certificates for an employee
function getExpiredCertificates(employee: any): string[] {
  const today = new Date()
  const expiredCerts: string[] = []
  
  const checkDate = (date: string | null, certName: string) => {
    if (!date) return
    const expiry = new Date(date)
    if (expiry < today) {
      expiredCerts.push(certName)
    }
  }
  
  // Check driver certificates (one-to-one relationship - single object, not array)
  if (employee.drivers) {
    const driver = Array.isArray(employee.drivers) ? employee.drivers[0] : employee.drivers
    if (driver) {
      checkDate(driver.tas_badge_expiry_date, 'TAS Badge')
      checkDate(driver.taxi_badge_expiry_date, 'Taxi Badge')
      checkDate(driver.dbs_expiry_date, 'DBS')
      checkDate(driver.first_aid_certificate_expiry_date, 'First Aid')
      checkDate(driver.passport_expiry_date, 'Passport')
      checkDate(driver.driving_license_expiry_date, 'Driving License')
      checkDate(driver.cpc_expiry_date, 'CPC')
      checkDate(driver.vehicle_insurance_expiry_date, 'Vehicle Insurance')
      checkDate(driver.mot_expiry_date, 'MOT')
    }
  }
  
  // Check PA certificates (one-to-one relationship - single object, not array)
  if (employee.passenger_assistants) {
    const pa = Array.isArray(employee.passenger_assistants) ? employee.passenger_assistants[0] : employee.passenger_assistants
    if (pa) {
      checkDate(pa.tas_badge_expiry_date, 'TAS Badge')
      checkDate(pa.dbs_expiry_date, 'DBS')
    }
  }
  
  return expiredCerts
}

// Helper to check if any certificate is expired or expiring soon
function getCertificateStatus(employee: any) {
  const today = new Date()
  const fourteenDays = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  
  let hasExpired = false
  let expiringCritical = false
  let expiringWarning = false
  
  const checkDate = (date: string | null) => {
    if (!date) return
    const expiry = new Date(date)
    if (expiry < today) {
      hasExpired = true
    } else if (expiry <= fourteenDays) {
      expiringCritical = true
    } else if (expiry.getTime() - today.getTime() <= 30 * 24 * 60 * 60 * 1000) {
      expiringWarning = true
    }
  }
  
  // Check driver certificates (one-to-one relationship - single object, not array)
  if (employee.drivers) {
    const driver = Array.isArray(employee.drivers) ? employee.drivers[0] : employee.drivers
    if (driver) {
      checkDate(driver.tas_badge_expiry_date)
      checkDate(driver.taxi_badge_expiry_date)
      checkDate(driver.dbs_expiry_date)
      checkDate(driver.first_aid_certificate_expiry_date)
      checkDate(driver.passport_expiry_date)
      checkDate(driver.driving_license_expiry_date)
      checkDate(driver.cpc_expiry_date)
      checkDate(driver.vehicle_insurance_expiry_date)
      checkDate(driver.mot_expiry_date)
    }
  }
  
  // Check PA certificates (one-to-one relationship - single object, not array)
  if (employee.passenger_assistants) {
    const pa = Array.isArray(employee.passenger_assistants) ? employee.passenger_assistants[0] : employee.passenger_assistants
    if (pa) {
      checkDate(pa.tas_badge_expiry_date)
      checkDate(pa.dbs_expiry_date)
    }
  }
  
  if (hasExpired || employee.can_work === false) {
    return { 
      status: 'expired', 
      label: 'Expired', 
      color: 'bg-red-100 text-red-800'
    }
  } else if (expiringCritical) {
    return { status: 'critical', label: '< 14 Days', color: 'bg-orange-100 text-orange-800' }
  } else if (expiringWarning) {
    return { status: 'warning', label: '< 30 Days', color: 'bg-yellow-100 text-yellow-800' }
  }
  
  return { status: 'valid', label: 'Valid', color: 'bg-green-100 text-green-800' }
}

async function EmployeesTable({
  search,
  role,
  status,
  can_work,
}: {
  search?: string
  role?: string
  status?: string
  can_work?: string
}) {
  const employees = await getEmployees({ search, role, status, can_work })

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Employment Status</TableHead>
            <TableHead>Can Work</TableHead>
            <TableHead>Certificate Status</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-gray-500">
                No employees found. Add your first employee to get started.
              </TableCell>
            </TableRow>
          ) : (
            employees.map((employee) => {
              const certStatus = getCertificateStatus(employee)
              const expiredCerts = getExpiredCertificates(employee)
              const isDriver = employee.drivers && (Array.isArray(employee.drivers) ? employee.drivers.length > 0 : true)
              const isPA = employee.passenger_assistants && (Array.isArray(employee.passenger_assistants) ? employee.passenger_assistants.length > 0 : true)
              
              return (
                <TableRow key={employee.id}>
                  <TableCell>{employee.id}</TableCell>
                  <TableCell className="font-medium">{employee.full_name}</TableCell>
                  <TableCell>{employee.role || 'N/A'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        employee.employment_status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {employee.employment_status || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {employee.can_work === false ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-red-100 text-red-800">
                          <XCircle className="mr-1 h-4 w-4" />
                          CANNOT WORK
                        </span>
                        {expiredCerts.length > 0 && (
                          <div className="text-xs text-red-700 font-medium">
                            Expired: {expiredCerts.join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Authorized
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(isDriver || isPA) ? (
                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 text-xs font-semibold leading-5 ${certStatus.color}`}
                        >
                          {certStatus.status === 'expired' && <AlertTriangle className="mr-1 h-3 w-3" />}
                          {certStatus.status === 'valid' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {certStatus.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>{employee.phone_number || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/employees/${employee.id}`} prefetch={true}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/employees/${employee.id}/edit`} prefetch={true}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: {
    search?: string
    role?: string
    status?: string
    can_work?: string
  }
}) {
  // Build filters from search params (Next.js 14 - searchParams is not a Promise)
  const filters = {
    search: searchParams?.search || undefined,
    role: searchParams?.role || undefined,
    status: searchParams?.status || undefined,
    can_work: searchParams?.can_work || undefined,
  }

  // Create a unique key for Suspense based on all filter params
  const suspenseKey = JSON.stringify(filters)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Employees</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all employees in your fleet
          </p>
        </div>
        <Link href="/dashboard/employees/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      <EmployeeSearchFilters />

      <Suspense key={suspenseKey} fallback={<TableSkeleton rows={5} columns={8} />}>
        <EmployeesTable {...filters} />
      </Suspense>
    </div>
  )
}

