# ✅ Expired Certificate Display Update

## 🎯 Overview

Updated all employee tables to show **which specific certificates are expired** for employees who cannot work, making it immediately clear what needs to be renewed.

---

## 📊 What Changed

### Before:
```
CANNOT WORK
```
Just showed the status, no details on what's expired.

### After:
```
CANNOT WORK
Expired: DBS, First Aid, Passport
```
Now shows **exactly which certificates** are expired!

---

## 🖥️ Updated Pages

### 1. **Employees List** (`/dashboard/employees`)
- Shows "CANNOT WORK" badge
- **New:** Lists all expired certificates below the badge
- Example: "Expired: DBS, First Aid"

### 2. **Drivers List** (`/dashboard/drivers`)
- Shows "CANNOT WORK" badge
- **New:** Lists all expired driver certificates
- Checks all 9 certificate fields
- Example: "Expired: TAS Badge, CPC, MOT"

### 3. **Passenger Assistants** (`/dashboard/assistants`)
- Shows "CANNOT WORK" badge
- **New:** Lists expired PA certificates
- Checks TAS Badge and DBS
- Example: "Expired: TAS Badge"

---

## 🔍 Certificates Checked

### For Drivers (9 certificates):
1. TAS Badge
2. Taxi Badge
3. DBS
4. First Aid Certificate
5. Passport
6. Driving License
7. CPC (Certificate of Professional Competence)
8. Vehicle Insurance
9. MOT

### For Passenger Assistants (2 certificates):
1. TAS Badge
2. DBS

---

## 🎨 Visual Design

### "Can Work" Column Display:

#### Authorized Employees:
```
✅ Authorized
[Green badge, single line]
```

#### Flagged Employees (CANNOT WORK):
```
❌ CANNOT WORK
Expired: DBS, First Aid
[Red badge with small red text below showing expired certificates]
```

**Styling:**
- Main badge: Bold, red background (`bg-red-100 text-red-800`)
- Expired list: Small red text (`text-xs text-red-700 font-medium`)
- Certificates separated by commas
- Displayed directly under the badge

---

## 📋 Example Output

### Employee with Multiple Expired Certificates:
```
John Smith | Driver | Active | ❌ CANNOT WORK
                                 Expired: DBS, CPC
```

### Employee with Single Expired Certificate:
```
Sarah Johnson | Driver | Active | ❌ CANNOT WORK
                                   Expired: TAS Badge
```

### Employee with Valid Certificates:
```
Michael Brown | Driver | Active | ✅ Authorized
```

---

## 🚀 Benefits

### ✅ **Instant Identification**
- See exactly what's expired without clicking
- No need to navigate to detail pages

### ✅ **Faster Action**
- Know immediately which certificates to renew
- Prioritize multiple renewals

### ✅ **Better Workflow**
- HR can prepare renewal paperwork instantly
- Drivers know what to bring to renewal appointments

### ✅ **Clear Communication**
- No ambiguity about why someone can't work
- Specific actionable information

---

## 🧪 Testing with Seed Data

Using the seed data script, you'll see:

### **Sarah Johnson** (Driver):
```
CANNOT WORK
Expired: DBS
```

### **Lisa Taylor** (PA):
```
CANNOT WORK
Expired: TAS Badge
```

### Multiple Expired (Example):
If an employee had multiple expired certificates:
```
CANNOT WORK
Expired: DBS, First Aid, Passport
```

---

## 📁 Files Modified

1. **`app/dashboard/employees/page.tsx`**
   - Updated `getCertificateStatus()` function to track expired certificates
   - Added `expiredCerts` array to return value
   - Updated display to show expired certificate list
   - Added query for all new driver certificate fields

2. **`app/dashboard/drivers/page.tsx`**
   - Added `getExpiredCertificates()` helper function
   - Checks all 9 driver certificate fields
   - Updated display with expired certificate list

3. **`app/dashboard/assistants/page.tsx`**
   - Added `getExpiredCertificates()` helper function
   - Checks TAS Badge and DBS
   - Updated display with expired certificate list

---

## 🔄 How It Works

### Logic Flow:
1. Fetch employee with all certificate data
2. For each certificate field, check if expired (date < today)
3. Add expired certificate names to array
4. Display array as comma-separated list under badge

### Code Example:
```typescript
const checkDate = (date: string | null, certName: string) => {
  if (!date) return
  const expiry = new Date(date)
  if (expiry < today) {
    expiredCerts.push(certName)
  }
}

checkDate(driver.dbs_expiry_date, 'DBS')
checkDate(driver.first_aid_certificate_expiry_date, 'First Aid')
// ... check all certificates

// Display:
{expiredCerts.length > 0 && (
  <div className="text-xs text-red-700 font-medium">
    Expired: {expiredCerts.join(', ')}
  </div>
)}
```

---

## 🎯 Result

**Before:** "This person can't work... but why?"  
**After:** "This person can't work because their DBS and First Aid certificates expired!"

**Instant clarity. Actionable information. Better UX.** ✅

---

## 📚 Related Documentation

- **Certificate Tracking System:** `CERTIFICATE_TRACKING_COMPLETE.md`
- **Can Work Visibility:** `CAN_WORK_VISIBILITY_UPDATE.md`
- **Seed Data Guide:** `SEED_DATA_GUIDE.md`

---

**🎉 Update Complete!**

Now when employees are flagged as "CANNOT WORK", you immediately see which specific certificates need to be renewed!

