# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Supabase

1. Go to https://supabase.com and create a new project
2. Wait for database setup (2-3 minutes)
3. Copy your project credentials from Project Settings → API

### Step 3: Configure Environment

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 4: Create Database Schema

1. Open Supabase SQL Editor
2. Copy contents from `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL script
4. Wait for completion (creates all tables, indexes, and policies)

**Optional - Add Dummy Data:**
5. Copy contents from `supabase/migrations/002_seed_data.sql`
6. Paste and run to populate with 15 employees, 5 schools, 8 vehicles, and more!

### Step 5: Run the App

```bash
npm run dev
```

Visit http://localhost:3000 and create your first account!

## 📱 What You Get

### ✅ Authentication
- Email/password signup and login
- Protected routes with middleware
- Automatic session management

### ✅ Dashboard
- Analytics cards (employees, vehicles, routes, etc.)
- Quick action buttons
- System status overview

### ✅ Full CRUD for All Entities
- **School Overview**: Comprehensive view of all schools, routes, crew, and vehicles in one place
- **Employees**: Manage staff with roles and status
- **Schools**: Track schools with addresses
- **Routes**: Link routes to schools
- **Vehicles**: Full vehicle fleet management
- **Passengers**: Student transport management
- **Drivers & PAs**: View certifications and expiry dates
- **Call Logs**: Track phone communications (inquiries, complaints, etc.)
- **Incidents**: Report and track incidents
- **Documents**: View document metadata
- **Audit Log**: Track all system changes

### ✅ Relationship Navigation
From a school page, you can:
- View all its routes
- See crew assigned to each route
- View passengers on those routes
- Quick add buttons for related entities

### ✅ Audit Logging
Every CREATE/UPDATE/DELETE operation is logged with:
- User who made the change
- What was changed
- When it happened

## 🎯 First Steps After Setup

1. **Sign Up**: Create your admin account at `/signup`
2. **Add a School**: Go to Schools → Add School
3. **Create a Route**: Add a route for that school
4. **Add Employees**: Create employee records
5. **Add Vehicles**: Register your fleet vehicles
6. **Add Passengers**: Register students/passengers

## 🔐 Default Behavior

- All routes under `/dashboard/*` require authentication
- Authenticated users on `/login` or `/signup` redirect to dashboard
- All CRUD operations are automatically logged
- Row Level Security (RLS) is enabled on all tables

## 📊 Key URLs

- `/` - Home (redirects to dashboard)
- `/login` - Login page
- `/signup` - Signup page
- `/dashboard` - Main dashboard
- `/dashboard/employees` - Employee management
- `/dashboard/schools` - School management
- `/dashboard/routes` - Route management
- `/dashboard/vehicles` - Vehicle management
- `/dashboard/passengers` - Passenger management
- `/dashboard/drivers` - Driver list
- `/dashboard/assistants` - PA list
- `/dashboard/incidents` - Incident tracking
- `/dashboard/documents` - Document viewer
- `/dashboard/audit` - Audit log

## 🛠️ Common Tasks

### Add Navigation Item
Edit `components/dashboard/Sidebar.tsx` and add to the navigation array.

### Create New CRUD Entity
1. Create table in Supabase
2. Add pages in `app/dashboard/[entity]/`
3. Add sidebar link
4. Add audit logging to mutations

### Customize Colors
Edit `app/globals.css` CSS variables for theme colors.

## 🐛 Troubleshooting

**Can't connect to database?**
- Verify `.env.local` credentials
- Check Supabase project is active

**Authentication not working?**
- Clear browser cookies/localStorage
- Verify email signup is enabled in Supabase Auth settings

**RLS errors?**
- Ensure SQL migration ran successfully
- Check policies are enabled for authenticated users

## 🔍 Important Note

After loading seed data, you need to run the **School Overview** view migration:

```sql
-- Run: supabase/migrations/003_create_school_route_overview.sql
```

This creates the database view that powers the School Overview page.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## 🎉 You're All Set!

Your fleet management dashboard is ready to use. Enjoy managing your fleet! 🚗

