'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type FilterValue = 'all' | 'yes' | 'no'

export function VehicleSearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [isSpare, setIsSpare] = useState<FilterValue>(
    (searchParams.get('is_spare') as FilterValue) || 'all'
  )
  const [isVor, setIsVor] = useState<FilterValue>(
    (searchParams.get('is_vor') as FilterValue) || 'all'
  )
  const [hasLift, setHasLift] = useState<FilterValue>(
    (searchParams.get('has_lift') as FilterValue) || 'all'
  )

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
    setIsSpare('all')
    setIsVor('all')
    setHasLift('all')
    router.push('/dashboard/vehicles')
  }

  const hasActiveFilters = 
    search.trim() !== '' || 
    isSpare !== 'all' || 
    isVor !== 'all' || 
    hasLift !== 'all'

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search" className="mb-2 block text-sm font-medium text-gray-700">
            Search by Registration
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="search"
              type="text"
              placeholder="Enter registration number..."
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

        {/* Is Spare Filter */}
        <div className="w-full md:w-48">
          <label htmlFor="is_spare" className="mb-2 block text-sm font-medium text-gray-700">
            Is Spare
          </label>
          <select
            id="is_spare"
            value={isSpare}
            onChange={(e) => {
              const value = e.target.value as FilterValue
              setIsSpare(value)
              updateFilters({ is_spare: value })
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            disabled={isPending}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        {/* Is VOR Filter */}
        <div className="w-full md:w-48">
          <label htmlFor="is_vor" className="mb-2 block text-sm font-medium text-gray-700">
            Is VOR
          </label>
          <select
            id="is_vor"
            value={isVor}
            onChange={(e) => {
              const value = e.target.value as FilterValue
              setIsVor(value)
              updateFilters({ is_vor: value })
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            disabled={isPending}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        {/* Has Lift Filter */}
        <div className="w-full md:w-48">
          <label htmlFor="has_lift" className="mb-2 block text-sm font-medium text-gray-700">
            Has Lift
          </label>
          <select
            id="has_lift"
            value={hasLift}
            onChange={(e) => {
              const value = e.target.value as FilterValue
              setHasLift(value)
              updateFilters({ has_lift: value })
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            disabled={isPending}
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            disabled={isPending}
            className="whitespace-nowrap"
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

