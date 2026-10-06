# IT Asset Management System

An IT asset lifecycle system for **Dizon Farms Produce, Inc.** — tracking laptops, printers, monitors, network devices, software licenses, and warranties from procurement through disposal.

Built as a layered, auditable web application: an interactive dashboard on top, a documented audit trail underneath, and every state change recorded against the user who made it.

---

## Table of Contents

- [Overview](#overview)
- [Screens](#screens)
- [Feature Summary](#feature-summary)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Audit Trail](#audit-trail)
- [Roles and Access](#roles-and-access)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Roadmap](#roadmap)

---

## Overview

IT assets at Dizon Farms were tracked across spreadsheets, email threads, and verbal handovers. The consequences were predictable: duplicate records, no reliable owner for a device, warranty expirations discovered only after the fact, and no way to answer *"who changed this record, and when?"*

This system replaces that with a single source of truth:

- **One record per asset**, identified by a unique asset tag, with serial number, manufacturer, model, department, location, cost, and warranty dates.
- **An interactive dashboard** showing inventory by category and department, warranty exposure over the next twelve months, and the current assignment register.
- **A complete audit trail** — append-only, enforced at the database level, recording every create, edit, delete, login, and logout against a named user.
- **Server-side authentication and authorization** using bcrypt password hashing and JWT session tokens.

---

## Screens

| Screen | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/` | KPI cards, inventory charts, warranty exposure, recent activity |
| Assets | `/assets` | Search, add, edit, delete, and export the asset register |
| Assignments | `/assignments` | Issue assets to employees, record returns |
| Audit Logs | `/auditlogs` | Searchable, filterable history of every recorded action |
| Login | `/login` | Sign in, or request a new account |

---

## Feature Summary

| # | Requirement | How it is met |
| --- | --- | --- |
| 1 | Interactive dashboard | Donut chart of assets by category, bar chart by department, line chart of warranty expirations over twelve months, four clickable KPI cards, and filterable activity panels |
| 2 | Company logo | `Dizon-Logo.png` pinned to the upper-left of the sidebar with the system name and company subtitle beneath it |
| 3 | Maintainable, editable code | Layered architecture (`domain` / `application` / `infrastructure` / `presentation`), one responsibility per file, documented in `CLAUDE.md` |
| 4 | Full traceability | Append-only `audit_logs` table recording actor, action, entity, before/after values, and timestamp — with a database trigger that rejects any UPDATE or DELETE |
| 5 | Export, import, image handling | CSV export of the filtered register; extension points documented for XLSX import and asset photography |
| 6 | User accounts | Email and password sign-in, self-service account requests held in a pending state until approved |
| 7 | AI assistant | Documented as a roadmap item, scoped behind the same repository interfaces so it can query real records rather than infer them |
| 8 | Smart search | Case-insensitive search across asset tag, type, category, manufacturer, model, serial number, status, and department |

---

## Architecture

The codebase follows a strict layered architecture. Each layer depends only on the layer beneath it, and the domain layer depends on nothing at all.

```
React 18  (presentation — pages, components, hooks)
   │
   ▼
REST API  (Express 5)
   │
   ▼
Routes  ──  HTTP entry points only
   │
   ▼
Controllers  ──  thin adapters, no business logic
   │
   ▼
Application services  ──  use cases (CreateAsset, UpdateAsset, AuthService)
   │
   ▼
Domain  ──  entities and repository interfaces (framework-free)
   │
   ▼
Repository ports
   │
   ▼
Knex repositories  (infrastructure)
   │
   ▼
PostgreSQL 18
```

**Enforced rules** (see `CLAUDE.md`):

- Domain code never imports Express, Knex, or the PostgreSQL driver.
- Controllers contain no business logic; routes never query the database.
- Knex and all persistence live in `infrastructure`.
- Authorization is enforced server-side, not by hiding UI.
- Important operations always create an audit record.
- Secrets live in environment variables, never in source.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, React Router 6, Vite, Recharts |
| Backend | Node.js, Express 5, TypeScript |
| Data access | Knex 3 query builder and migrations |
| Database | PostgreSQL 18 |
| Auth | bcrypt password hashing, JSON Web Tokens |
| Testing | Vitest, Supertest |
| Source control / CI | Git, GitHub, GitHub Actions |

---

## Database Schema

Core tables:

**`assets`** — the register.
`id`, `asset_tag` (unique), `asset_type`, `category`, `manufacturer`, `model`, `serial_number`, `status`, `department`, `location`, `purchase_date`, `purchase_cost`, `supplier`, `warranty_start`, `warranty_end`, `image_url`, `notes`, `created_by`, `created_at`, `updated_by`, `updated_at`

**`users`** — system accounts.
`id`, `full_name`, `email` (unique), `password` (bcrypt hash), `role`, `department_id`, `is_active`, `created_at`

**`asset_assignments`** — custody history.
`id`, `asset_tag`, `employee_name`, `department`, `assigned_by`, `assigned_at`, `returned_at`

**`audit_logs`** — append-only history.
`id`, `occurred_at`, `user_name`, `action`, `table_name`, `record_id`, `old_value`, `new_value`, `ip_address`

Asset status values in use: `Available`, `Issued`, `Maintenance`, `Retired`, `Disposed`.

---

## Getting Started

### Prerequisites

- Node.js 24 LTS or later
- PostgreSQL 18 running locally
- Git

### 1. Clone the repository

```bash
git clone https://github.com/manuelcalderoniv-bunso/ITAssetManagement.git
cd ITAssetManagement
```

### 2. Install dependencies

```bash
cd backend
npm install

cd ../frontend/frontend-ui
npm install
cd ../..
```

### 3. Create the database

In pgAdmin or `psql`, create the database and the dedicated application user:

```sql
CREATE DATABASE "IT_Asset_Management";

CREATE USER itasset_user WITH PASSWORD 'your-password-here';

GRANT CONNECT ON DATABASE "IT_Asset_Management" TO itasset_user;
GRANT USAGE ON SCHEMA public TO itasset_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO itasset_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO itasset_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO itasset_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO itasset_user;
```

### 4. Configure environment variables

Copy the example file and fill in your values:

```bash
cd backend
cp .env.example .env
```

### 5. Run both servers

Two terminals are required.

**Terminal 1 — backend API:**

```bash
cd backend
npm run dev
```

Expect: `Server running on port 3000`

**Terminal 2 — frontend:**

```bash
cd frontend/frontend-ui
npm run dev
```

Expect: `Local: http://localhost:5173/`

Open `http://localhost:5173` and sign in.

### 6. Create the first account

Use the **Create Account** link on the sign-in screen to register. New accounts are created inactive, so an administrator must activate the first one:

```sql
UPDATE users SET is_active = true, role = 'Super Admin'
WHERE email = 'your.email@dizonfarms.example';
```

All subsequent accounts can be approved from within the system.

---

## Environment Variables

`backend/.env` — **never committed to source control**.

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `IT_Asset_Management` |
| `DB_USER` | Application database user | `itasset_user` |
| `DB_PASSWORD` | Application database password | *(secret)* |
| `JWT_SECRET` | Token signing key — long and random | *(secret)* |
| `JWT_EXPIRES_IN` | Session lifetime | `8h` |

The repository ships a `.env.example` with the same keys and empty values.

---

## API Reference

All endpoints are served under `/api`.

### Assets

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/assets` | List all assets |
| `POST` | `/api/assets` | Create an asset |
| `GET` | `/api/assets/tag/:tag` | Fetch one asset by tag |
| `PUT` | `/api/assets/:tag` | Update an asset |
| `DELETE` | `/api/assets/:tag` | Delete an asset |
| `POST` | `/api/assets/:tag/assign` | Issue an asset to an employee |

### Dashboard

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/dashboard/stats` | KPI totals |
| `GET` | `/api/dashboard/recent-activities` | Latest audit entries |
| `GET` | `/api/dashboard/assignment-history` | Assignment register |
| `GET` | `/api/dashboard/by-category` | Inventory grouped by category |
| `GET` | `/api/dashboard/by-department` | Inventory grouped by department |
| `GET` | `/api/dashboard/warranty-expiry` | Warranty expirations over twelve months |

### Audit

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/audit-logs` | Full audit history |
| `POST` | `/api/audit/logout` | Record a sign-out |
| `GET` | `/api/audit/assets/:tag` | History for one asset |
| `GET` | `/api/audit/user/:email` | History for one user |

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Sign in, returns a JWT |
| `POST` | `/api/auth/register` | Request a new account |
| `GET` | `/api/auth/me` | Current user profile |

Interactive API documentation is available at `http://localhost:3000/api-docs` while the backend is running.

---

## Audit Trail

The audit trail is the backbone of the system's governance claim, and it is enforced at two levels.

**In the database.** A trigger rejects any attempt to modify or delete an audit record:

```sql
CREATE OR REPLACE FUNCTION audit_logs_no_modify() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_no_modify();
```

**In the application.** A single service writes every record, so no feature can forget to log:

| Field | Records |
| --- | --- |
| `occurred_at` | UTC timestamp of the action |
| `user_name` | The signed-in account that performed it |
| `action` | `Create`, `Edit`, `Delete`, `View`, `Export`, `Import`, `Login`, `Logout` |
| `table_name` | The entity affected |
| `record_id` | The specific record |
| `old_value` | State before the change (JSON) |
| `new_value` | State after the change (JSON) |
| `ip_address` | Source address |

Because the trail cannot be rewritten, it is suitable for both internal review and external audit.

---

## Roles and Access

Authorization is enforced on the server for every protected operation.

| Role | Capabilities |
| --- | --- |
| `IT Support` | Add, edit, assign, and update assets; run imports and exports |
| `IT Manager` | Everything above, plus approve accounts and view the full audit trail |
| `Super Admin` | Everything above, plus user and role administration |

No role can alter or delete an audit record — including `Super Admin`. That restriction is deliberate, and it is what allows the trail to be trusted.

---

## Project Structure

```
ITAssetManagement/
├── backend/
│   └── src/
│       ├── domain/                     # entities and repository interfaces
│       │   ├── entities/
│       │   └── repositories/
│       ├── application/                # use cases
│       │   └── services/
│       ├── infrastructure/             # Knex, PostgreSQL, adapters
│       │   ├── database/
│       │   │   └── migrations/
│       │   └── repositories/
│       └── presentation/               # HTTP layer
│           ├── controllers/
│           ├── middlewares/
│           ├── routes/
│           ├── app.ts
│           └── server.ts
├── frontend/
│   └── frontend-ui/
│       └── src/
│           ├── api/                    # API client
│           ├── assets/                 # logo and images
│           ├── components/             # Layout, StatCard, ChartPanel, UserMenu, RequireAuth
│           ├── hooks/                  # useAuth
│           ├── lib/                    # exportCsv
│           └── pages/                  # Dashboard, Assets, Assignments, AuditLogs, Login
├── docs/                               # requirements, architecture, UAT
├── .github/workflows/                  # CI pipeline
├── CLAUDE.md                           # architecture rules and quality bar
└── README.md
```

---

## Development Workflow

Changes follow the standard SDLC defined for this project:

1. **Idea** — state the business problem.
2. **Requirements** — numbered functional requirements in `docs/01-requirements.md`.
3. **Backlog** — prioritised epics and stories.
4. **Architecture** — recorded in `docs/02-architecture.md`.
5. **Threat model** — recorded in `docs/03-threat-model.md`.
6. **Branch** — `feature/STORY-nnn-short-name`, branched from `development/wip`.
7. **Implement** — smallest vertical slice that satisfies the story.
8. **Test** — domain, application, repository, API, and frontend.
9. **Verify** — prove the behaviour end to end.
10. **Review** — architecture compliance, security, audit coverage.
11. **Pull request** — CI must pass before merge.
12. **UAT and release readiness** — documented in `docs/`.

Branching:

```
main                production-ready
 └── development/wip    integrated development
      └── feature/*     individual stories
```

---

## Roadmap

| Item | Notes |
| --- | --- |
| Excel and CSV import wizard | Column mapping, validation report, and a dry-run preview before commit |
| Asset image upload | Drag-and-drop with preview, bound to the asset record; storage adapter already scoped in `infrastructure` |
| PDF report generation | Printable warranty and inventory reports with the company logo |
| Licence and warranty modules | Dedicated registers with seat usage and renewal tracking |
| Smart search and voice search | Web Speech API integration over the existing search index |
| AI assistant | Natural-language queries answered strictly from live records, with citations back to the underlying rows |

Each item is designed to slot into the existing layers without disturbing the working system.

---

<div align="center">

**IT Asset Management System**
Dizon Farms Produce, Inc.

</div>
