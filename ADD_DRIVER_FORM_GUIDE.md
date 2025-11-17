# 🚗 Add Driver Form - Complete Guide

## 📍 Location
**URL:** `/dashboard/drivers/create`
**File:** `app/dashboard/drivers/create/page.tsx`

---

## 🎯 Overview

A comprehensive multi-tab form for registering new drivers with all required certifications, documents, and training records.

---

## ✨ Features

### 1. **Multi-Tab Interface**
Organized into 4 logical sections:
- 👤 **Basic Info** - Employee selection and basic details
- 📜 **Certificates** - All certification expiry dates (10 different certificates)
- 📄 **Documents** - Document checklist (7 items)
- 🎓 **Training** - Training completion records (3 types)

### 2. **File Uploads**
Upload support for:
- TAS Badge certificate
- Taxi Badge certificate
- DBS certificate
- First Aid certificate
- Passport copy
- Driving License
- CPC certificate
- Utility Bill
- Birth Certificate
- Marriage Certificate
- Driver Photo
- Private Hire Badge
- Paper Licence
- Taxi Plate Photo
- Logbook

**Total: 15 upload fields**

Files are uploaded to Supabase Storage bucket: `driver-documents`

### 3. **Smart Employee Selection**
- Only shows **Active** employees
- **Excludes** employees who are already drivers
- Prevents duplicate driver entries

### 4. **Conditional Fields**
Training completion dates only show when checkbox is checked

### 5. **Navy Theme Styling**
- Navy blue headers on cards
- Navy colored buttons
- Consistent with dashboard theme

---

## 📋 Form Fields

### Basic Info Tab

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Employee | Dropdown | ✅ | Select from active employees not yet registered as drivers |
| PSV License | Checkbox | | Public Service Vehicle license status |
| Additional Notes | Textarea | | HR comments or special notes |

### Certificates Tab (10 Certificates)

| Certificate | Fields | Upload Support |
|------------|--------|----------------|
| **TAS Badge** | Badge Number, Expiry Date | ✅ |
| **Taxi Badge** | Badge Number, Expiry Date | ✅ |
| **DBS Certificate** | Expiry Date | ✅ |
| **First Aid Certificate** | Expiry Date | ✅ |
| **Passport** | Expiry Date | ✅ |
| **Driving License** | Expiry Date | ✅ |
| **CPC Certificate** | Expiry Date | ✅ |
| **Utility Bill** | Date | ✅ |
| **Vehicle Insurance** | Expiry Date | |
| **MOT** | Expiry Date | |

### Documents Tab (7 Documents)

| Document | Checkbox | Upload Support |
|----------|----------|----------------|
| Birth Certificate | ✅ | ✅ |
| Marriage Certificate | ✅ | ✅ |
| Photo Taken | ✅ | ✅ |
| Private Hire Badge | ✅ | ✅ |
| Paper Licence | ✅ | ✅ |
| Taxi Plate Photo | ✅ | ✅ |
| Logbook | ✅ | ✅ |

### Training Tab (3 Training Types)

| Training | Fields |
|----------|--------|
| **Safeguarding Training** | Completed (checkbox), Completion Date |
| **TAS PATS Training** | Completed (checkbox), Completion Date |
| **PSA Training** | Completed (checkbox), Completion Date |

---

## 🎨 UI Design

### Layout
```
┌──────────────────────────────────────┐
│  Add New Driver         [Back]       │
├──────────────────────────────────────┤
│  👤 Basic Info | 📜 Certificates      │
│  📄 Documents  | 🎓 Training          │
├──────────────────────────────────────┤
│  [Tab Content]                       │
│                                      │
│  [Form Fields...]                    │
│                                      │
├──────────────────────────────────────┤
│              [Cancel] [Create Driver]│
└──────────────────────────────────────┘
```

### Color Scheme
- **Navy (#1e3a8a):** Headers, buttons, active tabs
- **White:** Card backgrounds
- **Gray shades:** Borders, inactive states
- **Green/Red/Orange:** Status indicators

---

## 💾 File Upload System

### Supabase Storage Structure
```
driver-documents/
  └── {employee_id}/
      ├── tas_badge_file_1234567890.pdf
      ├── taxi_badge_file_1234567890.pdf
      ├── dbs_file_1234567890.pdf
      └── ...
```

### Accepted File Types
- PDF documents (`.pdf`)
- Images (`.jpg`, `.jpeg`, `.png`)

### File Naming Convention
```
{field_name}_{timestamp}.{extension}
```

Example: `tas_badge_file_1700000000000.pdf`

---

## 🔄 Form Flow

### 1. **Load Employees**
```typescript
// Fetches active employees who are not already drivers
const availableEmployees = employees.filter(
  emp => !existingDriverIds.includes(emp.id)
)
```

### 2. **Fill Form**
User navigates through tabs filling in:
- Employee selection (required)
- Certificate details
- Document checklist
- Training records

### 3. **Upload Files (Optional)**
For each document with upload support:
- Select file
- File stored in state
- Uploaded on form submission

### 4. **Submit**
```typescript
1. Upload files to Supabase Storage
2. Get public URLs for uploaded files
3. Insert driver record with all data
4. Redirect to drivers list
```

---

## 🚀 Usage Instructions

### For HR/Administrators:

1. **Navigate to Drivers Page**
   - Go to `/dashboard/drivers`
   - Click "Add Driver" button

2. **Basic Info Tab**
   - Select employee from dropdown
   - Check PSV License if applicable
   - Add any HR notes

3. **Certificates Tab**
   - Fill in badge numbers
   - Set expiry dates for all relevant certificates
   - Upload certificate scans/photos
   - **Important:** Set accurate expiry dates to trigger auto-flagging

4. **Documents Tab**
   - Check boxes for documents received
   - Upload scans where available

5. **Training Tab**
   - Check completed training
   - Set completion dates

6. **Submit**
   - Review all information
   - Click "Create Driver"
   - System will validate and save

---

## ⚠️ Important Notes

### Certificate Expiry Auto-Flagging
When any certificate expires:
- Driver automatically flagged as `can_work = FALSE`
- Appears in "Cannot Work" status
- Shows in Certificate Expiry Dashboard
- Daily cron job (`update_expiry_flags()`) maintains status

### Required Fields
- **Employee selection is mandatory**
- All other fields are optional
- Best practice: Fill in all available information

### File Upload Limits
- Max file size: 50MB (Supabase default)
- Consider compressing large files
- PDFs preferred for certificates

---

## 🔗 Integration

### Database Tables
- **Primary:** `drivers` table
- **Foreign Key:** `employee_id` → `employees.id`
- **Storage:** `driver-documents` bucket

### Related Features
- **Certificate Tracking:** Automatic expiry monitoring
- **Dashboard Stats:** Counts in main dashboard
- **Employee Management:** Links to employee records
- **Expiry Alerts:** Shows in certificate dashboard

---

## 🐛 Troubleshooting

### "Please select an employee"
- Employee field is required
- Select from dropdown before submitting

### No employees in dropdown
- All active employees may already be drivers
- Check employee status in Employees page
- Ensure employees are marked as "Active"

### File upload fails
- Check file size (< 50MB)
- Verify file type (PDF, JPG, PNG only)
- Ensure Supabase Storage bucket `driver-documents` exists
- Check bucket is public or has correct RLS policies

### Form doesn't submit
- Check browser console for errors
- Verify Supabase connection
- Ensure all required fields filled

---

## 📊 Database Schema

### drivers table
```sql
CREATE TABLE drivers (
  employee_id INTEGER PRIMARY KEY REFERENCES employees(id),
  tas_badge_number VARCHAR,
  tas_badge_expiry_date DATE,
  taxi_badge_number VARCHAR,
  taxi_badge_expiry_date DATE,
  dbs_expiry_date DATE,
  psv_license BOOLEAN,
  first_aid_certificate_expiry_date DATE,
  passport_expiry_date DATE,
  driving_license_expiry_date DATE,
  cpc_expiry_date DATE,
  utility_bill_date DATE,
  vehicle_insurance_expiry_date DATE,
  mot_expiry_date DATE,
  birth_certificate BOOLEAN,
  marriage_certificate BOOLEAN,
  photo_taken BOOLEAN,
  private_hire_badge BOOLEAN,
  paper_licence BOOLEAN,
  taxi_plate_photo BOOLEAN,
  logbook BOOLEAN,
  safeguarding_training_completed BOOLEAN,
  safeguarding_training_date DATE,
  tas_pats_training_completed BOOLEAN,
  tas_pats_training_date DATE,
  psa_training_completed BOOLEAN,
  psa_training_date DATE,
  additional_notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Future Enhancements

### Potential Improvements:
1. **Bulk Upload:** Upload multiple certificates at once
2. **Auto-Fill:** Pull data from existing systems
3. **Validation:** Check badge number formats
4. **Reminders:** Email alerts for expiring certificates
5. **OCR:** Auto-extract dates from uploaded documents
6. **Templates:** Pre-fill common combinations
7. **Progress Save:** Save draft and continue later

---

## ✅ Checklist for HR

When adding a new driver:

- [ ] Employee selected
- [ ] TAS Badge number and expiry entered
- [ ] Taxi Badge number and expiry entered
- [ ] DBS expiry entered
- [ ] Driving License expiry entered
- [ ] CPC expiry entered (if applicable)
- [ ] First Aid certificate uploaded
- [ ] All relevant documents checked
- [ ] Safeguarding training recorded
- [ ] Additional notes added (if any)
- [ ] Form submitted successfully
- [ ] Verify driver appears in drivers list
- [ ] Check certificate expiry dashboard

---

## 📱 Responsive Design

- **Desktop:** Full multi-column layout
- **Tablet:** 2-column grid for forms
- **Mobile:** Single column stacked layout
- All tabs accessible via horizontal scroll
- File upload buttons responsive

---

## 🔐 Security

- **Authentication:** Requires login
- **RLS Policies:** Enforced on database level
- **File Access:** Controlled via Supabase Storage
- **Validation:** Server-side and client-side
- **Error Handling:** Secure error messages

---

**🎉 Form Complete!**

This comprehensive driver registration form ensures all required information is captured systematically while providing a smooth user experience for HR administrators.

**Access:** `/dashboard/drivers/create`

