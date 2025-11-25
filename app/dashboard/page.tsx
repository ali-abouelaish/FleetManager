import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatsSkeleton } from '@/components/ui/Skeleton'
import { Users, Car, School, Route, AlertCircle, UserCheck, MapPinned, ParkingCircle, Calendar, XCircle, UserPlus, MessageSquare, FileText, Truck } from 'lucide-react'

async function getDashboardStats() {
  const supabase = await createClient()

  // Calculate date for "this month" filter
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: employeeCount },
    { count: vehicleCount },
    { count: schoolCount },
    { count: routeCount },
    { count: passengerCount },
    { count: incidentCount },
    { count: incidentsThisMonthCount },
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
    supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('reported_at', firstDayOfMonth),
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

  // Get passengers with parent links count
  const { data: passengersWithLinks } = await supabase
    .from('passenger_parent_contacts')
    .select('passenger_id')

  const uniquePassengersWithLinks = new Set(passengersWithLinks?.map(p => p.passenger_id) || []).size

  // Get recent passenger updates stats
  const { data: recentUpdates, count: recentUpdatesCount } = await supabase
    .from('passenger_updates')
    .select('created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1)

  const latestUpdateTimestamp = recentUpdates && recentUpdates.length > 0 ? recentUpdates[0].created_at : null

  // Get vehicle type counts
  const { data: allVehicles } = await supabase.from('vehicles').select('vehicle_type')
  const vehicleTypeCounts: Record<string, number> = {}
  
  allVehicles?.forEach((vehicle: any) => {
    const type = vehicle.vehicle_type || 'Unspecified'
    vehicleTypeCounts[type] = (vehicleTypeCounts[type] || 0) + 1
  })

  // Count expiring certificates - separate for employees and vehicles
  const today = new Date()
  const fourteenDaysAhead = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  const thirtyDaysAhead = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Fetch all certificates
  const { data: vehicles } = await supabase.from('vehicles').select('*')
  const { data: drivers } = await supabase.from('drivers').select('*')
  const { data: assistants } = await supabase.from('passenger_assistants').select('*')

  // Employee certificate counts
  let employeeExpired = 0
  let employeeExpiring14Days = 0
  let employeeExpiring30Days = 0

  // Vehicle certificate counts
  let vehicleExpired = 0
  let vehicleExpiring14Days = 0
  let vehicleExpiring30Days = 0

  const checkEmployeeExpiry = (date: string | null) => {
    if (!date) return
    const expiryDate = new Date(date)
    if (expiryDate < today) {
      employeeExpired++
    } else if (expiryDate >= today && expiryDate <= fourteenDaysAhead) {
      employeeExpiring14Days++
    }
    if (expiryDate >= today && expiryDate <= thirtyDaysAhead) {
      employeeExpiring30Days++
    }
  }

  const checkVehicleExpiry = (date: string | null) => {
    if (!date) return
    const expiryDate = new Date(date)
    if (expiryDate < today) {
      vehicleExpired++
    } else if (expiryDate >= today && expiryDate <= fourteenDaysAhead) {
      vehicleExpiring14Days++
    }
    if (expiryDate >= today && expiryDate <= thirtyDaysAhead) {
      vehicleExpiring30Days++
    }
  }

  // Count employee certificates
  drivers?.forEach(d => {
    checkEmployeeExpiry(d.tas_badge_expiry_date)
    checkEmployeeExpiry(d.taxi_badge_expiry_date)
    checkEmployeeExpiry(d.dbs_expiry_date)
    checkEmployeeExpiry(d.first_aid_certificate_expiry_date)
    checkEmployeeExpiry(d.passport_expiry_date)
    checkEmployeeExpiry(d.driving_license_expiry_date)
    checkEmployeeExpiry(d.cpc_expiry_date)
    checkEmployeeExpiry(d.vehicle_insurance_expiry_date)
    checkEmployeeExpiry(d.mot_expiry_date)
  })

  assistants?.forEach(a => {
    checkEmployeeExpiry(a.tas_badge_expiry_date)
    checkEmployeeExpiry(a.dbs_expiry_date)
  })

  // Count vehicle certificates
  vehicles?.forEach(v => {
    checkVehicleExpiry(v.plate_expiry_date)
    checkVehicleExpiry(v.insurance_expiry_date)
    checkVehicleExpiry(v.mot_date)
    checkVehicleExpiry(v.tax_date)
    checkVehicleExpiry(v.loler_expiry_date)
    checkVehicleExpiry(v.first_aid_expiry)
    checkVehicleExpiry(v.fire_extinguisher_expiry)
  })

  return {
    employees: employeeCount || 0,
    vehicles: vehicleCount || 0,
    schools: schoolCount || 0,
    routes: routeCount || 0,
    passengers: passengerCount || 0,
    incidents: incidentCount || 0,
    incidentsThisMonth: incidentsThisMonthCount || 0,
    passengersWithParentLinks: uniquePassengersWithLinks,
    recentPassengerUpdates: recentUpdatesCount || 0,
    latestUpdateTimestamp,
    spareVehicles: spareVehicleCount || 0,
    spareWithLocation: spareWithLocationCount || 0,
    vor: vorCount || 0,
    flaggedEmployees: flaggedEmployeesCount || 0,
    // Employee certificate stats
    employeeExpired,
    employeeExpiring14Days,
    employeeExpiring30Days,
    // Vehicle certificate stats
    vehicleExpired,
    vehicleExpiring14Days,
    vehicleExpiring30Days,
    vehicleTypeCounts,
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

  const employeeCertificateCards = [
    {
      title: 'Flagged Employees',
      value: stats.flaggedEmployees,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/dashboard/employees',
    },
    {
      title: 'Expired Certificates',
      value: stats.employeeExpired,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/dashboard/certificates-expiry/employees?period=expired',
    },
    {
      title: 'Expiring (14 Days)',
      value: stats.employeeExpiring14Days,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/dashboard/certificates-expiry/employees?period=14-days',
    },
    {
      title: 'Expiring (30 Days)',
      value: stats.employeeExpiring30Days,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      href: '/dashboard/certificates-expiry/employees?period=30-days',
    },
  ]

  const vehicleCertificateCards = [
    {
      title: 'Vehicles VOR',
      value: stats.vor,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/dashboard/vehicles?status=off-road',
    },
    {
      title: 'Expired Certificates',
      value: stats.vehicleExpired,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/dashboard/certificates-expiry/vehicles?period=expired',
    },
    {
      title: 'Expiring (14 Days)',
      value: stats.vehicleExpiring14Days,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/dashboard/certificates-expiry/vehicles?period=14-days',
    },
    {
      title: 'Expiring (30 Days)',
      value: stats.vehicleExpiring30Days,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      href: '/dashboard/certificates-expiry/vehicles?period=30-days',
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

      {/* Employee Certificate & Compliance Stats */}
      <div>
        <h2 className="text-2xl font-bold text-navy mb-4">👥 Employee Certificate & Compliance</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {employeeCertificateCards.map((card) => (
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

      {/* Vehicle Certificate & Compliance Stats */}
      <div>
        <h2 className="text-2xl font-bold text-navy mb-4">🚗 Vehicle Certificate & Compliance</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {vehicleCertificateCards.map((card) => (
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

      {/* Vehicle Type Breakdown */}
      {Object.keys(stats.vehicleTypeCounts).length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-navy mb-4">🚛 Vehicle Types</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats.vehicleTypeCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <Link key={type} href="/dashboard/vehicles" prefetch={true}>
                  <Card className="transition-all hover:shadow-lg hover:border-navy cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {type}
                      </CardTitle>
                      <div className="rounded-full p-2 bg-blue-100">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{count}</div>
                      <p className="text-xs text-gray-500 mt-2">Click to view vehicles →</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      )}

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

