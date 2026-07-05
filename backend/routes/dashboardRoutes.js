const express = require("express");

const router = express.Router();

const { getStats } = require("../controllers/dashboardController");

const {
  protect,
  requireRole,
} = require("../middleware/authMiddleware");

router.get("/stats", protect, requireRole("admin", "agent"), getStats);

module.exports = router;