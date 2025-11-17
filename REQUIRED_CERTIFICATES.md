# 📋 Required Certificates Policy

## ⚠️ Important: NULL Dates = Cannot Work

**New Policy:** Employees **cannot be authorized to work** if required certificate dates are **NULL (not set)** or **expired**.

---

## 🎯 Required Certificates

### For Drivers (3 Required):
1. ✅ **TAS Badge** - `tas_badge_expiry_date`
2. ✅ **Taxi Badge** - `taxi_badge_expiry_date`
3. ✅ **DBS Certificate** - `dbs_expiry_date`

### For Passenger Assistants (2 Required):
1. ✅ **TAS Badge** - `tas_badge_expiry_date`
2. ✅ **DBS Certificate** - `dbs_expiry_date`

---

## 🚫 Cannot Work If:

### Scenario 1: Missing Dates (NULL)
```sql
-- Driver with NULL certificate
tas_badge_expiry_date = NULL      ❌ CANNOT WORK
taxi_badge_expiry_date = '2025-12-31'  ✅ Valid
dbs_expiry_date = '2025-06-30'         ✅ Valid

Result: can_work = FALSE
Reason: TAS Badge date is missing
```

### Scenario 2: Expired Dates
```sql
-- Driver with expired certificate
tas_badge_expiry_date = '2024-01-15'   ❌ EXPIRED
taxi_badge_expiry_date = '2025-12-31'  ✅ Valid
dbs_expiry_date = '2025-06-30'         ✅ Valid

Result: can_work = FALSE
Reason: TAS Badge is expired
```

### Scenario 3: Both NULL and Expired
```sql
-- Driver with mixed issues
tas_badge_expiry_date = NULL           ❌ MISSING
taxi_badge_expiry_date = '2024-01-01'  ❌ EXPIRED
dbs_expiry_date = '2025-06-30'         ✅ Valid

Result: can_work = FALSE
Reason: Multiple issues (NULL + Expired)
```

---

## ✅ Can Work If:

### All Required Certificates Present AND Valid
```sql
-- Driver with all required certs
tas_badge_expiry_date = '2025-08-15'   ✅ Valid future date
taxi_badge_expiry_date = '2025-12-31'  ✅ Valid future date
dbs_expiry_date = '2025-06-30'         ✅ Valid future date

Result: can_work = TRUE
Reason: All required certificates set and valid
```

---

## 🔄 Automatic Flagging

### When Flags Are Updated:

#### 1. **On Driver/PA Creation**
```sql
INSERT INTO drivers (employee_id, tas_badge_expiry_date, ...)
-- Trigger runs immediately
-- If any required date is NULL → can_work = FALSE
```

#### 2. **On Driver/PA Update**
```sql
UPDATE drivers SET dbs_expiry_date = NULL WHERE employee_id = 123
-- Trigger runs immediately
-- Employee 123 flagged: can_work = FALSE
```

#### 3. **Daily Cron Job**
```sql
-- Runs every day at midnight
SELECT cron.schedule('update-expiry-flags', '0 0 * * *', 
  'SELECT update_expiry_flags();'
);
```

#### 4. **Manual Execution**
```sql
-- Run manually anytime
SELECT update_expiry_flags();
```

---

## 📊 Status Display

### In Drivers/PAs Tables:

**Cannot Work (NULL dates):**
```
John Smith | Driver | Active | ❌ CANNOT WORK
                                 Expired: TAS Badge, Taxi Badge
```

**Cannot Work (Missing dates):**
```
Sarah Jones | Driver | Active | ❌ CANNOT WORK
                                  Missing: TAS Badge, DBS
```

**Authorized:**
```
Mike Brown | Driver | Active | ✅ Authorized
```

---

## 🎨 UI Indicators

### Employees/Drivers/PAs Lists:

#### Red Flag - Cannot Work:
- **Badge:** Red background, white text
- **Icon:** ❌ XCircle
- **Text:** "CANNOT WORK"
- **Details:** Shows which certificates are expired/missing

#### Green Check - Authorized:
- **Badge:** Green background, white text
- **Icon:** ✅ CheckCircle
- **Text:** "Authorized"

---

## 💡 Best Practices

### For HR/Administrators:

1. **Always Set Dates When Adding Drivers**
   - Enter all required certificate dates
   - Don't leave required fields blank
   - Use actual expiry dates from certificates

2. **Review "Cannot Work" Status**
   - Check Certificate Expiry Dashboard regularly
   - Contact employees to renew certificates
   - Update dates as soon as renewed

3. **Before Assigning Routes**
   - Verify driver is "Authorized"
   - Check certificate expiry dates
   - Ensure adequate time before expiry

4. **Proactive Renewal**
   - Monitor 30-day expiry alerts
   - Start renewal process at 14-day warning
   - Don't wait until certificates expire

---

## 🔍 How to Fix "Cannot Work" Status

### Step 1: Identify the Issue
Go to:
- `/dashboard/drivers` or `/dashboard/assistants`
- Look for "CANNOT WORK" badge
- Note which certificates are expired/missing

### Step 2: Obtain/Renew Certificates
- Contact employee for updated certificates
- Process renewals through proper channels
- Scan/upload new certificates

### Step 3: Update System
- Go to employee detail page
- Click "Edit"
- Enter new expiry dates for required certificates
- Upload scanned certificates
- Save changes

### Step 4: Verify Status Change
- Status automatically updates via trigger
- Should now show "✅ Authorized"
- Employee can be assigned to routes

---

## 📝 Database Logic

### Update Function (Simplified):
```sql
-- Flag as cannot work if:
UPDATE employees SET can_work = FALSE
WHERE id IN (
  SELECT employee_id FROM drivers
  WHERE 
    tas_badge_expiry_date IS NULL OR      -- Missing
    taxi_badge_expiry_date IS NULL OR     -- Missing
    dbs_expiry_date IS NULL OR            -- Missing
    tas_badge_expiry_date < CURRENT_DATE OR   -- Expired
    taxi_badge_expiry_date < CURRENT_DATE OR  -- Expired
    dbs_expiry_date < CURRENT_DATE            -- Expired
)

-- Unflag (allow work) if:
UPDATE employees SET can_work = TRUE
WHERE id IN (
  SELECT employee_id FROM drivers
  WHERE 
    tas_badge_expiry_date IS NOT NULL AND     -- Set
    taxi_badge_expiry_date IS NOT NULL AND    -- Set
    dbs_expiry_date IS NOT NULL AND           -- Set
    tas_badge_expiry_date >= CURRENT_DATE AND -- Valid
    taxi_badge_expiry_date >= CURRENT_DATE AND-- Valid
    dbs_expiry_date >= CURRENT_DATE           -- Valid
)
```

---

## 🚀 Migration Applied

### File: `009_require_certificate_dates.sql`

**Changes:**
1. ✅ Updated `update_expiry_flags()` function
2. ✅ Updated `trigger_update_driver_expiry()` function
3. ✅ Updated `trigger_update_pa_expiry()` function
4. ✅ Added NULL checks for required certificates
5. ✅ Ran immediate update to flag existing records

---

## 📊 Impact

### Existing Drivers/PAs:
- **Immediately flagged** if missing required dates
- **Immediately flagged** if expired certificates
- Shows in "Cannot Work" status
- Visible in Certificate Expiry Dashboard

### New Drivers/PAs:
- **Must have** required dates to be authorized
- Form validation should enforce this
- Cannot be added without dates (recommended)

---

## ✅ Checklist for Authorization

### Driver Checklist:
- [ ] TAS Badge expiry date **set**
- [ ] TAS Badge expiry date **in future**
- [ ] Taxi Badge expiry date **set**
- [ ] Taxi Badge expiry date **in future**
- [ ] DBS expiry date **set**
- [ ] DBS expiry date **in future**
- [ ] Status shows "✅ Authorized"

### PA Checklist:
- [ ] TAS Badge expiry date **set**
- [ ] TAS Badge expiry date **in future**
- [ ] DBS expiry date **set**
- [ ] DBS expiry date **in future**
- [ ] Status shows "✅ Authorized"

---

## 🎯 Benefits

### Compliance:
✅ Ensures all drivers/PAs have valid certificates
✅ Prevents unauthorized personnel from working
✅ Maintains legal compliance requirements
✅ Audit trail of certificate validity

### Safety:
✅ Only authorized personnel work with passengers
✅ All background checks (DBS) current
✅ Professional qualifications (badges) verified
✅ Reduces liability risks

### Operations:
✅ Clear visibility of workforce availability
✅ Proactive certificate renewal reminders
✅ Automated status management
✅ Accurate route assignment capabilities

---

## 📚 Related Features

- **Certificate Expiry Dashboard** - View all expiring certificates
- **Daily Cron Job** - Automatic status updates
- **Employee Detail Pages** - Shows all certificate dates
- **Driver/PA Lists** - Displays can_work status
- **Add Driver Form** - Enter all required dates

---

## 🎉 Result

**Now: Zero-tolerance policy for missing or expired required certificates!**

- Drivers need 3 certificates (TAS, Taxi, DBS)
- PAs need 2 certificates (TAS, DBS)
- All must be **set** (not NULL)
- All must be **valid** (future dates)
- Automatic flagging enforced
- Clear UI indicators

**Safety and compliance first!** 🛡️✨

---

**Migration:** `009_require_certificate_dates.sql`
**Status:** Ready to deploy

