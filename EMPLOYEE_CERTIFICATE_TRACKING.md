# 📋 Employee Certificate Tracking System

## ✅ Overview

**Employee certificates are now fully tracked and automatically enforced** across the dashboard. The system monitors certificates for **Drivers** and **Passenger Assistants**, automatically flagging employees who cannot work due to expired documents.

---

## 🎯 Key Features

### 1. Automatic Work Authorization Flagging
- ✅ Employees with expired certificates are automatically flagged as `can_work = FALSE`
- ✅ Daily cron job checks all certificates at midnight UTC
- ✅ Instant flagging via database triggers when certificates are updated

### 2. Visual Certificate Status
- ✅ **Employees List** shows certificate status column with color-coded badges
- ✅ **Employee Detail Page** displays all certificates with days remaining
- ✅ **Warning Banner** appears when employee cannot work

### 3. Comprehensive Certificate Coverage

#### For Drivers:
- 📛 **TAS Badge** (`tas_badge_expiry_date`)
- 🚕 **Taxi Badge** (`taxi_badge_expiry_date`)
- 🔒 **DBS Certificate** (`dbs_expiry_date`)
- 🚌 **PSV License** (boolean field)

#### For Passenger Assistants:
- 📛 **TAS Badge** (`tas_badge_expiry_date`)
- 🔒 **DBS Certificate** (`dbs_expiry_date`)

---

## 📊 UI Enhancements

### Employees List (`/dashboard/employees`)

**New "Certificate Status" Column** showing:
- ✅ **Valid** (Green) - All certificates valid for 30+ days
- ⚠️ **< 30 Days** (Yellow) - At least one certificate expiring within 30 days
- 🔴 **< 14 Days** (Orange) - At least one certificate expiring within 14 days
- ❌ **Expired** (Red) - At least one certificate expired

**Additional Indicators:**
- 🚫 **Cannot Work** badge (Red) when `can_work = FALSE`

```typescript
// Example: Employee with expired certificate
Certificate Status: ⚠️ Expired  🚫 Cannot Work
```

---

### Employee Detail Page (`/dashboard/employees/[id]`)

#### 1. **Work Authorization Banner**
When an employee has `can_work = FALSE`, a prominent red warning banner displays at the top:

```
⚠️ Employee Cannot Work
This employee has expired certificates and is flagged as unable to work. 
Please renew certificates below.
```

#### 2. **Work Authorization Status**
Added to the "Basic Information" card:

- ✅ **Authorized to Work** (Green) - All certificates valid
- ❌ **Cannot Work (Expired Certificates)** (Red) - Flagged by system

#### 3. **Driver Certificates Card**
Displays for employees who are drivers:

```
🚗 Driver Certificates

┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│ TAS Badge               │  │ Taxi Badge              │  │ DBS Certificate         │
│ Badge: 12345            │  │ Badge: TX-789           │  │ Expires: 2026-05-15     │
│ Expires: 2026-03-20     │  │ Expires: 2025-12-01     │  │ ✅ 485 days remaining   │
│ ✅ 423 days remaining   │  │ ⚠️ 10 days remaining   │  │                         │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘

┌─────────────────────────┐
│ PSV License             │
│ ✅ Yes                  │
└─────────────────────────┘
```

#### 4. **Passenger Assistant Certificates Card**
Displays for employees who are PAs:

```
👥 Passenger Assistant Certificates

┌─────────────────────────┐  ┌─────────────────────────┐
│ TAS Badge               │  │ DBS Certificate         │
│ Badge: PA-456           │  │ Expires: 2024-11-01     │
│ Expires: 2026-06-15     │  │ ❌ 3 days overdue       │
│ ✅ 540 days remaining   │  │                         │
└─────────────────────────┘  └─────────────────────────┘
```

#### 5. **Quick Link to Certificate Expiry Dashboard**
At the bottom of the page:

```
⚠️ View All Certificate Expiries
   Check all expiring certificates across drivers, PAs, and vehicles
   
   [View Dashboard →]
```

---

## 🚨 Certificate Status Badges

| Days Remaining | Badge | Color | Icon |
|----------------|-------|-------|------|
| Not Set | Not Set | Gray | None |
| < 0 (Expired) | `X days overdue` | Red | ❌ XCircle |
| 0 - 14 | `X days remaining` | Orange | ⚠️ AlertTriangle |
| 15 - 30 | `X days remaining` | Yellow | 🕐 Clock |
| 30+ | `X days remaining` | Green | ✅ CheckCircle |

---

## 🔄 Automatic Flagging System

### Database Schema

```sql
ALTER TABLE employees ADD COLUMN can_work BOOLEAN DEFAULT TRUE;
```

### Trigger Logic (runs on driver/PA certificate UPDATE)

```sql
-- Check if any certificate is expired
IF (tas_badge_expiry_date < CURRENT_DATE) OR
   (taxi_badge_expiry_date < CURRENT_DATE) OR
   (dbs_expiry_date < CURRENT_DATE) THEN
  UPDATE employees SET can_work = FALSE WHERE id = employee_id;
ELSE
  UPDATE employees SET can_work = TRUE WHERE id = employee_id;
END IF;
```

### Daily Cron Job (runs at midnight UTC)

```sql
-- Flag employees with expired certificates
UPDATE employees
SET can_work = FALSE
WHERE id IN (
  SELECT DISTINCT e.id
  FROM employees e
  LEFT JOIN drivers d ON d.employee_id = e.id
  LEFT JOIN passenger_assistants pa ON pa.employee_id = e.id
  WHERE (
    (d.tas_badge_expiry_date < CURRENT_DATE) OR
    (d.taxi_badge_expiry_date < CURRENT_DATE) OR
    (d.dbs_expiry_date < CURRENT_DATE) OR
    (pa.tas_badge_expiry_date < CURRENT_DATE) OR
    (pa.dbs_expiry_date < CURRENT_DATE)
  )
);

-- Unflag employees when all certificates are renewed
UPDATE employees
SET can_work = TRUE
WHERE can_work = FALSE
AND id IN (...all certificates valid...);
```

---

## 📍 Certificate Expiry Dashboard

The existing **Certificate Expiry Dashboard** (`/dashboard/certificates-expiry`) displays:

### Tabs:
1. **Expired** - All expired certificates
2. **< 14 Days** - Certificates expiring within 14 days
3. **< 30 Days** - Certificates expiring within 30 days

### Tables:
- 🚗 **Drivers** with expiring/expired certificates
- 👥 **Passenger Assistants** with expiring/expired certificates
- 🚙 **Vehicles** with expiring/expired certificates

### Features:
- Color-coded rows (Red = Expired, Orange = 14 days, Yellow = 30 days)
- Clickable employee names linking to detail pages
- Displays badge numbers and certificate types
- Shows days remaining or days overdue

---

## 📊 Dashboard Integration

### Main Dashboard (`/dashboard`)

**New Stats Cards:**

1. **👷 Flagged Employees (Not Authorized)**
   - Count: `SELECT COUNT(*) FROM employees WHERE can_work = FALSE`
   - Links to: `/dashboard/employees` (filtered by `can_work = FALSE` in future)

2. **⚠️ Certificates Expiring in < 14 Days**
   - Count: Total certificates expiring within 14 days (drivers + PAs + vehicles)
   - Links to: `/dashboard/certificates-expiry?period=14-days`

3. **🗓️ Certificates Expiring in < 30 Days**
   - Count: Total certificates expiring within 30 days
   - Links to: `/dashboard/certificates-expiry?period=30-days`

---

## 🧪 Testing the System

### Test 1: Create Driver with Expired Certificate

```sql
-- Insert employee
INSERT INTO employees (full_name, role, employment_status, can_work)
VALUES ('John Doe', 'Driver', 'Active', TRUE);

-- Insert driver with expired DBS
INSERT INTO drivers (employee_id, dbs_expiry_date)
VALUES (1, '2024-01-01'); -- Expired

-- Run manual check
SELECT update_expiry_flags();

-- Verify result
SELECT id, full_name, can_work FROM employees WHERE id = 1;
-- Expected: can_work = FALSE ✅
```

### Test 2: Renew Expired Certificate

```sql
-- Update certificate to future date
UPDATE drivers
SET dbs_expiry_date = '2026-12-31'
WHERE employee_id = 1;

-- Trigger should auto-update can_work
SELECT id, full_name, can_work FROM employees WHERE id = 1;
-- Expected: can_work = TRUE ✅
```

### Test 3: Check UI Display

1. Navigate to `/dashboard/employees`
2. Find employee with expired certificate
3. Verify:
   - Certificate Status column shows **"Expired"** (Red)
   - **"Cannot Work"** badge appears
4. Click on employee name
5. Verify:
   - Red warning banner appears at top
   - "Work Authorization" shows **"Cannot Work"**
   - Certificate cards show expired status with red badge

---

## 🔧 Setup Instructions

### 1. Apply Migration

```bash
# If using Supabase CLI
supabase db push

# Or run SQL file directly in Supabase SQL Editor:
# supabase/migrations/006_certificate_expiry_tracking.sql
```

### 2. Enable Cron Job

Run this SQL in Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'update-expiry-flags',
  '0 0 * * *', -- Daily at midnight UTC
  $$SELECT update_expiry_flags();$$
);
```

### 3. Run Initial Check

```sql
-- Check all existing employees and flag if needed
SELECT update_expiry_flags();
```

### 4. Verify Triggers

```sql
-- Check that triggers are installed
SELECT tgname, tgtype
FROM pg_trigger
WHERE tgname LIKE '%expiry%';

-- Expected output:
-- trigger_driver_expiry_check
-- trigger_pa_expiry_check
-- trigger_vehicle_expiry_check
```

---

## 📋 Files Changed

### New/Updated Files:

1. **`supabase/migrations/006_certificate_expiry_tracking.sql`**
   - Added `can_work` column to `employees`
   - Created `update_expiry_flags()` function
   - Created triggers for drivers, PAs, and vehicles
   - Scheduled daily cron job

2. **`app/dashboard/employees/page.tsx`**
   - Added "Certificate Status" column
   - Fetches driver/PA certificate data
   - Shows color-coded status badges
   - Shows "Cannot Work" indicator

3. **`app/dashboard/employees/[id]/page.tsx`**
   - Added warning banner for `can_work = FALSE`
   - Added "Work Authorization" field
   - Added Driver Certificates card
   - Added Passenger Assistant Certificates card
   - Added quick link to Certificate Expiry dashboard

4. **`app/dashboard/certificates-expiry/page.tsx`**
   - Displays expiring certificates for drivers, PAs, and vehicles
   - Filter tabs for Expired / 14 Days / 30 Days
   - Color-coded tables

5. **`app/dashboard/page.tsx`**
   - Added stats cards for:
     - Flagged Employees
     - Certificates Expiring (14 Days)
     - Certificates Expiring (30 Days)

---

## ✅ Summary

### What's Tracked:
- ✅ Driver TAS Badge, Taxi Badge, DBS
- ✅ PA TAS Badge, DBS
- ✅ Vehicle certificates (Plate, Insurance, MOT, Tax, LOLER, First Aid, Fire Extinguisher)

### What Happens Automatically:
- ✅ Employees flagged as `can_work = FALSE` when certificates expire
- ✅ Vehicles flagged as `off_the_road = TRUE` when certificates expire
- ✅ Triggers fire instantly on certificate updates
- ✅ Daily cron job catches time-based expirations
- ✅ Re-enables employees/vehicles when certificates renewed

### Where to View:
- ✅ **Employees List** - Certificate Status column
- ✅ **Employee Detail Page** - Full certificate breakdown
- ✅ **Certificate Expiry Dashboard** - All expiring certificates
- ✅ **Main Dashboard** - Summary stats

---

**Result:** 🎯 Complete end-to-end employee certificate tracking with automatic enforcement and comprehensive UI visibility!

