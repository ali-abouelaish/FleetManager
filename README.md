# Fleet Admin Dashboard

A comprehensive Next.js 14 + Supabase admin dashboard for managing a fleet management system with full CRUD operations, authentication, and audit logging.

## 🚀 Features

- **Authentication**: Supabase Email+Password authentication with signup and login
- **Dashboard**: Analytics cards showing key metrics (employees, vehicles, routes, etc.)
- **School Overview**: Comprehensive view using `school_route_overview` database view
  - See all schools with their routes in one place
  - View crew assignments (driver + PA) per route
  - Check vehicle capacity vs passenger count
  - Identify issues (missing crew, overcapacity, etc.)
- **CRUD Operations**: Full Create, Read, Update, Delete for all entities:
  - Employees
  - Schools & Routes (with relationship drill-down)
  - Vehicles
  - Passengers
  - Drivers
  - Passenger Assistants
  - Call Logs (track phone communications)
  - Incidents
  - Documents
  - Audit Log
- **Relationship Management**: Navigate through related entities (Schools → Routes → Crew → Passengers)
- **Audit Logging**: Track all CREATE/UPDATE/DELETE operations
- **Protected Routes**: Middleware-based authentication
- **Responsive Design**: Mobile-friendly interface with TailwindCSS
- **Modern UI**: Clean, professional interface with reusable components

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: TailwindCSS
- **UI Components**: Custom components with Shadcn/UI patterns

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

## 🔧 Installation

### 1. Clone the repository

```bash
cd Fleet
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be set up
3. Go to Project Settings → API
4. Copy your project URL and anon/public key

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Set up the database schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL script

This will create all the necessary tables, indexes, and Row Level Security (RLS) policies.

### 6. (Optional) Load seed data

To populate your dashboard with dummy data for testing:

1. In Supabase SQL Editor
2. Copy the contents of `supabase/migrations/002_seed_data.sql`
3. Paste and run the SQL script
4. This creates 15 employees, 5 schools, 8 routes, 8 vehicles, 15 passengers, and more!

See `SEED_DATA.md` for details on what data is created.

### 7. (Optional) Create School Overview view

For the School Overview page to work:

1. In Supabase SQL Editor
2. Copy the contents of `supabase/migrations/003_create_school_route_overview.sql`
3. Paste and run the SQL script
4. This creates a powerful database view for comprehensive school/route reporting

### 8. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
Fleet/
├── app/
│   ├── api/
│   │   └── audit/          # Audit logging API route
│   ├── dashboard/          # Dashboard pages
│   │   ├── employees/      # Employee CRUD
│   │   ├── schools/        # School CRUD with drill-down
│   │   ├── routes/         # Route CRUD
│   │   ├── vehicles/       # Vehicle CRUD
│   │   ├── passengers/     # Passenger CRUD
│   │   ├── drivers/        # Driver list
│   │   ├── assistants/     # PA list
│   │   ├── incidents/      # Incident management
│   │   ├── documents/      # Document viewer
│   │   ├── audit/          # Audit log viewer
│   │   └── layout.tsx      # Dashboard layout
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects to dashboard)
│   └── globals.css         # Global styles
├── components/
│   ├── dashboard/          # Dashboard components
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   └── Topbar.tsx      # Top navigation bar
│   └── ui/                 # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Label.tsx
│       ├── Select.tsx
│       └── Table.tsx
├── lib/
│   ├── supabase/           # Supabase utilities
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   └── middleware.ts   # Auth middleware
│   ├── audit.ts            # Audit logging helper
│   └── utils.ts            # Utility functions
├── supabase/
│   └── migrations/         # Database migrations
├── middleware.ts           # Next.js middleware
└── README.md
```

## 🔐 Authentication Flow

1. User signs up at `/signup` with email and password
2. Supabase creates auth user and entry in `users` table
3. User is redirected to `/dashboard`
4. Middleware checks authentication on protected routes
5. Unauthenticated users are redirected to `/login`

## 📊 Database Schema

The system includes the following main tables:

- **employees**: Core employee information
- **users**: Authentication and system access
- **drivers**: Driver-specific certifications
- **passenger_assistants**: PA-specific certifications
- **schools**: School information
- **routes**: Transport routes linked to schools
- **passengers**: Student/passenger details
- **vehicles**: Fleet vehicle information
- **crew**: Driver and PA assignments to routes
- **incidents**: Incident tracking
- **documents**: Document storage metadata
- **audit_log**: System audit trail

See `supabase/migrations/001_initial_schema.sql` for complete schema.

## 🔍 Key Features Explained

### Relationship Drill-Down

Navigate through related entities seamlessly:

```
Schools → View Routes → See Crew → View Passengers
```

Each school detail page shows:
- Routes assigned to the school
- Crew (drivers & PAs) on each route
- Passengers on those routes
- Quick links to add new related entities

### Audit Logging

All CREATE, UPDATE, and DELETE operations are automatically logged to the `audit_log` table, tracking:
- Table name
- Record ID
- Action performed
- User who made the change
- Timestamp

View the audit log at `/dashboard/audit`.

### Protected Routes

The middleware (`middleware.ts`) protects all `/dashboard/*` routes, ensuring only authenticated users can access the admin panel.

## 🎨 Customization

### Adding a New Entity

1. Create the table in Supabase
2. Add CRUD pages in `app/dashboard/[entity]/`
3. Add navigation link in `components/dashboard/Sidebar.tsx`
4. Implement audit logging in create/update/delete operations

### Styling

All styles use TailwindCSS. Customize the theme in `tailwind.config.ts` and `app/globals.css`.

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel project settings
4. Deploy!

### Environment Variables in Production

Make sure to set all environment variables in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📝 Notes

- The `users` table should ideally be managed via Supabase triggers or Edge Functions in production
- File uploads for documents are not implemented in this version (only metadata)
- Role-based access control (RBAC) is set up but not enforced in the UI
- **School Overview** page uses the `school_route_overview` database view for optimized queries
- Make sure to run migration `003_create_school_route_overview.sql` for the overview page to work

## 🐛 Troubleshooting

### "Failed to load" errors
- Check that your Supabase credentials are correct
- Verify RLS policies are enabled and correctly configured

### Authentication issues
- Clear browser cookies and local storage
- Check Supabase Auth settings allow email signups

### Database errors
- Ensure the SQL migration ran successfully
- Check for foreign key constraint violations

## 📄 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

Built with ❤️ using Next.js and Supabase

