const express = require("express");
const router = express.Router();

const {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getExecutionHistory,
  getAIRuleSuggestions,
} = require("../controllers/automationController");

const { protect, requireRole } = require("../middleware/authMiddleware");

// Admin & Staff read rules; Admin write rules
router.get("/", protect, requireRole("admin", "support_engineer", "agent"), getRules);
router.get("/history", protect, requireRole("admin", "support_engineer", "agent"), getExecutionHistory);
router.post("/ai-suggest", protect, requireRole("admin", "support_engineer", "agent"), getAIRuleSuggestions);

router.post("/", protect, requireRole("admin"), createRule);
router.put("/:id", protect, requireRole("admin"), updateRule);
router.delete("/:id", protect, requireRole("admin"), deleteRule);

module.exports = router;
