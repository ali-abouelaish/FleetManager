'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Car,
  School,
  Route,
  UserCheck,
  AlertCircle,
  FileText,
  ClipboardList,
  UserCog,
  MapPin,
  MapPinned,
  Phone,
  Calendar,
  Contact,
  BarChart3,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'School Overview', href: '/dashboard/school-overview', icon: MapPin },
  { name: 'Daily Summaries', href: '/dashboard/summaries', icon: BarChart3 },
  { name: 'Employee Certificates', href: '/dashboard/certificates-expiry/employees', icon: Calendar },
  { name: 'Vehicle Certificates', href: '/dashboard/certificates-expiry/vehicles', icon: Calendar },
  { name: 'Employees', href: '/dashboard/employees', icon: Users },
  { name: 'Drivers', href: '/dashboard/drivers', icon: UserCog },
  { name: 'Passenger Assistants', href: '/dashboard/assistants', icon: UserCheck },
  { name: 'Schools', href: '/dashboard/schools', icon: School },
  { name: 'Routes', href: '/dashboard/routes', icon: Route },
  { name: 'Vehicles', href: '/dashboard/vehicles', icon: Car },
  { name: 'Spare Vehicle Locations', href: '/dashboard/vehicle-locations', icon: MapPinned },
  { name: 'Passengers', href: '/dashboard/passengers', icon: Users },
  { name: 'Parent Contacts', href: '/dashboard/parent-contacts', icon: Contact },
  { name: 'Call Logs', href: '/dashboard/call-logs', icon: Phone },
  { name: 'Incidents', href: '/dashboard/incidents', icon: AlertCircle },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Audit Log', href: '/dashboard/audit', icon: ClipboardList },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b-2 border-navy bg-gray-800">
        <h1 className="text-xl font-bold text-white">Fleet Admin</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navigation.map((item) => {
          // Special handling for dashboard home - only active on exact match
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-navy text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

