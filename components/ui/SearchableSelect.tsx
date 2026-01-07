'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from './Input'
import { Label } from './Label'
import { ChevronDown, X, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchableSelectOption {
  value: string | number
  label: string
}

interface SearchableSelectProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  loading?: boolean
  error?: boolean
}

export function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Search and select...',
  className,
  disabled = false,
  loading = false,
  error = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(opt => String(opt.value) === value)

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(0)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [searchTerm])

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
    setHighlightedIndex(0)
  }, [onChange])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleSelect(String(filteredOptions[highlightedIndex].value))
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearchTerm('')
        break
    }
  }

  return (
    <div className={cn('space-y-2', className)} ref={containerRef}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm',
            'ring-offset-background transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            !selectedOption && 'text-muted-foreground',
            error ? 'border-red-500 focus-visible:ring-red-500' : 'border-input',
            isOpen && 'ring-2 ring-ring ring-offset-2'
          )}
        >
          <span className="truncate">
            {loading ? 'Loading...' : selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {value && !disabled && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 focus:outline-none rounded-full hover:bg-gray-100 p-0.5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Dropdown */}
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg',
            'transition-all duration-200 origin-top',
            isOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          )}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                autoFocus={isOpen}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(String(option.value))}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors',
                    'focus:outline-none focus:bg-gray-100',
                    String(option.value) === value && 'bg-blue-50 text-blue-900 font-medium',
                    index === highlightedIndex && 'bg-gray-100',
                    String(option.value) !== value && index !== highlightedIndex && 'hover:bg-gray-50'
                  )}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
