'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export function PassengerSearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [mobilityType, setMobilityType] = useState(searchParams.get('mobility_type') || 'all')

  // Sync state with URL params when they change
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setMobilityType(searchParams.get('mobility_type') || 'all')
  }, [searchParams])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    
    if (value.trim()) {
      params.set('search', value.trim())
    } else {
      params.delete('search')
    }
    
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setSearch('')
    setMobilityType('all')
    startTransition(() => {
      router.push('/dashboard/passengers')
    })
  }

  const hasActiveFilters = 
    search.trim() !== '' || 
    mobilityType !== 'all'

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
              placeholder="Enter passenger name..."
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

        {/* Mobility Type Filter */}
        <div className="w-full md:w-48">
          <label htmlFor="mobility_type" className="mb-2 block text-sm font-medium text-gray-700">
            Mobility Type
          </label>
          <Select
            id="mobility_type"
            value={mobilityType}
            onChange={(e) => {
              setMobilityType(e.target.value)
              updateFilters({ mobility_type: e.target.value })
            }}
            disabled={isPending}
          >
            <option value="all">All Types</option>
            <option value="Wheelchair">Wheelchair</option>
            <option value="Ambulant">Ambulant</option>
            <option value="Other">Other</option>
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

