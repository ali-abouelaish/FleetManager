import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatsSkeleton } from '@/components/ui/Skeleton'
import { Users, Car, School, Route, AlertCircle, UserCheck } from 'lucide-react'

async function getDashboardStats() {
  const supabase = await createClient()

  const [
    { count: employeeCount },
    { count: vehicleCount },
    { count: schoolCount },
    { count: routeCount },
    { count: passengerCount },
    { count: incidentCount },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('schools').select('*', { count: 'exact', head: true }),
    supabase.from('routes').select('*', { count: 'exact', head: true }),
    supabase.from('passengers').select('*', { count: 'exact', head: true }),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('resolved', false),
  ])

  return {
    employees: employeeCount || 0,
    vehicles: vehicleCount || 0,
    schools: schoolCount || 0,
    routes: routeCount || 0,
    passengers: passengerCount || 0,
    incidents: incidentCount || 0,
  }
}

async function DashboardStats() {
  const stats = await getDashboardStats()

  const cards = [
    {
      title: 'Total Employees',
      value: stats.employees,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Vehicles',
      value: stats.vehicles,
      icon: Car,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Schools',
      value: stats.schools,
      icon: School,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Routes',
      value: stats.routes,
      icon: Route,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Total Passengers',
      value: stats.passengers,
      icon: UserCheck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Open Incidents',
      value: stats.incidents,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ]

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/dashboard/employees/create"
              prefetch={true}
              className="block w-full rounded-md bg-navy px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-800 transition-colors"
            >
              Add New Employee
            </Link>
            <Link
              href="/dashboard/vehicles/create"
              prefetch={true}
              className="block w-full rounded-md bg-navy px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-800 transition-colors"
            >
              Add New Vehicle
            </Link>
            <Link
              href="/dashboard/passengers/create"
              prefetch={true}
              className="block w-full rounded-md bg-navy px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-800 transition-colors"
            >
              Add New Passenger
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database Connection</span>
                <span className="text-sm font-medium text-green-600">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Sync</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Routes</span>
                <span className="text-sm font-medium text-gray-900">{stats.routes}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-navy">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of your fleet management system
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}

