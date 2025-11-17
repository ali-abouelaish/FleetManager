# 📅 Certificate Expiry Tracking - Quick Start Guide

## 🚀 Getting Started (5 Minutes)

### Step 1: Run the Migration
```bash
# Apply database changes
supabase db push
```

**What it does:**
- ✅ Adds `can_work` column to employees table
- ✅ Creates `update_expiry_flags()` function
- ✅ Creates 3 triggers for automatic updates
- ✅ Sets up real-time certificate monitoring

### Step 2: Test the System
```sql
-- Run manual update to initialize flags
SELECT update_expiry_flags();

-- Check if any vehicles are VOR
SELECT vehicle_identifier, off_the_road 
FROM vehicles 
WHERE off_the_road = TRUE;

-- Check if any employees are flagged
SELECT first_name, last_name, can_work 
FROM employees 
WHERE can_work = FALSE;
```

### Step 3: Access the Dashboard
1. Navigate to `/dashboard`
2. Look for "📅 Certificate & Compliance Status" section
3. Click on any card to view details

### Step 4: View Certificate Expiries
1. Click "Certificate Expiries" in the sidebar (📅)
2. Or navigate to `/dashboard/certificates-expiry`
3. Use tabs to filter: 30 Days | 14 Days | Expired

---

## 🎯 How It Works

### Automatic Flagging

**When a certificate expires:**
```
Vehicle Certificate Expires
    ↓
Trigger Fires Automatically
    ↓
off_the_road = TRUE (VOR)
    ↓
Vehicle appears in "Vehicles VOR" card
```

**When an employee certificate expires:**
```
Driver/PA Certificate Expires
    ↓
Trigger Fires Automatically
    ↓
can_work = FALSE
    ↓
Employee appears in "Flagged Employees" card
```

**When a certificate is renewed:**
```
Update Expiry Date (future date)
    ↓
Trigger Fires Automatically
    ↓
Status Reset (off_the_road = FALSE or can_work = TRUE)
    ↓
Entity removed from alerts
```

---

## 📊 Dashboard Cards

### 1. Vehicles VOR (🔴)
- **Shows**: Count of vehicles off-road due to expired certificates
- **Click**: Goes to vehicles list filtered by VOR status
- **Formula**: `COUNT(vehicles WHERE off_the_road = TRUE)`

### 2. Certificates Expiring (14 Days) (🟠)
- **Shows**: Count of certificates expiring in next 14 days
- **Click**: Goes to certificate expiry page (14-day filter)
- **Critical**: Immediate action required

### 3. Certificates Expiring (30 Days) (🟡)
- **Shows**: Count of certificates expiring in next 30 days
- **Click**: Goes to certificate expiry page (30-day filter)
- **Warning**: Plan renewal soon

### 4. Flagged Employees (🔴)
- **Shows**: Count of employees who cannot work (expired certificates)
- **Click**: Goes to employees list
- **Formula**: `COUNT(employees WHERE can_work = FALSE)`

---

## 📋 Certificate Types Monitored

### Vehicles (7 types)
| Certificate | Field Name | Impact |
|-------------|-----------|---------|
| Plate Expiry | `plate_expiry_date` | VOR |
| Insurance | `insurance_expiry_date` | VOR |
| MOT | `mot_date` | VOR |
| Tax | `tax_date` | VOR |
| LOLER | `loler_expiry_date` | VOR |
| First Aid Kit | `first_aid_expiry` | VOR |
| Fire Extinguisher | `fire_extinguisher_expiry` | VOR |

### Drivers (3 types)
| Certificate | Field Name | Impact |
|-------------|-----------|---------|
| TAS Badge | `tas_badge_expiry_date` | Cannot Work |
| Taxi Badge | `taxi_badge_expiry_date` | Cannot Work |
| DBS | `dbs_expiry_date` | Cannot Work |

### Passenger Assistants (2 types)
| Certificate | Field Name | Impact |
|-------------|-----------|---------|
| TAS Badge | `tas_badge_expiry_date` | Cannot Work |
| DBS | `dbs_expiry_date` | Cannot Work |

---

## 🎨 Color Coding

### Filter Tabs
- **📅 30 Days** - Yellow badge - Warning
- **⚠️ 14 Days** - Orange badge - Critical
- **🔴 Expired** - Red badge - Immediate action

### Table Rows
- **Red Row** - Expired (past due date)
- **Orange Row** - Critical (≤ 14 days)
- **Yellow Row** - Warning (≤ 30 days)

### Stat Cards
- **Red Card** - VOR vehicles, Flagged employees, Expired
- **Orange Card** - Certificates expiring in 14 days
- **Yellow Card** - Certificates expiring in 30 days

---

## 🔧 Common Tasks

### Renew a Certificate

1. **Navigate to entity** (vehicle/driver/PA)
2. **Click "Edit"**
3. **Update expiry date** to future date
4. **Save**
5. ✅ Trigger automatically updates status

### Check What's Expiring Today

1. Go to `/dashboard/certificates-expiry?period=14-days`
2. Look for badges showing "0 days" or negative numbers
3. Click entity name to go to edit page

### Find All VOR Vehicles

1. Go to `/dashboard/vehicles?status=off-road`
2. Or click "Vehicles VOR" card on dashboard
3. Table shows all vehicles off-road

### Find Flagged Employees

1. Go to `/dashboard/employees`
2. Filter or search for employees with `can_work = FALSE`
3. Or click "Flagged Employees" card on dashboard

---

## 🔄 Manual Update (If Needed)

If you want to force an update of all flags:

```sql
-- Run in Supabase SQL Editor
SELECT update_expiry_flags();
```

**When to use:**
- After bulk data import
- After manual database changes
- If you suspect flags are out of sync

**Note**: Triggers handle real-time updates automatically, so manual runs are rarely needed.

---

## ⚙️ Optional: Set Up Daily Cron

To ensure flags are updated daily (backup to triggers):

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily at midnight UTC
SELECT cron.schedule(
  'update-expiry-flags',
  '0 0 * * *',
  $$SELECT update_expiry_flags();$$
);

-- Verify
SELECT * FROM cron.job;
```

---

## 🧪 Testing

### Test Automatic VOR
```sql
-- Create a vehicle with expired MOT
UPDATE vehicles 
SET mot_date = '2023-01-01' 
WHERE id = 1;

-- Check if automatically marked VOR
SELECT vehicle_identifier, mot_date, off_the_road 
FROM vehicles 
WHERE id = 1;
-- Should show off_the_road = TRUE
```

### Test Automatic Flagging
```sql
-- Expire a driver's TAS badge
UPDATE drivers 
SET tas_badge_expiry_date = '2023-01-01' 
WHERE employee_id = 1;

-- Check if employee flagged
SELECT first_name, last_name, can_work 
FROM employees 
WHERE id = 1;
-- Should show can_work = FALSE
```

### Test Renewal
```sql
-- Renew the MOT
UPDATE vehicles 
SET mot_date = '2025-12-31' 
WHERE id = 1;

-- Check if VOR cleared
SELECT vehicle_identifier, mot_date, off_the_road 
FROM vehicles 
WHERE id = 1;
-- Should show off_the_road = FALSE (if all other certs valid)
```

---

## 📱 Page Locations

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Main stats overview |
| Certificates | `/dashboard/certificates-expiry` | All expiring certificates |
| 30-Day Filter | `/dashboard/certificates-expiry?period=30-days` | Expiring within 30 days |
| 14-Day Filter | `/dashboard/certificates-expiry?period=14-days` | Critical - within 14 days |
| Expired Filter | `/dashboard/certificates-expiry?period=expired` | Already expired |
| VOR Vehicles | `/dashboard/vehicles?status=off-road` | All VOR vehicles |

---

## 🚨 Troubleshooting

### Problem: Certificate expired but vehicle not VOR
**Solution:**
```sql
-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'trigger_vehicle_expiry_check';

-- If missing, re-run migration
-- If exists, manually run update
SELECT update_expiry_flags();
```

### Problem: No certificates showing in expiry page
**Possible Causes:**
1. All certificates are valid (good!)
2. No expiry dates entered in database
3. Data fetch error (check console)

**Check:**
```sql
-- See which vehicles have expiry dates
SELECT vehicle_identifier, mot_date, insurance_expiry_date 
FROM vehicles 
WHERE mot_date IS NOT NULL OR insurance_expiry_date IS NOT NULL;
```

### Problem: Counts don't match between dashboard and expiry page
**Solution:**
- Dashboard calculates in real-time
- Refresh both pages
- Check if filters are applied correctly

---

## 💡 Pro Tips

### 1. Plan Renewals in Bulk
- Go to "30 Days" tab monthly
- Export or screenshot list
- Batch schedule renewals

### 2. Daily Check
- Review "14 Days" tab daily
- Address critical items first
- Update dates as renewals complete

### 3. Use Links
- Click entity names to go directly to edit page
- Save time navigating

### 4. Monitor Dashboard
- Check dashboard daily for VOR count
- Investigate flagged employees immediately

### 5. Color Signals
- Red = Act now
- Orange = This week
- Yellow = This month

---

## ✅ Success Indicators

**System is working correctly when:**

✅ Expired vehicle certificates automatically set VOR
✅ Expired employee certificates automatically flag employee
✅ Renewed certificates automatically clear flags
✅ Dashboard shows accurate counts
✅ Certificate page displays all expiring items
✅ Color coding helps prioritize actions
✅ Links navigate to correct detail pages

---

## 📞 Quick Reference

### Key Database Objects
- **Column**: `employees.can_work`
- **Function**: `update_expiry_flags()`
- **Triggers**: `trigger_vehicle_expiry_check`, `trigger_driver_expiry_check`, `trigger_pa_expiry_check`

### Key Pages
- **Main**: `/dashboard/certificates-expiry`
- **Dashboard**: `/dashboard` (see Certificate & Compliance section)
- **Sidebar**: "Certificate Expiries" (📅 icon)

### Key Queries
```sql
-- Manual update all flags
SELECT update_expiry_flags();

-- Check VOR vehicles
SELECT * FROM vehicles WHERE off_the_road = TRUE;

-- Check flagged employees
SELECT * FROM employees WHERE can_work = FALSE;
```

---

**🎉 You're all set! The certificate expiry tracking system is ready to use.**

**For detailed information, see:** `CERTIFICATE_EXPIRY_TRACKING_COMPLETE.md`

