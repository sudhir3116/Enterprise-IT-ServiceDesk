const express = require("express");
const router = express.Router();

const {
  getFeedback,
  getFeedbackById,
  submitFeedback,
  updateFeedback,
  voteFeedback,
  deleteFeedback,
} = require("../controllers/feedbackController");

const { protect, requireRole } = require("../middleware/authMiddleware");

// Any authenticated user can view, submit, and vote on feedback
router.get(  "/",           protect, getFeedback);
router.get(  "/:id",        protect, getFeedbackById);
router.post( "/",           protect, submitFeedback);
router.post( "/:id/vote",   protect, voteFeedback);

// Only admins can update status/response or delete feedback
router.put(    "/:id", protect, requireRole("admin"), updateFeedback);
router.delete( "/:id", protect, requireRole("admin"), deleteFeedback);

module.exports = router;
