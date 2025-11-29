'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Plus, Trash2, MapPin, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { generateUUID } from '@/lib/utils'

interface RoutePoint {
  id: string
  point_name: string
  address: string
  latitude: string
  longitude: string
  stop_order: number
}

export default function CreateRoutePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schools, setSchools] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [passengerAssistants, setPassengerAssistants] = useState<any[]>([])

  const [formData, setFormData] = useState({
    route_number: '',
    school_id: searchParams.get('school_id') || '',
    driver_id: '',
    passenger_assistant_id: '',
  })

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([
    {
      id: generateUUID(),
      point_name: '',
      address: '',
      latitude: '',
      longitude: '',
      stop_order: 1,
    },
  ])

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
      },
    ])
  }

  const removeRoutePoint = (id: string) => {
    const newPoints = routePoints.filter((point) => point.id !== id)
    // Re-order remaining points
    const reorderedPoints = newPoints.map((point, index) => ({
      ...point,
      stop_order: index + 1,
    }))
    setRoutePoints(reorderedPoints)
  }

  const updateRoutePoint = (id: string, field: keyof RoutePoint, value: string | number) => {
    setRoutePoints(
      routePoints.map((point) =>
        point.id === id ? { ...point, [field]: value } : point
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
      const [schoolsResult, driversResult, pasResult] = await Promise.all([
        supabase.from('schools').select('id, name').order('name'),
        supabase
          .from('drivers')
          .select('employee_id, employees(full_name, employment_status, can_work)')
          .order('employee_id'),
        supabase
          .from('passenger_assistants')
          .select('employee_id, employees(full_name, employment_status, can_work)')
          .order('employee_id'),
      ])

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
        setPassengerAssistants(
          pasResult.data
            .filter((pa: any) => pa.employees?.employment_status === 'Active' && pa.employees?.can_work !== false)
            .map((pa: any) => ({
              id: pa.employee_id,
              name: pa.employees?.full_name || 'Unknown',
            }))
        )
      }
    }

    loadData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Step 1: Create the route
      const routeDataToInsert = {
        route_number: formData.route_number,
        school_id: formData.school_id || null,
        driver_id: formData.driver_id || null,
        passenger_assistant_id: formData.passenger_assistant_id || null,
      }
      
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .insert([routeDataToInsert])
        .select()
        .single()

      if (routeError) throw routeError

      const routeId = routeData.id

      // Step 2: Create route points (only ones with names filled in)
      const validRoutePoints = routePoints.filter(
        (point) => point.point_name.trim() !== ''
      )

      if (validRoutePoints.length > 0) {
        const pointsToInsert = validRoutePoints.map((point) => ({
          route_id: routeId,
          point_name: point.point_name,
          address: point.address || null,
          latitude: point.latitude ? parseFloat(point.latitude) : null,
          longitude: point.longitude ? parseFloat(point.longitude) : null,
          stop_order: point.stop_order,
        }))

        const { error: pointsError } = await supabase
          .from('route_points')
          .insert(pointsToInsert)

        if (pointsError) {
          console.error('Error creating route points:', pointsError)
          // Continue anyway - route is created
        }
      }

      // Step 3: Audit log
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'routes',
          record_id: routeId,
          action: 'CREATE',
        }),
      })

      router.push('/dashboard/routes')
      router.refresh()
    } catch (error: any) {
      console.error('Error creating route:', error)
      setError(error.message || 'An error occurred while creating the route')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/routes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-navy">Add New Route</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the route information and add stops/pickup points
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle>Route Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
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
          </form>
        </CardContent>
      </Card>

      {/* Route Points Section */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Route Stops / Pickup Points
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
                Add pickup/dropoff points for this route. Use ↑↓ buttons to reorder stops.
                Coordinates are optional but help with mapping.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {routePoints.map((point, index) => (
              <Card key={point.id} className="border-2 border-gray-200">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-navy">
                      Stop {point.stop_order}
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
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end space-x-4">
            <Link href="/dashboard/routes">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Route'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

