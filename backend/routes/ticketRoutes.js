const express = require("express");

const router = express.Router();

const {
  createTicket,
  getTickets,
  updateTicketStatus,
  deleteTicket,
  addComment,
  getTicketById,
  confirmResolution,
  reopenTicket,
} = require("../controllers/ticketController");

const {
  protect,
  requireRole,
} = require("../middleware/authMiddleware");

// All roles — normalized names used here; requireRole also accepts legacy DB names
router.post("/", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), createTicket);
router.get("/", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), getTickets);
router.get("/:id", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), getTicketById);
router.post("/:id/comments", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), addComment);

// Customer resolution confirmation loops
router.post("/:id/confirm-resolution", protect, confirmResolution);
router.post("/:id/reopen", protect, reopenTicket);

// Agent & Admin operations
router.put("/:id", protect, requireRole("support_engineer", "agent", "admin"), updateTicketStatus);

// Delete — role check also enforced in controller
router.delete("/:id", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), deleteTicket);

module.exports = router;