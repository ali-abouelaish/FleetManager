'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Trash2, Plus, MapPin, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { generateUUID } from '@/lib/utils'

interface RoutePoint {
  id: string | number // string for new (UUID), number for existing (DB ID)
  point_name: string
  address: string
  latitude: string
  longitude: string
  stop_order: number
  isNew?: boolean // flag to track if it's a new point
}

function EditRoutePageClient({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schools, setSchools] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [passengerAssistants, setPassengerAssistants] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])

  const [formData, setFormData] = useState({
    route_number: '',
    school_id: '',
    driver_id: '',
    passenger_assistant_id: '',
    vehicle_id: '',
    am_start_time: '',
    pm_start_time: '',
    pm_start_time_friday: '',
    days_of_week: [] as string[],
  })

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [deletedPointIds, setDeletedPointIds] = useState<number[]>([])
  const [paAddresses, setPaAddresses] = useState<Record<number, string>>({})
  const routePointsRef = useRef(routePoints)
  routePointsRef.current = routePoints

  const addRoutePoint = () => {
    const nextOrder = routePoints.length + 1
    setRoutePoints([
      ...routePoints,
      {
        id: generateUUID(),
        point_name: '',
        address: '',
        latitude: '',
        longitude: '',
        stop_order: nextOrder,
        isNew: true,
      },
    ])
  }

  const removeRoutePoint = (pointId: string | number) => {
    // If it's an existing point (number ID), add to deleted list
    if (typeof pointId === 'number') {
      setDeletedPointIds([...deletedPointIds, pointId])
    }
    
    const newPoints = routePoints.filter((point) => point.id !== pointId)
    // Re-order remaining points
    const reorderedPoints = newPoints.map((point, index) => ({
      ...point,
      stop_order: index + 1,
    }))
    setRoutePoints(reorderedPoints)
  }

  const updateRoutePoint = (pointId: string | number, field: keyof RoutePoint, value: string | number) => {
    setRoutePoints(
      routePoints.map((point) =>
        point.id === pointId ? { ...point, [field]: value } : point
      )
    )
  }

  const movePointUp = (index: number) => {
    if (index === 0) return
    const newPoints = [...routePoints]
    ;[newPoints[index - 1], newPoints[index]] = [newPoints[index], newPoints[index - 1]]
    const reorderedPoints = newPoints.map((point, idx) => ({
      ...point,
      stop_order: idx + 1,
    }))
    setRoutePoints(reorderedPoints)
  }

  const movePointDown = (index: number) => {
    if (index === routePoints.length - 1) return
    const newPoints = [...routePoints]
    ;[newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]]
    const reorderedPoints = newPoints.map((point, idx) => ({
      ...point,
      stop_order: idx + 1,
    }))
    setRoutePoints(reorderedPoints)
  }

  useEffect(() => {
    async function loadData() {
      const [routeResult, schoolsResult, pointsResult, driversResult, pasResult, vehiclesResult] = await Promise.all([
        supabase.from('routes').select('*').eq('id', id).single(),
        supabase.from('schools').select('id, name').order('name'),
        supabase.from('route_points').select('*').eq('route_id', id).order('stop_order'),
        supabase
          .from('drivers')
          .select('employee_id, employees(full_name, employment_status, can_work)')
          .order('employee_id'),
        supabase
          .from('passenger_assistants')
          .select('employee_id, employees(full_name, employment_status, can_work, address)')
          .order('employee_id'),
        supabase
          .from('vehicles')
          .select('id, vehicle_identifier, registration, make, model, plate_number, off_the_road')
          .eq('off_the_road', false)
          .order('vehicle_identifier'),
      ])

      if (routeResult.error) {
        setError('Failed to load route')
        return
      }

      if (routeResult.data) {
        // Format time values for input (HH:MM format)
        const formatTime = (time: string | null) => {
          if (!time) return ''
          // If time is in HH:MM:SS format, extract HH:MM
          if (time.includes(':')) {
            const parts = time.split(':')
            return `${parts[0]}:${parts[1]}`
          }
          return time
        }

        setFormData({
          route_number: routeResult.data.route_number || '',
          school_id: routeResult.data.school_id || '',
          driver_id: routeResult.data.driver_id || '',
          passenger_assistant_id: routeResult.data.passenger_assistant_id || '',
          vehicle_id: routeResult.data.vehicle_id || '',
          am_start_time: formatTime(routeResult.data.am_start_time),
          pm_start_time: formatTime(routeResult.data.pm_start_time),
          pm_start_time_friday: formatTime(routeResult.data.pm_start_time_friday),
          days_of_week: Array.isArray(routeResult.data.days_of_week) 
            ? routeResult.data.days_of_week 
            : [],
        })
      }

      if (schoolsResult.data) {
        setSchools(schoolsResult.data)
      }

      if (driversResult.data) {
        setDrivers(
          driversResult.data
            .filter((d: any) => d.employees?.employment_status === 'Active' && d.employees?.can_work !== false)
            .map((d: any) => ({
              id: d.employee_id,
              name: d.employees?.full_name || 'Unknown',
            }))
        )
      }

      if (pasResult.data) {
        const pas = pasResult.data
          .filter((pa: any) => pa.employees?.employment_status === 'Active' && pa.employees?.can_work !== false)
          .map((pa: any) => ({
            id: pa.employee_id,
            name: pa.employees?.full_name || 'Unknown',
          }))
        setPassengerAssistants(pas)
        
        // Store PA addresses for later use
        const addresses: Record<number, string> = {}
        pasResult.data.forEach((pa: any) => {
          if (pa.employees?.address) {
            addresses[pa.employee_id] = pa.employees.address
          }
        })
        setPaAddresses(addresses)
      }

      if (pointsResult.data) {
        const existingPoints = pointsResult.data.map((point) => ({
          id: point.id,
          point_name: point.point_name || '',
          address: point.address || '',
          latitude: point.latitude ? String(point.latitude) : '',
          longitude: point.longitude ? String(point.longitude) : '',
          stop_order: point.stop_order,
          isNew: false,
        }))
        setRoutePoints(existingPoints)
      }

      if (vehiclesResult.data) {
        setVehicles(vehiclesResult.data)
      }
    }

    loadData()
  }, [id, supabase])

  // Auto-add APA address as pickup point when APA is assigned and AM/PM times are set
  useEffect(() => {
    const currentPoints = routePointsRef.current

    if (!formData.passenger_assistant_id) {
      // Remove APA points if PA is removed - check all possible PA addresses
      const allPaAddresses = Object.values(paAddresses)
      const updatedPoints = currentPoints.filter(
        point => {
          const nameLower = point.point_name.toLowerCase()
          const isApaPoint = (nameLower.includes('apa') && nameLower.includes('home')) || 
                            allPaAddresses.includes(point.address || '')
          return !isApaPoint
        }
      )
      if (updatedPoints.length !== currentPoints.length) {
        const reordered = updatedPoints.map((point, idx) => ({
          ...point,
          stop_order: idx + 1,
        }))
        setRoutePoints(reordered)
      }
      return
    }

    const selectedPA = passengerAssistants.find(pa => pa.id === parseInt(formData.passenger_assistant_id))
    if (!selectedPA) return

    // Check if PA name contains "APA" (case-insensitive)
    const isAPA = selectedPA.name.toLowerCase().includes('apa')
    if (!isAPA) {
      // Remove APA points if PA is not APA - check all possible PA addresses
      const allPaAddresses = Object.values(paAddresses)
      const updatedPoints = currentPoints.filter(
        point => {
          const nameLower = point.point_name.toLowerCase()
          const isApaPoint = (nameLower.includes('apa') && nameLower.includes('home')) || 
                            allPaAddresses.includes(point.address || '')
          return !isApaPoint
        }
      )
      if (updatedPoints.length !== currentPoints.length) {
        const reordered = updatedPoints.map((point, idx) => ({
          ...point,
          stop_order: idx + 1,
        }))
        setRoutePoints(reordered)
      }
      return
    }

    const paAddress = paAddresses[parseInt(formData.passenger_assistant_id)]
    if (!paAddress) return

    let updatedPoints = [...currentPoints]
    let hasChanges = false

    // For AM routes: ensure first point is APA address
    if (formData.am_start_time) {
      const firstPoint = updatedPoints[0]
      const isFirstApa = firstPoint && (
        (firstPoint.point_name.toLowerCase().includes('apa') && firstPoint.point_name.toLowerCase().includes('home')) ||
        firstPoint.address === paAddress
      )

      if (!isFirstApa) {
        // Remove any existing APA points
        updatedPoints = updatedPoints.filter(
          point => !(
            (point.point_name.toLowerCase().includes('apa') && point.point_name.toLowerCase().includes('home')) ||
            point.address === paAddress
          )
        )

        // Add APA as first point
        const apaPoint = {
          id: generateUUID(),
          point_name: `${selectedPA.name} - Home`,
          address: paAddress,
          latitude: '',
          longitude: '',
          stop_order: 1,
          isNew: true,
        }

        // Shift existing points down
        updatedPoints = updatedPoints.map((point, idx) => ({
          ...point,
          stop_order: idx + 2,
        }))

        updatedPoints = [apaPoint, ...updatedPoints]
        hasChanges = true
      }
    } else {
      // Remove first APA point if AM time is removed
      if (updatedPoints[0] && (
        (updatedPoints[0].point_name.toLowerCase().includes('apa') && updatedPoints[0].point_name.toLowerCase().includes('home')) ||
        updatedPoints[0].address === paAddress
      )) {
        updatedPoints = updatedPoints.slice(1).map((point, idx) => ({
          ...point,
          stop_order: idx + 1,
        }))
        hasChanges = true
      }
    }

    // For PM routes: ensure last point is APA address
    if (formData.pm_start_time) {
      const lastPoint = updatedPoints[updatedPoints.length - 1]
      const isLastApa = lastPoint && (
        (lastPoint.point_name.toLowerCase().includes('apa') && lastPoint.point_name.toLowerCase().includes('home')) ||
        lastPoint.address === paAddress
      )

      if (!isLastApa) {
        // Remove any existing APA points that aren't first (keep first if AM exists)
        updatedPoints = updatedPoints.filter(
          (point, idx) => {
            if (idx === 0 && formData.am_start_time) return true // Keep first if AM route
            return !(
              (point.point_name.toLowerCase().includes('apa') && point.point_name.toLowerCase().includes('home')) ||
              point.address === paAddress
            )
          }
        )

        // Add APA as last point
        const nextOrder = updatedPoints.length > 0 
          ? Math.max(...updatedPoints.map(p => p.stop_order)) + 1 
          : 1
        const apaPoint = {
          id: generateUUID(),
          point_name: `${selectedPA.name} - Home`,
          address: paAddress,
          latitude: '',
          longitude: '',
          stop_order: nextOrder,
          isNew: true,
        }

        updatedPoints = [...updatedPoints, apaPoint]
        hasChanges = true
      }
    } else {
      // Remove last APA point if PM time is removed (but keep first if AM exists)
      if (updatedPoints.length > 0) {
        const lastPoint = updatedPoints[updatedPoints.length - 1]
        if (lastPoint && (
          (lastPoint.point_name.toLowerCase().includes('apa') && lastPoint.point_name.toLowerCase().includes('home')) ||
          lastPoint.address === paAddress
        ) && !formData.am_start_time) {
          // Only remove if it's not the first point (which would be for AM)
          updatedPoints = updatedPoints.slice(0, -1)
          hasChanges = true
        }
      }
    }

    if (hasChanges) {
      // Reorder all points
      const reordered = updatedPoints.map((point, idx) => ({
        ...point,
        stop_order: idx + 1,
      }))
      setRoutePoints(reordered)
    }
  }, [formData.passenger_assistant_id, formData.am_start_time, formData.pm_start_time, passengerAssistants, paAddresses])

  // Helper function to check if a driver/PA is authorized to work
  const checkAuthorization = async (employeeId: string, type: 'driver' | 'pa'): Promise<{ authorized: boolean; reason?: string }> => {
    if (!employeeId) return { authorized: true }

    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        full_name,
        can_work,
        employment_status,
        ${type === 'driver' 
          ? 'drivers(tas_badge_expiry_date, taxi_badge_expiry_date, dbs_expiry_date, driving_license_expiry_date, cpc_expiry_date)'
          : 'passenger_assistants(tas_badge_expiry_date, dbs_expiry_date, first_aid_certificate_expiry_date, passport_expiry_date)'
        }
      `)
      .eq('id', parseInt(employeeId))
      .single()

    if (error || !employee) {
      return { authorized: false, reason: `Failed to fetch ${type} information` }
    }

    // Check employment status
    if (employee.employment_status !== 'Active') {
      return { authorized: false, reason: `${employee.full_name} is not an active employee` }
    }

    // Check can_work flag
    if (employee.can_work === false) {
      const expiredCerts: string[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const checkDate = (date: string | null, certName: string) => {
        if (!date) return
        const expiry = new Date(date)
        expiry.setHours(0, 0, 0, 0)
        if (expiry < today) {
          expiredCerts.push(certName)
        }
      }

      if (type === 'driver') {
        const driver = Array.isArray(employee.drivers) ? employee.drivers[0] : employee.drivers
        if (driver) {
          checkDate(driver.tas_badge_expiry_date, 'TAS Badge')
          checkDate(driver.taxi_badge_expiry_date, 'Taxi Badge')
          checkDate(driver.dbs_expiry_date, 'DBS')
          checkDate(driver.driving_license_expiry_date, 'Driving License')
          checkDate(driver.cpc_expiry_date, 'CPC')
        }
      } else {
        const pa = Array.isArray(employee.passenger_assistants) ? employee.passenger_assistants[0] : employee.passenger_assistants
        if (pa) {
          checkDate(pa.tas_badge_expiry_date, 'TAS Badge')
          checkDate(pa.dbs_expiry_date, 'DBS')
          checkDate(pa.first_aid_certificate_expiry_date, 'First Aid Certificate')
          checkDate(pa.passport_expiry_date, 'Passport')
        }
      }

      const reason = expiredCerts.length > 0
        ? `${employee.full_name} cannot be assigned because they have expired certificates: ${expiredCerts.join(', ')}`
        : `${employee.full_name} is not authorized to work. Please check their profile for compliance issues.`

      return { authorized: false, reason }
    }

    return { authorized: true }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate driver authorization
      if (formData.driver_id) {
        const driverAuth = await checkAuthorization(formData.driver_id, 'driver')
        if (!driverAuth.authorized) {
          setError(driverAuth.reason || 'Driver is not authorized to work')
          setLoading(false)
          return
        }
      }

      // Validate PA authorization
      if (formData.passenger_assistant_id) {
        const paAuth = await checkAuthorization(formData.passenger_assistant_id, 'pa')
        if (!paAuth.authorized) {
          setError(paAuth.reason || 'Passenger Assistant is not authorized to work')
          setLoading(false)
          return
        }
      }

      // Step 1: Update the route
      const routeDataToUpdate = {
        route_number: formData.route_number,
        school_id: formData.school_id || null,
        driver_id: formData.driver_id || null,
        passenger_assistant_id: formData.passenger_assistant_id || null,
        vehicle_id: formData.vehicle_id || null,
        am_start_time: formData.am_start_time || null,
        pm_start_time: formData.pm_start_time || null,
        days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : null,
      }
      
      const { error: routeError } = await supabase
        .from('routes')
        .update(routeDataToUpdate)
        .eq('id', id)

      if (routeError) throw routeError

      // Step 2: Delete removed Pick-up Points
      if (deletedPointIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('route_points')
          .delete()
          .in('id', deletedPointIds)

        if (deleteError) {
          console.error('Error deleting Pick-up Points:', deleteError)
        }
      }

      // Step 3: Update existing points and create new ones
      for (const point of routePoints) {
        if (point.point_name.trim() === '') continue // Skip empty points

        const pointData = {
          route_id: parseInt(id),
          point_name: point.point_name,
          address: point.address || null,
          latitude: point.latitude ? parseFloat(point.latitude) : null,
          longitude: point.longitude ? parseFloat(point.longitude) : null,
          stop_order: point.stop_order,
        }

        if (point.isNew) {
          // Insert new point
          const { error: insertError } = await supabase
            .from('route_points')
            .insert(pointData)

          if (insertError) {
            console.error('Error inserting route point:', insertError)
          }
        } else {
          // Update existing point
          const { error: updateError } = await supabase
            .from('route_points')
            .update(pointData)
            .eq('id', point.id)

          if (updateError) {
            console.error('Error updating route point:', updateError)
          }
        }
      }

      // Step 4: Audit log
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'routes',
          record_id: parseInt(id),
          action: 'UPDATE',
        }),
      })

      router.push(`/dashboard/routes/${id}`)
      router.refresh()
    } catch (error: any) {
      console.error('Error updating route:', error)
      setError(error.message || 'An error occurred while updating the route')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this route?')) {
      return
    }

    setDeleting(true)

    try {
      const { error } = await supabase.from('routes').delete().eq('id', id)

      if (error) throw error

      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'routes',
          record_id: parseInt(id),
          action: 'DELETE',
        }),
      })

      router.push('/dashboard/routes')
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
          <Link href={`/dashboard/routes/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy">Edit Route</h1>
            <p className="mt-2 text-sm text-gray-600">Update route information and stops</p>
          </div>
        </div>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle>Route Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-800 mb-1">Assignment Blocked</div>
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="route_number">Route Number</Label>
              <Input
                id="route_number"
                value={formData.route_number}
                onChange={(e) =>
                  setFormData({ ...formData, route_number: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_id">School</Label>
              <Select
                id="school_id"
                value={formData.school_id}
                onChange={(e) =>
                  setFormData({ ...formData, school_id: e.target.value })
                }
              >
                <option value="">Select a school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="driver_id">Driver</Label>
                <Select
                  id="driver_id"
                  value={formData.driver_id}
                  onChange={(e) =>
                    setFormData({ ...formData, driver_id: e.target.value })
                  }
                >
                  <option value="">Select a driver (optional)</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passenger_assistant_id">Passenger Assistant</Label>
                <Select
                  id="passenger_assistant_id"
                  value={formData.passenger_assistant_id}
                  onChange={(e) =>
                    setFormData({ ...formData, passenger_assistant_id: e.target.value })
                  }
                >
                  <option value="">Select a PA (optional)</option>
                  {passengerAssistants.map((pa) => (
                    <option key={pa.id} value={pa.id}>
                      {pa.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_id">Vehicle</Label>
              <Select
                id="vehicle_id"
                value={formData.vehicle_id}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle_id: e.target.value })
                }
              >
                <option value="">Select a vehicle (optional)</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_identifier || vehicle.registration || vehicle.plate_number || `Vehicle ${vehicle.id}`}
                    {vehicle.make && vehicle.model ? ` - ${vehicle.make} ${vehicle.model}` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Route Schedule</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="am_start_time">AM Start Time</Label>
                  <Input
                    id="am_start_time"
                    type="time"
                    value={formData.am_start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, am_start_time: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pm_start_time">PM Start Time</Label>
                  <Input
                    id="pm_start_time"
                    type="time"
                    value={formData.pm_start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, pm_start_time: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Friday PM Start Time - Only show if Friday is selected */}
              {formData.days_of_week.includes('Friday') && (
                <div className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="pm_start_time_friday">
                      PM Start Time (Friday) <span className="text-gray-500 text-sm">(Optional - different from regular PM time)</span>
                    </Label>
                    <Input
                      id="pm_start_time_friday"
                      type="time"
                      value={formData.pm_start_time_friday}
                      onChange={(e) =>
                        setFormData({ ...formData, pm_start_time_friday: e.target.value })
                      }
                      placeholder="Leave empty to use regular PM time"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If Friday has a different PM start time, enter it here. Otherwise, leave empty to use the regular PM time above.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Label className="mb-2 block">Days of Week</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <label key={day} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.days_of_week.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              days_of_week: [...formData.days_of_week, day],
                            })
                          } else {
                            setFormData({
                              ...formData,
                              days_of_week: formData.days_of_week.filter((d) => d !== day),
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-navy focus:ring-navy"
                      />
                      <span className="text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pick-up Points Section */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Pickup Points ({routePoints.length})
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addRoutePoint}
              className="bg-white text-navy hover:bg-gray-100"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Stop
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2 mb-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Manage pickup/dropoff points for this route. Use ↑↓ to reorder. Changes will be saved when you click "Save Changes".
              </p>
            </div>
          </div>

          {routePoints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No stops added yet. Click "Add Stop" to create the first stop.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {routePoints.map((point, index) => (
                <Card key={point.id} className="border-2 border-gray-200">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-navy">
                        Stop {point.stop_order}
                        {point.isNew && <span className="ml-2 text-xs text-green-600">(New)</span>}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {/* Reorder buttons */}
                        <div className="flex flex-col space-y-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => movePointUp(index)}
                            disabled={index === 0}
                            className="h-5 px-2 text-gray-600 hover:text-navy"
                            title="Move up"
                          >
                            ▲
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => movePointDown(index)}
                            disabled={index === routePoints.length - 1}
                            className="h-5 px-2 text-gray-600 hover:text-navy"
                            title="Move down"
                          >
                            ▼
                          </Button>
                        </div>
                        {/* Remove button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRoutePoint(point.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`point_name_${point.id}`}>
                          Stop Name
                        </Label>
                        <Input
                          id={`point_name_${point.id}`}
                          value={point.point_name}
                          onChange={(e) =>
                            updateRoutePoint(point.id, 'point_name', e.target.value)
                          }
                          placeholder="e.g., School Main Gate, Home Pickup"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`address_${point.id}`}>Address</Label>
                        <Input
                          id={`address_${point.id}`}
                          value={point.address}
                          onChange={(e) =>
                            updateRoutePoint(point.id, 'address', e.target.value)
                          }
                          placeholder="Full address..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`latitude_${point.id}`}>
                          Latitude (Optional)
                        </Label>
                        <Input
                          id={`latitude_${point.id}`}
                          type="number"
                          step="any"
                          value={point.latitude}
                          onChange={(e) =>
                            updateRoutePoint(point.id, 'latitude', e.target.value)
                          }
                          placeholder="e.g., 51.5074"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`longitude_${point.id}`}>
                          Longitude (Optional)
                        </Label>
                        <Input
                          id={`longitude_${point.id}`}
                          type="number"
                          step="any"
                          value={point.longitude}
                          onChange={(e) =>
                            updateRoutePoint(point.id, 'longitude', e.target.value)
                          }
                          placeholder="e.g., -0.1278"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end space-x-4">
            <Link href={`/dashboard/routes/${id}`}>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EditRoutePageClient id={id} />
}

