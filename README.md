# Unikart — Campus Bookstore & Resource Sharing Platform (v2.0)

> Complete End-to-End Enterprise Delivery in accordance with **Unikart SRS v2.0** (Course Instructor: Prof. M. M. Gore, Department of Computer Science & Engineering, Motilal Nehru National Institute of Technology Allahabad).

---

## 1. System Overview & Architecture

Unikart is a multi-campus, multi-store textbook and academic material circulation platform designed to serve collegiate ecosystems (MNNIT Allahabad, IIIT Allahabad, University of Allahabad). It enables students and faculty to buy textbooks, borrow for flexible durations (14, 30, 45 days), sell used study materials, manage university digital wallets, settle overdue fines, and track store order pick-ups.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS 16.4 FRONTEND (App Router)                   │
│   React 19 · Tailwind CSS v4 · TypeScript · Lucide · Radix UI · Sonner      │
│   Port: 3000  ·  API Client: lib/api-client.ts  ·  Context: lib/auth-context │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / JSON (JWT Bearer Auth)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   SPRING BOOT 3.2.5 ENTERPRISE BACKEND                      │
│   Java 17 · Spring Security 6 (BCrypt strength 12, JWT) · JPA / Hibernate   │
│   Port: 8088 · Context-Path: /api/v1 · Flyway Migrations (V1..V7)           │
│                                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌────────────────┐ │
│  │ Auth & 2FA Engine       │  │ Order & Inventory     │  │ Double-Entry   │ │
│  │ (Lockout & Audit Chain) │  │ (Copy-level checkout) │  │ Wallet Ledger  │ │
│  └─────────────────────────┘  └───────────────────────┘  └────────────────┘ │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌────────────────┐ │
│  │ Borrow & Fines Engine   │  │ Lifecycle Automations │  │ Admin & Stores │ │
│  │ (Handover timestamp)    │  │ (@Scheduled Cron Jobs)│  │ (Multi-campus) │ │
│  └─────────────────────────┘  └───────────────────────┘  └────────────────┘ │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ JDBC
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL 18 DATABASE                              │
│   Database: `unikart` on localhost:5432                                     │
│   Enforces strict foreign keys, check constraints & immutability triggers   │
│   Audit Logs: Tamper-evident cryptographic SHA-256 hash chains              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Demo User Credentials

The database is pre-seeded with institutions, stores, catalog books, and authorized accounts:

| Role | Email | Password | 2FA Required? | Default Demo OTP | Context / Store |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Student (Customer)** | `aryan.20224031@mnnit.ac.in` | `password123` | No | — | MNNIT Allahabad (₹3,500 Balance) |
| **Store Manager** | `priya.nair@unikart.in` | `password123` | **Yes (Staff 2FA)** | Auto-generated or `482100` | Unikart Central Store — MNNIT |
| **Platform Admin** | `rahul.verma@unikart.in` | `password123` | **Yes (Staff 2FA)** | Auto-generated or `482100` | All Institutions / 4 Campus Stores |

*Note: The login page includes a one-click "Fill Demo Credentials" button for instant switching between Customer, Store Manager, and Admin roles.*

---

## 3. How to Run the Project

### Prerequisites
- **Java 17+** (Eclipse Adoptium OpenJDK 17 verified)
- **Maven 3.9+**
- **Node.js 18+** / npm
- **PostgreSQL 18** running locally on port `5432` with database `unikart` (password `5658` or as configured in `backend/src/main/resources/application.yml`).

---

### Step 1: Start the Spring Boot Backend

Open a terminal in the root directory:

```powershell
cd backend
mvn spring-boot:run
```

The Spring Boot backend will start on **`http://localhost:8088/api/v1`**.
- Flyway automatically validates and runs all database migrations (`V1` through `V7`).
- Scheduled lifecycle automations for pickup expiry, overdue fine calculation, and DPDP data retention purging are enabled and active.

---

### Step 2: Start the Next.js Frontend

Open a second terminal in the project root:

```powershell
npm run dev
```

Visit **`http://localhost:3000`** in your browser.
- Open **`/login`** to sign in as student, store manager, or platform administrator.
- Open **`/register`** to test whitelisted institutional onboarding.

---

## 4. Key SRS Requirements Implemented & Verified

### Security & Authentication
- **AUTH-01..08**: University email domain validation matching authorized institutional member lists.
- **BCrypt Password Hashing**: Strength 12 salt rounds for credential security.
- **Login Throttling & Lockout**: 5 failed login attempts trigger an automatic 15-minute lockout with audit event recording.
- **Staff Two-Factor Authentication (2FA)**: Mandatory 6-digit OTP verification for Store Managers and Platform Admins prior to issuing the full session JWT.
- **Tamper-Evident Audit Logging (AUD-01)**: Every state mutation is cryptographically hashed with SHA-256 (`entry_hash = SHA256(prev_hash + actor + action + entity + state)`), forming an immutable hash chain.

### Core Inventory & Orders
- **Server-Side Copy Tracking (INV-01..06)**: Physical inventory tracked at the individual copy level (`AVAILABLE`, `ALLOCATED_ORDER`, `BORROWED`, `DAMAGED`).
- **Atomic Checkout & Multi-Store Order Splitting (CART-03..07)**: Single checkout containing items across multiple campus stores atomically splits into independent `store_orders` with separate fulfillment pipelines.
- **Idempotency Protection**: Every checkout, wallet top-up, and fine payment enforces idempotency keys (`Idempotency-Key` / payload) to prevent duplicate transactions.

### Wallet & Ledger
- **Append-Only Double-Entry Ledger (WAL-01..12)**: Database trigger `trg_wallet_ledger_append_only` strictly forbids `UPDATE` or `DELETE` operations on `wallet_transactions`. Balance is verified continuously against ledger entries.
- **UPI Top-Up & Bank Redemptions**: Top up funds, reserve balances during payouts, and credit automated deposit refunds upon return inspection.

### Borrow Lifecycle & Automation
- **Borrow Due-Date Calibration (BOR-01..04)**: Due dates start on physical handover timestamp (not at checkout), guaranteeing the student gets their full 14, 30, or 45 days.
- **Pickup Expiry Scheduled Task (FUL-02)**: Cancels uncollected self-pickup orders after 7 days, restocks inventory, and refunds deposits minus a 10% no-show fee.
- **Daily Overdue Fine Accrual (PEN-01..04)**: Accrues ₹15/day per overdue textbook and enforces fine dispute submission workflows.
- **DPDP Retention Hygiene (DAT-01..03)**: Automatically purges expired OTP tokens and ephemeral challenge states.

---

## 5. Verification & Automated Test Suite

### Backend Test Suite
Run the test suite with Maven:
```powershell
cd backend
mvn test
```
**Results:** `Tests run: 23, Failures: 0, Errors: 0, Skipped: 0` (100% Passing).

### Frontend Production Build
Run the Next.js production build:
```powershell
npm run build
```
**Results:** All 19 routes compiled and statically optimized with **0 errors**.
