# TrashTrack AI — Smart Municipal Waste Management & Workforce Telematics

TrashTrack AI is a full-stack, enterprise-grade smart municipal waste management and telematics platform. It seamlessly connects citizens, field sanitation workers, and municipal administrators to enable automated issue reporting, jurisdictional worker verification, live duty tracking, and real-time shift telematics.

---

## 📑 Table of Contents

- [Live Deployments](#-live-deployments)
- [Key Features by Role](#-key-features-by-role)
- [System Architecture & Lifecycle Workflows](#-system-architecture--lifecycle-workflows)
  - [1. Worker Registration & Admin Approval Flowchart](#1-worker-registration--admin-approval-flowchart)
  - [2. Worker Daily Availability & Shift Telematics Flowchart](#2-worker-daily-availability--shift-telematics-flowchart)
  - [3. Admin Live Monitoring & Session Oversight Flowchart](#3-admin-live-monitoring--session-oversight-flowchart)
- [Database Schema & Migrations](#-database-schema--migrations)
- [REST API Reference](#-rest-api-reference)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Worker Duty & Availability Endpoints](#worker-duty--availability-endpoints)
  - [Admin Workforce Management Endpoints](#admin-workforce-management-endpoints)
- [Technology Stack](#-technology-stack)
- [Local Setup & Development](#-local-setup--development)
- [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🌐 Live Deployments

| Component | Platform | URL |
| :--- | :--- | :--- |
| **Frontend Web App** | Vercel | [https://trash-track-ai.vercel.app/](https://trash-track-ai.vercel.app/) |
| **Backend REST API** | Render | [https://trashtrack-ai.onrender.com](https://trashtrack-ai.onrender.com) |

---

## 🚀 Key Features by Role

### 1. Citizen Dashboard
* **GPS-Assisted Waste Reporting**: Auto-detects real-time coordinates using the browser Geolocation API with reverse-geocoded landmark resolution.
* **Interactive Map Visualization**: Integrated Leaflet + OpenStreetMap engine showing user location and nearby collection zones.
* **Complaint Tracking**: Live status lifecycle tracking (`Pending`, `Assigned`, `In Progress`, `Resolved`).

### 2. Sanitation Worker Portal
* **Top-Bar Daily Availability Toggle**: One-click **"Go Active" / "Go Inactive"** switch directly in the dashboard header.
* **Live Session Telematics**: Real-time ticker displaying elapsed shift duration, active shift start timestamp, and total accumulated daily working hours.
* **Automated Heartbeat**: Background ping sent every 90 seconds while on duty to preserve session integrity.
* **Strict Verification Protection**: Unverified or rejected accounts cannot activate duty, with client-side guard modals and transactional server-side enforcement.

### 3. Municipal Administrator Console
* **Workforce Management Hub**:
  * **All Workers Directory**: Complete roster with search by name, phone, area, or email, plus filter by duty status (`Active`, `Pending Verification`, `Rejected`).
  * **Pending Verification Queue**: Dedicated triage pipeline with municipality validation, identity audit, and approval/rejection modal dialogs with mandatory rejection reason logging.
  * **Live Worker Availability Monitoring**: Real-time table displaying current worker status (🟢 Active vs ⚪ Inactive), shift start times, live session duration tickers, and today's total logged hours.
  * **Working Hours History Modal**: Detailed telematics modal showing 7-day bar chart distribution, daily completed vs active durations, and session counts.
  * **Administrative Session Termination**: Ability to remotely close open worker sessions with audit trail logging (`admin_manual_close`).

---

## 🔄 System Architecture & Lifecycle Workflows

### 1. Worker Registration & Admin Approval Flowchart

```mermaid
flowchart TD
    Start(["Worker Signs Up"]) --> SubmitReq["POST /api/v1/auth/signup (role: worker)"]
    SubmitReq --> DBInit["PostgreSQL Transaction:<br/>1. Create users record (status: pending_verification)<br/>2. Create worker_approvals record (status: PENDING_VERIFICATION)"]
    DBInit --> WorkerLogin["Worker logs into Dashboard"]
    WorkerLogin --> CheckStatus{"Is worker approved?"}
    
    CheckStatus -- "No (Pending)" --> ToggleBlocked["Toggle button shows 'Pending Verification'<br/>Duty activation blocked"]
    CheckStatus -- "Yes (Approved)" --> ToggleActive["Toggle button shows 'Go Active'<br/>Eligible for shifts"]

    DBInit --> AdminAlert["Admin sees Pending Approvals badge"]
    AdminAlert --> AdminReview["Admin inspects Worker in Workforce Management"]
    AdminReview --> AdminDecision{"Admin Decision"}
    
    AdminDecision -- "Reject" --> InputReason["Admin enters Rejection Reason"]
    InputReason --> ProcessReject["POST /api/v1/admin/workers/:id/reject<br/>DB: users.status='rejected', worker_approvals.status='REJECTED'"]
    ProcessReject --> WorkerRejected["Worker notified: Account Rejected<br/>Duty activation disabled"]
    
    AdminDecision -- "Approve" --> ProcessApprove["POST /api/v1/admin/workers/:id/approve<br/>DB: users.status='active', worker_approvals.status='APPROVED'<br/>Allocates Admin's Municipality ID"]
    ProcessApprove --> WorkerApproved["Worker Dashboard updates to Active Duty<br/>'Go Active' button enabled"]
```

---

### 2. Worker Daily Availability & Shift Telematics Flowchart

```mermaid
flowchart TD
    Worker["Verified Worker on Dashboard"] --> ClickToggle{"Clicks Availability Toggle"}
    
    ClickToggle -- "When INACTIVE -> Go Active" --> CheckEligible{"Server checks eligibility"}
    CheckEligible -- "Unverified / Rejected" --> Err403["403 Forbidden: Duty restricted"]
    CheckEligible -- "Verified & Active" --> StartSession["1. Open new worker_sessions record (work_date: CURRENT_DATE)<br/>2. Update users: availability_status='ACTIVE'<br/>3. Start client-side timer"]
    
    StartSession --> ShiftRunning["Worker Shift In-Progress"]
    ShiftRunning --> HeartbeatPing["Background Heartbeat every 90s<br/>POST /api/v1/worker/availability/heartbeat"]
    ShiftRunning --> MidnightCheck{"Crosses Midnight (00:00 UTC)?"}
    
    MidnightCheck -- "Yes" --> MidnightSplit["Automated Split:<br/>1. Close session at 23:59:59 (closure: midnight_split)<br/>2. Open new session slice at 00:00:00 for new day"]
    MidnightSplit --> ShiftRunning
    
    ShiftRunning --> TimeoutCheck{"Heartbeat age > 2 hours?"}
    TimeoutCheck -- "Yes" --> AutoClose["Auto-close session (closure: inactivity_timeout)<br/>users.availability_status set to INACTIVE"]
    
    ClickToggle -- "When ACTIVE -> Go Inactive" --> ManualClose["1. Compute exact elapsed seconds<br/>2. Close worker_sessions record (closure: worker_toggle)<br/>3. Update users: availability_status='INACTIVE'"]
    ManualClose --> ShiftEnded["Worker Off-Duty (Shift logged in PostgreSQL)"]
```

---

### 3. Admin Live Monitoring & Session Oversight Flowchart

```mermaid
flowchart TD
    Admin["Admin opens Workforce -> Availability Tab"] --> FetchLive["GET /api/v1/admin/workers/availability/live"]
    FetchLive --> ScopeFilter["Filter by Admin Municipality Jurisdiction"]
    ScopeFilter --> RenderTable["Render Live Monitoring Table:<br/>- Live Pulse Badges (🟢 Online / ⚪ Inactive)<br/>- Live Shift Timer tickers<br/>- Today's Total Formatted Hours"]
    
    RenderTable --> FilterControls{"Admin applies filters"}
    FilterControls --> QuickSearch["Search by Name / Email"]
    FilterControls --> StatusFilter["Filter by All / Active Duty / Inactive"]
    
    RenderTable --> ViewHours["Admin clicks 'Hours' on worker"]
    ViewHours --> FetchHistory["GET /api/v1/admin/workers/:id/working-hours"]
    FetchHistory --> RenderModal["Open Working Hours Modal:<br/>- 7-Day Visual Bar Chart<br/>- Shift History by Date<br/>- Active vs Completed Breakdowns"]
    
    RenderTable --> RemoteClose["Admin clicks 'End Shift' on active worker"]
    RemoteClose --> ConfirmClose["POST /api/v1/admin/workers/:id/close-session"]
    ConfirmClose --> TerminateSession["1. Terminate open session slice (closure: admin_manual_close)<br/>2. Set worker availability_status='INACTIVE'<br/>3. Dispatch live workforce update event"]
```

---



## 🔌 REST API Reference

All protected endpoints require a valid Bearer token in the request header:
`Authorization: Bearer <JWT_TOKEN>`

### Authentication Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Public | Registers a citizen, worker, or admin (requires secret key for admin). |
| `POST` | `/api/v1/auth/login` | Public | Validates credentials and returns JWT + user profile including verification status. |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieves current authenticated user record with joined verification details. |

### Worker Duty & Availability Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/worker/availability` | Worker | Returns worker's live availability status, eligibility, active session, and today's accumulated hours. |
| `POST` | `/api/v1/worker/availability/toggle` | Worker | Toggles duty status between `ACTIVE` and `INACTIVE` with server-side approval check. |
| `POST` | `/api/v1/worker/availability/heartbeat` | Worker | Heartbeat ping to prevent timeout while on duty. |

### Admin Workforce Management Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/workers` | Admin | Retrieves all workers within the admin's municipal jurisdiction. |
| `GET` | `/api/v1/admin/workers/pending` | Admin | Lists pending worker verification requests. |
| `GET` | `/api/v1/admin/workers/pending-count` | Admin | Returns count of pending worker approvals for badge display. |
| `GET` | `/api/v1/admin/workers/:id` | Admin | Detailed view of a specific worker's profile and audit history. |
| `POST` | `/api/v1/admin/workers/:id/approve` | Admin | Transactionally approves a worker and allocates municipal zone. |
| `POST` | `/api/v1/admin/workers/:id/reject` | Admin | Rejects a worker registration with required reason string. |
| `GET` | `/api/v1/admin/workers/availability/live` | Admin | Live telematics roster showing active shifts, elapsed times, and today's totals. |
| `GET` | `/api/v1/admin/workers/:id/working-hours`| Admin | Returns historical shift sessions, weekly charts, and daily summaries. |
| `POST` | `/api/v1/admin/workers/:id/close-session`| Admin | Remotely terminates an open worker shift with audit reason `admin_manual_close`. |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Core** | React 18, Vite, React Router v6 |
| **State & Context** | React Context API (`AuthContext`, `LocationContext`) |
| **Styling & Design** | Tailwind CSS, Lucide React, Glassmorphic UI Tokens |
| **Maps & GIS** | Leaflet, React-Leaflet, OpenStreetMap API |
| **Backend Core** | Node.js (ES Modules), Express.js 5 |
| **Database** | PostgreSQL (relational + spatial indexes) via `pg` pool |
| **Validation & Auth** | Zod schemas, BCrypt.js, JSON Web Tokens (JWT) |

---

## 💻 Local Setup & Development

### 1. Prerequisites
- **Node.js** v18+ (tested with v20 / v24)
- **PostgreSQL** v14+ (local service or managed cloud instance)

### 2. Environment Variables Configuration

**Backend (`/backend/.env`)**:
```env
PORT=5000
DATABASE_URL=postgres://username:password@localhost:5432/trashtrack
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
ADMIN_SIGNUP_SECRET=admin_secret_key_123
```

**Frontend (`/frontend/.env`)**:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 3. Install Dependencies & Run Database Migrations

```bash
# 1. Setup Backend
cd backend
npm install

# Run database schema migrations (001 through 005)
node apply-migration-004.mjs

# 2. Setup Frontend
cd ../frontend
npm install
```

### 4. Running Locally

```bash
# Terminal 1: Backend Dev Server
cd backend
npm run dev

# Terminal 2: Frontend Vite Server
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Quality Assurance

The codebase includes targeted automated test suites covering authentication, role verification, worker registration, and approval lifecycles.

```bash
# Run Worker Approval & Verification Test Suite
cd backend
node test-worker-approval.mjs

# Build and Validate Frontend Bundle
cd ../frontend
npm run build
```

---

## 📄 License

This project is licensed under the **ISC License**.
