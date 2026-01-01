'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate, formatDateTime } from '@/lib/utils'

interface FieldAuditInfo {
  field_name: string
  change_time: string
  action: string
  changed_by: string
  changed_by_name: string
}

interface RouteDetailClientProps {
  route: any
  routeId: number
}

export default function RouteDetailClient({ route, routeId }: RouteDetailClientProps) {
  const [fieldAudit, setFieldAudit] = useState<Record<string, FieldAuditInfo>>({})

  useEffect(() => {
    async function fetchFieldAudit() {
      try {
        const response = await fetch(`/api/routes/${routeId}/field-audit`)
        if (response.ok) {
          const data = await response.json()
          setFieldAudit(data.fieldHistory || {})
        }
      } catch (error) {
        console.error('Error fetching route field audit:', error)
      }
    }

    fetchFieldAudit()
  }, [routeId])

  const getFieldAuditInfo = (fieldName: string) => {
    return fieldAudit[fieldName]
  }

  const formatTime = (time: string | null): string => {
    if (!time) return 'N/A'
    if (time.includes(':')) {
      const parts = time.split(':')
      return `${parts[0]}:${parts[1]}`
    }
    return time
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
            {auditInfo.action === 'CREATE' ? 'Created' : 'Updated'} by {auditInfo.changed_by_name || 'System'} on {formatDateTime(auditInfo.change_time)}
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
            <dt className="text-sm font-medium text-gray-500">Route ID</dt>
            <dd className="mt-1 text-sm text-gray-900">{route.id}</dd>
          </div>
          <FieldWithAudit fieldName="route_number" label="Route Number" value={route.route_number} />
          <div>
            <dt className="text-sm font-medium text-gray-500">School</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {route.schools ? (
                <Link href={`/dashboard/schools/${route.school_id}`} className="text-blue-600 hover:underline">
                  {route.schools.name}
                </Link>
              ) : (
                'N/A'
              )}
            </dd>
            {getFieldAuditInfo('school_id') && (
              <dd className="mt-0.5 text-xs text-gray-500">
                {getFieldAuditInfo('school_id')!.action === 'CREATE' ? 'Created' : 'Updated'} by {getFieldAuditInfo('school_id')!.changed_by_name || 'System'} on {formatDateTime(getFieldAuditInfo('school_id')!.change_time)}
              </dd>
            )}
          </div>
          <FieldWithAudit fieldName="am_start_time" label="AM Start Time" value={route.am_start_time} formatValue={formatTime} />
          <FieldWithAudit fieldName="pm_start_time" label="PM Start Time" value={route.pm_start_time} formatValue={formatTime} />
          {route.pm_start_time_friday && (
            <FieldWithAudit fieldName="pm_start_time_friday" label="PM Start Time (Friday)" value={route.pm_start_time_friday} formatValue={formatTime} />
          )}
          <FieldWithAudit 
            fieldName="days_of_week" 
            label="Days of Week" 
            value={route.days_of_week}
            formatValue={(val) => {
              if (val && Array.isArray(val) && val.length > 0) {
                return val.join(', ')
              }
              return 'N/A'
            }}
          />
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(route.created_at)}</dd>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crew Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldWithAudit 
            fieldName="driver_id" 
            label="Driver" 
            value={(() => {
              if (!route.driver_id) return 'Not assigned'
              const driver = Array.isArray(route.driver) ? route.driver[0] : route.driver
              const driverEmp = Array.isArray(driver?.employees) ? driver.employees[0] : driver?.employees
              return driverEmp?.full_name || 'Unknown'
            })()}
          />
          <FieldWithAudit 
            fieldName="passenger_assistant_id" 
            label="Passenger Assistant" 
            value={(() => {
              if (!route.passenger_assistant_id) return 'Not assigned'
              const pa = Array.isArray(route.pa) ? route.pa[0] : route.pa
              const paEmp = Array.isArray(pa?.employees) ? pa.employees[0] : pa?.employees
              return paEmp?.full_name || 'Unknown'
            })()}
          />
          <FieldWithAudit 
            fieldName="vehicle_id" 
            label="Vehicle" 
            value={(() => {
              if (!route.vehicle_id) return 'Not assigned'
              const vehicle = route.vehicles 
                ? (Array.isArray(route.vehicles) ? route.vehicles[0] : route.vehicles)
                : null
              if (!vehicle) return 'Unknown'
              return vehicle.vehicle_identifier || vehicle.registration || `Vehicle ${route.vehicle_id}`
            })()}
          />
        </CardContent>
      </Card>
    </div>
  )
}

