'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import VehicleUpdates from './VehicleUpdates'
import VehicleDocuments from './VehicleDocuments'
import VehicleComplianceDocuments from './VehicleComplianceDocuments'

type TabType = 'overview' | 'compliance' | 'documents'

interface VehicleDetailClientProps {
  vehicle: any
  vehicleId: number
}

interface FieldAuditInfo {
  field_name: string
  change_time: string
  action: string
  changed_by: string
  changed_by_name: string
}

export default function VehicleDetailClient({ vehicle, vehicleId }: VehicleDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [fieldAudit, setFieldAudit] = useState<Record<string, FieldAuditInfo>>({})

  useEffect(() => {
    async function fetchFieldAudit() {
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}/field-audit`)
        if (response.ok) {
          const data = await response.json()
          setFieldAudit(data.fieldHistory || {})
        }
      } catch (error) {
        console.error('Error fetching field audit:', error)
      }
    }

    fetchFieldAudit()
  }, [vehicleId])

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
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Vehicle sections">
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
            onClick={() => setActiveTab('compliance')}
            className={`
              border-b-2 px-1 py-4 text-sm font-medium transition-colors
              ${activeTab === 'compliance' 
                ? 'border-navy text-navy' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
            `}
          >
            📜 Compliance Documents
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
            📄 All Documents
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vehicle ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.id}</dd>
                </div>
                <FieldWithAudit fieldName="vehicle_identifier" label="Vehicle Identifier" value={vehicle.vehicle_identifier} />
                <FieldWithAudit fieldName="registration" label="Registration" value={vehicle.registration} />
                <FieldWithAudit fieldName="registration_expiry_date" label="Registration Expiry Date" value={vehicle.registration_expiry_date} formatValue={formatDate} />
                <FieldWithAudit fieldName="plate_number" label="Plate Number" value={vehicle.plate_number} />
                <FieldWithAudit fieldName="make" label="Make" value={vehicle.make} />
                <FieldWithAudit fieldName="model" label="Model" value={vehicle.model} />
                <FieldWithAudit fieldName="colour" label="Colour" value={vehicle.colour} />
                <FieldWithAudit fieldName="vehicle_type" label="Vehicle Type" value={vehicle.vehicle_type} />
                <FieldWithAudit fieldName="ownership_type" label="Ownership Type" value={vehicle.ownership_type} />
                <FieldWithAudit fieldName="council_assignment" label="Council Assignment" value={vehicle.council_assignment} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status & Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        vehicle.off_the_road
                          ? 'bg-red-100 text-red-800'
                          : vehicle.spare_vehicle
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {vehicle.off_the_road ? 'VOR' : vehicle.spare_vehicle ? 'Spare' : 'Active'}
                    </span>
                  </dd>
                </div>
                <FieldWithAudit fieldName="tail_lift" label="Tail Lift" value={vehicle.tail_lift} formatValue={(val) => val ? 'Yes' : 'No'} />
                <FieldWithAudit fieldName="spare_vehicle" label="Spare Vehicle" value={vehicle.spare_vehicle} formatValue={(val) => val ? 'Yes' : 'No'} />
                <FieldWithAudit fieldName="off_the_road" label="Off the Road" value={vehicle.off_the_road} formatValue={(val) => val ? 'Yes' : 'No'} />
                {(() => {
                  const assignedEmployee = Array.isArray(vehicle.assigned_employee) 
                    ? vehicle.assigned_employee[0] 
                    : vehicle.assigned_employee
                  const assignedName = assignedEmployee?.full_name || (vehicle.assigned_to ? 'Unknown' : 'N/A')
                  return (
                    <FieldWithAudit 
                      fieldName="assigned_to" 
                      label="Assigned To (MOT & Service Follow-up)" 
                      value={assignedName} 
                    />
                  )
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance & Expiry Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWithAudit fieldName="insurance_expiry_date" label="Vehicle Insurance - Expiry Date" value={vehicle.insurance_expiry_date} formatValue={formatDate} />
                <FieldWithAudit fieldName="mot_date" label="MOT - Expiry Date" value={vehicle.mot_date} formatValue={formatDate} />
                <FieldWithAudit fieldName="tax_date" label="Tax Date" value={vehicle.tax_date} formatValue={formatDate} />
                <FieldWithAudit fieldName="taxi_badge_number" label="Taxi Badge - Badge Number" value={vehicle.taxi_badge_number} />
                <FieldWithAudit fieldName="taxi_badge_expiry_date" label="Taxi Badge - Expiry Date" value={vehicle.taxi_badge_expiry_date} formatValue={formatDate} />
                <FieldWithAudit fieldName="loler_expiry_date" label="LOLER Expiry" value={vehicle.loler_expiry_date} formatValue={formatDate} />
                <FieldWithAudit fieldName="plate_expiry_date" label="Plate Expiry" value={vehicle.plate_expiry_date} formatValue={formatDate} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance & Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldWithAudit fieldName="last_serviced" label="Last Serviced" value={vehicle.last_serviced} formatValue={formatDate} />
                <FieldWithAudit fieldName="service_booked_day" label="Service Booked" value={vehicle.service_booked_day} formatValue={formatDate} />
                <FieldWithAudit fieldName="first_aid_expiry" label="First Aid Expiry" value={vehicle.first_aid_expiry} formatValue={formatDate} />
                <FieldWithAudit fieldName="fire_extinguisher_expiry" label="Fire Extinguisher Expiry" value={vehicle.fire_extinguisher_expiry} formatValue={formatDate} />
                <FieldWithAudit fieldName="taxi_license" label="Taxi License" value={vehicle.taxi_license} />
                <FieldWithAudit fieldName="taxi_registration_driver" label="Taxi Registration Driver" value={vehicle.taxi_registration_driver} />
              </CardContent>
            </Card>

            {vehicle.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{vehicle.notes}</dd>
                    {getFieldAuditInfo('notes') && (
                      <dd className="mt-0.5 text-xs text-gray-500">
                        {getFieldAuditInfo('notes')!.action === 'CREATE' ? 'Created' : 'Updated'} by {getFieldAuditInfo('notes')!.changed_by_name} on {formatDateTime(getFieldAuditInfo('notes')!.change_time)}
                      </dd>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Vehicle Updates */}
          <VehicleUpdates vehicleId={vehicleId} />
        </>
      )}

      {/* Compliance Documents Tab */}
      {activeTab === 'compliance' && (
        <VehicleComplianceDocuments vehicleId={vehicleId} />
      )}

      {/* All Documents Tab */}
      {activeTab === 'documents' && (
        <VehicleDocuments vehicleId={vehicleId} />
      )}
    </div>
  )
}

