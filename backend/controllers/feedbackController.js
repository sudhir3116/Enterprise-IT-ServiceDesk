const feedbackService = require("../services/feedbackService");
const ProductFeedback = require("../models/ProductFeedback");
const { logAction } = require("../utils/auditLogger");

// ── GET /api/feedback ─────────────────────────────────────────────────────────
const getFeedback = async (req, res, next) => {
  try {
    const items = await feedbackService.getFeedbackList(req.user, {
      status:   req.query.status,
      category: req.query.category,
    });
    res.status(200).json(items);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/feedback/:id ─────────────────────────────────────────────────────
const getFeedbackById = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    const item = await ProductFeedback.findOne({
      _id: req.params.id,
      organizationId: orgId,
      isDeleted: false,
    })
      .populate("createdBy",   "name email")
      .populate("respondedBy", "name email");

    if (!item) return res.status(404).json({ message: "Feedback item not found" });
    res.status(200).json(item);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/feedback ────────────────────────────────────────────────────────
const submitFeedback = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    const feedback = await feedbackService.submitFeedback(
      { title: title.trim(), description, category },
      req.user
    );
    res.status(201).json({ success: true, message: "Feedback submitted", feedback });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/feedback/:id ─────────────────────────────────────────────────────
// Admin only — update status and/or add admin response
const updateFeedback = async (req, res, next) => {
  try {
    const feedback = await feedbackService.updateFeedbackStatus(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({ success: true, message: "Feedback updated", feedback });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/feedback/:id/vote ───────────────────────────────────────────────
const voteFeedback = async (req, res, next) => {
  try {
    const result = await feedbackService.toggleVote(req.params.id, req.user);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/feedback/:id ──────────────────────────────────────────────────
const deleteFeedback = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    const item = await ProductFeedback.findOne({ _id: req.params.id, organizationId: orgId });
    if (!item) return res.status(404).json({ message: "Feedback item not found" });

    item.isDeleted = true;
    await item.save();

    await logAction("ProductFeedback", item._id, "FEEDBACK_DELETED", req.user._id, {
      before: { title: item.title, status: item.status },
    });

    res.status(200).json({ success: true, message: "Feedback deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeedback, getFeedbackById, submitFeedback, updateFeedback, voteFeedback, deleteFeedback };
