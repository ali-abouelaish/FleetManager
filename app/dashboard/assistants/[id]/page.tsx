import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Pencil, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import the QR code component (client component)
const PassengerAssistantQRCodeWrapper = dynamic(
  () => import('../../passenger-assistants/[id]/qr-code'),
  { ssr: false }
)

async function getPassengerAssistant(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('passenger_assistants')
    .select(`
      *,
      employees(
        id,
        full_name,
        role,
        employment_status,
        phone_number,
        personal_email,
        start_date,
        end_date,
        wheelchair_access,
        can_work
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

// Helper to calculate days remaining
function getDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Helper to get status badge
function getStatusBadge(daysRemaining: number | null) {
  if (daysRemaining === null) {
    return { label: 'Not set', color: 'bg-gray-100 text-gray-800', icon: null }
  }
  if (daysRemaining < 0) {
    return { label: 'Expired', color: 'bg-red-100 text-red-800', icon: XCircle }
  }
  if (daysRemaining <= 30) {
    return { label: `Expires in ${daysRemaining} days`, color: 'bg-red-100 text-red-800', icon: AlertTriangle }
  }
  if (daysRemaining <= 60) {
    return { label: `Expires in ${daysRemaining} days`, color: 'bg-yellow-100 text-yellow-800', icon: Clock }
  }
  return { label: `Valid for ${daysRemaining} days`, color: 'bg-green-100 text-green-800', icon: CheckCircle }
}

export default async function ViewPassengerAssistantPage({
  params,
}: {
  params: { id: string }
}) {
  const assistant = await getPassengerAssistant(params.id)
  
  if (!assistant) {
    notFound()
  }

  const employee = assistant.employees
  const tasDaysRemaining = getDaysRemaining(assistant.tas_badge_expiry_date)
  const dbsDaysRemaining = getDaysRemaining(assistant.dbs_expiry_date)
  const tasBadge = getStatusBadge(tasDaysRemaining)
  const dbsBadge = getStatusBadge(dbsDaysRemaining)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/assistants">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy">{employee?.full_name || 'Unknown'}</h1>
            <p className="mt-2 text-sm text-gray-600">Passenger Assistant Profile</p>
          </div>
        </div>
        <Link href={`/dashboard/employees/${employee?.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Assistant ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{assistant.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900 font-semibold">{employee?.full_name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{assistant.employee_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  employee?.employment_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {employee?.employment_status || 'N/A'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee?.phone_number || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee?.personal_email || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Can Work</dt>
              <dd className="mt-1">
                {employee?.can_work === false ? (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-red-100 text-red-800">
                    CANNOT WORK
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold leading-5 bg-green-100 text-green-800">
                    Authorized
                  </span>
                )}
              </dd>
            </div>
          </CardContent>
        </Card>

        {/* Certificates & Badges */}
        <Card>
          <CardHeader className="bg-navy text-white">
            <CardTitle>Certificates & Badges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">TAS Badge Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{assistant.tas_badge_number || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">TAS Badge Expiry</dt>
              <dd className="mt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">{assistant.tas_badge_expiry_date ? formatDate(assistant.tas_badge_expiry_date) : 'Not set'}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${tasBadge.color}`}>
                    {tasBadge.icon && <tasBadge.icon className="mr-1 h-3 w-3" />}
                    {tasBadge.label}
                  </span>
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">DBS Expiry</dt>
              <dd className="mt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">{assistant.dbs_expiry_date ? formatDate(assistant.dbs_expiry_date) : 'Not set'}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${dbsBadge.color}`}>
                    {dbsBadge.icon && <dbsBadge.icon className="mr-1 h-3 w-3" />}
                    {dbsBadge.label}
                  </span>
                </div>
              </dd>
            </div>
          </CardContent>
        </Card>

        {/* QR Code for Document Upload */}
        <div className="md:col-span-2">
          <PassengerAssistantQRCodeWrapper assistantId={assistant.id} />
        </div>
      </div>
    </div>
  )
}

