const BugReport = require("../models/BugReport");
const Ticket = require("../models/Ticket");
const { logAction } = require("../utils/auditLogger");

/**
 * Create a new bug report from a ticket investigation.
 * Automatically links the bug to the source ticket.
 */
const createBug = async (data, user) => {
  const { ticketId, title, description, severity, reproductionSteps,
          expectedBehaviour, actualBehaviour, environment, assignedDeveloper } = data;

  const orgId = user.organizationId?._id || user.organizationId;

  // Validate that the source ticket exists and is active
  const ticketFilter = { _id: ticketId, isDeleted: false };
  if (orgId && user.role !== "admin") {
    ticketFilter.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
  }
  const ticket = await Ticket.findOne(ticketFilter);
  if (!ticket) {
    const err = new Error("Ticket not found or does not belong to your organization");
    err.statusCode = 404;
    throw err;
  }

  const bug = await BugReport.create({
    ticketId,
    organizationId: orgId,
    createdBy:      user._id,
    title,
    description:        description || "",
    severity:           severity || "Medium",
    reproductionSteps:  reproductionSteps || ticket.issueDetails?.stepsToReproduce || "",
    expectedBehaviour:  expectedBehaviour || ticket.issueDetails?.expectedBehavior || "",
    actualBehaviour:    actualBehaviour   || ticket.issueDetails?.actualBehavior   || "",
    environment: {
      browser:    environment?.browser    || ticket.environment?.browser || "",
      OS:         environment?.OS         || ticket.environment?.OS      || "",
      device:     environment?.device     || ticket.environment?.device  || "",
      appVersion: environment?.appVersion || ticket.investigation?.appVersion || "",
    },
    assignedDeveloper: assignedDeveloper || undefined,
  });

  // Back-link bug to ticket
  await Ticket.findByIdAndUpdate(ticketId, {
    $addToSet: { bugReportIds: bug._id },
  });

  // Audit log
  await logAction("BugReport", bug._id, "BUG_CREATED", user._id, {
    after: { bugNumber: bug.bugNumber, title: bug.title, severity: bug.severity, ticketId },
  });

  return bug;
};

/**
 * Role-aware bug list query.
 * - Developer: sees only bugs assigned to them
 * - Engineer / Admin: sees all org bugs
 */
const getBugsForUser = async (user, filters = {}) => {
  const orgId = user.organizationId?._id || user.organizationId;
  const query = { isDeleted: false };
  if (orgId && user.role !== "admin") {
    query.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
  }

  if (user.role === "developer") {
    query.assignedDeveloper = user._id;
  }

  if (filters.status)   query.status   = filters.status;
  if (filters.severity) query.severity  = filters.severity;
  if (filters.assignedDeveloper) query.assignedDeveloper = filters.assignedDeveloper;

  const page = parseInt(filters.page) || 1;
  const limit = Math.min(parseInt(filters.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [total, bugs] = await Promise.all([
    BugReport.countDocuments(query),
    BugReport.find(query)
      .populate("ticketId",          "ticketNumber title priority status createdAt")
      .populate("createdBy",         "name email")
      .populate("assignedDeveloper", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  return {
    bugs,
    data: bugs,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
};

/**
 * Update bug status / developer assignment / add a comment.
 * Validates allowed state transitions.
 */
const VALID_TRANSITIONS = {
  Open:        ["Assigned", "In Progress", "Closed"],
  Assigned:    ["In Progress", "Closed"],
  "In Progress": ["Fixed", "Open"],
  Fixed:       ["Testing", "In Progress"],
  Testing:     ["Verified", "In Progress"],
  Verified:    ["Closed"],
  Closed:      ["Open", "In Progress"],
};

const updateBug = async (bugId, data, user) => {
  const orgId = user.organizationId?._id || user.organizationId;
  const filter = { _id: bugId, isDeleted: false };
  if (orgId && user.role !== "admin") {
    filter.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
  }
  const bug = await BugReport.findOne(filter);

  if (!bug) {
    const err = new Error("Bug report not found");
    err.statusCode = 404;
    throw err;
  }

  const before = {
    status:            bug.status,
    assignedDeveloper: bug.assignedDeveloper,
  };

  // Validate status transition
  if (data.status && data.status !== bug.status) {
    const allowed = VALID_TRANSITIONS[bug.status] || [];
    if (!allowed.includes(data.status)) {
      const err = new Error(`Invalid status transition: ${bug.status} → ${data.status}`);
      err.statusCode = 422;
      throw err;
    }
    bug.status = data.status;
  }

  if (data.assignedDeveloper !== undefined) bug.assignedDeveloper = data.assignedDeveloper || undefined;
  if (data.title       !== undefined) bug.title       = data.title;
  if (data.description !== undefined) bug.description = data.description;
  if (data.severity    !== undefined) bug.severity    = data.severity;

  await bug.save();

  await logAction("BugReport", bug._id, "BUG_UPDATED", user._id, {
    before,
    after: { status: bug.status, assignedDeveloper: bug.assignedDeveloper },
  });

  return bug;
};

/**
 * Add a comment to a bug report.
 */
const addBugComment = async (bugId, text, user) => {
  const orgId = user.organizationId?._id || user.organizationId;
  const filter = { _id: bugId, isDeleted: false };
  if (orgId && user.role !== "admin") {
    filter.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
  }
  const bug = await BugReport.findOne(filter);

  if (!bug) {
    const err = new Error("Bug report not found");
    err.statusCode = 404;
    throw err;
  }

  bug.comments.push({
    text,
    author:     user._id,
    authorName: user.name,
    isInternal: true,
  });

  await bug.save();
  return bug;
};

module.exports = { createBug, getBugsForUser, updateBug, addBugComment };
