# System Design Document — Product Support Portal

## 1. System Architecture & Data Flow

```
[Customer Browser] ────► [Vite SPA / React 19] ────► [Express 5 API Gateway]
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                            ▼                                   ▼
                                  [Service Layer Logic]             [Security & Middleware]
                                  - AuthService                     - Helmet / CORS
                                  - TicketService                   - RateLimiter
                                  - RoutingService                  - AuthMiddleware (RBAC)
                                  - SlaService                      - ErrorHandler
                                  - BugService                      - Winston Logger
                                  - FeedbackService                             │
                                            │                                   │
                                            └─────────────────┬─────────────────┘
                                                              ▼
                                                   [MongoDB Atlas Cloud DB]
```

---

## 2. Multi-Tenancy & Data Isolation Model

- Every collection storing tenant data (`Ticket`, `BugReport`, `ProductFeedback`, `KnowledgeArticle`, `AutomationRule`) maintains an indexed `organizationId` reference field.
- The `authMiddleware` extracts `req.user.organizationId` upon JWT verification.
- Controllers enforce query scoping:
  ```javascript
  const filter = { isDeleted: false };
  if (req.user.organizationId && req.user.role !== 'admin') {
    filter.organizationId = req.user.organizationId;
  }
  ```

---

## 3. SLA Calculation & Breach Monitoring Engine

- **Priority Calculation**: Computed on pre-save using an Impact $\times$ Urgency matrix:
  - High Impact + High Urgency = `Critical` (4-hour SLA)
  - High Impact + Medium Urgency = `High` (24-hour SLA)
  - Medium Impact + Medium Urgency = `Medium` (72-hour SLA)
  - Low Impact / Low Urgency = `Low` (120-hour SLA)
- **Breach Monitoring**: A cron job (`jobs/slaMonitor.js`) runs every 5 minutes querying overdue active tickets, marking `slaBreached: true`, pushing history timeline entries, and logging audit events.

---

## 4. Ticket-to-Bug-to-Knowledge Resolution Loop

```
1. Ticket Created ──► 2. Investigation Saved ──► 3. Bug Report (BUG-XXXX)
                                                        │
                                                        ▼
5. Knowledge Article ◄── 4. Fix Verified & Closed ◄── 4. Developer Fixes
```

---

## 5. Security & Threat Model

| Threat | Mitigation Applied |
|---|---|
| **Stale JWT Authorization** | Startup validation via `GET /api/auth/me` verifies account status & approval flag on every refresh. |
| **Unapproved User Access** | Admin approval workflow (`accountStatus: 'pending_approval'`) blocks unapproved users with HTTP 403 `PENDING_APPROVAL`. |
| **Cross-Tenant Data Leakage** | Router-level RBAC + controller-level `organizationId` query isolation. |
| **File Upload Exploits** | Multer file extension whitelist, MIME-type verification, and 10MB size limit. |
| **Brute Force Attacks** | `express-rate-limit` windowing per IP address. |
