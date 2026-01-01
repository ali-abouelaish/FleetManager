import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatsSkeleton } from '@/components/ui/Skeleton'
import { Users, Car, School, Route, AlertCircle, UserCheck, MapPinned, ParkingCircle, Calendar, XCircle, UserPlus, MessageSquare, FileText, Truck, Clock, TrendingUp, Activity } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

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

async function getRecentActivities() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('system_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching recent activities:', error)
    return []
  }

  return data || []
}

async function getRecentIncidents() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('incidents')
    .select(`
      id,
      incident_type,
      description,
      reported_at,
      resolved,
      reference_number,
      routes(route_number),
      vehicles(vehicle_identifier)
    `)
    .order('reported_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching recent incidents:', error)
    return []
  }

  return data || []
}

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case 'document_upload':
      return <FileText className="h-4 w-4 text-blue-600" />
    case 'appointment_booking':
      return <Calendar className="h-4 w-4 text-green-600" />
    default:
      return <Activity className="h-4 w-4 text-gray-600" />
  }
}

function getEntityLink(entityType: string, entityId: number): string {
  if (entityType === 'vehicle') {
    return `/dashboard/vehicles/${entityId}`
  } else if (entityType === 'driver' || entityType === 'assistant') {
    return `/dashboard/employees/${entityId}`
  }
  return '#'
}

async function DashboardStats() {
  const stats = await getDashboardStats()
  const spareVehicles = await getSpareVehiclesWithLocation()
  const recentActivities = await getRecentActivities()
  const recentIncidents = await getRecentIncidents()

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

  // Calculate urgent alerts
  const urgentAlerts = [
    { title: 'Open Incidents', count: stats.incidents, href: '/dashboard/incidents', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle },
    { title: 'Expired Employee Certificates', count: stats.employeeExpired, href: '/dashboard/certificates-expiry/employees?period=expired', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
    { title: 'Expired Vehicle Certificates', count: stats.vehicleExpired, href: '/dashboard/certificates-expiry/vehicles?period=expired', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
    { title: 'Vehicles Off Road', count: stats.vor, href: '/dashboard/vehicles?status=off-road', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Car },
    { title: 'Flagged Employees', count: stats.flaggedEmployees, href: '/dashboard/employees', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Users },
  ].filter(alert => alert.count > 0)

  return (
    <>
      {/* Key Metrics - Top Priority */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.slice(0, 4).map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
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

      {/* Urgent Alerts */}
      {urgentAlerts.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Urgent Alerts Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {urgentAlerts.map((alert) => (
                <Link key={alert.title} href={alert.href} prefetch={true}>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${alert.bgColor} hover:shadow-md transition-shadow cursor-pointer`}>
                    <div className="flex items-center gap-3">
                      <alert.icon className={`h-5 w-5 ${alert.color}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                        <p className="text-xs text-gray-600">Click to view</p>
                      </div>
                    </div>
                    <span className={`text-2xl font-bold ${alert.color}`}>{alert.count}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Incidents */}
      {recentIncidents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Recent Incidents
            </CardTitle>
            <Link href="/dashboard/incidents" prefetch={true} className="text-sm text-navy hover:underline">
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIncidents.map((incident: any) => (
                <Link
                  key={incident.id}
                  href={`/dashboard/incidents/${incident.id}`}
                  prefetch={true}
                  className="block p-3 rounded-lg border border-gray-200 hover:border-navy hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          incident.resolved 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {incident.resolved ? 'Resolved' : 'Open'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{incident.incident_type}</span>
                        {incident.reference_number && (
                          <span className="text-xs text-gray-500">#{incident.reference_number}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{incident.description || 'No description'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {incident.routes && (
                          <span>Route: {incident.routes.route_number || 'N/A'}</span>
                        )}
                        {incident.vehicles && (
                          <span>Vehicle: {incident.vehicles.vehicle_identifier || 'N/A'}</span>
                        )}
                        <span>{formatDateTime(incident.reported_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      {recentActivities.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Recent Activities
            </CardTitle>
            <Link href="/dashboard/activities" prefetch={true} className="text-sm text-navy hover:underline">
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="mt-0.5">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {activity.activity_type?.replace('_', ' ')}
                      </span>
                      {activity.entity_name && (
                        <Link
                          href={getEntityLink(activity.entity_type, activity.entity_id)}
                          className="text-xs text-navy hover:underline"
                          prefetch={true}
                        >
                          {activity.entity_name}
                        </Link>
                      )}
                    </div>
                    {activity.certificate_name && (
                      <p className="text-sm text-gray-600">Certificate: {activity.certificate_name}</p>
                    )}
                    {activity.recipient_name && (
                      <p className="text-sm text-gray-600">Recipient: {activity.recipient_name}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.slice(4).map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
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

      {/* Operational Metrics Grid */}
      <div>
        <h2 className="text-2xl font-bold text-navy mb-4">📊 Today's Operations</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/vehicles?filter=spare" prefetch={true}>
            <Card className="transition-all hover:shadow-lg hover:border-navy cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Spare Vehicles
                </CardTitle>
                <div className="rounded-full p-2 bg-yellow-100">
                  <ParkingCircle className="h-5 w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.spareVehicles}</div>
                <p className="text-xs text-gray-500 mt-2">Available for deployment</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/vehicles?status=off-road" prefetch={true}>
            <Card className="transition-all hover:shadow-lg hover:border-navy cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Vehicles Off Road
                </CardTitle>
                <div className="rounded-full p-2 bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.vor}</div>
                <p className="text-xs text-gray-500 mt-2">Need attention</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/incidents" prefetch={true}>
            <Card className="transition-all hover:shadow-lg hover:border-navy cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Incidents (This Month)
                </CardTitle>
                <div className="rounded-full p-2 bg-orange-100">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.incidentsThisMonth}</div>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.incidents} currently open
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/vehicle-locations" prefetch={true}>
            <Card className="transition-all hover:shadow-lg hover:border-navy cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Spare Locations Tracked
                </CardTitle>
                <div className="rounded-full p-2 bg-blue-100">
                  <MapPinned className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.spareWithLocation}</div>
                <p className="text-xs text-gray-500 mt-2">
                  of {stats.spareVehicles} spares
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
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

