const express = require("express");

const router = express.Router();

const {
  createTicket,
  getTickets,
  updateTicketStatus,
  deleteTicket,
  addComment,
  deleteComment,
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
router.post("/:id/comments", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), addCommentValidator, addComment);
router.delete("/:id/comments/:commentId", protect, requireRole("employee", "requester", "support_engineer", "agent", "admin"), deleteComment);

// Customer resolution confirmation & CSAT rating loops
router.post("/:id/confirm-resolution", protect, requireRole("customer", "employee", "requester", "admin"), confirmResolution);
router.post("/:id/reopen", protect, requireRole("customer", "employee", "requester", "admin"), reopenTicket);
router.post("/:id/csat", protect, requireRole("customer", "employee", "requester", "admin"), submitCSATRating);

// Agent & Admin operations
router.put("/:id", protect, requireRole("support_engineer", "agent", "admin"), updateTicketValidator, updateTicketStatus);

// Module 8 — Investigation & KB Article creation (engineer + admin only)
router.put( "/:id/investigation",   protect, requireRole("support_engineer", "agent", "admin"), saveInvestigation);
router.post("/:id/create-article",  protect, requireRole("support_engineer", "agent", "admin"), createArticleFromTicket);

// Delete — Admin only
router.delete("/:id", protect, requireRole("admin"), deleteTicket);

module.exports = router;