'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Car,
  School,
  Route,
  UserCheck,
  AlertCircle,
  ClipboardList,
  UserCog,
  MapPin,
  Phone,
  Calendar,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  Briefcase,
  TrendingUp,
  Mail,
  Shield,
} from 'lucide-react'
import { useNotificationCount } from '@/hooks/useNotificationCount'
import { useComplianceNotificationCount } from '@/hooks/useComplianceNotificationCount'
import { useRouteActivityNotificationCount } from '@/hooks/useRouteActivityNotificationCount'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface NavGroup {
  name: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

// Top-level items that are always visible (never collapsed)
const topLevelItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Compliance', href: '/dashboard/compliance', icon: Bell },
  { name: 'Route Activity', href: '/dashboard/route-activity', icon: Bell },
  { name: 'School Overview', href: '/dashboard/school-overview', icon: MapPin },
]

const navigationGroups: NavGroup[] = [
  {
    name: 'People',
    icon: Users,
    items: [
      { name: 'Employees', href: '/dashboard/employees', icon: Users },
      { name: 'Drivers', href: '/dashboard/drivers', icon: UserCog },
      { name: 'Passenger Assistants', href: '/dashboard/assistants', icon: UserCheck },
      { name: 'Passengers', href: '/dashboard/passengers', icon: Users },
    ],
  },
  {
    name: 'Operations',
    icon: Briefcase,
    items: [
      { name: 'Routes', href: '/dashboard/routes', icon: Route },
      { name: 'Schools', href: '/dashboard/schools', icon: School },
      { name: 'Incidents', href: '/dashboard/incidents', icon: AlertCircle },
      { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
      { name: 'Call Logs', href: '/dashboard/call-logs', icon: Phone },
      { name: 'Email Summaries', href: '/dashboard/email-summaries', icon: Mail },
    ],
  },
  {
    name: 'Vehicles',
    icon: Car,
    items: [
      { name: 'Vehicles', href: '/dashboard/vehicles', icon: Car },
      { name: 'Vehicle Locations', href: '/dashboard/vehicle-locations', icon: MapPin },
    ],
  },
  {
    name: 'Reports',
    icon: TrendingUp,
    items: [
      { name: 'Daily Summaries', href: '/dashboard/summaries', icon: BarChart3 },
      { name: 'Daily Vehicle Checks', href: '/dashboard/vehicle-pre-checks', icon: ClipboardList },
      { name: 'Employee Certificates', href: '/dashboard/certificates-expiry/employees', icon: Calendar },
      { name: 'Vehicle Certificates', href: '/dashboard/certificates-expiry/vehicles', icon: Calendar },
    ],
  },
  {
    name: 'Admin',
    icon: Shield,
    items: [
      { name: 'User Approvals', href: '/dashboard/admin/user-approvals', icon: UserCheck },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { count: notificationCount } = useNotificationCount()
  const { count: complianceCount } = useComplianceNotificationCount()
  const { count: routeActivityCount } = useRouteActivityNotificationCount()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isGroupActive = (items: NavItem[]) => {
    return items.some((item) => isItemActive(item.href))
  }

  // Auto-expand groups that contain active items on mount and pathname change
  useEffect(() => {
    const groupsToExpand = new Set<string>()
    navigationGroups.forEach((group) => {
      const hasActive = group.items.some((item) => {
        if (item.href === '/dashboard') {
          return pathname === '/dashboard'
        }
        return pathname === item.href || pathname.startsWith(item.href + '/')
      })
      if (hasActive) {
        groupsToExpand.add(group.name)
      }
    })
    setExpandedGroups(groupsToExpand)
  }, [pathname])

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl">
      {/* Header */}
      <div className="flex h-16 items-center justify-center border-b border-gray-700 bg-gradient-to-r from-blue-900 to-navy">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/10 p-2 backdrop-blur-sm">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Fleet Admin</h1>
            <p className="text-xs text-blue-200">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {/* Top-level items - always visible */}
        <div className="space-y-1 mb-4 pb-4 border-b border-gray-700">
          {topLevelItems.map((item) => {
            const isActive = isItemActive(item.href)
            // Show badge with appropriate count for each page
            let badgeCount = 0
            let showBadge = false
            if (item.href === '/dashboard/compliance') {
              badgeCount = complianceCount
              showBadge = complianceCount > 0
            } else if (item.href === '/dashboard/route-activity') {
              badgeCount = routeActivityCount
              showBadge = routeActivityCount > 0
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={cn(
                  'group flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 relative',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 flex-shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                  )}
                />
                <span className="flex-1">{item.name}</span>
                {showBadge && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-lg animate-pulse">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Collapsible groups */}
        {navigationGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.name)
          const hasActiveItem = isGroupActive(group.items)

          return (
            <div key={group.name}>
              <button
                onClick={() => toggleGroup(group.name)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200',
                  hasActiveItem
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <group.icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    hasActiveItem ? "text-white" : "text-gray-400"
                  )} />
                  <span>{group.name}</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded ? "rotate-180" : "rotate-0"
                )} />
              </button>
              
              {/* Animated dropdown */}
              <div className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                isExpanded ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
              )}>
                <div className="ml-3 space-y-1 border-l-2 border-gray-700 pl-3">
                  {group.items.map((item) => {
                    const isActive = isItemActive(item.href)
                    const showBadge = item.href === '/dashboard/notifications' && notificationCount > 0

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch={true}
                        className={cn(
                          'group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 relative',
                          isActive
                            ? 'bg-blue-600/20 text-white border-l-2 border-blue-400 -ml-px shadow-sm'
                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white hover:border-l-2 hover:border-gray-500 hover:-ml-px'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-4 w-4 flex-shrink-0 transition-colors',
                            isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
                          )}
                        />
                        <span className="flex-1">{item.name}</span>
                        {showBadge && (
                          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-lg animate-pulse">
                            {notificationCount > 99 ? '99+' : notificationCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 px-4 py-3 bg-gray-900/50">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>System Online</span>
        </div>
      </div>
    </div>
  )
}

