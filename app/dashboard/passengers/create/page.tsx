'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Plus, Trash2, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { generateUUID } from '@/lib/utils'

interface ParentContact {
  id: string
  full_name: string
  relationship: string
  phone_number: string
  email: string
  address: string
}

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
    personal_item: '',
    supervision_type: '',
  })

  const [parentContacts, setParentContacts] = useState<ParentContact[]>([
    {
      id: generateUUID(),
      full_name: '',
      relationship: '',
      phone_number: '',
      email: '',
      address: '',
    },
  ])

  const addParentContact = () => {
    setParentContacts([
      ...parentContacts,
      {
        id: generateUUID(),
        full_name: '',
        relationship: '',
        phone_number: '',
        email: '',
        address: '',
      },
    ])
  }

  const removeParentContact = (id: string) => {
    if (parentContacts.length > 1) {
      setParentContacts(parentContacts.filter((contact) => contact.id !== id))
    }
  }

  const updateParentContact = (id: string, field: keyof ParentContact, value: string) => {
    setParentContacts(
      parentContacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    )
  }

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
      // Step 1: Create the passenger
      const { data: passengerData, error: passengerError } = await supabase
        .from('passengers')
        .insert([formData])
        .select()
        .single()

      if (passengerError) throw passengerError

      const passengerId = passengerData.id

      // Step 2: Create parent contacts (only ones with names filled in)
      const validParentContacts = parentContacts.filter(
        (contact) => contact.full_name.trim() !== ''
      )

      if (validParentContacts.length > 0) {
        for (const contact of validParentContacts) {
          // Create parent contact
          const { data: contactData, error: contactError } = await supabase
            .from('parent_contacts')
            .insert({
              full_name: contact.full_name,
              relationship: contact.relationship || null,
              phone_number: contact.phone_number || null,
              email: contact.email || null,
              address: contact.address || null,
            })
            .select()
            .single()

          if (contactError) {
            console.error('Error creating parent contact:', contactError)
            continue // Skip this contact but continue with others
          }

          // Link parent contact to passenger
          const { error: linkError } = await supabase
            .from('passenger_parent_contacts')
            .insert({
              passenger_id: passengerId,
              parent_contact_id: contactData.id,
            })

          if (linkError) {
            console.error('Error linking parent contact:', linkError)
          }
        }
      }

      // Step 3: Audit log
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: 'passengers',
          record_id: passengerId,
          action: 'CREATE',
        }),
      })

      router.push('/dashboard/passengers')
      router.refresh()
    } catch (error: any) {
      console.error('Error creating passenger:', error)
      setError(error.message || 'An error occurred while creating the passenger')
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
          <h1 className="text-3xl font-bold text-navy">Add New Passenger</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the passenger information and add parent/guardian contacts
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-navy text-white">
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

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="personal_item">Personal Item</Label>
                <Input
                  id="personal_item"
                  value={formData.personal_item}
                  onChange={(e) =>
                    setFormData({ ...formData, personal_item: e.target.value })
                  }
                  placeholder="e.g., backpack, medication bag, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supervision_type">Supervision Type</Label>
                <Input
                  id="supervision_type"
                  value={formData.supervision_type}
                  onChange={(e) =>
                    setFormData({ ...formData, supervision_type: e.target.value })
                  }
                  placeholder="Type of supervision required"
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Parent Contacts Section */}
      <Card>
        <CardHeader className="bg-navy text-white">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Parent / Guardian Contacts
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addParentContact}
              className="bg-white text-navy hover:bg-gray-100"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Contact
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-2 mb-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Add emergency contacts, parents, or guardians for this passenger. 
                You can add multiple contacts. Leave fields empty if not applicable.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {parentContacts.map((contact, index) => (
              <Card key={contact.id} className="border-2 border-gray-200">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-navy">
                      Contact {index + 1}
                    </h3>
                    {parentContacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParentContact(contact.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`parent_name_${contact.id}`}>
                        Full Name
                      </Label>
                      <Input
                        id={`parent_name_${contact.id}`}
                        value={contact.full_name}
                        onChange={(e) =>
                          updateParentContact(contact.id, 'full_name', e.target.value)
                        }
                        placeholder="e.g., Sarah Johnson"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`parent_relationship_${contact.id}`}>
                        Relationship
                      </Label>
                      <Select
                        id={`parent_relationship_${contact.id}`}
                        value={contact.relationship}
                        onChange={(e) =>
                          updateParentContact(contact.id, 'relationship', e.target.value)
                        }
                      >
                        <option value="">-- Select Relationship --</option>
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Grandparent">Grandparent</option>
                        <option value="Aunt">Aunt</option>
                        <option value="Uncle">Uncle</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`parent_phone_${contact.id}`}>
                        Phone Number
                      </Label>
                      <Input
                        id={`parent_phone_${contact.id}`}
                        type="tel"
                        value={contact.phone_number}
                        onChange={(e) =>
                          updateParentContact(contact.id, 'phone_number', e.target.value)
                        }
                        placeholder="e.g., 07123456789"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`parent_email_${contact.id}`}>
                        Email
                      </Label>
                      <Input
                        id={`parent_email_${contact.id}`}
                        type="email"
                        value={contact.email}
                        onChange={(e) =>
                          updateParentContact(contact.id, 'email', e.target.value)
                        }
                        placeholder="e.g., sarah@example.com"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`parent_address_${contact.id}`}>
                        Address
                      </Label>
                      <textarea
                        id={`parent_address_${contact.id}`}
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={contact.address}
                        onChange={(e) =>
                          updateParentContact(contact.id, 'address', e.target.value)
                        }
                        placeholder="Full address..."
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
            <Link href="/dashboard/passengers">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Passenger'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

