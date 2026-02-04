'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, Building2 } from 'lucide-react'

interface FieldAuditInfo {
  field_name: string
  change_time: string
  action: string
  changed_by: string
  changed_by_name: string
}

interface EmployeeDetailClientProps {
  employee: any
  employeeId: string
}

export default function EmployeeDetailClient({ employee, employeeId }: EmployeeDetailClientProps) {
  const [fieldAudit, setFieldAudit] = useState<Record<string, FieldAuditInfo>>({})
  const [assignedSchools, setAssignedSchools] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    async function fetchFieldAudit() {
      try {
        const response = await fetch(`/api/employees/${employeeId}/field-audit`)
        if (response.ok) {
          const data = await response.json()
          setFieldAudit(data.fieldHistory || {})
        }
      } catch (error) {
        console.error('Error fetching employee field audit:', error)
      }
    }

    fetchFieldAudit()
  }, [employeeId])

  useEffect(() => {
    if (employee?.role !== 'Coordinator' || !employeeId) return
    async function fetchAssignedSchools() {
      try {
        const res = await fetch(`/api/employees/${employeeId}/coordinator-schools`)
        if (res.ok) {
          const data = await res.json()
          setAssignedSchools(data.schools || [])
        }
      } catch (e) {
        console.error('Error fetching coordinator schools:', e)
      }
    }
    fetchAssignedSchools()
  }, [employee?.role, employeeId])

  const getFieldAuditInfo = (fieldName: string) => {
    return fieldAudit[fieldName]
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const FieldWithAudit = ({ fieldName, label, value, formatValue }: {
    fieldName: string
    label: string
    value: any
    formatValue?: (val: any) => string
  }) => {
    const auditInfo = getFieldAuditInfo(fieldName)
    const displayValue = formatValue ? formatValue(value) : (value || 'N/A')

    return (
      <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{displayValue}</dd>
        {auditInfo && (
          <dd className="mt-0.5 text-xs text-gray-500">
            {auditInfo.action === 'CREATE' ? 'Created' : 'Updated'} by {auditInfo.changed_by_name} on {formatDateTime(auditInfo.change_time)}
          </dd>
        )}
      </div>
    )
  }

  return (
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
          <FieldWithAudit fieldName="full_name" label="Full Name" value={employee.full_name} />
          <FieldWithAudit fieldName="role" label="Role" value={employee.role} />
          <div>
            <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${employee.employment_status === 'Active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
                  }`}
              >
                {employee.employment_status || 'N/A'}
              </span>
              {getFieldAuditInfo('employment_status') && (
                <dd className="mt-0.5 text-xs text-gray-500">
                  {getFieldAuditInfo('employment_status')!.action === 'CREATE' ? 'Created' : 'Updated'} by {getFieldAuditInfo('employment_status')!.changed_by_name} on {formatDateTime(getFieldAuditInfo('employment_status')!.change_time)}
                </dd>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Work Authorization</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-2 text-xs font-semibold leading-5 ${employee.can_work === false
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
              {getFieldAuditInfo('can_work') && (
                <dd className="mt-0.5 text-xs text-gray-500">
                  {getFieldAuditInfo('can_work')!.action === 'CREATE' ? 'Created' : 'Updated'} by {getFieldAuditInfo('can_work')!.changed_by_name} on {formatDateTime(getFieldAuditInfo('can_work')!.change_time)}
                </dd>
              )}
            </dd>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldWithAudit fieldName="phone_number" label="Phone Number" value={employee.phone_number} />
          <FieldWithAudit fieldName="personal_email" label="Personal Email" value={employee.personal_email} />
          <FieldWithAudit fieldName="address" label="Address" value={employee.address} />
          <FieldWithAudit fieldName="next_of_kin" label="Next of Kin" value={employee.next_of_kin} />
          <FieldWithAudit fieldName="date_of_birth" label="Date of Birth" value={employee.date_of_birth} formatValue={(v) => v ? formatDate(v) : 'N/A'} />
        </CardContent>
      </Card>

      {employee.role === 'Coordinator' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Assigned Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedSchools.length === 0 ? (
              <p className="text-sm text-gray-500">No schools assigned.</p>
            ) : (
              <ul className="space-y-2">
                {assignedSchools.map((school) => (
                  <li key={school.id}>
                    <Link
                      href={`/dashboard/schools/${school.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {school.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employment Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldWithAudit fieldName="start_date" label="Start Date" value={employee.start_date} formatValue={formatDate} />
          <FieldWithAudit fieldName="end_date" label="End Date" value={employee.end_date} formatValue={formatDate} />
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
  )
}
