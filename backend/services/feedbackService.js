const ProductFeedback = require("../models/ProductFeedback");
const { logAction } = require("../utils/auditLogger");

/**
 * Submit a new feature request / feedback item.
 */
const submitFeedback = async (data, user) => {
  const orgId = user.organizationId?._id || user.organizationId;

  const feedback = await ProductFeedback.create({
    organizationId: orgId,
    createdBy:      user._id,
    title:          data.title,
    description:    data.description || "",
    category:       data.category    || "Feature Request",
    status:         "Submitted",
  });

  await logAction("ProductFeedback", feedback._id, "FEEDBACK_SUBMITTED", user._id, {
    after: { title: feedback.title, category: feedback.category },
  });

  return feedback;
};

/**
 * List feedback for the user's org, paginated and filtered.
 */
const getFeedbackList = async (user, filters = {}) => {
  const orgId = user.organizationId?._id || user.organizationId;
  const query = { isDeleted: false };
  if (orgId) {
    query.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
  }

  if (filters.status)   query.status   = filters.status;
  if (filters.category) query.category = filters.category;

  const page = parseInt(filters.page) || 1;
  const limit = Math.min(parseInt(filters.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [total, feedback] = await Promise.all([
    ProductFeedback.countDocuments(query),
    ProductFeedback.find(query)
      .populate("createdBy",   "name email")
      .populate("respondedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  return {
    feedback,
    data: feedback,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
};

/**
 * Toggle a user's vote on a feedback item.
 * Returns the updated voteCount and whether the user has voted.
 */
const toggleVote = async (feedbackId, user) => {
  const orgId = user.organizationId?._id || user.organizationId;
  const filter = { _id: feedbackId, isDeleted: false };
  if (orgId && user.role !== "admin") {
    filter.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
  }
  const feedback = await ProductFeedback.findOne(filter);

  if (!feedback) {
    const err = new Error("Feedback item not found");
    err.statusCode = 404;
    throw err;
  }

  const userId = user._id.toString();
  const alreadyVoted = feedback.votes.some((v) => v.toString() === userId);

  if (alreadyVoted) {
    feedback.votes = feedback.votes.filter((v) => v.toString() !== userId);
  } else {
    feedback.votes.push(user._id);
  }

  await feedback.save();

  return {
    voteCount: feedback.votes.length,
    hasVoted:  !alreadyVoted,
  };
};

/**
 * Admin: update feedback status and/or add a response.
 */
const updateFeedbackStatus = async (feedbackId, data, admin) => {
  const orgId = admin.organizationId?._id || admin.organizationId;
  const filter = { _id: feedbackId, isDeleted: false };
  if (orgId && admin.role !== "admin") {
    filter.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
  }
  const feedback = await ProductFeedback.findOne(filter);

  if (!feedback) {
    const err = new Error("Feedback item not found");
    err.statusCode = 404;
    throw err;
  }

  const before = { status: feedback.status, adminResponse: feedback.adminResponse };

  if (data.status)        feedback.status        = data.status;
  if (data.adminResponse !== undefined) {
    feedback.adminResponse = data.adminResponse;
    feedback.respondedBy   = admin._id;
    feedback.respondedAt   = new Date();
  }

  await feedback.save();

  await logAction("ProductFeedback", feedback._id, "FEEDBACK_STATUS_UPDATED", admin._id, {
    before,
    after: { status: feedback.status, adminResponse: feedback.adminResponse },
  });

  return feedback;
};

module.exports = { submitFeedback, getFeedbackList, toggleVote, updateFeedbackStatus };
