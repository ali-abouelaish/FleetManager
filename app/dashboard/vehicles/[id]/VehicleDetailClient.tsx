'use client'

import { useState } from 'react'
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

export default function VehicleDetailClient({ vehicle, vehicleId }: VehicleDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

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
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vehicle Identifier</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.vehicle_identifier || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Registration</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.registration || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Registration Expiry Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.registration_expiry_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Plate Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.plate_number || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Make</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.make || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Model</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.model || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Colour</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.colour || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vehicle Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.vehicle_type || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ownership Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.ownership_type || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Council Assignment</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.council_assignment || 'N/A'}</dd>
                </div>
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
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tail Lift</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.tail_lift ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Spare Vehicle</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.spare_vehicle ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Off the Road</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.off_the_road ? 'Yes' : 'No'}</dd>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance & Expiry Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vehicle Insurance - Expiry Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.insurance_expiry_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">MOT - Expiry Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.mot_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tax Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.tax_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Taxi Badge - Badge Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{vehicle.taxi_badge_number || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Taxi Badge - Expiry Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.taxi_badge_expiry_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">LOLER Expiry</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.loler_expiry_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Plate Expiry</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.plate_expiry_date)}</dd>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance & Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Serviced</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.last_serviced)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Booked</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.service_booked_day)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">First Aid Expiry</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.first_aid_expiry)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fire Extinguisher Expiry</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.fire_extinguisher_expiry)}</dd>
                </div>
              </CardContent>
            </Card>
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

