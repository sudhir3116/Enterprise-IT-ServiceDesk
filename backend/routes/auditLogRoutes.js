/**
 * auditLogRoutes.js — Admin-only Audit Log Query API
 *
 * GET /api/audit-logs
 *
 * Supports:
 *   ?page=1           Pagination
 *   ?limit=50         Page size (max 100)
 *   ?action=          Filter by action name (exact or partial)
 *   ?category=        Filter by category (AUTHENTICATION | SECURITY | USER_MANAGEMENT | ...)
 *   ?severity=        Filter by severity (INFO | WARNING | CRITICAL)
 *   ?status=          Filter by status (SUCCESS | FAILURE | BLOCKED)
 *   ?userId=          Filter by user ObjectId
 *   ?search=          Full-text search on email field
 *   ?startDate=       ISO date string — filter by timestamp >=
 *   ?endDate=         ISO date string — filter by timestamp <=
 *   ?entity=          Legacy entity filter (for backward compat)
 *   ?performedBy=     Legacy performedBy filter (for backward compat)
 */

const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const { protect, requireRole } = require("../middleware/authMiddleware");

// GET /api/audit-logs — Admin only
router.get("/", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip  = (page - 1) * limit;

    const filter = {};

    // ── New structured filters ────────────────────────────────────────────
    if (req.query.action)   filter.action   = { $regex: req.query.action,   $options: "i" };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.userId)   filter.userId   = req.query.userId;

    // Email search (case-insensitive partial match)
    if (req.query.search) {
      filter.email = { $regex: req.query.search, $options: "i" };
    }

    // ── Legacy filters (backward compat) ─────────────────────────────────
    if (req.query.entity)      filter.entity      = req.query.entity;
    if (req.query.performedBy) filter.performedBy = req.query.performedBy;

    // ── Date range filter ─────────────────────────────────────────────────
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) {
        filter.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const endD = new Date(req.query.endDate);
        if (req.query.endDate.length <= 10) {
          endD.setHours(23, 59, 59, 999);
        }
        filter.timestamp.$lte = endD;
      }
    }

    const [totalLogs, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .populate("userId",      "name email role employeeId")
        .populate("performedBy", "name email role employeeId")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      logs,
      page,
      limit,
      totalPages: Math.ceil(totalLogs / limit),
      totalLogs,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/audit-logs/stats — Summary counts for admin dashboard widgets
router.get("/stats", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours

    const [totalToday, criticalToday, failedLoginsToday, categoryCounts] = await Promise.all([
      AuditLog.countDocuments({ timestamp: { $gte: since } }),
      AuditLog.countDocuments({ timestamp: { $gte: since }, severity: "CRITICAL" }),
      AuditLog.countDocuments({ timestamp: { $gte: since }, action: "LOGIN_FAILED" }),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({
      last24Hours: {
        total:         totalToday,
        critical:      criticalToday,
        failedLogins:  failedLoginsToday,
        byCategory:    categoryCounts,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
