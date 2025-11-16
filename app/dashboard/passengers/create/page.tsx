'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreatePassengerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schools, setSchools] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])

  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    address: '',
    sen_requirements: '',
    school_id: searchParams.get('school_id') || '',
    mobility_type: '',
    route_id: '',
    seat_number: '',
  })

  useEffect(() => {
    async function loadData() {
      const [schoolsResult, routesResult] = await Promise.all([
        supabase.from('schools').select('id, name').order('name'),
        supabase.from('routes').select('id, route_number').order('route_number')
      ])

      if (schoolsResult.data) setSchools(schoolsResult.data)
      if (routesResult.data) setRoutes(routesResult.data)
    }

    loadData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('passengers')
        .insert([formData])
        .select()

      if (error) throw error

      if (data && data[0]) {
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: 'passengers',
            record_id: data[0].id,
            action: 'CREATE',
          }),
        })
      }

      router.push('/dashboard/passengers')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/passengers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Passenger</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the information below to create a new passenger
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Passenger Information</CardTitle>
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
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData({ ...formData, dob: e.target.value })
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

              <div className="space-y-2">
                <Label htmlFor="route_id">Route</Label>
                <Select
                  id="route_id"
                  value={formData.route_id}
                  onChange={(e) =>
                    setFormData({ ...formData, route_id: e.target.value })
                  }
                >
                  <option value="">Select a route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.route_number || `Route ${route.id}`}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobility_type">Mobility Type</Label>
                <Select
                  id="mobility_type"
                  value={formData.mobility_type}
                  onChange={(e) =>
                    setFormData({ ...formData, mobility_type: e.target.value })
                  }
                >
                  <option value="">Select mobility type</option>
                  <option value="Ambulant">Ambulant</option>
                  <option value="Wheelchair">Wheelchair</option>
                  <option value="Walker">Walker</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seat_number">Seat Number</Label>
                <Input
                  id="seat_number"
                  value={formData.seat_number}
                  onChange={(e) =>
                    setFormData({ ...formData, seat_number: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sen_requirements">SEN Requirements</Label>
              <textarea
                id="sen_requirements"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.sen_requirements}
                onChange={(e) =>
                  setFormData({ ...formData, sen_requirements: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/passengers">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Passenger'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

