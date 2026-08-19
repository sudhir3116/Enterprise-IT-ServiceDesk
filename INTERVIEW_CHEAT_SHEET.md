# Cartrabbit Product Support Engineer — Interview Cheat Sheet

> **Candidate**: Sudhir S  
> **Target Role**: Product Support Engineer @ Cartrabbit  
> **Project**: Product Support Portal (Enterprise SaaS MERN Application)

---

## 🎤 Part 1: 2-Minute Elevator Pitch ("What is Product Support Portal?")

> *"Product Support Portal is an enterprise-grade Product Support Engineering platform that I built to solve the fragmentation between customer support, technical incident investigation, engineering bug resolution, and product roadmap planning.*
> 
> *Unlike traditional single-purpose ticketing tools, this portal manages the full incident resolution lifecycle. When a merchant submits a critical ticket—such as a Shopify webhook sync failure—our platform automatically computes its SLA priority using an Impact $\times$ Urgency matrix, routes it to a skill-matched support engineer, and allows the engineer to document technical reproduction steps in an internal Investigation Drawer.*
> 
> *From there, the engineer can convert the issue into a formal Bug Report (`BUG-XXXX`) linked to the ticket, enabling seamless developer handoff. Once resolved, the engineer can convert the root cause analysis into a Knowledge Base article with one click, while merchants can upvote feature requests in a Product Feedback portal to guide product roadmap decisions.*
> 
> *It's built with Node.js, Express, React 19, and MongoDB, featuring multi-tenant data isolation, JWT refresh token security, Winston file logging, Swagger OpenAPI docs, and a 100% passing Jest integration test suite."*

---

## 🏗️ Part 2: Architecture Explanation (Whiteboard Walkthrough)

### Data Flow Overview
1. **Client Layer**: React 19 SPA powered by Vite 8 with enterprise CSS design system tokens. `AuthContext` validates JWT tokens on startup via `GET /api/auth/me`.
2. **API Gateway & Middleware Layer**: Express 5 application equipped with `helmet` security headers, `express-rate-limit` brute-force protection, `cors` domain validation, and custom `uploadMiddleware` (Multer with 10MB limit & MIME whitelist).
3. **Service Layer**: Decoupled business logic services (`authService`, `ticketService`, `routingService`, `slaService`, `bugService`, `feedbackService`) that handle transactional operations and trigger audit logging via `logAction()`.
4. **Database & Persistence Layer**: MongoDB Atlas cloud cluster with Mongoose v9 schemas, compound indexes (`organizationId + status`, `assignedDeveloper + status`), and full-text search capability.
5. **Background Jobs & Monitoring**: Background SLA monitor (`jobs/slaMonitor.js`) running cron sweeps every 5 minutes to detect deadline breaches, write audit records, and notify assignees.

---

## 💡 Part 3: Top 10 Technical Interview Questions & Answers

### Q1: How does multi-tenancy data isolation work in your backend?
**Answer**: Every collection that stores tenant data (`Ticket`, `BugReport`, `ProductFeedback`, `KnowledgeArticle`) includes an indexed `organizationId` reference. On every request, `authMiddleware` validates the JWT and attaches `req.user.organizationId`. In controller queries, we inject an explicit tenant filter:
```javascript
const filter = { isDeleted: false };
if (req.user.organizationId && req.user.role !== 'admin') {
  filter.$or = [{ organizationId: req.user.organizationId }, { organizationId: { $exists: false } }, { organizationId: null }];
}
```
This guarantees strict organization-level data boundaries across all API endpoints.

---

### Q2: How is the SLA priority and deadline calculated?
**Answer**: When a ticket is submitted, the system evaluates Impact (`High`, `Medium`, `Low`) and Urgency (`High`, `Medium`, `Low`) using an ITIL-aligned priority matrix:
- High Impact + High Urgency = `Critical` (First Response: 30 mins, Resolution: 4 hours)
- High Impact + Medium Urgency = `High` (First Response: 2 hours, Resolution: 24 hours)
The SLA engine queries `SlaPolicy` for the tenant to set `dueDate = createdAt + resolutionTime`. A background cron job (`jobs/slaMonitor.js`) runs every 5 minutes checking for `dueDate < Date.now()` and updates `slaBreached: true`.

---

### Q3: How does the developer bug handoff workflow function?
**Answer**: In `EngineerTicketDetails.jsx`, engineers expand the **Bug Investigation Panel** to document reproduction steps, app version, and technical notes. Clicking **"Create Bug Report"** triggers `POST /api/bugs`, which generates a sequential `BUG-XXXX` identifier, copies technical details, links `ticketId` to `BugReport`, and back-links `bugReportIds` on the source ticket. Developers access `/developer/bugs` showing only their assigned bugs to transition status (`Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Fixed`).

---

### Q4: How is security enforced on backend endpoints vs frontend routes?
**Answer**: Frontend protection in `App.jsx` uses `ProtectedRoute` to redirect unauthorized roles to `/unauthorized` or `/login`. However, because client-side protection can be bypassed, **all security is enforced at the Express router level**. Each route explicitly calls `protect` (JWT validation) and `requireRole("support_engineer", "admin", "developer")`. For example, customers requesting `GET /api/bugs` receive HTTP 403 Forbidden regardless of frontend state.

---

### Q5: How do you handle authentication and session expiration safely?
**Answer**: We implement a Dual-Token strategy:
- Short-lived **JWT Access Token** (15-minute expiration) sent in `Authorization: Bearer <token>` headers.
- Long-lived **Refresh Token** (7-day expiration) stored in an `HttpOnly`, `SameSite` cookie.
- On frontend startup, `AuthContext` calls `GET /api/auth/me` to verify user validity, account approval status (`isApproved: true`), and active role before rendering dashboards.

---

### Q6: How does automatic ticket routing assign tickets to engineers?
**Answer**: The `routingService.js` engine executes a 3-tier algorithm:
1. **Category/Skill Matching**: Filters engineers whose `team` or `department` matches the ticket's `category` (e.g. `Software`).
2. **Workload Balancing**: Counts active tickets (`status: { $in: ["New", "Assigned", "In Progress"] }`) per candidate engineer.
3. **Least-Loaded Assignment**: Assigns the ticket to the engineer with the lowest active queue count.

---

### Q7: How does one-click Knowledge Base article generation work?
**Answer**: When a ticket is marked `Resolved` or `Closed`, the engineer clicks **"Create Knowledge Article"** (`POST /api/tickets/:id/create-article`). The controller extracts `ticket.description`, `ticket.issueDetails.stepsToReproduce`, `ticket.issueDetails.expectedBehavior/actualBehavior`, and `ticket.resolutionSummary`, formats them into markdown, generates a slug, sets `status: "draft"`, and links `sourceTicketId`. The engineer can review and publish it from the Knowledge Base.

---

### 8. How is atomic upvoting implemented for Product Feedback?
**Answer**: In `ProductFeedback.js`, the `votes` field is an array of user `ObjectId`s. When `POST /api/feedback/:id/vote` is called, `feedbackService.js` checks if `req.user._id` already exists in `votes`. If present, it pulls the ID (unvote); if absent, it pushes the ID (upvote). This guarantees atomic, duplicate-free voting per user. A virtual field `voteCount` returns `votes.length`.

---

### Q9: How do you handle production errors and logging?
**Answer**: 
- **Logging**: Configured **Winston** (`utils/logger.js`) to stream structured JSON logs to `logs/combined.log` (requests, auth events) and `logs/error.log` (exceptions & stack traces).
- **Error Handling**: Implemented custom `AppError` subclasses (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`) caught by `middleware/errorHandler.js` to return uniform `{ success: false, message, errorCode, timestamp }` responses.

---

### Q10: What was the biggest technical challenge during development?
**Answer**: *"The biggest challenge was maintaining strict multi-tenant isolation and role-based scoping across complex relational actions—like creating a bug report from a ticket or converting a ticket to a KB article—without breaking existing workflows or introducing redundant database queries. I solved this by building clean service layer helpers and reusable query filter abstractions (`paginateQuery`) that sanitize organization boundaries automatically."*
