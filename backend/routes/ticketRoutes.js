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
  submitCSATRating,
  saveInvestigation,
  createArticleFromTicket,
} = require("../controllers/ticketController");

const {
  protect,
  requireRole,
} = require("../middleware/authMiddleware");
const { createTicketValidator } = require("../validators/ticketValidator");
const { updateTicketValidator, addCommentValidator } = require("../validators/ticketValidator");

// All roles — normalized names used here; requireRole also accepts legacy DB names
router.post("/", protect, requireRole("customer", "employee", "requester", "support_engineer", "agent", "admin"), createTicketValidator, createTicket);
router.get("/", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), getTickets);
router.get("/:id", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), getTicketById);
router.post("/:id/comments", requireRole("employee", "requester", "support_engineer", "agent", "admin"), addCommentValidator, addComment);

// Customer resolution confirmation & CSAT rating loops
router.post("/:id/confirm-resolution", requireRole(), confirmResolution);
router.post("/:id/reopen", requireRole(), reopenTicket);
router.post("/:id/csat", requireRole(), submitCSATRating);

// Agent & Admin operations
router.put("/:id", requireRole("support_engineer", "agent", "admin"), updateTicketValidator, updateTicketStatus);

// Module 8 — Investigation & KB Article creation (engineer + admin only)
router.put( "/:id/investigation",   protect, requireRole("support_engineer", "agent", "admin"), saveInvestigation);
router.post("/:id/create-article",  protect, requireRole("support_engineer", "agent", "admin"), createArticleFromTicket);

// Delete — role check also enforced in controller
router.delete("/:id", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), deleteTicket);

module.exports = router;