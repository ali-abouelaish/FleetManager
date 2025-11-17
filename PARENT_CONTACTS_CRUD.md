# 📇 Parent Contacts CRUD - Complete Guide

## 🎯 Overview

Full CRUD (Create, Read, Update, Delete) functionality for managing parent/guardian contacts with **many-to-many relationships** to passengers.

**Key Feature:** One parent contact can be associated with multiple passengers, and one passenger can have multiple parent contacts (e.g., Mother, Father, Guardian).

---

## 📊 Database Schema

### Tables Created

#### 1. **parent_contacts**
```sql
CREATE TABLE parent_contacts (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR NOT NULL,
  relationship VARCHAR,           -- Mother, Father, Guardian, etc.
  phone_number VARCHAR,
  email VARCHAR,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **passenger_parent_contacts** (Junction Table)
```sql
CREATE TABLE passenger_parent_contacts (
  id SERIAL PRIMARY KEY,
  passenger_id INTEGER REFERENCES passengers(id) ON DELETE CASCADE,
  parent_contact_id INTEGER REFERENCES parent_contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(passenger_id, parent_contact_id) -- No duplicates
);
```

---

## 🚀 Features Implemented

### ✅ Full CRUD Operations

| Operation | Route | Description |
|-----------|-------|-------------|
| **List** | `/dashboard/parent-contacts` | View all parent contacts with passenger counts |
| **Create** | `/dashboard/parent-contacts/create` | Add new parent contact and link to passengers |
| **View** | `/dashboard/parent-contacts/[id]` | View contact details and associated passengers |
| **Edit** | `/dashboard/parent-contacts/[id]/edit` | Update contact info and passenger links |
| **Delete** | `/dashboard/parent-contacts/[id]/edit` | Delete contact and all associations |

---

## 🎨 UI Features

### 1. **List Page** (`/dashboard/parent-contacts`)

**Features:**
- Displays all parent contacts in a table
- Shows passenger count badge for each contact
- Quick actions: View and Edit buttons
- Navy-themed table headers
- Alternating row colors with hover effects
- Skeleton loader during data fetch

**Table Columns:**
- ID
- Full Name
- Relationship
- Phone Number
- Email
- Passengers (count badge)
- Actions (View/Edit)

**Example Display:**
```
┌─────────────────────────────────────────────────────────────┐
│ ID │ Full Name      │ Relationship │ Phone       │ Passengers │
├─────────────────────────────────────────────────────────────┤
│ 1  │ Sarah Johnson  │ Mother       │ 07123456789 │ 🔵 2       │
│ 2  │ Mike Brown     │ Father       │ 07987654321 │ 🔵 1       │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. **Create Page** (`/dashboard/parent-contacts/create`)

**Features:**
- Form to add new parent contact
- Dropdown for relationship type (Mother, Father, Guardian, etc.)
- Multi-select passenger association with checkboxes
- Shows passenger names and schools
- Form validation (name required)
- Navy-themed cards and buttons

**Form Sections:**

#### **Contact Information Card:**
- Full Name * (required)
- Relationship (dropdown)
- Phone Number
- Email
- Address (textarea)

#### **Link to Passengers Card:**
- Checkbox list of all passengers
- Displays: Passenger name + School name
- Scrollable list (max-height with overflow)
- Click entire card to toggle checkbox

**Example:**
```
┌─────────────────────────────────────────┐
│ Contact Information                     │
├─────────────────────────────────────────┤
│ Full Name: Sarah Johnson *              │
│ Relationship: [Mother ▼]                │
│ Phone: 07123456789                      │
│ Email: sarah@example.com                │
│ Address: 123 Main St, London            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 👥 Link to Passengers                   │
├─────────────────────────────────────────┤
│ ☑ Emily Johnson                         │
│   Springfield Elementary                │
│                                          │
│ ☑ Oliver Johnson                        │
│   Springfield Elementary                │
└─────────────────────────────────────────┘

[Cancel]  [Create Parent Contact]
```

---

### 3. **View Page** (`/dashboard/parent-contacts/[id]`)

**Features:**
- Displays all contact information in organized cards
- Shows associated passengers with clickable links
- Contact info with icons (phone, email, address)
- Clickable phone (tel:) and email (mailto:) links
- System timestamps (created/updated)
- Edit button in header

**Card Layout:**

#### **Contact Information Card:**
- ID
- Full Name
- Relationship
- 📞 Phone Number (clickable)
- 📧 Email (clickable)
- 📍 Address

#### **System Information Card:**
- Created At
- Updated At

#### **Associated Passengers Card:**
- Count in header: "Associated Passengers (2)"
- Grid layout of passenger cards
- Each card shows:
  - Passenger name (bold, navy color)
  - School name
  - Date of birth
  - Clickable to navigate to passenger detail

**Example:**
```
┌─────────────────────────────────────────┐
│ Sarah Johnson                           │
│ Mother Contact Details                  │
│                               [Edit]    │
├─────────────────────────────────────────┤
│ Contact Information   │ System Info     │
│ ID: 1                 │ Created: ...    │
│ Name: Sarah Johnson   │ Updated: ...    │
│ Relationship: Mother  │                 │
│ 📞 07123456789        │                 │
│ 📧 sarah@example.com  │                 │
│ 📍 123 Main St...     │                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 👥 Associated Passengers (2)            │
├─────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐       │
│ │ Emily J.    │ │ Oliver J.   │       │
│ │ Springfield │ │ Springfield │       │
│ │ DOB: ...    │ │ DOB: ...    │       │
│ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────┘
```

---

### 4. **Edit Page** (`/dashboard/parent-contacts/[id]/edit`)

**Features:**
- Pre-filled form with existing data
- Update contact information
- Modify passenger associations (add/remove)
- Delete contact button (with confirmation)
- Cascade deletion (removes all passenger links)
- Form validation

**Sections:**
1. Contact Information (editable)
2. Link to Passengers (modify selections)
3. Action buttons:
   - Delete Contact (left, red)
   - Cancel (right)
   - Save Changes (right, navy)

**Delete Confirmation:**
```
Are you sure you want to delete this parent contact?
This will remove all passenger associations.

[Cancel]  [Confirm Delete]
```

---

## 🔄 Data Relationships

### Many-to-Many Example

**Scenario:**
- Sarah Johnson (Mother) → Emily Johnson, Oliver Johnson
- Mike Brown (Father) → Emily Johnson, Oliver Johnson
- Jane Doe (Guardian) → Emily Johnson

**Result:**
- Emily Johnson has 3 parent contacts (Mother, Father, Guardian)
- Oliver Johnson has 2 parent contacts (Mother, Father)
- Sarah Johnson is linked to 2 passengers
- Mike Brown is linked to 2 passengers
- Jane Doe is linked to 1 passenger

**Database Records:**

```sql
-- parent_contacts
id | full_name      | relationship
1  | Sarah Johnson  | Mother
2  | Mike Brown     | Father
3  | Jane Doe       | Guardian

-- passenger_parent_contacts
passenger_id | parent_contact_id
101          | 1  -- Emily → Sarah
101          | 2  -- Emily → Mike
101          | 3  -- Emily → Jane
102          | 1  -- Oliver → Sarah
102          | 2  -- Oliver → Mike
```

---

## 🎨 UI/UX Enhancements

### Navy Blue Theme
- Table headers: `bg-navy text-white`
- Card headers: `bg-navy text-white`
- Primary buttons: Navy background
- Active hover states: `hover:bg-blue-50`

### Skeleton Loaders
- Table skeleton with 7 columns
- Animated pulse effect
- Smooth transition to actual data

### Prefetching
- All navigation links use `prefetch={true}`
- Fast page transitions
- Better perceived performance

### Icons
- Contact icon (📇) in sidebar
- Users icon (👥) for passenger count
- Phone (📞), Email (📧), MapPin (📍) for contact details
- Plus (+) for add button
- Eye (👁️) for view
- Pencil (✏️) for edit
- Trash (🗑️) for delete

---

## 📋 Migration File

**File:** `supabase/migrations/010_create_parent_contacts.sql`

**Includes:**
- ✅ Table creation with constraints
- ✅ Indexes for performance
- ✅ `updated_at` triggers
- ✅ Row Level Security (RLS)
- ✅ Policies for authenticated users
- ✅ Cascade deletion on foreign keys
- ✅ UNIQUE constraint on junction table
- ✅ Helpful table/column comments

---

## 🚀 Deployment Steps

### 1. **Run Migration**
```bash
npx supabase migration up 010_create_parent_contacts
```

Or run directly in Supabase Dashboard SQL Editor:
```sql
-- Copy contents of 010_create_parent_contacts.sql
```

### 2. **Verify Tables**
```sql
-- Check parent_contacts
SELECT * FROM parent_contacts LIMIT 5;

-- Check junction table
SELECT * FROM passenger_parent_contacts LIMIT 5;
```

### 3. **Test CRUD Operations**
1. Navigate to `/dashboard/parent-contacts`
2. Click "Add Parent Contact"
3. Fill form and select passengers
4. Save and verify
5. Edit and delete to test all operations

---

## 🔍 Usage Examples

### **Scenario 1: Add New Mother Contact**

**Steps:**
1. Go to `/dashboard/parent-contacts`
2. Click "Add Parent Contact"
3. Enter:
   - Full Name: Sarah Johnson
   - Relationship: Mother
   - Phone: 07123456789
   - Email: sarah@example.com
   - Address: 123 Main St, London
4. Select passengers: Emily Johnson, Oliver Johnson
5. Click "Create Parent Contact"

**Result:**
- New contact created
- Linked to 2 passengers
- Shows in parent contacts list
- Passengers show 1 parent contact each

---

### **Scenario 2: Update Contact Information**

**Steps:**
1. Go to `/dashboard/parent-contacts`
2. Click View on "Sarah Johnson"
3. Click "Edit"
4. Update phone: 07999888777
5. Add new passenger: Charlie Johnson
6. Click "Save Changes"

**Result:**
- Phone number updated
- Now linked to 3 passengers
- All associated passengers updated

---

### **Scenario 3: View Contact with Passengers**

**Steps:**
1. Go to `/dashboard/parent-contacts`
2. Click View on "Sarah Johnson"
3. See:
   - Full contact details
   - Clickable phone/email
   - List of 3 associated passengers
   - Click passenger card to view passenger detail

---

### **Scenario 4: Delete Contact**

**Steps:**
1. Go to `/dashboard/parent-contacts`
2. Click Edit on "Jane Doe"
3. Click "Delete Contact"
4. Confirm deletion

**Result:**
- Contact deleted from `parent_contacts`
- All links deleted from `passenger_parent_contacts`
- Passengers remain unaffected (cascade only affects junction table)

---

## 📊 Benefits

### For Fleet Management:
✅ **Emergency Contacts:** Quick access to parent/guardian info
✅ **Multi-Contact Support:** Multiple contacts per passenger
✅ **Shared Custody:** Both parents linked to same child
✅ **Guardian Networks:** Extended family/guardians managed easily

### For Operations:
✅ **Fast Lookup:** Find all passengers for a parent
✅ **Reverse Lookup:** Find all parents for a passenger
✅ **Contact Verification:** Ensure up-to-date emergency contacts
✅ **Communication:** Easy access to phone/email for notifications

### For Compliance:
✅ **Audit Trail:** Created/updated timestamps
✅ **Data Integrity:** Foreign key constraints prevent orphaned records
✅ **RLS Security:** Row-level security policies
✅ **Relationship Tracking:** Clear parent-child relationships documented

---

## 🎯 Technical Details

### Component Architecture

**Server Components:**
- `page.tsx` (list) - Fetches data server-side
- `[id]/page.tsx` (view) - Fetches contact with passengers

**Client Components:**
- `create/page.tsx` - Form with state management
- `[id]/edit/page.tsx` - Wrapped in async server component for Next.js 15

**Loading States:**
- `loading.tsx` - Skeleton for list page
- Suspense boundaries for async data

### Data Fetching

**List Page:**
```typescript
const { data } = await supabase
  .from('parent_contacts')
  .select(`
    *,
    passenger_parent_contacts (
      passenger_id
    )
  `)
  .order('full_name')
```

**View Page:**
```typescript
const { data } = await supabase
  .from('parent_contacts')
  .select(`
    *,
    passenger_parent_contacts (
      passenger_id,
      passengers (
        id,
        full_name,
        dob,
        schools (name)
      )
    )
  `)
  .eq('id', id)
  .single()
```

**Create:**
```typescript
// 1. Insert contact
const { data: contact } = await supabase
  .from('parent_contacts')
  .insert({ full_name, relationship, ... })
  .select()
  .single()

// 2. Link to passengers
const links = selectedPassengers.map(passengerId => ({
  passenger_id: passengerId,
  parent_contact_id: contact.id,
}))

await supabase
  .from('passenger_parent_contacts')
  .insert(links)
```

**Update:**
```typescript
// 1. Update contact
await supabase
  .from('parent_contacts')
  .update({ full_name, relationship, ... })
  .eq('id', id)

// 2. Delete old links
await supabase
  .from('passenger_parent_contacts')
  .delete()
  .eq('parent_contact_id', id)

// 3. Insert new links
await supabase
  .from('passenger_parent_contacts')
  .insert(newLinks)
```

---

## 📚 Files Created

| File | Purpose |
|------|---------|
| `app/dashboard/parent-contacts/page.tsx` | List all parent contacts |
| `app/dashboard/parent-contacts/loading.tsx` | Skeleton loader |
| `app/dashboard/parent-contacts/create/page.tsx` | Create new contact |
| `app/dashboard/parent-contacts/[id]/page.tsx` | View contact details |
| `app/dashboard/parent-contacts/[id]/edit/page.tsx` | Edit/delete contact |
| `supabase/migrations/010_create_parent_contacts.sql` | Database migration |
| `components/dashboard/Sidebar.tsx` | Added navigation link |
| `PARENT_CONTACTS_CRUD.md` | This documentation |

---

## ✅ Status

| Item | Status |
|------|--------|
| Database Migration | ✅ Created |
| List Page | ✅ Complete |
| Create Page | ✅ Complete |
| View Page | ✅ Complete |
| Edit Page | ✅ Complete |
| Delete Functionality | ✅ Complete |
| Sidebar Navigation | ✅ Added |
| Skeleton Loaders | ✅ Implemented |
| Prefetching | ✅ Enabled |
| Navy Theme | ✅ Applied |
| RLS Policies | ✅ Configured |
| Documentation | ✅ Complete |
| No Linter Errors | ✅ Verified |
| Ready to Deploy | ✅ Yes |

---

## 🎉 Result

**Complete Parent Contacts CRUD system with:**
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Many-to-many passenger relationships
- ✅ Beautiful navy-themed UI
- ✅ Skeleton loaders for smooth UX
- ✅ Prefetched navigation
- ✅ Cascade deletion protection
- ✅ Contact information with icons
- ✅ Passenger association management
- ✅ Mobile-responsive design
- ✅ Next.js 15 compatibility

**Navigate to `/dashboard/parent-contacts` to start managing parent/guardian contacts!** 📇✨

---

**Migration:** `010_create_parent_contacts.sql`
**Status:** ✅ Ready to deploy
**No breaking changes**

