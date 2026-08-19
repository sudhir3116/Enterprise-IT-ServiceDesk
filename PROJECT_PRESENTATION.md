# Product Support Portal — Technical Project Presentation Guide

> **Target Interview**: Cartrabbit Product Support Engineer Role  
> **Presenter**: Sudhir S  
> **System**: Production-Grade Multi-Tenant ITSM & Product Support Engineering Platform (MERN Stack)

---

## 1. Executive Summary & Problem Statement

Support Engineers at high-growth SaaS platforms like **Cartrabbit** face complex challenges:
- **Disjointed Workflows**: Customer support tickets live in one system, bug reports in Jira/GitHub, SLA tracking in a spreadsheet, and Knowledge Base articles elsewhere.
- **SLA Breach Risks**: High-priority merchant issues (e.g. webhook synchronization crashes or checkout payment failures) require immediate automated SLA escalation and skill-matched routing.
- **Product Feedback Gap**: Support engineers identify recurring customer feature requests, but lack structured tools to upvote, quantify demand, and feed requirements directly into the product roadmap.

### The Solution: Product Support Portal
A unified enterprise SaaS platform that bridges customer support, technical investigation, developer handoff, knowledge capture, and product feedback into a single loop:

$$\text{Merchant Issue} \longrightarrow \text{Auto Routing \& SLA} \longrightarrow \text{Technical Investigation} \longrightarrow \text{Bug Lifecycle} \longrightarrow \text{Knowledge Capture} \longrightarrow \text{Product Roadmap}$$

---

## 2. Technical System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 REACT 19 FRONTEND                                 |
|     Vite 8 | CSS Tokens Design System | Recharts v3 | Axios Bearer Auth           |
+-----------------------------------------+-----------------------------------------+
                                          |
                         HTTPS / REST API (JWT Bearer Token)
                                          |
+-----------------------------------------v-----------------------------------------+
|                                EXPRESS 5 API GATEWAY                              |
|   [Helmet Security] [CORS] [Rate Limiter] [Winston Logger] [Swagger /api-docs]    |
+-----------------------------------------+-----------------------------------------+
|  AUTHENTICATION & RBAC                  | TICKET & SLA ENGINE                     |
|  - JWT Access + Refresh Tokens          - Impact x Urgency Priority Matrix        |
|  - Role Normalizer (Admin/Eng/Dev/Cust) - Background SLA Breach Monitor Job       |
+-----------------------------------------+-----------------------------------------+
|  BUG & DEVELOPER WORKFLOW               | FEEDBACK & KNOWLEDGE BASE               |
|  - Ticket -> Bug Report Converter       - Atomic Upvoting Engine                  |
|  - Dev Status Lifecycle                 - Ticket -> Draft KB Article Converter    |
+-----------------------------------------+-----------------------------------------+
                                          |
                                Mongoose v9 ODM Driver
                                          |
+-----------------------------------------v-----------------------------------------+
|                                MONGODB ATLAS CLOUD DB                             |
| Collections: Users, Organizations, Tickets, SlaPolicies, BugReports,              |
| ProductFeedbacks, KnowledgeArticles, AuditLogs, AutomationRules                   |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Feature Walkthrough (Demo Script)

### Step 1: Customer Self-Service & Ticket Submission (`customer@shopdemo.com`)
- Merchant logs into the **Customer Portal** to report `TKT-1001`: *"Shopify Checkout Webhook Sync Failing on High Volume"*.
- The SLA engine evaluates Impact (`High`) $\times$ Urgency (`High`) to automatically compute priority **`Critical`** with a **30-minute first response deadline** and **4-hour resolution deadline**.
- Automatic ticket routing engine assigns ticket to `engineer@cartrabbit.com` based on skills (`Software`) and workload balancing.

### Step 2: Support Engineer Technical Investigation (`engineer@cartrabbit.com`)
- Engineer accesses the **Support Workspace** (`/engineer/assigned`) and opens `TKT-1001`.
- Expands the **Bug Investigation Panel** to document reproduction steps, technical logs (`Redis queue memory leak`), and severity.
- Clicks **"Create Bug Report"** $\rightarrow$ Auto-generates `BUG-1001` linked directly to `TKT-1001` for developer handoff.
- Posts private internal staff note explaining findings to the team.

### Step 3: Developer Collaboration & Fix Verification (`developer@cartrabbit.com`)
- Developer logs into **My Bug Queue** (`/developer/bugs`) showing `BUG-1001`.
- Inspects reproduction steps and technical notes, updates status `Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Fixed`, and posts technical confirmation.

### Step 4: Resolution & One-Click Knowledge Capture
- Engineer marks `TKT-1001` as **`Resolved`** with resolution summary.
- Clicks **"Create Knowledge Article"** $\rightarrow$ System auto-populates a draft KB article *"Troubleshooting Webhook Batch Sync Delays"* linking `sourceTicketId`.
- Merchant receives notification, reviews resolution, and provides a **5-star CSAT rating**.

### Step 5: Product Feedback Loop & Roadmap (`admin@cartrabbit.com`)
- Merchant submits feature request: *"Support GraphQL Subscriptions for Real-Time Inventory Updates"*.
- Community upvotes request (12 votes).
- Admin reviews in **Product Feedback Management** (`/admin/feedback`), changes status to **`Planned`**, and attaches an official roadmap response.

---

## 4. Technical Decision Matrix

| Architectural Challenge | Engineering Decision | Business Rationale |
|---|---|---|
| **Data Security & Multi-Tenancy** | Mongo `organizationId` filter injection on all queries | Prevents cross-tenant leaks in SaaS multi-organization deployments. |
| **Authentication Security** | JWT Access Token (15m) + HttpOnly Refresh Token Cookie (7d) | Mitigates XSS token theft while providing seamless session renewal. |
| **Production Error Handling** | Centralized `errorHandler.js` + `AppError` subclasses | Standardizes error payload shape `{ success: false, errorCode, message }`. |
| **Operational Visibility** | Winston JSON logger (`logs/combined.log`, `logs/error.log`) | Provides audit trail and integration points for ELK/Datadog monitoring. |
| **API Maintainability** | Swagger / OpenAPI 3.0 mounted at `/api-docs` | Provides interactive developer documentation for frontend & partner integrations. |

---

## 5. Summary of Cartrabbit Demo Credentials

| Role | Email | Password | Primary URL |
|---|---|---|---|
| **Admin** | `admin@cartrabbit.com` | `Password123!` | `http://localhost:5173/admin/dashboard` |
| **Support Engineer** | `engineer@cartrabbit.com` | `Password123!` | `http://localhost:5173/engineer/dashboard` |
| **Developer** | `developer@cartrabbit.com` | `Password123!` | `http://localhost:5173/developer/bugs` |
| **Merchant / Customer** | `customer@shopdemo.com` | `Password123!` | `http://localhost:5173/employee/dashboard` |
