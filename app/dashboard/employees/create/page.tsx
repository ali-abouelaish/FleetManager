'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateEmployeePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    employment_status: 'Active',
    phone_number: '',
    personal_email: '',
    address: '',
    start_date: '',
    end_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate dates
      let startDate: string | null = formData.start_date.trim() || null
      let endDate: string | null = formData.end_date.trim() || null

      // Validate date formats if provided
      if (startDate) {
        const startDateObj = new Date(startDate)
        if (isNaN(startDateObj.getTime())) {
          throw new Error('Start Date: Please enter a valid date (YYYY-MM-DD format)')
        }
      }

      if (endDate) {
        const endDateObj = new Date(endDate)
        if (isNaN(endDateObj.getTime())) {
          throw new Error('End Date: Please enter a valid date (YYYY-MM-DD format)')
        }

        // Validate that end date is after start date if both are provided
        if (startDate) {
          const startDateObj = new Date(startDate)
          const endDateObj = new Date(endDate)
          if (endDateObj < startDateObj) {
            throw new Error('End Date must be after or equal to Start Date')
          }
        }
      }

      // Prepare data for insertion
      const insertData: any = {
        full_name: formData.full_name,
        role: formData.role || null,
        employment_status: formData.employment_status,
        phone_number: formData.phone_number || null,
        personal_email: formData.personal_email || null,
        address: formData.address || null,
        start_date: startDate,
        end_date: endDate, // Can be null
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([insertData])
        .select()

      if (error) {
        // Provide clearer error messages
        if (error.message.includes('date') || error.message.includes('invalid input')) {
          if (error.message.includes('start_date')) {
            throw new Error('Start Date: Invalid date format. Please use YYYY-MM-DD format or leave blank.')
          } else if (error.message.includes('end_date')) {
            throw new Error('End Date: Invalid date format. Please use YYYY-MM-DD format or leave blank.')
          } else {
            throw new Error('Date Error: Please check your date fields. Use YYYY-MM-DD format or leave blank.')
          }
        }
        throw error
      }

      if (data && data[0]) {
        // Log audit
        await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: 'employees',
            record_id: data[0].id,
            action: 'CREATE',
          }),
        })
      }

      router.push('/dashboard/employees')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred while creating the employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/employees">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the information below to create a new employee
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
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
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="">Select role</option>
                  <option value="Driver">Driver</option>
                  <option value="PA">Passenger Assistant</option>
                  <option value="Coordinator">Coordinator</option>
                  <option value="Admin">Admin</option>
                  <option value="Other">Other</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employment_status">Employment Status</Label>
                <Select
                  id="employment_status"
                  value={formData.employment_status}
                  onChange={(e) =>
                    setFormData({ ...formData, employment_status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal_email">Personal Email</Label>
                <Input
                  id="personal_email"
                  type="email"
                  value={formData.personal_email}
                  onChange={(e) =>
                    setFormData({ ...formData, personal_email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Full address..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">Optional - Leave blank if not applicable</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">Optional - Leave blank if employee is still active</p>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/employees">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

