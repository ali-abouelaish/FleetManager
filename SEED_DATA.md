# Seed Data Guide

## 📊 Overview

The seed data file creates realistic dummy data for testing your Fleet Admin Dashboard. After running the seed script, you'll have a fully populated system ready to explore.

## 🗃️ What Gets Created

### **15 Employees**
- **7 Drivers**: John Smith, Michael Brown, David Wilson, James Anderson, Maria Garcia, Patricia White, Linda Clark
- **6 Passenger Assistants**: Sarah Johnson, Emily Davis, Lisa Martinez, Jennifer Taylor, William Lee, Christopher Harris
- **1 Admin**: Robert Thomas
- **1 Other**: Daniel Lewis

### **5 Schools**
- Greenfield Primary School
- Riverside Secondary School
- Meadowbrook Special School
- Oakwood Academy
- Sunnydale High School

### **8 Routes**
- R-101, R-102 (Greenfield Primary)
- R-201, R-202 (Riverside Secondary)
- R-301, R-302 (Meadowbrook Special)
- R-401 (Oakwood Academy)
- R-501 (Sunnydale High)

### **8 Vehicles**
- VAN-001 through VAN-008
- Mix of Ford, Mercedes, Volkswagen, Peugeot, and Renault
- Various types: Minibus, Van
- Different ownership: Owned, Leased, Rented
- Includes wheelchair accessible vehicles
- One spare vehicle and one off-road vehicle

### **15 Passengers**
- Distributed across all schools and routes
- Various mobility types: Ambulant, Wheelchair, Walker
- Some with SEN requirements (Autism, ADHD, Cerebral Palsy, etc.)
- Realistic names, addresses, and seat assignments

### **10 Parent Contacts**
- Linked to passengers
- Mix of mothers, fathers, and guardians
- Contact information and relationships

### **8 Crew Assignments**
- Each route assigned a driver and passenger assistant
- Linked to specific schools

### **12 Route Points**
- Multiple stops per route
- Includes coordinates (latitude/longitude)
- Ordered stop sequences

### **8 Vehicle Configurations**
- Seat counts ranging from 6 to 20
- Wheelchair capacity information

### **7 Vehicle Assignments**
- Active vehicle-to-driver assignments
- One historical assignment

### **5 Next of Kin Records**
- Emergency contacts for key employees

### **6 Incidents**
- Mix of resolved and open incidents
- Types: Breakdown, Safety Issue, Accident, Complaint
- Realistic descriptions and timestamps

### **6 Documents**
- Metadata for various certificates and licenses
- DBS certificates, driving licenses, badges

## 🚀 How to Use

### Step 1: Run the Initial Schema
Make sure you've already run `001_initial_schema.sql` first.

### Step 2: Run the Seed Data Script

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/002_seed_data.sql`
4. Paste and click **Run**
5. Wait for completion message

**Option B: Via Supabase CLI** (if you have it installed)
```bash
supabase db push
```

### Step 3: Sign Up & Explore
1. Go to your app at http://localhost:3000
2. Sign up with any email (e.g., `admin@test.com`)
3. Explore the populated dashboard!

## 📍 Key Test Scenarios

### **Scenario 1: View School Relationships**
1. Go to **Schools** → Click "Greenfield Primary School"
2. See 2 routes (R-101, R-102)
3. View crew assigned to each route
4. See passengers on those routes

### **Scenario 2: Check Vehicle Fleet**
1. Go to **Vehicles**
2. See 8 vehicles with different statuses
3. Find VAN-006 marked as "Off Road"
4. View VAN-005 marked as "Spare"

### **Scenario 3: Review Incidents**
1. Go to **Incidents**
2. See 6 incidents (some resolved, some open)
3. Click on incident #3 (accident) to view details
4. Note it's still unresolved

### **Scenario 4: Explore Passengers**
1. Go to **Passengers**
2. See 15 students with various needs
3. Find wheelchair users (Emma Wilson, Mason Rodriguez, Lucas Harris)
4. View their SEN requirements

### **Scenario 5: Check Driver Certifications**
1. Go to **Drivers**
2. See all drivers with badge expiry dates
3. Note some badges expiring in different months
4. Check DBS expiry dates

### **Scenario 6: View Route Details**
1. Go to **Routes** → Click "R-301"
2. See assigned crew (driver + PA)
3. View passengers on this route
4. See route points with coordinates

## 🎯 Testing CRUD Operations

### **Create**
- Add a new passenger to an existing route
- Create a new incident
- Add a new school

### **Update**
- Edit an employee's status
- Update a vehicle's MOT date
- Change a passenger's seat number

### **Delete**
- Remove a route point
- Delete a test passenger you created

All operations will be logged in the **Audit Log**!

## 🔍 Verification Queries

Run these in Supabase SQL Editor to verify data:

```sql
-- Count all records
SELECT 
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM schools) as schools,
  (SELECT COUNT(*) FROM routes) as routes,
  (SELECT COUNT(*) FROM vehicles) as vehicles,
  (SELECT COUNT(*) FROM passengers) as passengers,
  (SELECT COUNT(*) FROM drivers) as drivers,
  (SELECT COUNT(*) FROM passenger_assistants) as pas;

-- View route assignments
SELECT 
  r.route_number,
  s.name as school,
  d.full_name as driver,
  p.full_name as pa
FROM crew c
JOIN routes r ON c.route_id = r.id
JOIN schools s ON r.school_id = s.id
JOIN employees d ON c.driver_id = d.id
JOIN employees p ON c.pa_id = p.id;

-- Check wheelchair accessible passengers
SELECT full_name, school_id, mobility_type, seat_number
FROM passengers
WHERE mobility_type = 'Wheelchair';
```

## 🧹 Clearing Seed Data

If you want to reset and start fresh:

```sql
-- WARNING: This will delete all data!
TRUNCATE 
  crew, 
  passenger_parent_contacts,
  route_points,
  vehicle_configurations,
  vehicle_assignments,
  next_of_kin,
  incidents,
  documents,
  passengers,
  parent_contacts,
  routes,
  drivers,
  passenger_assistants,
  vehicles,
  schools,
  employees
RESTART IDENTITY CASCADE;
```

Then re-run the seed script.

## 📝 Notes

- **Users table**: Not populated by seed data. Create accounts via signup page.
- **Audit log**: Empty initially. Gets populated as you make changes.
- **Timestamps**: Incidents use recent dates. Other records use default timestamps.
- **IDs**: Sequences are reset to ensure consistent numbering.

## 🎉 Ready to Go!

Your dashboard is now populated with realistic data. Explore all the features:

- ✅ View employee lists
- ✅ Navigate school → route → crew → passenger relationships
- ✅ Check vehicle fleet status
- ✅ Review incidents
- ✅ Track certifications and expiry dates
- ✅ Test CRUD operations
- ✅ Monitor audit logs

Enjoy testing your Fleet Admin Dashboard! 🚗





