# Product Support Portal — Enterprise SaaS ITSM & Support Engineering Platform

> A production-grade Enterprise Product Support Engineering & Incident Resolution Platform built with the MERN stack (MongoDB Atlas, Express v5, React 19, Node.js v20). Engineered to demonstrate Zendesk, Freshdesk, and ServiceNow level technical capabilities.

---

## 📌 Executive Overview & Cartrabbit Demo Credentials

The **Product Support Portal** bridges customer support, support engineering, development, and product management into a single unified SaaS workflow:

$$\text{Merchant Issue} \longrightarrow \text{Auto Routing \& SLA} \longrightarrow \text{Technical Investigation} \longrightarrow \text{Bug Lifecycle} \longrightarrow \text{Knowledge Capture} \longrightarrow \text{Product Roadmap}$$

### 🔐 Demo Credentials (Seeded for Live Demonstration)

| Role | Email | Password | Primary Workspace URL |
|---|---|---|---|
| **Admin** | `admin@cartrabbit.com` | `Password123!` | `http://localhost:5173/admin/dashboard` |
| **Support Engineer** | `engineer@cartrabbit.com` | `Password123!` | `http://localhost:5173/engineer/dashboard` |
| **Developer** | `developer@cartrabbit.com` | `Password123!` | `http://localhost:5173/developer/bugs` |
| **Merchant / Customer** | `customer@shopdemo.com` | `Password123!` | `http://localhost:5173/employee/dashboard` |

---

## 🛠️ Key Platform Modules

- **Authentication & Security**: Dual JWT access + HttpOnly refresh token rotation, Google OAuth 2.0, startup session validation (`GET /api/auth/me`), and admin approval workflow.
- **Multi-Tenant Data Isolation**: Multi-tenant database architecture with strict `organizationId` query isolation across all endpoints.
- **SLA Policy Engine**: Dynamic ITIL priority computation (Impact $\times$ Urgency matrix), response/resolution target deadlines, and automated background breach monitoring (`jobs/slaMonitor.js`).
- **Automated Ticket Routing**: Skill-matched and workload-balanced auto-assignment algorithm matching engineer team capabilities.
- **Developer Bug Handoff**: One-click bug report creation (`BUG-XXXX`), severity tracking, reproduction steps capture, and developer lifecycle status updates (`Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Fixed`).
- **Product Feedback Portal**: Merchant feature request submission, atomic upvoting, status updates (`Planned`, `In Development`, `Released`), and official admin responses.
- **Knowledge Base Auto-Conversion**: Convert resolved tickets into draft Knowledge Base articles with auto-populated markdown content.

---

## 📐 System Architecture Diagram

```
+-----------------------------------------------------------------------+
|                             FRONTEND SPA                              |
|   React 19 + Vite 8 | AuthContext | ThemeContext | Enterprise Shell  |
+-----------------------------------+-----------------------------------+
                                    |
                         HTTPS / REST API (JWT Bearer)
                                    |
+-----------------------------------v-----------------------------------+
|                         EXPRESS BACKEND (v5)                          |
|  [Helmet CSP] [CORS] [Rate Limiter] [Winston Logger] [Swagger Docs]   |
+-----------------------------------+-----------------------------------+
|  AUTH & RBAC ROUTER               | TICKET & SLA ENGINE ROUTER        |
|  - JWT + Refresh Token            - Impact x Urgency Matrix           |
|  - Role Normalizer                - SLA Monitor Background Job        |
+-----------------------------------+-----------------------------------+
|  BUG & DEV WORKFLOW ROUTER        | FEEDBACK & KB ROUTER              |
|  - Ticket -> Bug Converter        - Upvoting & Admin Roadmap          |
|  - Dev Status Machine             - Ticket -> KB Converter            |
+-----------------------------------+-----------------------------------+
                                    |
                           Mongoose v9 Driver
                                    |
+-----------------------------------v-----------------------------------+
|                           MONGODB ATLAS DB                            |
| Collections: Users, Organizations, Tickets, SlaPolicies, BugReports,  |
| ProductFeedbacks, KnowledgeArticles, AuditLogs, AutomationRules       |
+-----------------------------------------------------------------------+
```

---

## 🚀 Quick Start & Seed Guide

### 1. Backend Setup & Demo Seeding
```bash
cd backend
npm install
node scripts/seedDemoData.js   # Seeds Cartrabbit Commerce demo data
npm run dev                    # Runs backend server on port 8001
```
- Interactive Swagger API Documentation: `http://localhost:8001/api-docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev                    # Runs Vite dev server on port 5173
```

### 3. Run Automated Integration Test Suite
```bash
cd backend
npm test                       # Runs Jest + Supertest integration suite
```

---

## 📄 Key Documentation Guides

- **[PROJECT_PRESENTATION.md](file:///Users/sudhir31/Documents/VSCode/Projects/Product%20Support%20Portal/PROJECT_PRESENTATION.md)** — Complete technical presentation guide and demo walkthrough script for Cartrabbit interviewers.
- **[INTERVIEW_CHEAT_SHEET.md](file:///Users/sudhir31/Documents/VSCode/Projects/Product%20Support%20Portal/INTERVIEW_CHEAT_SHEET.md)** — 2-minute elevator pitch, whiteboard architecture breakdown, and Top 10 technical Q&A.
- **[SYSTEM_DESIGN.md](file:///Users/sudhir31/Documents/VSCode/Projects/Product%20Support%20Portal/SYSTEM_DESIGN.md)** — In-depth technical system design document covering multi-tenancy isolation, SLA calculation algorithm, and threat model.