import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatsSkeleton } from '@/components/ui/Skeleton'
import { Users, Car, School, Route, AlertCircle, UserCheck, MapPinned, ParkingCircle, Calendar, XCircle } from 'lucide-react'

async function getDashboardStats() {
  const supabase = await createClient()

  const [
    { count: employeeCount },
    { count: vehicleCount },
    { count: schoolCount },
    { count: routeCount },
    { count: passengerCount },
    { count: incidentCount },
    { count: spareVehicleCount },
    { count: spareWithLocationCount },
    { count: vorCount },
    { count: flaggedEmployeesCount },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('schools').select('*', { count: 'exact', head: true }),
    supabase.from('routes').select('*', { count: 'exact', head: true }),
    supabase.from('passengers').select('*', { count: 'exact', head: true }),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('vehicles').select('*', { count: 'exact', head: true })
      .eq('spare_vehicle', true)
      .or('off_the_road.is.null,off_the_road.eq.false'),
    supabase.from('vehicle_locations').select('vehicle_id, vehicles!inner(spare_vehicle)', { count: 'exact', head: true })
      .eq('vehicles.spare_vehicle', true),
    supabase.from('vehicles').select('*', { count: 'exact', head: true })
      .eq('off_the_road', true),
    supabase.from('employees').select('*', { count: 'exact', head: true })
      .eq('can_work', false),
  ])

  // Count expiring certificates
  const today = new Date()
  const fourteenDaysAhead = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  const thirtyDaysAhead = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Fetch all certificates and count expiring ones
  const { data: vehicles } = await supabase.from('vehicles').select('*')
  const { data: drivers } = await supabase.from('drivers').select('*')
  const { data: assistants } = await supabase.from('passenger_assistants').select('*')

  let expiring14Days = 0
  let expiring30Days = 0

  const checkExpiry = (date: string | null) => {
    if (!date) return
    const expiryDate = new Date(date)
    if (expiryDate >= today && expiryDate <= fourteenDaysAhead) {
      expiring14Days++
    }
    if (expiryDate >= today && expiryDate <= thirtyDaysAhead) {
      expiring30Days++
    }
  }

  vehicles?.forEach(v => {
    checkExpiry(v.plate_expiry_date)
    checkExpiry(v.insurance_expiry_date)
    checkExpiry(v.mot_date)
    checkExpiry(v.tax_date)
    checkExpiry(v.loler_expiry_date)
    checkExpiry(v.first_aid_expiry)
    checkExpiry(v.fire_extinguisher_expiry)
  })

  drivers?.forEach(d => {
    checkExpiry(d.tas_badge_expiry_date)
    checkExpiry(d.taxi_badge_expiry_date)
    checkExpiry(d.dbs_expiry_date)
  })

  assistants?.forEach(a => {
    checkExpiry(a.tas_badge_expiry_date)
    checkExpiry(a.dbs_expiry_date)
  })

  return {
    employees: employeeCount || 0,
    vehicles: vehicleCount || 0,
    schools: schoolCount || 0,
    routes: routeCount || 0,
    passengers: passengerCount || 0,
    incidents: incidentCount || 0,
    spareVehicles: spareVehicleCount || 0,
    spareWithLocation: spareWithLocationCount || 0,
    vor: vorCount || 0,
    flaggedEmployees: flaggedEmployeesCount || 0,
    expiring14Days,
    expiring30Days,
  }
}

async function getSpareVehiclesWithLocation() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicle_locations')
    .select(`
      id,
      location_name,
      address,
      last_updated,
      vehicles!inner (
        id,
        vehicle_identifier,
        make,
        model,
        spare_vehicle,
        off_the_road
      )
    `)
    .eq('vehicles.spare_vehicle', true)
    .order('last_updated', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching spare vehicles:', error)
    return []
  }

  return data || []
}

async function DashboardStats() {
  const stats = await getDashboardStats()
  const spareVehicles = await getSpareVehiclesWithLocation()

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

  const spareVehicleCards = [
    {
      title: 'Spare Vehicles Available',
      value: stats.spareVehicles,
      icon: ParkingCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      href: '/dashboard/vehicles?filter=spare',
    },
    {
      title: 'Spare Vehicles with Location',
      value: stats.spareWithLocation,
      icon: MapPinned,
      color: 'text-navy',
      bgColor: 'bg-blue-100',
      href: '/dashboard/vehicle-locations',
    },
  ]

  const certificateCards = [
    {
      title: 'Vehicles VOR',
      value: stats.vor,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/dashboard/vehicles?status=off-road',
    },
    {
      title: 'Certificates Expiring (14 Days)',
      value: stats.expiring14Days,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/dashboard/certificates-expiry?period=14-days',
    },
    {
      title: 'Certificates Expiring (30 Days)',
      value: stats.expiring30Days,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      href: '/dashboard/certificates-expiry?period=30-days',
    },
    {
      title: 'Flagged Employees',
      value: stats.flaggedEmployees,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/dashboard/employees',
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

      {/* Certificate Expiry Stats */}
      <div>
        <h2 className="text-2xl font-bold text-navy mb-4">📅 Certificate & Compliance Status</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {certificateCards.map((card) => (
            <Link key={card.title} href={card.href} prefetch={true}>
              <Card className="transition-all hover:shadow-lg hover:border-navy cursor-pointer">
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
                  <p className="text-xs text-gray-500 mt-2">Click to view details →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Spare Vehicles Section */}
      <div>
        <h2 className="text-2xl font-bold text-navy mb-4">🚗 Spare Vehicle Management</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {spareVehicleCards.map((card) => (
            <Link key={card.title} href={card.href} prefetch={true}>
              <Card className="transition-all hover:shadow-lg hover:border-navy cursor-pointer">
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
                  <p className="text-xs text-gray-500 mt-2">Click to view details →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Spare Vehicles with Location Table */}
      {spareVehicles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-navy">📍 Recent Spare Vehicle Locations (Top 5)</CardTitle>
            <Link href="/dashboard/vehicle-locations" prefetch={true}>
              <span className="text-sm text-navy hover:underline">View All →</span>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spareVehicles.map((location: any) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between border-l-4 border-yellow-400 bg-gray-50 p-3 rounded-r-md"
                >
                  <div>
                    <p className="font-medium text-navy">
                      {location.vehicles?.vehicle_identifier || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {location.vehicles?.make} {location.vehicles?.model}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{location.location_name}</p>
                    <p className="text-xs text-gray-500">{location.address || 'No address'}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <Link
              href="/dashboard/vehicle-locations/create"
              prefetch={true}
              className="block w-full rounded-md bg-navy px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-800 transition-colors"
            >
              Add Spare Vehicle Location
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Spare Vehicles</span>
                <span className="text-sm font-medium text-yellow-600">{stats.spareVehicles}</span>
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

