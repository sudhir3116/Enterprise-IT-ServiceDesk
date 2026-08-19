const BugReport = require("../models/BugReport");
const bugService = require("../services/bugService");
const { logAction } = require("../utils/auditLogger");

// ── GET /api/bugs ─────────────────────────────────────────────────────────────
const getBugs = async (req, res, next) => {
  try {
    const bugs = await bugService.getBugsForUser(req.user, {
      status:            req.query.status,
      severity:          req.query.severity,
      assignedDeveloper: req.query.assignedDeveloper,
    });
    res.status(200).json(bugs);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/bugs/:id ─────────────────────────────────────────────────────────
const getBugById = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId?._id || req.user.organizationId;

    const bugQuery = { _id: req.params.id, organizationId: orgId, isDeleted: false };

    // Developers can only see bugs assigned to them
    if (req.user.role === "developer") {
      bugQuery.assignedDeveloper = req.user._id;
    }

    const bug = await BugReport.findOne(bugQuery)
      .populate("ticketId",          "ticketNumber title priority status description issueDetails investigation environment createdAt")
      .populate("createdBy",         "name email")
      .populate("assignedDeveloper", "name email")
      .populate("comments.author",   "name email");

    if (!bug) return res.status(404).json({ message: "Bug report not found" });

    res.status(200).json(bug);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/bugs ────────────────────────────────────────────────────────────
const createBug = async (req, res, next) => {
  try {
    const bug = await bugService.createBug(req.body, req.user);
    res.status(201).json({ success: true, message: "Bug report created", bug });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/bugs/:id ─────────────────────────────────────────────────────────
const updateBug = async (req, res, next) => {
  try {
    const bug = await bugService.updateBug(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, message: "Bug report updated", bug });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/bugs/:id/comments ───────────────────────────────────────────────
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }
    const bug = await bugService.addBugComment(req.params.id, text.trim(), req.user);
    res.status(200).json({ success: true, message: "Comment added", bug });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/bugs/:id ──────────────────────────────────────────────────────
const deleteBug = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    const bug = await BugReport.findOne({ _id: req.params.id, organizationId: orgId });
    if (!bug) return res.status(404).json({ message: "Bug report not found" });

    bug.isDeleted = true;
    await bug.save();

    await logAction("BugReport", bug._id, "BUG_DELETED", req.user._id, {
      before: { bugNumber: bug.bugNumber, title: bug.title },
    });

    res.status(200).json({ success: true, message: "Bug report deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBugs, getBugById, createBug, updateBug, addComment, deleteBug };
