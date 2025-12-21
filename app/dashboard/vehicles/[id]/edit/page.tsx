'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
function EditVehiclePageClient({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string }>>([])

  const [formData, setFormData] = useState({
    vehicle_identifier: '',
    registration: '',
    registration_expiry_date: '',
    make: '',
    model: '',
    plate_number: '',
    colour: '',
    plate_expiry_date: '',
    vehicle_type: '',
    ownership_type: '',
    council_assignment: '',
    mot_date: '',
    tax_date: '',
    insurance_expiry_date: '',
    taxi_badge_number: '',
    taxi_badge_expiry_date: '',
    tail_lift: false,
    loler_expiry_date: '',
    last_serviced: '',
    service_booked_day: '',
    first_aid_expiry: '',
    fire_extinguisher_expiry: '',
    taxi_license: '',
    taxi_registration_driver: '',
    spare_vehicle: false,
    off_the_road: false,
    assigned_to: '',
    notes: '',
  })

  useEffect(() => {
    async function loadDrivers() {
      const { data, error } = await supabase
        .from('drivers')
        .select('employee_id, employees(full_name, employment_status, can_work)')
        .order('employee_id')

      if (!error && data) {
        const driverList = data
          .filter((d: any) => d.employees?.employment_status === 'Active' && d.employees?.can_work !== false)
          .map((d: any) => ({
            id: d.employee_id,
            name: d.employees?.full_name || 'Unknown',
          }))
        setDrivers(driverList)
      }
    }

    loadDrivers()
  }, [supabase])

  useEffect(() => {
    async function loadVehicle() {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError('Failed to load vehicle')
        return
      }

      if (data) {
        setFormData({
          vehicle_identifier: data.vehicle_identifier || '',
          registration: data.registration || '',
          registration_expiry_date: data.registration_expiry_date || '',
          make: data.make || '',
          model: data.model || '',
          plate_number: data.plate_number || '',
          colour: data.colour || '',
          plate_expiry_date: data.plate_expiry_date || '',
          vehicle_type: data.vehicle_type || '',
          ownership_type: data.ownership_type || '',
          council_assignment: data.council_assignment || '',
          mot_date: data.mot_date || '',
          tax_date: data.tax_date || '',
          insurance_expiry_date: data.insurance_expiry_date || '',
          taxi_badge_number: data.taxi_badge_number || '',
          taxi_badge_expiry_date: data.taxi_badge_expiry_date || '',
          tail_lift: data.tail_lift || false,
          loler_expiry_date: data.loler_expiry_date || '',
          last_serviced: data.last_serviced || '',
          service_booked_day: data.service_booked_day || '',
          first_aid_expiry: data.first_aid_expiry || '',
          fire_extinguisher_expiry: data.fire_extinguisher_expiry || '',
          taxi_license: data.taxi_license || '',
          taxi_registration_driver: data.taxi_registration_driver || '',
          spare_vehicle: data.spare_vehicle || false,
          off_the_road: data.off_the_road || false,
          assigned_to: data.assigned_to ? String(data.assigned_to) : '',
          notes: data.notes || '',
        })
      }
    }

    loadVehicle()
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Convert empty date strings to null
      const dataToUpdate = {
        ...formData,
        registration_expiry_date: formData.registration_expiry_date || null,
        plate_expiry_date: formData.plate_expiry_date || null,
        mot_date: formData.mot_date || null,
        tax_date: formData.tax_date || null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        taxi_badge_expiry_date: formData.taxi_badge_expiry_date || null,
        loler_expiry_date: formData.loler_expiry_date || null,
        last_serviced: formData.last_serviced || null,
        service_booked_day: formData.service_booked_day || null,
        first_aid_expiry: formData.first_aid_expiry || null,
        fire_extinguisher_expiry: formData.fire_extinguisher_expiry || null,
        ownership_type: formData.ownership_type || null,
        council_assignment: formData.council_assignment || null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
      }

      const { error } = await supabase
        .from('vehicles')
        .update(dataToUpdate)
        .eq('id', id)

      if (error) throw error

      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'vehicles',
          record_id: parseInt(id),
          action: 'UPDATE',
        }),
      })

      router.push(`/dashboard/vehicles/${id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return
    }

    setDeleting(true)

    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id)

      if (error) throw error

      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'vehicles',
          record_id: parseInt(id),
          action: 'DELETE',
        }),
      })

      router.push('/dashboard/vehicles')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/vehicles/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Vehicle</h1>
            <p className="mt-2 text-sm text-gray-600">Update vehicle information</p>
          </div>
        </div>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicle_identifier">Vehicle Identifier</Label>
                <Input
                  id="vehicle_identifier"
                  value={formData.vehicle_identifier}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_identifier: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration">Registration</Label>
                <Input
                  id="registration"
                  value={formData.registration}
                  onChange={(e) =>
                    setFormData({ ...formData, registration: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_expiry_date">Registration Expiry Date</Label>
                <Input
                  id="registration_expiry_date"
                  type="date"
                  value={formData.registration_expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, registration_expiry_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plate_number">Plate Number</Label>
                <Input
                  id="plate_number"
                  value={formData.plate_number}
                  onChange={(e) =>
                    setFormData({ ...formData, plate_number: e.target.value })
                  }
                  placeholder="e.g., AB12 CDE"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) =>
                    setFormData({ ...formData, make: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="colour">Colour</Label>
                <Input
                  id="colour"
                  value={formData.colour}
                  onChange={(e) =>
                    setFormData({ ...formData, colour: e.target.value })
                  }
                  placeholder="e.g., Red, Blue, White"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Select
                  id="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_type: e.target.value })
                  }
                >
                  <option value="">Select type</option>
                  <option value="Minibus">Minibus</option>
                  <option value="Van">Van</option>
                  <option value="Car">Car</option>
                  <option value="Coach">Coach</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownership_type">Ownership Type</Label>
                <Select
                  id="ownership_type"
                  value={formData.ownership_type}
                  onChange={(e) =>
                    setFormData({ ...formData, ownership_type: e.target.value })
                  }
                >
                  <option value="">Select type</option>
                  <option value="In-House">In-House</option>
                  <option value="Subcontractors">Subcontractors</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="council_assignment">Council Assignment</Label>
                <Input
                  id="council_assignment"
                  value={formData.council_assignment}
                  onChange={(e) =>
                    setFormData({ ...formData, council_assignment: e.target.value })
                  }
                  placeholder="e.g., Council name or reference"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurance_expiry_date">Vehicle Insurance - Expiry Date</Label>
                <Input
                  id="insurance_expiry_date"
                  type="date"
                  value={formData.insurance_expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, insurance_expiry_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mot_date">MOT - Expiry Date</Label>
                <Input
                  id="mot_date"
                  type="date"
                  value={formData.mot_date}
                  onChange={(e) =>
                    setFormData({ ...formData, mot_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_date">Tax Date</Label>
                <Input
                  id="tax_date"
                  type="date"
                  value={formData.tax_date}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxi_badge_number">
                  Taxi Badge - Badge Number
                </Label>
                <Input
                  id="taxi_badge_number"
                  value={formData.taxi_badge_number}
                  onChange={(e) =>
                    setFormData({ ...formData, taxi_badge_number: e.target.value })
                  }
                  placeholder="e.g., TAXI67890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxi_badge_expiry_date">
                  Taxi Badge - Expiry Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="taxi_badge_expiry_date"
                  type="date"
                  value={formData.taxi_badge_expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, taxi_badge_expiry_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_serviced">Last Serviced</Label>
                <Input
                  id="last_serviced"
                  type="date"
                  value={formData.last_serviced}
                  onChange={(e) =>
                    setFormData({ ...formData, last_serviced: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tail_lift"
                  checked={formData.tail_lift}
                  onChange={(e) =>
                    setFormData({ ...formData, tail_lift: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="tail_lift">Tail Lift</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="spare_vehicle"
                  checked={formData.spare_vehicle}
                  onChange={(e) =>
                    setFormData({ ...formData, spare_vehicle: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="spare_vehicle">Spare Vehicle</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="off_the_road"
                  checked={formData.off_the_road}
                  onChange={(e) =>
                    setFormData({ ...formData, off_the_road: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="off_the_road">Off the Road</Label>
              </div>

              <div className="space-y-2">
                <SearchableSelect
                  id="assigned_to"
                  label="Assigned To (MOT & Service Follow-up)"
                  value={formData.assigned_to}
                  onChange={(value) => setFormData({ ...formData, assigned_to: value })}
                  options={drivers.map(driver => ({
                    value: driver.id,
                    label: driver.name,
                  }))}
                  placeholder="Select driver for MOT & service follow-up..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/dashboard/vehicles/${id}`}>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditVehiclePageClient id={id} />
}

