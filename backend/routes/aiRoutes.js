const express = require("express");
const router = express.Router();

const {
  getAISuggestions,
  getAITicketAssistance,
} = require("../controllers/kbController");

const { requireRole } = require("../middleware/authMiddleware");

router.post("/suggest", requireRole(), getAISuggestions);
router.post("/ticket-assist", requireRole(), getAITicketAssistance);

module.exports = router;
