# Morya Fitness – Gym Management System (Sinnar)

A modern, responsive, commercial-grade **Gym Management System** custom built for **Morya Fitness, Sinnar (Nashik)**.

The system empowers the gym owner, manager/receptionist, and trainers to manage all day-to-day operations from a single high-performance dashboard: member registrations, flexible membership plans, non-destructive renewals, partial payments & printable receipts, live camera QR attendance check-in, trainer assignments, workout routines, operating expenses, financial P&L reporting, WhatsApp automated templates, audit logs, and database backup.

---

## 🌟 Key Features

### 1. 👑 Role-Based Access Control (RBAC)
- **Owner / Admin (`OWNER`)**: Full access to all operations, member deletion, plan pricing modification, financial P&L, system branding settings, security audit logs, and 1-click database backup dumps.
- **Manager / Receptionist (`MANAGER`)**: Fast daily reception workflows: register new members, renew subscriptions, collect full/partial payments, print receipts, scan attendance, and view operational reports. (Cannot delete financial records).
- **Trainer (`TRAINER`)**: View assigned members, track attendance, and build workout split routines (sets, reps, weights).

### 2. 📊 Executive Dashboard & Analytics
- **8 Real-time KPI Cards**:
  - Total Members (with monthly growth badge)
  - Active Members
  - Expiring Soon Members ($\le 7$ days)
  - Expired Members
  - Today's Check-in Attendance
  - Today's Collection (₹ INR) & This Month's Revenue
  - Outstanding Pending Receivables (₹ INR)
  - New Members Enrolled this Month
- **Interactive Recharts**:
  - 6-Month Revenue & Operating Expense Growth with Net Profit curves
  - 14-Day Attendance Check-in Footfall Bar Chart
  - Membership Health Donut Chart (Active / Expiring / Expired)
  - Plan Popularity Distribution Breakdown
- **Actionable Reminder Feeds**:
  - Expiring This Week alert list with 1-click Renew & WhatsApp buttons
  - Pending Payments list with 1-click "Collect Balance" button
  - Today's Member Birthdays list with 1-click WhatsApp greeting button

### 3. 👥 Member Management & Auto-Generated ID
- Sequential unique Member ID format: `MF20260001`
- Complete profile information: 10-digit Indian mobile, email, DOB, gender, emergency contact, residential address, trainer assignment, and lead source.
- Multi-criteria instant search (by Name, Phone, or Member ID) and status filter tabs (All, Active, Expiring Soon, Expired, Pending Dues).
- Comprehensive Member Profile with 6 interactive tabs:
  1. **Overview**: Personal info & current subscription health
  2. **Memberships History**: Non-destructive timeline of all past & current subscriptions
  3. **Payments**: Ledger of all receipts with print/download capability
  4. **Attendance**: Historical check-in log with timestamps and methods
  5. **Workout Routine**: Assigned exercise split with target weights
  6. **Staff Notes**: Fitness and medical remarks

### 4. ⚡ Fast Single-Screen Registration & Non-Destructive Renewals
- **Fast Registration**: Single-screen receptionist form with real-time fee calculation, discounts, partial payment support, and instant receipt generation.
- **Non-Destructive Renewals**: Generates a new subscription period starting immediately upon current expiry without ever overwriting historical audit data.

### 5. 💳 Payment Management, Partial Dues & Printable Receipts
- Support for **Full and Partial Payments** (e.g. ₹2,500 plan $\rightarrow$ ₹200 discount $\rightarrow$ ₹1,500 paid $\rightarrow$ ₹800 pending balance).
- Payment modes: **UPI** (GPay / PhonePe / Paytm / BHIM), **Cash**, **Card**, and **Bank Transfer** with UTR/transaction reference numbers.
- **Commercial Tax/Fee Receipt**:
  - Morya Fitness Sinnar branding, address, and phone
  - Receipt number (`MF-REC-2026-0001`), payment date & received by
  - Breakdown of plan, duration, discount, net payable, amount paid, and remaining dues
  - Terms & conditions with authorized signature line
  - Native Thermal & A4 Print / PDF styling.

### 6. 📷 Attendance Module & Live Camera QR Check-In
- **3 Check-In Modes**:
  1. Live Camera QR code scanner
  2. Member ID Lookup (`MF20260001`)
  3. 10-digit Mobile Number Lookup
- **Instant Status Validation**:
  - If **Active**: Success chime + green banner + confetti + check-in timestamp
  - If **Expired**: Warning chime + red alert modal + instant 1-click "Renew Membership" button
  - If **Already Checked In**: Informational status showing time of entry.
- **Hourly Peak Hours Heatmap** (6:00 AM to 10:00 PM) to optimize gym floor staffing.
- **Top 5 Most Active Members Leaderboard**.

### 7. 📱 Member Digital QR Pass Card
- Stylish digital gym pass card with member name, photo badge, Member ID, validity date, and encrypted QR token.
- Printable / downloadable pass card for physical member cards.

### 8. 💬 WhatsApp Integration & Automated Templates
- 1-Click WhatsApp Web / App deep links prefilled with Indian templates:
  - *Welcome to Morya Fitness*
  - *7-Day Expiry Reminder*
  - *3-Day Urgent Expiry Reminder*
  - *Membership Expired Notification*
  - *Pending Balance Dues Reminder*
  - *Birthday Greetings with Special Gym Offer*

### 9. 🏋️ Trainers & Workout Plan Builder
- Trainer directory with contact details, specializations (CrossFit, Hypertrophy, Weight Loss), salaries, and assigned member counts.
- Member workout routine builder with split days (Monday Chest/Triceps, Tuesday Back/Biceps, Wednesday Legs, etc.), exercise names, sets, reps, and target weights (kg).

### 10. 🧾 Expense Tracking & Financial P&L Statement
- Categorized expense logging (Rent, Electricity, Equipment, Maintenance, Trainer Salaries, Cleaning, Marketing, Supplements, Other).
- **Financial Dashboard**:
  - Total Lifetime Revenue vs Total Lifetime Expenses $\rightarrow$ Net Profit
  - This Month's Margin vs Last Month's Margin
  - Category-wise expenditure breakdown chart.

### 11. 📑 Reports & One-Click CSV Export
- Member Registry Report, Payments & Collection Report, Daily Attendance Logs, and Financial P&L statement.
- Filter by date range and 1-click **Export to CSV** or **Print**.

### 12. 🔒 Security, Audit Trail & Database Backup
- Role-based permissions on all API endpoints.
- Immutable **Audit Log** tracking staff actions (member created, renewal, payment, expense, login).
- Admin 1-Click **JSON Database Backup Export**.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, HTML5-QRCode, Canvas-Confetti |
| **Backend** | Python 3.11, Django 5.x, Django REST Framework, SimpleJWT, Django-CORS-Headers, Pillow |
| **Database** | Relational Database (SQLite for zero-config local / PostgreSQL or MySQL ready for production) |
| **Styling & Theme** | Dark modern slate (`#0a0d14`), Fitness Orange (`#f97316`), Emerald (`#10b981`), Glassmorphism |
| **Localization** | Indian Rupee (₹ INR), 10-digit Indian Mobile Numbers (`+91`), Indian Date Formatting (`DD/MM/YYYY`) |

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** and **npm** installed

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python requirements
python -m pip install -r requirements.txt

# Run migrations
python manage.py makemigrations api
python manage.py migrate

# Seed database with realistic demo data (25 members, 5 plans, payments, attendance, trainers, expenses)
python manage.py seed_data

# Start Django backend server
python manage.py runserver 0.0.0.0:8000 --noreload
```
Backend API will be live at `http://127.0.0.1:8000/api/`.

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend Web App will be live at `http://127.0.0.1:5173/`.

---

## 🔑 Demo Login Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Owner / Admin** | `admin` | `admin123` | Full Administrator (Members, Plans, Finance, Settings, Backups, Audit) |
| **Manager / Receptionist** | `reception` | `reception123` | Receptionist (Enrollment, Renewals, Payments, Attendance, QR) |
| **Trainer** | `trainer` | `trainer123` | Fitness Coach (Assigned Members, Attendance, Workout Plans) |

*(You can also use the 1-click demo buttons on the login screen for instant sign-in).*

---

## 📁 Project Structure

```
gym management/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── morya_backend/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── api/
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── permissions.py
│       ├── utils.py
│       └── management/
│           └── commands/
│               └── seed_data.py
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── types/
│       │   └── index.ts
│       ├── services/
│       │   └── api.ts
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── components/
│       │   ├── common/
│       │   │   ├── StatusBadge.tsx
│       │   │   └── Modal.tsx
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Navbar.tsx
│       │   │   └── AppLayout.tsx
│       │   ├── receipts/
│       │   │   └── PaymentReceipt.tsx
│       │   ├── qr/
│       │   │   ├── MemberQRCard.tsx
│       │   │   └── QRScannerModal.tsx
│       │   └── whatsapp/
│       │       └── WhatsAppModal.tsx
│       └── pages/
│           ├── Login.tsx
│           ├── Dashboard.tsx
│           ├── Members.tsx
│           ├── MemberDetails.tsx
│           ├── AddMember.tsx
│           ├── RenewMembership.tsx
│           ├── MembershipPlans.tsx
│           ├── Payments.tsx
│           ├── Attendance.tsx
│           ├── Trainers.tsx
│           ├── Workouts.tsx
│           ├── Expenses.tsx
│           ├── Financials.tsx
│           ├── Reports.tsx
│           ├── AuditLogs.tsx
│           └── Settings.tsx
└── README.md
```

---

## 🏛️ Location & Branding
**Morya Fitness**  
Near Shiv Smarak, Pune Highway, Sinnar, Nashik, Maharashtra – 422103  
*Helpline:* +91 98220 12345 | *Email:* contact@moryafitness.com | *UPI:* `moryafitness@okhdfcbank`
