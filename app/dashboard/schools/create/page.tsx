'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateSchoolPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('schools')
        .insert([formData])
        .select()

      if (error) throw error

      if (data && data[0]) {
        // Audit log (non-blocking)
        fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: 'schools',
            record_id: data[0].id,
            action: 'CREATE',
          }),
        }).catch(err => console.error('Audit log error:', err))
      }

      router.push('/dashboard/schools')
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
        <Link href="/dashboard/schools">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New School</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the information below to create a new school
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">School Address</Label>
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
              <Label htmlFor="phone_number">School Phone Number</Label>
              <Input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                placeholder="e.g., 0121 464 1676"
              />
            </div>

            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">School Contact Information</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">School Contact</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_name: e.target.value })
                    }
                    placeholder="e.g., Sarah Eaton"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">School Contact Direct No.</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_phone: e.target.value })
                    }
                    placeholder="e.g., 0121 464 1676"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">School Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                    placeholder="e.g., seaton@hamilton.bham.sch.uk"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/schools">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create School'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

