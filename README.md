# Dashboard Pro — Registration / Admission / Collection Tracking System

A modern, production-ready full-stack dashboard built around the **Register → Admit → Collect** workflow. Originally designed for coaching institutes, the same flow fits any business that tracks inquiries, confirms enrollments, and collects payments in installments (gyms, clinics, training centers, course platforms, etc).

## What's tracked

The dashboard centers on four KPIs (matching the original hand sketch):

1. **Total Employees** — across all teams (active staff count)
2. **Total Register** — new registrations this month (inquiries / walk-ins)
3. **Total Admission** — confirmed enrollments this month (fee committed)
4. **Total Collection** — money actually received this month

Plus side widgets: revenue split by team, recent admissions/registrations this month, and a team-performance-vs-target combo chart.

## Tech Stack

**Frontend:** React 18 (Vite), Tailwind CSS, shadcn-style UI primitives, Zustand, React Router, React Hook Form + Zod, Recharts, Framer Motion, Axios, react-hot-toast

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, Helmet, express-rate-limit, Zod, Socket.io

## Domain Model

```
Registration  →  Admission  →  Collection (one or many — installments)
   (inquiry)     (confirmed)      (money in)

Each is tied to:  Team  →  Employee (handler)
```

- A **Registration** is a prospect/inquiry — they walked in, called, or filled a form.
- Once they pay/commit, an **Admission** is created (denormalizes prospect name + program + fee).
- Money received is logged as one or more **Collections** against an admission (supports installments).
- Every record is tagged with a **Team** so revenue, performance, and target tracking can be sliced by team.
- **Employees** are the staff doing the work (counsellors, sales reps). They're separate from system **Users** (login accounts).

## Project Structure

```
crm-saas/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/                  User, Team, Employee, Registration, Admission, Collection, Activity
│   │   ├── controllers/             auth, dashboard, team, employee, registration, admission, collection, user
│   │   ├── routes/                  one router per resource
│   │   ├── middleware/              auth, error, validate
│   │   ├── utils/                   generateToken, seed
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/                  Button, Card, Input, Select, Badge, Skeleton, Modal
    │   │   ├── layout/              Sidebar, Navbar, AppLayout
    │   │   ├── dashboard/           KpiCard, RevenueByTeam, ThisMonthLists, TeamPerformanceChart
    │   │   └── ProtectedRoute.jsx
    │   ├── pages/                   Login, Register, Dashboard, Registrations, Admissions, Collections, Employees, Teams, Settings
    │   ├── store/                   Zustand stores (auth, theme)
    │   ├── services/api.js          Axios with JWT interceptor
    │   ├── lib/utils.js             Helpers (cn, formatCurrency, formatDate, formatRelativeTime)
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

## Prerequisites

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **MongoDB** running locally on `mongodb://localhost:27017`, or a MongoDB Atlas connection string

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET (32+ random chars)
npm install
npm run seed       # Optional: loads 356 employees, 27 registrations, 47 admissions, ~₹5L collections
npm run dev        # Starts http://localhost:5000
```

After seeding, log in with:
- **Admin:** `admin@app.com` / `admin123`
- **Staff:** `priya@app.com` / `user123`

### 2. Frontend (new terminal)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # Starts http://localhost:5173
```

Open `http://localhost:5173` and sign in.

## Daily Workflow

1. **Admin sets up teams** → Teams page → create teams (e.g. "Sales A", "Counsellors") with monthly revenue targets.
2. **Admin/Staff add employees** → Employees page → assign each to a team.
3. **Staff records new inquiries** → Registrations page → "New Registration" with prospect name, phone, source, team.
4. **When the inquiry converts** → Admissions page → "New Admission" with student/customer name, program, fee amount, team.
5. **Money received** → Collections page → "Record Payment" against an admission (one admission can have multiple collections for installments).
6. **Dashboard** auto-aggregates everything in real time. Switch between "Last 7 Days", "Last 30 Days", and "This Month" using the top-right filter.

## API Reference

All endpoints except `/auth/login` and `/auth/register` require `Authorization: Bearer <token>`.

### Auth — `/api/auth`
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/register` | Public | First registered user becomes admin |
| POST | `/login` | Public | Returns JWT |
| GET | `/me` | Auth | Current user |

### Dashboard — `/api/dashboard`
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/?range=7\|30\|thisMonth` | Auth | All KPIs + chart data in one response |
| GET | `/activity` | Auth | Recent activity feed |

### Teams — `/api/teams`
| Method | Path | Access |
|--------|------|--------|
| GET / POST | `/` | Auth / Admin |
| PUT / DELETE | `/:id` | Admin |

### Employees — `/api/employees`
GET, POST, PUT, DELETE — `/api/employees[/:id]` (all Auth; DELETE is Admin)

### Registrations — `/api/registrations`
GET (with `?search=&status=&team=&page=&limit=`), POST, PUT, DELETE

### Admissions — `/api/admissions`
GET, POST, PUT, DELETE — admission auto-creates when a Registration is "converted"

### Collections — `/api/collections`
GET, POST — appending to an admission's payment history

### Users — `/api/users` (admin)
GET (list), PUT (update role), DELETE

## Features Checklist

- [x] JWT auth with bcrypt password hashing
- [x] Role-based access (admin / user) on both client and server
- [x] First registered user auto-promoted to admin (bootstrap)
- [x] Sticky navbar with search, notifications, profile dropdown
- [x] Collapsible sidebar with icons + labels
- [x] Light / dark mode (persists to localStorage)
- [x] Dashboard layout exactly matches the original sketch:
  - 4 KPI cards row (Employees / Register / Admission / Collection)
  - Revenue by Team pie + This Month split list
  - Team Performance vs Target full-width combo chart
- [x] Date-range filter (7d / 30d / This Month)
- [x] Full CRUD with modal forms for Registrations, Admissions, Collections, Employees, Teams
- [x] Inline target editing on Teams page
- [x] React Hook Form + Zod validation everywhere
- [x] Toast notifications (react-hot-toast)
- [x] Loading skeletons on every async surface
- [x] Lazy-loaded pages
- [x] Centralized error middleware on backend
- [x] Rate limiting + Helmet security headers
- [x] Smooth Framer Motion animations
- [x] Seed script with realistic demo data matching the sketch numbers (356 emp, 27 reg, 47 adm, ₹5L)
- [x] **Bulk import** — Excel (.xlsx, .xls) and CSV upload on Employees / Registrations / Admissions / Collections pages, with downloadable templates and row-by-row error reporting

## Bulk Import

Each of the four data pages (Employees, Registrations, Admissions, Collections) has an **Import** button next to the "New" button. The flow is:

1. **Download the template** — Excel file with the exact column headers expected.
2. **Fill in your rows** — extra columns are ignored; column header order doesn't matter; common variants are accepted (e.g. "Phone", "Mobile", "Phone Number" all work).
3. **Drag & drop or click to upload** — accepts `.xlsx`, `.xls`, `.csv` up to 5 MB.
4. **Review the result** — server reports how many rows were inserted, how many failed, and a per-row error message for each failed row (e.g. "Row 12: phone is required" or "Row 8: Team 'Foo' not found").

Valid rows always import even if some rows are invalid — you don't have to re-upload the whole file after fixing typos.

**For collections** specifically: the importer matches each row to an existing admission by student/customer name. If a name maps to multiple admissions, the most recent one wins. So make sure target admissions exist in the system before importing collections.

API:
- `GET /api/import/template/:resource` — download template
- `POST /api/import/:resource` — multipart `file` field (resource: `employees` | `registrations` | `admissions` | `collections`)

## Production Deployment Notes

1. Set `NODE_ENV=production` and a strong 32+ char `JWT_SECRET`.
2. Use MongoDB Atlas or a managed instance — never expose Mongo to the internet directly.
3. Build frontend: `cd frontend && npm run build` → serve `dist/` via Nginx/Vercel/Netlify/Cloudflare Pages.
4. Backend can deploy to Railway, Render, Fly.io, etc. Set `CLIENT_URL` to the deployed frontend origin so CORS works.
5. For multi-tenant SaaS (multiple clients with isolated data), add an `Organization` model and scope every query by `organizationId` — currently all data is shared across users in one DB.

## Common Customizations

- **Rename "Register/Admission/Collection"** to your domain language (e.g. "Lead/Booking/Payment") — change strings in:
  - `frontend/src/pages/DashboardPage.jsx` (KPI labels)
  - `frontend/src/components/layout/Sidebar.jsx` (nav labels)
  - Page titles in each page file
  - The model files keep their names but you can rename the collection labels in the UI without touching the schema.
- **Add a new KPI** — extend `dashboardController.js` aggregation, then add a `<KpiCard />` in `DashboardPage.jsx`.
- **Add a new collection method** (e.g. "Crypto") — add to the enum in `Collection.js` and the dropdown in `CollectionsPage.jsx`.

## License

MIT — use freely for learning or commercial work.
