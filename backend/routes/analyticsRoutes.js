const express = require("express");
const router = express.Router();

const {
  getDashboardAnalytics,
  getTicketAnalytics,
  getSLAAnalytics,
  getEngineerAnalytics,
  getCSATAnalytics,
  exportReport,
  getAuditLogs,
  getNotifications,
} = require("../controllers/analyticsController");

const { protect, requireRole } = require("../middleware/authMiddleware");

// Admin & Engineer analytics routes (Admin full access; Engineers self-view)
router.get("/dashboard", protect, requireRole("admin", "support_engineer", "agent"), getDashboardAnalytics);
router.get("/tickets", protect, requireRole("admin", "support_engineer", "agent"), getTicketAnalytics);
router.get("/sla", protect, requireRole("admin", "support_engineer", "agent"), getSLAAnalytics);
router.get("/engineers", protect, requireRole("admin", "support_engineer", "agent"), getEngineerAnalytics);
router.get("/csat", protect, requireRole("admin", "support_engineer", "agent"), getCSATAnalytics);

// Report export route
router.get("/export/:type", protect, requireRole("admin", "support_engineer", "agent"), exportReport);

module.exports = router;
