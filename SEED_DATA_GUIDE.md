# 🌱 Seed Data Guide - Certificate Tracking Demo

## 🎯 Overview

The seed data creates a complete demonstration of the certificate tracking system with various expiry statuses, showing all the different states and visual indicators.

---

## 📊 What's Included

### 👥 **8 Employees** (5 Drivers + 3 Passenger Assistants)

### 🚗 **5 Drivers** with Different Certificate Statuses:

#### 1. **John Smith** ✅ ALL VALID
- **Status:** Authorized to work
- All 10 certificates valid (30+ days)
- All documents complete
- All training completed
- **Use to see:** Green badges, complete compliance

#### 2. **Sarah Johnson** ❌ EXPIRED
- **Status:** CANNOT WORK (Red banner)
- **Expired:** DBS Certificate (15 days overdue)
- Other certificates mixed status
- Missing some documents
- TAS PATS training not completed
- **Use to see:** Red "CANNOT WORK" badge, expired certificate handling

#### 3. **Michael Brown** ⚠️ CRITICAL (14 Days)
- **Status:** Authorized (but urgent action needed)
- **Critical:** TAS Badge (10 days), First Aid (12 days)
- Other certificates valid
- All documents complete
- **Use to see:** Orange badges for 14-day warnings

#### 4. **Emma Davis** 🟡 WARNING (30 Days)
- **Status:** Authorized
- **Warning:** Taxi Badge (25 days), Passport (28 days), CPC (22 days)
- Other certificates valid
- PSA training not completed
- **Use to see:** Yellow badges for 30-day warnings

#### 5. **David Anderson** 📋 INCOMPLETE
- **Status:** Authorized
- All certificates valid
- **Missing:** Marriage certificate, Taxi plate photo
- **Missing:** TAS PATS and PSA training
- **Use to see:** Document checklist with incomplete items

---

### 👥 **3 Passenger Assistants:**

#### 1. **James Wilson** ✅ ALL VALID
- **Status:** Authorized
- All certificates valid
- **Use to see:** PA certificates display

#### 2. **Lisa Taylor** ❌ EXPIRED
- **Status:** CANNOT WORK (Red banner)
- **Expired:** TAS Badge (20 days overdue)
- **Use to see:** PA with expired certificate

#### 3. **Sophie Martin** ⚠️ CRITICAL
- **Status:** Authorized
- **Critical:** DBS (13 days)
- **Use to see:** PA with critical certificate

---

### 🚙 **5 Vehicles** with Different Statuses:

#### 1. **VAN-001** (AB12 CDE) ✅ ALL VALID
- **Status:** Operational
- All 7 certificates valid
- **Use to see:** Green vehicle status

#### 2. **VAN-002** (CD34 EFG) ❌ VOR
- **Status:** Vehicle Off Road
- **Expired:** MOT (10 days overdue)
- **Use to see:** Red VOR badge, automatic flagging

#### 3. **VAN-003** (EF56 GHI) ⚠️ CRITICAL
- **Status:** Operational (urgent renewal needed)
- **Critical:** Insurance (12 days), Tax (13 days)
- **Use to see:** Orange badges for vehicle certificates

#### 4. **SPARE-001** (GH78 IJK) 🅿️ SPARE
- **Status:** Spare vehicle, available
- All certificates valid
- No location logged
- **Use to see:** Spare vehicle without location

#### 5. **SPARE-002** (IJ90 KLM) 📍 SPARE + LOCATION
- **Status:** Spare vehicle with location
- All certificates valid
- Location: Main Depot - Bay 3
- **Use to see:** Spare vehicle with tracked location

---

## 🚀 How to Use the Seed Data

### Step 1: Apply Migrations First
```bash
# Make sure all migrations are applied
supabase db push
```

### Step 2: Run the Seed Script
```sql
-- In Supabase SQL Editor, paste and run:
-- supabase/seed_certificate_demo.sql
```

### Step 3: Verify
```sql
-- Check employees
SELECT full_name, can_work FROM employees;

-- Check flagged employees (should see 2: Sarah Johnson, Lisa Taylor)
SELECT full_name, can_work FROM employees WHERE can_work = FALSE;

-- Check VOR vehicles (should see 1: VAN-002)
SELECT vehicle_identifier, off_the_road FROM vehicles WHERE off_the_road = TRUE;
```

---

## 📱 What to Check in the Dashboard

### 1. **Main Dashboard** (`/dashboard`)
- ✅ See stats cards with counts
- ✅ "Flagged Employees" card shows: **2**
- ✅ "Vehicles VOR" card shows: **1**
- ✅ "Certificates Expiring (14 Days)" shows multiple
- ✅ "Certificates Expiring (30 Days)" shows multiple

### 2. **Employees List** (`/dashboard/employees`)
- ✅ See **Sarah Johnson** with red "CANNOT WORK" badge
- ✅ See **John Smith** with green "Authorized" badge
- ✅ See certificate status badges (Red/Orange/Yellow/Green)
- ✅ Click "View" on any employee to see all certificates

### 3. **Drivers List** (`/dashboard/drivers`)
- ✅ See "Can Work" column with status
- ✅ See **Sarah Johnson** flagged
- ✅ Click "View" on any driver to see driver detail page with tabs

### 4. **Passenger Assistants** (`/dashboard/assistants`)
- ✅ See **Lisa Taylor** with red "CANNOT WORK" badge
- ✅ See other PAs with various statuses

### 5. **Vehicles List** (`/dashboard/vehicles`)
- ✅ See **VAN-002** with red "VOR" badge
- ✅ Filter by "VOR" status
- ✅ See spare vehicles

### 6. **Certificate Expiry Dashboard** (`/dashboard/certificates-expiry`)
- ✅ **Expired Tab:** See Sarah Johnson, Lisa Taylor, VAN-002
- ✅ **14 Days Tab:** See Michael Brown, Sophie Martin, VAN-003
- ✅ **30 Days Tab:** See Emma Davis
- ✅ Color-coded rows (Red/Orange/Yellow)

### 7. **Driver Detail Page** (`/dashboard/drivers/{id}`)
Click on any driver to see:
- ✅ **Overview Tab:** Key certificates summary
- ✅ **Documentation Tab:** Full certificate table, document checklist
- ✅ **Training Tab:** Training compliance status

### 8. **Employee Detail Page** (`/dashboard/employees/{id}`)
Click on employees to see:
- ✅ Warning banner for flagged employees
- ✅ All 10 certificates in table format
- ✅ Document checklist (for drivers)
- ✅ Training status (for drivers)
- ✅ Additional notes

### 9. **Spare Vehicle Locations** (`/dashboard/vehicle-locations`)
- ✅ See SPARE-002 with location
- ✅ See location details (Main Depot - Bay 3)

---

## 🎨 Visual Elements to Check

### Color-Coded Badges:
- 🔴 **Red:** Expired certificates, CANNOT WORK, VOR
- 🟠 **Orange:** Critical (≤ 14 days)
- 🟡 **Yellow:** Warning (≤ 30 days)
- 🟢 **Green:** Valid (> 30 days)

### Status Indicators:
- ❌ **XCircle icon:** Expired/Cannot work
- ⚠️ **AlertTriangle icon:** Critical
- 🕐 **Clock icon:** Warning
- ✅ **CheckCircle icon:** Valid

### Training Badges:
- ✅ Green "Completed"
- ❌ Red "Not Completed"

### Document Checklist:
- ✓ Green "Yes"
- ✗ Gray "No"

---

## 🧪 Testing Scenarios

### Test Automatic Flagging:
1. View Sarah Johnson in employees list → See "CANNOT WORK"
2. View Sarah Johnson detail → See red warning banner
3. Navigate to Certificate Expiry → See Sarah in "Expired" tab
4. Check she appears with expired DBS certificate

### Test Critical Alerts:
1. View Michael Brown → See orange "< 14 Days" badges
2. Navigate to Certificate Expiry → 14 Days tab
3. See Michael listed with critical certificates

### Test VOR Status:
1. View vehicles list → See VAN-002 with "VOR" badge
2. Filter by "VOR" → Only VAN-002 appears
3. Navigate to Certificate Expiry → See VAN-002 in "Expired" tab

### Test Spare Vehicles:
1. Navigate to Spare Vehicle Locations
2. See SPARE-002 with location details
3. Check dashboard stats show spare vehicle counts

### Test Driver Detail Tabs:
1. Click "View" on John Smith
2. Navigate through Overview/Documentation/Training tabs
3. See all certificates, documents, and training status

---

## 📋 Sample Data Summary

| Category | Count | Details |
|----------|-------|---------|
| **Total Employees** | 8 | 5 Drivers + 3 PAs |
| **Flagged Employees** | 2 | Sarah Johnson, Lisa Taylor |
| **Total Vehicles** | 5 | 3 Active + 2 Spare |
| **VOR Vehicles** | 1 | VAN-002 (Expired MOT) |
| **Spare Vehicles** | 2 | SPARE-001, SPARE-002 |
| **Vehicles with Location** | 1 | SPARE-002 |
| **Expired Certificates** | 3 | Sarah DBS, Lisa TAS, VAN-002 MOT |
| **Critical Certificates** | 5 | Michael (2), Sophie (1), VAN-003 (2) |
| **Warning Certificates** | 3 | Emma (3) |

---

## 🎯 What This Demonstrates

✅ **Automatic Flagging:** Expired certificates instantly flag employees/vehicles  
✅ **Color Coding:** Visual status indicators across all pages  
✅ **Warning System:** 30-day and 14-day advance warnings  
✅ **Complete Tracking:** All 10 driver certificates + documents + training  
✅ **Dashboard Stats:** Real-time compliance overview  
✅ **Certificate Dashboard:** Centralized expiry management  
✅ **Spare Vehicle Tracking:** Location management for spare vehicles  
✅ **VOR Management:** Automatic vehicle off-road flagging  
✅ **Comprehensive Views:** All certificate details in one place  

---

## 🔄 Reset Data

If you want to start fresh:

```sql
-- Clear all seed data
TRUNCATE TABLE vehicle_locations CASCADE;
TRUNCATE TABLE passenger_assistants CASCADE;
TRUNCATE TABLE drivers CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE schools CASCADE;

-- Then re-run the seed script
```

---

**🎉 Seed Data Complete!**

Navigate to `/dashboard` and explore all the features with realistic, varied data demonstrating every status and scenario!

