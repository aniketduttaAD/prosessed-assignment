# HRMS Lite

A small HR management tool with a clean UI for managing employees and tracking daily attendance, built as a full‑stack TypeScript app (Next.js + Express + Prisma + Neon/Postgres).

## Features & Functionality

- **Employee Management**
  - Add employees with generated unique `employeeId`, full name, email, and department (`EmployeeForm`).
  - List employees with search, department filter, pagination/infinite scroll (`EmployeeDashboard`, `useEmployeeStore`).
  - Responsive list: table on desktop, cards on mobile, with delete support in both views.
  - Delete an employee and automatically remove their attendance records (`DELETE /employees/:id`).

- **Attendance Management**
  - Calendar view showing per‑day summary of present/absent counts and remaining employees (`Calendar`, `AttendancePage`, `/attendance/month-summary`).
  - “Mark attendance” modal for the selected day with present/absent buttons for each employee (`AttendanceDayModal`, `POST /attendance`).
  - Daily status fetch for a specific date (`/attendance/day`), stored in Zustand (`useAttendanceStore`) for instant UI updates.

- **Validation, Errors & States**
  - Backend validation for required fields, email format, and duplicate email/attendance (`employeeController`, `attendanceController`).
  - Frontend form validation and inline error messages (`EmployeeForm`).
  - Meaningful loading/empty/error states across dashboard and attendance views (e.g. “Loading employees…”, “No employees match the current filters.”).

## Backend API (Express + Prisma)

- **Employees (`/employees`)**
  - `GET /employees` – paginated list with `page`, `pageSize`, `search`, `department` query params.
  - `POST /employees` – create employee; auto‑creates `Department` records and normalizes department names.
  - `DELETE /employees/:id` – delete employee and cascade delete their `AttendanceRecord`s.

- **Attendance (`/attendance`)**
  - `POST /attendance` – create/update attendance for current date only; validates employee existence and disallows non‑current dates.
  - `GET /attendance?employeeId=` – list attendance records for a specific employee.
  - `GET /attendance/month-summary?year=&month=` – monthly summary: total employees and per‑day present/absent counts.
  - `GET /attendance/day?date=YYYY-MM-DD` – per‑day attendance statuses by employee.

- **Departments (`/departments`)**
  - `GET /departments?search=` – search departments by name, used by the department autocomplete in `EmployeeForm`.

## Tech Stack & Design Choices

- **Frontend**
  - Next.js App Router with TypeScript.
  - State management with Zustand (`useEmployeeStore`, `useAttendanceStore`) so API data is centralized and UI components stay lean.
  - Responsive, utility‑class‑based styling via `app/globals.css` with a focus on:
    - Clean, card‑based layout.
    - Clear hierarchy and spacing.
    - Consistent typography and button styles.

- **Backend**
  - Node.js + Express with TypeScript.
  - Prisma ORM with Neon/Postgres (`PrismaNeon` adapter) and a simple schema (`Employee`, `Department`, `AttendanceRecord`).
  - Centralized logging via Winston (`logger`) and global error/not‑found middlewares.
  - CORS restricted via env to `http://localhost:3000` and `https://aniketduuta.space`.

## Project Setup

### Backend (`/backend`)

1. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Configure environment (`backend/.env`):

   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require"
   CORS_ORIGIN="http://localhost:3000,https://aniketduuta.space"
   PORT=8080
   ```

3. Apply schema and generate Prisma client:

   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. Run:

   ```bash
   # development (hot reload)
   npm run dev

   # or build + start
   npm run build
   npm run start
   ```

The backend listens on `http://localhost:8080` by default.

### Frontend (`/frontend`)

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Configure env (`frontend/.env` or `.env.local`):

   ```bash
   NEXT_PUBLIC_API_BASE_URL="http://localhost:8080"
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

The frontend runs on `http://localhost:3000`, talking to the backend via `NEXT_PUBLIC_API_BASE_URL`.

