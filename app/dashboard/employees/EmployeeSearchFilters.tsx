'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export function EmployeeSearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [role, setRole] = useState(searchParams.get('role') || 'all')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [canWork, setCanWork] = useState(searchParams.get('can_work') || 'all')

  const updateFilters = (updates: Record<string, string>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      router.push(`?${params.toString()}`)
    })
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    
    if (value.trim()) {
      params.set('search', value.trim())
    } else {
      params.delete('search')
    }
    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setRole('all')
    setStatus('all')
    setCanWork('all')
    router.push('/dashboard/employees')
  }

  const hasActiveFilters = 
    search.trim() !== '' || 
    role !== 'all' || 
    status !== 'all' ||
    canWork !== 'all'

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700">
            Search by Name
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="search"
              type="text"
              placeholder="Enter employee name..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              disabled={isPending}
            />
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Role Filter */}
        <div className="w-full md:w-48">
          <label htmlFor="role" className="mb-2 block text-sm font-medium text-gray-700">
            Role
          </label>
          <Select
            id="role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              updateFilters({ role: e.target.value })
            }}
            disabled={isPending}
          >
            <option value="all">All Roles</option>
            <option value="Driver">Driver</option>
            <option value="PA">Passenger Assistant</option>
            <option value="Coordinator">Coordinator</option>
            <option value="Admin">Admin</option>
            <option value="Other">Other</option>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
            Employment Status
          </label>
          <Select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              updateFilters({ status: e.target.value })
            }}
            disabled={isPending}
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
          </Select>
        </div>

        {/* Can Work Filter */}
        <div className="w-full md:w-48">
          <label htmlFor="can_work" className="mb-2 block text-sm font-medium text-gray-700">
            Can Work
          </label>
          <Select
            id="can_work"
            value={canWork}
            onChange={(e) => {
              setCanWork(e.target.value)
              updateFilters({ can_work: e.target.value })
            }}
            disabled={isPending}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <div className="w-full md:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={clearFilters}
              disabled={isPending}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
