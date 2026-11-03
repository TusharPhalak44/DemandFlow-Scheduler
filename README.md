# DemandFlow Scheduler - Meeting Calendar Booking & Management System

A high-performance, full-stack, database-driven meeting scheduling and calendar administration system built with **React**, **Tailwind CSS**, **Node.js**, **Express**, **Prisma ORM**, and **MySQL**.

---

## 🌟 Key Features

### 1. Public Agent Booking Panel (`/#/book` or `/#/book/:token`)
- **Interactive Monthly Calendar**: Month-by-month navigation with real-time day availability indicators.
- **Automatic Non-Working Day Exclusions**: Weekends, past dates, fully booked days, and holidays are physically non-selectable.
- **4 US Timezone Engine**:
  - Eastern: `America/New_York` (EST/EDT)
  - Central: `America/Chicago` (CST/CDT)
  - Mountain: `America/Denver` (MST/MDT)
  - Pacific: `America/Los_Angeles` (PST/PDT)
  - Automatically handles Daylight Saving Time (DST) shifts without time drift.
- **Dynamic Slot Generation**: Generates 20-minute slots (default 3 slots/hour, 24 slots/full working day) adjusted dynamically to the agent's target timezone.
- **Booking Confirmation & Multizone Export**:
  - Unique booking reference code (e.g. `MTG-202611-74C421`).
  - **Copy Meeting Details**: Formats details for clipboard.
  - **Copy in All 4 US Timezones**: Generates side-by-side time conversion for Eastern, Central, Mountain, and Pacific.
  - **Download .ICS Calendar File**: RFC 5545 compliant `.ics` calendar invitation for Google Calendar, Outlook, and Apple Calendar.

### 2. Admin Management Portal (`/#/admin-login`)
1. **Dashboard**: Live KPI metrics (Today's Bookings, Upcoming Meetings, Cancelled, Weekly/Monthly volume, Active Agents), Agent performance leaderboard, and Timezone distribution chart.
2. **Calendar Inspector**: Visual day-by-day slot inspector to examine live slot inventory and booked vs open times.
3. **Working Hours Management**: Configurable operating windows per weekday (Monday–Sunday) with dynamic slots/day calculation.
4. **Slot Settings**: Configurable meeting duration (15m, 20m, 30m, 45m, 60m), buffer time, min advance notice (hours), and max advance window (days).
5. **Holiday Management**: Automatic calculation of US Federal Holidays (including observed date logic) plus custom single-day, recurring, and partial-day company holidays.
6. **Booking Management**: Comprehensive table with search (reference, prospect, company, agent), date range filters, timezone filter, cancellation with reason (which immediately releases the slot), rescheduling, status updating, and CSV report export.
7. **Agent Management**: Register agents, activate/deactivate agents, assign unique non-guessable booking tokens, and track agent booking volume.
8. **Booking Link Management**: Monitor active links, click/booking counters, and token expirations.
9. **Reports & Analytics**: Status distribution charts, cancellation rate metrics, and conversion analytics.
10. **General Settings**: Organization branding, primary scheduling timezone, and required booking form fields.
11. **Activity Logs**: Tamper-evident audit trail of all booking, cancellation, rescheduling, and administrative actions.

### 3. Concurrency & Double-Booking Prevention
- Physical database-level concurrency protection via MySQL unique constraint on `slot_inventory.slot_start_utc`.
- Wrapped in atomic Prisma transactions (`prisma.$transaction`).
- Guarantees that two agents attempting to confirm the exact same instant simultaneously will never create duplicate bookings; the second request receives HTTP 409 Conflict.
- When an admin cancels a booking, the slot is immediately released for re-booking while preserving 100% of the historical meeting and audit record.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Luxon |
| **Backend** | Node.js (v24), Express.js, TypeScript, TSX |
| **ORM & Database** | Prisma ORM, MySQL (Port 3306) |
| **Timezone & Calendar** | Luxon (IANA timezones), `ics` (RFC 5545) |
| **Authentication & Security** | JWT (JSON Web Tokens), bcryptjs |
| **Validation** | Zod schema validation |

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: v18 or later (v24 recommended)
- **MySQL Server**: Running on port `3306` (e.g. XAMPP, Docker, or native MySQL)

### 1. Database Setup
Create the MySQL database:
```sql
CREATE DATABASE IF NOT EXISTS meeting_calendar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Environment Configuration
Check `server/.env`:
```env
PORT=5000
DATABASE_URL="mysql://root:@127.0.0.1:3306/meeting_calendar"
JWT_SECRET="meeting_calendar_secret_jwt_key_2026_super_secure"
FRONTEND_URL="http://localhost:5173"
```

### 3. Install Dependencies & Seed Database
```bash
# Install backend dependencies & sync schema
cd server
npm install
npx prisma db push
npx tsx prisma/seed.ts

# Install frontend dependencies
cd ../client
npm install
```

### 4. Run Development Servers
From the project root:
```bash
# Starts both Backend (port 5000) and Frontend (port 5173)
npm run dev
```
Or start individually:
- **Server**: `cd server && npm run dev`
- **Client**: `cd client && npm run dev`

Open `http://localhost:5173` in your browser.

---

## 🔑 Default Credentials & Demo Links

### Admin Portal Login
- **URL**: `http://localhost:5173/#/admin-login`
- **Email**: `admin@meetingcalendar.com`
- **Password**: `AdminPassword123!`
*(The login page includes an "Auto-fill Demo Credentials" button for convenience)*

### Sample Direct Agent Booking Links
- **Sarah Jenkins**: `http://localhost:5173/#/book/sarah-booking-2026`
- **David Miller**: `http://localhost:5173/#/book/david-booking-2026`
- **General Link**: `http://localhost:5173/#/book`

---

## 📡 REST API Reference

### Public Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/public/calendar/timezones` | 4 US timezones with current DST offsets |
| `GET` | `/api/public/calendar/available-dates` | Month availability (`?month=YYYY-MM&tz=...`) |
| `GET` | `/api/public/calendar/slots` | Available slots for a date (`?date=YYYY-MM-DD&tz=...`) |
| `GET` | `/api/public/booking-link/:token` | Resolves agent booking token |
| `POST` | `/api/public/bookings` | Confirms booking with transactional slot lock |
| `GET` | `/api/public/bookings/:reference` | Confirmed meeting details with 4 US timezones |
| `GET` | `/api/public/bookings/:reference/ics` | Downloads `.ics` calendar invitation |

### Admin Endpoints (Require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Admin authentication (returns JWT) |
| `GET` | `/api/auth/me` | Current admin session profile |
| `GET` | `/api/admin/dashboard/stats` | KPI metrics, agent charts, timezone stats |
| `GET` | `/api/admin/bookings` | Filtered and paginated bookings list |
| `POST` | `/api/admin/bookings/:id/cancel` | Cancel booking and release slot |
| `POST` | `/api/admin/bookings/:id/reschedule` | Reschedule meeting to new slot |
| `PATCH` | `/api/admin/bookings/:id/status` | Update status (`COMPLETED`, `NO_SHOW`) |
| `GET` | `/api/admin/bookings/export/csv` | Export bookings report to CSV |
| `GET` | `/api/admin/working-hours` | Get weekday operating hours |
| `PUT` | `/api/admin/working-hours` | Update working hours and active days |
| `GET` | `/api/admin/slot-settings` | Get slot duration and buffer settings |
| `PUT` | `/api/admin/slot-settings` | Update slot duration and buffer settings |
| `GET` | `/api/admin/holidays` | Get federal and custom holidays |
| `POST` | `/api/admin/holidays` | Create custom company holiday |
| `DELETE` | `/api/admin/holidays/:id` | Delete custom company holiday |
| `PATCH` | `/api/admin/holidays/federal/toggle` | Toggle automatic federal holidays |
| `GET` | `/api/admin/agents` | List agents with booking counts |
| `POST` | `/api/admin/agents` | Register agent and generate unique token |
| `PATCH` | `/api/admin/agents/:id` | Update agent profile / status |
| `GET` | `/api/admin/booking-links` | List all booking links and click stats |
| `GET` | `/api/admin/activity-logs` | Filterable administrative audit trail |
| `GET` | `/api/admin/settings` | Get general calendar settings |
| `PUT` | `/api/admin/settings` | Update company name and default timezone |

---

## 🧪 Acceptance Criteria Verification

| Requirement | Verification Result |
|---|---|
| 1. Mon–Fri 9 AM–5 PM configuration | ✅ Verified (24 slots per full working day) |
| 2. Three slots per hour (20 min meetings) | ✅ Verified (09:00, 09:20, 09:40...) |
| 3. Access calendar via public URL | ✅ Verified (`/#/book` and `/#/book/:token`) |
| 4. Four US timezone options | ✅ Verified (Eastern, Central, Mountain, Pacific) |
| 5. Daylight saving time handling | ✅ Verified via Luxon dynamic offset resolution |
| 6. Automatic US federal holidays excluded | ✅ Verified (Veterans Day, Thanksgiving, etc. disabled) |
| 7. Custom company holidays | ✅ Verified (full day, partial day, and recurring) |
| 8. Dynamically generated slots | ✅ Verified (slot engine computes on-the-fly) |
| 9. Database persistence | ✅ Verified in MySQL database `meeting_calendar` |
| 10. Booked slots immediately unavailable | ✅ Verified (slots decrease by 1 immediately) |
| 11. Concurrency double-booking prevention | ✅ Verified (unique slot constraint raises 409) |
| 12. Admin cancel & release slot | ✅ Verified (releases slot in inventory, preserves history) |
| 13. Copy meeting details in 4 timezones | ✅ Verified (clipboard text formatted for ET, CT, MT, PT) |
| 14. Admin filter and search bookings | ✅ Verified (reference, status, timezone, date filters) |
| 15. Responsive desktop & mobile design | ✅ Verified across multiple viewport widths |
| 16. Audit trail maintained | ✅ Verified in `activity_logs` |
| 17. Download `.ics` calendar invite | ✅ Verified RFC 5545 `.ics` file generation |
