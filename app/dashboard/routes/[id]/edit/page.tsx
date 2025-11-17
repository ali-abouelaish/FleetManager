'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Trash2, Plus, MapPin, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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

  const [formData, setFormData] = useState({
    route_number: '',
    school_id: '',
  })

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([])
  const [deletedPointIds, setDeletedPointIds] = useState<number[]>([])

  const addRoutePoint = () => {
    const nextOrder = routePoints.length + 1
    setRoutePoints([
      ...routePoints,
      {
        id: crypto.randomUUID(),
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
      const [routeResult, schoolsResult, pointsResult] = await Promise.all([
        supabase.from('routes').select('*').eq('id', id).single(),
        supabase.from('schools').select('id, name').order('name'),
        supabase.from('route_points').select('*').eq('route_id', id).order('stop_order')
      ])

      if (routeResult.error) {
        setError('Failed to load route')
        return
      }

      if (routeResult.data) {
        setFormData({
          route_number: routeResult.data.route_number || '',
          school_id: routeResult.data.school_id || '',
        })
      }

      if (schoolsResult.data) {
        setSchools(schoolsResult.data)
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
    }

    loadData()
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Step 1: Update the route
      const { error: routeError } = await supabase
        .from('routes')
        .update(formData)
        .eq('id', id)

      if (routeError) throw routeError

      // Step 2: Delete removed route points
      if (deletedPointIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('route_points')
          .delete()
          .in('id', deletedPointIds)

        if (deleteError) {
          console.error('Error deleting route points:', deleteError)
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
          </form>
        </CardContent>
      </Card>

      {/* Route Points Section */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Route Stops / Pickup Points ({routePoints.length})
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

