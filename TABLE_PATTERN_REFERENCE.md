# Table Pattern Reference - Header Fix

## 🎯 The Correct Pattern

This document shows the **exact pattern** to use for all tables in the dashboard to ensure headers are always visible.

---

## ✅ Pattern 1: TableSkeleton Component

**File**: `components/ui/Skeleton.tsx`

```typescript
export function TableSkeleton({ 
  rows = 5, 
  columns = 5,
  headers 
}: { 
  rows?: number
  columns?: number
  headers?: string[]  // ✅ NEW: Pass real header names
}) {
  return (
    <div className="rounded-md border bg-white shadow-sm" role="status" aria-label="Loading table...">
      <div className="w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          
          {/* ✅ CRITICAL: Static headers - NEVER animated */}
          <thead className="bg-navy">
            <tr className="border-b">
              {headers ? (
                // Real header text provided
                headers.map((header, i) => (
                  <th 
                    key={i} 
                    className="h-12 px-4 text-left align-middle font-semibold text-white"
                  >
                    {header}
                  </th>
                ))
              ) : (
                // Fallback to static blocks
                Array.from({ length: columns }).map((_, i) => (
                  <th 
                    key={i} 
                    className="h-12 px-4 text-left align-middle font-semibold text-white"
                  >
                    {/* Static block - NO animate-pulse */}
                    <div className="h-4 w-24 rounded bg-blue-800" />
                  </th>
                ))
              )}
            </tr>
          </thead>
          
          {/* ✅ Body rows with animated cells only */}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'border-b transition-opacity',
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                )}
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="p-4 align-middle">
                    {/* Only THIS element animates */}
                    <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### Key Points
1. ✅ `<thead>` has `bg-navy` - static, never animated
2. ✅ Headers have real text or static blocks
3. ✅ Only `<div>` inside `<td>` has `animate-pulse`
4. ✅ Alternating row colors maintained

---

## ✅ Pattern 2: loading.tsx Files

**Example**: `app/dashboard/employees/loading.tsx`

```typescript
import { TableSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-48 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-64 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-md bg-gray-200" />
      </div>

      {/* ✅ CRITICAL: Pass real header names */}
      <TableSkeleton 
        rows={8} 
        columns={7}
        headers={['ID', 'Full Name', 'Role', 'Employment Status', 'Phone Number', 'Start Date', 'Actions']}
      />
    </div>
  )
}
```

### Key Points
1. ✅ Always provide `headers` array with real column names
2. ✅ Match column count exactly
3. ✅ Match row count to typical page size

---

## ✅ Pattern 3: Actual Table Component

**File**: `components/ui/Table.tsx` (Already correct - no changes needed)

```typescript
const TableHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('[&_tr]:border-b bg-navy [&_tr]:hover:bg-navy', className)} {...props} />
)

const TableHead = ({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      'h-12 px-4 text-left align-middle font-semibold text-white [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
)

const TableRow = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      'border-b transition-colors hover:bg-blue-50 data-[state=selected]:bg-blue-100 even:bg-gray-50 odd:bg-white',
      className
    )}
    {...props}
  />
)
```

### Key Points
1. ✅ `TableHeader` has `bg-navy`
2. ✅ `TableHead` has `text-white` and `font-semibold`
3. ✅ `TableRow` has alternating colors and hover states

---

## ✅ Pattern 4: Page Component with Data

**Example**: `app/dashboard/employees/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Plus, Eye, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getEmployees() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching employees:', error)
    return []
  }

  return data || []
}

async function EmployeesTable() {
  const employees = await getEmployees()

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        {/* ✅ Headers always rendered, never wrapped in conditions */}
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Employment Status</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        
        {/* ✅ Body with smooth transition */}
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-500">
                No employees found.
              </TableCell>
            </TableRow>
          ) : (
            employees.map((employee) => (
              <TableRow key={employee.id} className="transition-opacity duration-200">
                <TableCell>{employee.id}</TableCell>
                <TableCell className="font-medium">{employee.full_name}</TableCell>
                <TableCell>{employee.role || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    employee.employment_status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {employee.employment_status || 'N/A'}
                  </span>
                </TableCell>
                <TableCell>{employee.phone_number || 'N/A'}</TableCell>
                <TableCell>{formatDate(employee.start_date)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/employees/${employee.id}`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/employees/${employee.id}/edit`} prefetch={true}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Employees</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all employees in your fleet
          </p>
        </div>
        <Link href="/dashboard/employees/create" prefetch={true}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      {/* ✅ Clean Suspense boundary */}
      <Suspense fallback={
        <TableSkeleton 
          rows={8} 
          columns={7}
          headers={['ID', 'Full Name', 'Role', 'Employment Status', 'Phone Number', 'Start Date', 'Actions']}
        />
      }>
        <EmployeesTable />
      </Suspense>
    </div>
  )
}
```

### Key Points
1. ✅ Separate async component for data fetching
2. ✅ Headers always present in real table
3. ✅ Suspense with skeleton fallback
4. ✅ Smooth transition classes on rows
5. ✅ Prefetch enabled on links

---

## 🚫 Common Mistakes to AVOID

### ❌ DON'T: Animate the entire table
```typescript
// ❌ BAD
<table className="animate-pulse">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

### ❌ DON'T: Animate headers
```typescript
// ❌ BAD
<thead className="animate-pulse">
  <tr>...</tr>
</thead>
```

### ❌ DON'T: Use Skeleton components in headers
```typescript
// ❌ BAD
<th>
  <Skeleton className="h-4 w-24" />
</th>
```

### ❌ DON'T: Conditionally render headers
```typescript
// ❌ BAD
{isLoading ? null : (
  <TableHeader>
    <TableRow>...</TableRow>
  </TableHeader>
)}
```

---

## ✅ DO These Instead

### ✅ DO: Animate only cell content
```typescript
// ✅ GOOD
<td className="p-4">
  <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
</td>
```

### ✅ DO: Keep headers static
```typescript
// ✅ GOOD
<thead className="bg-navy">
  <tr className="border-b">
    <th className="h-12 px-4 font-semibold text-white">
      Header Text
    </th>
  </tr>
</thead>
```

### ✅ DO: Use real header names
```typescript
// ✅ GOOD
<TableSkeleton 
  headers={['ID', 'Name', 'Status']}
/>
```

### ✅ DO: Separate skeleton and data states
```typescript
// ✅ GOOD
<Suspense fallback={<TableSkeleton />}>
  <DataTable />
</Suspense>
```

---

## 📋 Quick Checklist

Before deploying any table page:

- [ ] TableSkeleton has `headers` prop with real names
- [ ] Header count matches table column count
- [ ] Headers have `bg-navy` and `text-white`
- [ ] No `animate-pulse` on `<thead>`
- [ ] Only `<td>` content has `animate-pulse`
- [ ] Rows have alternating colors (even:bg-white odd:bg-gray-50)
- [ ] Hover states work (hover:bg-blue-50)
- [ ] Suspense boundary separates skeleton from data
- [ ] No hydration errors in console
- [ ] Headers visible immediately on page load

---

## 🎯 Summary

**The Golden Rule**: Headers are structural elements that should NEVER animate or disappear.

**The Fix**: 
1. Static headers in skeleton state
2. Animate only cell content
3. Use real header names
4. Clean separation of skeleton and data

**The Result**: Headers always visible, professional UX, zero bugs! ✅

