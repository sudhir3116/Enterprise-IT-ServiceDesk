const express = require("express");
const router = express.Router();

const {
  getAISuggestions,
  getAITicketAssistance,
} = require("../controllers/kbController");

const { protect } = require("../middleware/authMiddleware");

router.post("/suggest", protect, getAISuggestions);
router.post("/ticket-assist", protect, getAITicketAssistance);

module.exports = router;
