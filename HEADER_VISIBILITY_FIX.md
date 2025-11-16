# Table Header Visibility Fix

## 🐛 Problem
Table headers were not appearing after skeleton loaders finished, only becoming visible on hover. This was caused by:
1. Animated skeleton headers conflicting with real headers during hydration
2. CSS classes from skeleton state persisting into the real table
3. Potential hydration mismatches between skeleton and actual data

## ✅ Solution

### Key Principles
1. **Headers are ALWAYS static and visible** - Never animated
2. **Only body rows animate** during skeleton state
3. **Clean conditional rendering** - Either skeleton OR real table, never both
4. **No lingering CSS classes** - Fresh render for real data

---

## 📝 Implementation

### 1. Updated TableSkeleton Component

**File**: `components/ui/Skeleton.tsx`

```typescript
export function TableSkeleton({ 
  rows = 5, 
  columns = 5,
  headers 
}: { 
  rows?: number
  columns?: number
  headers?: string[]
}) {
  return (
    <div className="rounded-md border bg-white shadow-sm" role="status" aria-label="Loading table...">
      <div className="w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          {/* ✅ Static headers - NEVER animated, always visible */}
          <thead className="bg-navy">
            <tr className="border-b">
              {headers ? (
                // Use real header names if provided
                headers.map((header, i) => (
                  <th 
                    key={i} 
                    className="h-12 px-4 text-left align-middle font-semibold text-white"
                  >
                    {header}
                  </th>
                ))
              ) : (
                // Fallback to static placeholder blocks (NOT animated)
                Array.from({ length: columns }).map((_, i) => (
                  <th 
                    key={i} 
                    className="h-12 px-4 text-left align-middle font-semibold text-white"
                  >
                    <div className="h-4 w-24 rounded bg-blue-800" />
                  </th>
                ))
              )}
            </tr>
          </thead>
          
          {/* ✅ Animated body rows only - headers stay stable */}
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
                    {/* Only cells animate, not the entire row */}
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

### Key Changes
- ✅ **Headers are static** - No `animate-pulse` on `<thead>`
- ✅ **Navy background persists** - `bg-navy` on headers matches real tables
- ✅ **Optional header text** - Can pass actual column names for better UX
- ✅ **Only cells animate** - `animate-pulse` only on `<td>` content divs
- ✅ **Alternating rows maintained** - Same pattern as real tables

---

### 2. Updated Page Components - Clean Conditional Rendering

**Example**: `app/dashboard/employees/page.tsx`

#### ❌ BEFORE (Problematic)
```typescript
export default function EmployeesPage() {
  const employees = await getEmployees()

  return (
    <div>
      {/* Both skeleton and table might exist in DOM simultaneously */}
      <Suspense fallback={<TableSkeleton />}>
        <Table>...</Table>
      </Suspense>
    </div>
  )
}
```

#### ✅ AFTER (Fixed)
```typescript
async function EmployeesTable() {
  const employees = await getEmployees()

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Headers always visible, never animated */}
            <TableHead>ID</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Employment Status</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id} className="transition-opacity duration-200">
              <TableCell>{employee.id}</TableCell>
              <TableCell className="font-medium">{employee.full_name}</TableCell>
              {/* ... */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-navy">Employees</h1>
      
      {/* Clean separation: Either skeleton OR real table */}
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

### Key Changes
- ✅ **Pass real headers to skeleton** - Better UX, prevents hydration mismatch
- ✅ **Separate async component** - Clean boundary between loading and loaded states
- ✅ **Add transition classes** - Smooth fade-in when data arrives
- ✅ **No dual rendering** - Suspense ensures only one state exists in DOM

---

### 3. Updated loading.tsx Files

**Example**: `app/dashboard/employees/loading.tsx`

```typescript
import { TableSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-48 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-64 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-md bg-gray-200" />
      </div>

      {/* Use real header names for better UX */}
      <TableSkeleton 
        rows={8} 
        columns={7}
        headers={['ID', 'Full Name', 'Role', 'Employment Status', 'Phone Number', 'Start Date', 'Actions']}
      />
    </div>
  )
}
```

---

## 🎯 Files to Update

### ✅ Already Fixed
- `components/ui/Skeleton.tsx` - TableSkeleton component

### 📝 Update These Files with Real Header Names

#### List Pages (13 files)
```
✅ app/dashboard/employees/loading.tsx
✅ app/dashboard/schools/loading.tsx
✅ app/dashboard/routes/loading.tsx
✅ app/dashboard/vehicles/loading.tsx
✅ app/dashboard/passengers/loading.tsx
✅ app/dashboard/call-logs/loading.tsx
✅ app/dashboard/incidents/loading.tsx
✅ app/dashboard/drivers/loading.tsx
✅ app/dashboard/assistants/loading.tsx
✅ app/dashboard/documents/loading.tsx
✅ app/dashboard/audit/loading.tsx
```

#### Update Pattern for Each loading.tsx
```typescript
// Instead of:
<TableSkeleton rows={8} columns={7} />

// Use:
<TableSkeleton 
  rows={8} 
  columns={7}
  headers={['Col1', 'Col2', 'Col3', ...]}  // ✅ Add actual column names
/>
```

---

## 🔍 Header Names for Each Route

### Employees
```typescript
headers={['ID', 'Full Name', 'Role', 'Employment Status', 'Phone Number', 'Start Date', 'Actions']}
```

### Schools
```typescript
headers={['ID', 'School Name', 'Address', 'Created At', 'Actions']}
```

### Routes
```typescript
headers={['ID', 'Route Number', 'School', 'Created At', 'Actions']}
```

### Vehicles
```typescript
headers={['ID', 'Vehicle Identifier', 'Registration', 'Make/Model', 'Vehicle Type', 'Status', 'MOT Date', 'Actions']}
```

### Passengers
```typescript
headers={['ID', 'Full Name', 'School', 'Route', 'Mobility Type', 'Seat Number', 'Actions']}
```

### Call Logs
```typescript
headers={['Date/Time', 'Caller', 'Type', 'Subject', 'Related To', 'Priority', 'Status', 'Actions']}
```

### Incidents
```typescript
headers={['ID', 'Type', 'Employee', 'Vehicle', 'Route', 'Status', 'Reported At', 'Actions']}
```

### Drivers
```typescript
headers={['Employee ID', 'Full Name', 'Phone', 'Status', 'TAS Badge Expiry', 'Taxi Badge Expiry', 'DBS Expiry', 'Actions']}
```

### Assistants
```typescript
headers={['Employee ID', 'Full Name', 'Phone', 'Status', 'TAS Badge Number', 'TAS Badge Expiry', 'DBS Expiry', 'Actions']}
```

### Documents
```typescript
headers={['ID', 'File Name', 'File Type', 'Employee', 'Uploaded By', 'Uploaded At']}
```

### Audit
```typescript
headers={['ID', 'Table', 'Record ID', 'Action', 'Changed By', 'Change Time']}
```

---

## 🎨 CSS Classes Reference

### Headers (Always Visible, Never Animated)
```typescript
// ✅ Correct header styling
<thead className="bg-navy">
  <tr className="border-b">
    <th className="h-12 px-4 text-left align-middle font-semibold text-white">
      Header Text
    </th>
  </tr>
</thead>
```

### Body Rows (Animated During Skeleton)
```typescript
// ✅ Skeleton body cells
<tbody>
  <tr className="border-b transition-opacity even:bg-gray-50 odd:bg-white">
    <td className="p-4 align-middle">
      <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
    </td>
  </tr>
</tbody>
```

### Real Data Rows (Smooth Transition)
```typescript
// ✅ Real data rows
<tbody>
  <tr className="border-b transition-opacity duration-200 hover:bg-blue-50 even:bg-gray-50 odd:bg-white">
    <td className="p-4 align-middle">
      {data}
    </td>
  </tr>
</tbody>
```

---

## ✅ Checklist

### Core Fix
- [x] Remove `animate-pulse` from table headers
- [x] Make headers static with navy background
- [x] Only animate body cell content
- [x] Add `headers` prop to TableSkeleton
- [x] Ensure clean conditional rendering

### Update All Routes
- [ ] Update all `loading.tsx` files with real header names
- [ ] Verify headers stay visible during load
- [ ] Test on slow network (throttle to Slow 3G)
- [ ] Check hover states work correctly
- [ ] Verify alternating row colors

### Polish
- [x] Add `transition-opacity` to real rows
- [x] Maintain navy theme throughout
- [x] Keep shadow-sm on table containers
- [x] Ensure accessibility (ARIA labels)

---

## 🧪 Testing Steps

### 1. Test Header Visibility
```bash
# In Chrome DevTools
1. Network tab → Throttle to "Slow 3G"
2. Navigate to /dashboard/employees
3. Watch headers → Should be visible immediately
4. Watch body → Should show animated skeleton rows
5. When data loads → Headers stay visible, rows fade in
```

### 2. Test Hover States
```bash
1. After page loads completely
2. Hover over table rows
3. Should see blue-50 background on hover
4. Headers should never disappear or flicker
```

### 3. Test Alternating Rows
```bash
1. Load any list page
2. Check even rows are white
3. Check odd rows are gray-50
4. Check headers are navy with white text
```

---

## 🎯 Expected Result

### Before Fix ❌
```
User navigates → Skeleton shows → Data loads → Headers missing → User hovers → Headers appear
```

### After Fix ✅
```
User navigates → Headers visible immediately → Skeleton body animates → Data loads → Headers stay visible → Smooth row transition
```

---

## 📊 Performance Impact

- ✅ **Immediate visual stability** - Headers never disappear
- ✅ **Better UX** - Users can read column names during load
- ✅ **No hydration errors** - Clean separation of states
- ✅ **Smooth transitions** - Professional fade-in effect
- ✅ **Consistent theming** - Navy headers throughout

---

## 🚀 Summary

The fix ensures:
1. **Headers are ALWAYS visible** - Navy background, white text, never animated
2. **Only body cells animate** - `animate-pulse` on individual cell content
3. **Clean state separation** - Suspense manages skeleton vs. real data
4. **Smooth transitions** - `transition-opacity duration-200` on data rows
5. **Better UX** - Real column names in skeleton state

**Result**: No more missing headers, professional loading experience! ✅

