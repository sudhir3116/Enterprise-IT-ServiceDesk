const express = require("express");
const router = express.Router();

const {
  getEmailConfig,
  updateEmailConfig,
  sendTestEmail,
  handleInboundWebhook,
  getEmailLogs,
} = require("../controllers/emailController");

const { protect, requireRole } = require("../middleware/authMiddleware");

// Inbound email processing webhook (public or authenticated)
router.post("/inbound", handleInboundWebhook);

// Admin Configuration & Operations
router.get("/config", protect, requireRole("admin"), getEmailConfig);
router.put("/config", protect, requireRole("admin"), updateEmailConfig);
router.post("/test", protect, requireRole("admin"), sendTestEmail);
router.get("/logs", protect, requireRole("admin"), getEmailLogs);

module.exports = router;
