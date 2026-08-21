const Ticket = require("../models/Ticket");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const Notification = require("../models/Notification");
const { logAction } = require("../utils/auditLogger");
const Comment = require("../models/Comment");
const ticketService = require("../services/ticketService");

// Create Ticket
const createTicket = async (req, res, next) => {
  try {
    const ticket = await ticketService.createTicket(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Ticket Created Successfully",
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Get Tickets (with pagination, filtering, soft-delete exclusion, and scoping)
const getTickets = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 100);
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };

    if (req.user.organizationId) {
      filter.organizationId = req.user.organizationId?._id || req.user.organizationId;
    }

    // Basic filtering
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Role-based scope limiting — accepts both normalized and DB role names
    if (req.user.role === "admin") {
      // Admins see all tickets
    } else if (["support_engineer", "agent"].includes(req.user.role) || ["support_engineer", "agent"].includes(req.user.dbRole)) {
      // Engineers see tickets assigned to them, created by them, or matching their team
      filter.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id },
        { category: req.user.team }
      ];
    } else {
      // Requesters / employees see only their own tickets
      filter.createdBy = req.user._id;
    }

    let tickets = await Ticket.find(filter)
      .populate("createdBy", "name email role mobileNumber department designation employeeId")
      .populate("assignedTo", "name email role department designation employeeId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Proactive SLA breach evaluation
    tickets = await Promise.all(
      tickets.map(async (t) => {
        if (!["Resolved", "Closed"].includes(t.status) && t.dueDate && t.dueDate < Date.now() && !t.slaBreached) {
          t.slaBreached = true;
          t.history.push({
            action: "SLA Deadline Breached (System)",
            performedBy: "System"
          });
          await t.save();
          
          await logAction("Ticket", t._id, "SLA Breached", "System", {
            before: { slaBreached: false },
            after: { slaBreached: true }
          }).catch(()=>{});
        }
        return t;
      })
    );

    // Populate comments from standalone collection and hide internal ones for requesters
    const ticketsWithComments = await Promise.all(
      tickets.map(async (t) => {
        const tObj = t.toObject();
        const commentsQuery = { ticket: t._id };
        if (req.user.role === "requester") {
          commentsQuery.isInternal = false;
        }
        const dbComments = await Comment.find(commentsQuery)
          .populate("author", "name email role")
          .sort({ createdAt: 1 });

        tObj.comments = dbComments.map((c) => ({
          _id: c._id,
          text: c.body,
          user: c.author,
          name: c.author ? c.author.name : "System",
          isInternal: c.isInternal,
          createdAt: c.createdAt,
        }));
        return tObj;
      })
    );

      // Return paginated response for clients
      const total = await Ticket.countDocuments(filter);
      res.status(200).json({
        data: ticketsWithComments,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      });
  } catch (error) {
    next(error);
  }
};

// Update Ticket Status & Assignee
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status, assignedTo, dueDate } = req.body;
    const ticketId = req.params.id;
    const userId = req.user._id;

    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false })
      .populate("createdBy");

    if (!ticket) {
      await logAction("Ticket", ticketId, "Rejected Update Attempt - Ticket Not Found", userId, {});
      return res.status(404).json({ message: "Ticket Not Found" });
    }

    // Verify role is admin or engineer (normalized or legacy)
    const isStaff = ["admin", "support_engineer", "agent"].includes(req.user.role)
      || ["admin", "agent"].includes(req.user.dbRole);

    const isCreator = ticket.createdBy && ticket.createdBy._id.toString() === userId.toString();
    const isRequesterClosing = !isStaff && isCreator && status === "Closed" && ticket.status === "Resolved";

    if (!isStaff && !isRequesterClosing) {
      await logAction("Ticket", ticketId, "Rejected Update Attempt - Unauthorized", userId, {
        before: { role: req.user.role }
      });
      return res.status(403).json({ message: "Access Forbidden: Agent or Admin role required" });
    }

    // Support Engineer safety check
    if (["support_engineer", "agent"].includes(req.user.role) || ["agent"].includes(req.user.dbRole)) {
      const isAssigned = ticket.assignedTo && ticket.assignedTo.toString() === userId.toString();
      const isCreator  = ticket.createdBy && ticket.createdBy.toString() === userId.toString();
      const isTeam     = ticket.category === req.user.team;
      if (!isAssigned && !isCreator && !isTeam) {
        await logAction("Ticket", ticketId, "Rejected Update Attempt - Outside Scope", userId, {
          before: { ticketCategory: ticket.category, agentTeam: req.user.team }
        });
        return res.status(403).json({ message: "Access Forbidden: Incident is not allocated to your team or queue." });
      }
    }

    // Engineer restriction: can only self-assign
    const isEngineer = ["support_engineer", "agent"].includes(req.user.role) || req.user.dbRole === "agent";
    if (assignedTo && isEngineer && assignedTo !== userId.toString()) {
      await logAction("Ticket", ticketId, "Rejected Reassignment - Support agents can only self-assign", userId, {
        before: { assignedTo: ticket.assignedTo ? ticket.assignedTo.toString() : null },
        after: { attemptedAssignee: assignedTo }
      });
      return res.status(403).json({ message: "Support agents are only permitted to self-assign incident requests." });
    }

    const logs = [];

    // Auto-transition to Assigned if status is Open and assignedTo is specified
    let targetStatus = status;
    if (assignedTo && ticket.status === "Open" && !status) {
      targetStatus = "Assigned";
    }

    if (targetStatus && ticket.status !== targetStatus) {
      const oldStatus = ticket.status;
      ticket.status = targetStatus;
      logs.push(`Status updated from "${oldStatus}" to "${targetStatus}"`);

      await logAction("Ticket", ticket._id, "STATUS_CHANGED", userId, {
        before: { status: oldStatus },
        after: { status: targetStatus, ticketNumber: ticket.ticketNumber }
      }).catch(() => {});

      // In-app notification to creator
      try {
        await Notification.create({
          recipient: ticket.createdBy._id,
          title: "Ticket Status Updated",
          message: `Your ticket "${ticket.title}" status has been set to "${targetStatus}".`,
          ticketId: ticket._id
        });
      } catch (err) {
        console.error("Failed to create status change notification:", err.message);
      }

      // Send Ticket Status Changed Email
      try {
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket Status Update</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f5f6; color: #333333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background: #3b82f6; padding: 24px 20px; text-align: center; color: #ffffff; }
            .content { padding: 30px 20px; line-height: 1.6; }
            .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>IT HelpDesk Update</h2>
            </div>
            <div class="content">
              <p style="font-weight: 600; margin-top: 0;">Support Ticket Status Transitioned</p>
              <p>Your ticket: <strong>"${ticket.title}"</strong> has been updated to status: <strong>${targetStatus}</strong>.</p>
              <div class="card">
                <strong>Status Change:</strong> ${oldStatus} &rarr; ${targetStatus}
              </div>
            </div>
          </div>
        </body>
        </html>
        `;
        await sendEmail(ticket.createdBy.email, `Support Ticket Status Update: ${ticket.title} (${targetStatus})`, emailHtml);
      } catch (err) {
        console.error("Status transition email failed:", err.message);
      }
    }

    if (assignedTo && (!ticket.assignedTo || ticket.assignedTo.toString() !== assignedTo)) {
      ticket.assignedTo = assignedTo;
      const engineer = await User.findById(assignedTo);
      if (engineer) {
        logs.push(`Ticket assigned to ${engineer.name}`);

        // In-app notification to assignee
        try {
          await Notification.create({
            recipient: engineer._id,
            title: "New Support Task Assigned",
            message: `You have been assigned to investigate ticket "${ticket.title}".`,
            ticketId: ticket._id
          });
        } catch (err) {
          console.error("Failed to notify assignee:", err.message);
        }

        // In-app notification to creator
        try {
          await Notification.create({
            recipient: ticket.createdBy._id,
            title: "Ticket Support Representative Allocated",
            message: `Support Representative ${engineer.name} has been assigned to work on ticket "${ticket.title}".`,
            ticketId: ticket._id
          });
        } catch (err) {
          console.error("Failed to notify creator about assignment:", err.message);
        }

        // Send Ticket Assigned Email
        try {
          const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Ticket Assigned to You</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f5f6; color: #333333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
              .header { background: #3b82f6; padding: 24px 20px; text-align: center; color: #ffffff; }
              .content { padding: 30px 20px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>IT HelpDesk Assignment</h2>
              </div>
              <div class="content">
                <p style="font-weight: 600; margin-top: 0;">New Ticket Assignment</p>
                <p>Hello ${engineer.name}, you have been assigned to investigate the support ticket: <strong>"${ticket.title}"</strong>.</p>
              </div>
            </div>
          </body>
          </html>
          `;
          await sendEmail(engineer.email, "New Support Assignment: " + ticket.title, emailHtml);
        } catch (err) {
          console.error("Assignment email failed:", err.message);
        }
      }
    }

    if (dueDate) {
      ticket.dueDate = dueDate;
      logs.push(`Due date configured for ${new Date(dueDate).toLocaleDateString()}`);
    }

    const before = {
      status: ticket.status,
      assignedTo: ticket.assignedTo ? ticket.assignedTo.toString() : null,
      dueDate: ticket.dueDate ? ticket.dueDate.toISOString() : null
    };

    logs.forEach(logText => {
      ticket.history.push({
        action: logText,
        performedBy: req.user.name,
      });
    });

    await ticket.save();

    // Write AuditLog for updating ticket parameters
    await logAction("Ticket", ticket._id, "Update Ticket Status & Details", req.user._id, {
      before,
      after: {
        status: ticket.status,
        assignedTo: ticket.assignedTo ? ticket.assignedTo.toString() : null,
        dueDate: ticket.dueDate ? ticket.dueDate.toISOString() : null
      }
    });

    res.status(200).json({
      message: "Ticket Updated Successfully",
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Ticket (Soft Delete with logging of unauthorized attempts)
const deleteTicket = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user._id;

    // Verify role is admin
    if (req.user.role !== "admin") {
      await logAction("Ticket", ticketId, "Rejected Delete Attempt - Unauthorized", userId, {
        before: { role: req.user.role }
      });
      return res.status(403).json({ message: "Access Forbidden: Administrator privileges required to delete incident records" });
    }

    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });

    if (!ticket) {
      await logAction("Ticket", ticketId, "Rejected Delete Attempt - Ticket Not Found", userId, {});
      return res.status(404).json({ message: "Ticket Not Found" });
    }

    ticket.isDeleted = true;
    ticket.history.push({
      action: "Ticket Deleted (Soft Delete)",
      performedBy: req.user.name,
    });
    await ticket.save();

    // Write AuditLog for soft delete action
    await logAction("Ticket", ticket._id, "Soft Delete Ticket", userId, {
      before: { isDeleted: false },
      after: { isDeleted: true }
    });

    res.status(200).json({
      message: "Ticket Deleted Successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Add Comment
const addComment = async (req, res, next) => {
  try {
    const { text, isInternal } = req.body;
    const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket Not Found");
    }

    // Requester/employee/customer authorization: can only comment on own tickets
    if (["customer", "requester", "employee"].includes(req.user.role) && ticket.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Access Forbidden: You cannot reply to tickets created by other users.");
    }

    // Only support staff or admins can create internal notes
    const setInternal = ["support_engineer", "agent", "admin"].includes(req.user.role) ? (!!isInternal) : false;

    // Create comment in standalone collection
    await Comment.create({
      ticket: ticket._id,
      author: req.user._id,
      body: text,
      isInternal: setInternal,
    });
    
    // Record first response timestamp if staff/admin replies publicly
    const isStaff = ["support_engineer", "agent", "admin"].includes(req.user.role) || ["support_engineer", "agent", "admin"].includes(req.user.dbRole);
    if (isStaff && !setInternal) {
      if (!ticket.sla) {
        ticket.sla = { breached: false, responseBreached: false, resolutionBreached: false };
      }
      ticket.sla.firstRespondedAt = ticket.sla.firstRespondedAt || new Date();
      ticket.markModified("sla");
    }

    ticket.history.push({
      action: setInternal ? `Added an internal note` : `Added a public comment`,
      performedBy: req.user.name,
    });

    await ticket.save();

    // Write AuditLog for comments
    await logAction("Ticket", ticket._id, "Add Comment", req.user._id, {
      after: { text, isInternal: setInternal }
    });

    // In-app Notification dispatching
    try {
      if (["employee", "requester"].includes(req.user.role)) {
        // If employee comments, notify the assigned support representative
        if (ticket.assignedTo) {
          await Notification.create({
            recipient: ticket.assignedTo,
            title: "New Comment on Support Ticket",
            message: `${req.user.name} added a comment to ticket "${ticket.title}".`,
            ticketId: ticket._id
          });
        }
      } else {
        // If support staff or admin comments, notify the creator (unless it's an internal note)
        if (!setInternal) {
          await Notification.create({
            recipient: ticket.createdBy,
            title: "Support Ticket Updated",
            message: `${req.user.name} posted a new reply to your ticket "${ticket.title}".`,
            ticketId: ticket._id
          });

          // Dispatch outbound email to customer
          const emailService = require("../services/emailService");
          await emailService.sendEngineerReplyNotification(ticket, text, req.user.name).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.error("Failed to dispatch comment notification:", notifErr.message);
    }

    // Fetch the updated ticket comments list from standalone Comment collection
    const commentsQuery = { ticket: ticket._id };
    if (req.user.role === "requester") {
      commentsQuery.isInternal = false;
    }
    const dbComments = await Comment.find(commentsQuery)
      .populate("author", "name email role")
      .sort({ createdAt: 1 });

    const commentsToReturn = dbComments.map(c => ({
      _id: c._id,
      text: c.body,
      user: c.author,
      name: c.author ? c.author.name : "System",
      isInternal: c.isInternal,
      createdAt: c.createdAt
    }));

    res.status(201).json({
      message: "Comment Added Successfully",
      comments: commentsToReturn,
    });
  } catch (error) {
    next(error);
  }
};

// Get comments for a ticket (with role-based internal filter)
const getCommentsForTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
    if (!ticket) return res.status(404).json({ message: 'Ticket Not Found' });

    // Authorization — if requester/employee/customer, only allow on their own ticket
    if (["customer", "requester", "employee"].includes(req.user.role) && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access Forbidden' });
    }

    const commentsQuery = { ticket: ticket._id };
    if (["customer", "requester", "employee"].includes(req.user.role)) {
      commentsQuery.isInternal = false;
    }

    const dbComments = await Comment.find(commentsQuery)
      .populate('author', 'name email role')
      .sort({ createdAt: 1 });

    const commentsToReturn = dbComments.map(c => ({
      _id: c._id,
      text: c.body,
      user: c.author,
      name: c.author ? c.author.name : 'System',
      isInternal: c.isInternal,
      createdAt: c.createdAt,
    }));

    res.status(200).json({ comments: commentsToReturn });
  } catch (err) {
    next(err);
  }
};

// Get Ticket By ID
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false })
      .populate("createdBy", "name email role mobileNumber department designation employeeId")
      .populate("assignedTo", "name email role department designation employeeId");

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket Not Found");
    }

    // Proactive SLA breach evaluation
    if (ticket && !["Resolved", "Closed"].includes(ticket.status) && ticket.dueDate && ticket.dueDate < Date.now() && !ticket.slaBreached) {
      ticket.slaBreached = true;
      ticket.history.push({
        action: "SLA Deadline Breached (System)",
        performedBy: "System"
      });
      await ticket.save();
      
      await logAction("Ticket", ticket._id, "SLA Breached", "System", {
        before: { slaBreached: false },
        after: { slaBreached: true }
      }).catch(()=>{});
    }

    // Check authorization: Employee/Requester/Customer can only view their own tickets
    if (["customer", "requester", "employee"].includes(req.user.role) && ticket.createdBy._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Access Forbidden");
    }

    // Check authorization: Engineer can only view tickets assigned to them, created by them, or matching their team category
    if (["support_engineer", "agent"].includes(req.user.role) || req.user.dbRole === "agent") {
      const isAssigned = ticket.assignedTo && ticket.assignedTo._id.toString() === req.user._id.toString();
      const isCreator = ticket.createdBy && ticket.createdBy._id.toString() === req.user._id.toString();
      const isTeam = ticket.category === req.user.team;
      if (!isAssigned && !isCreator && !isTeam) {
        res.status(403);
        throw new Error("Access Forbidden: Ticket is not allocated to your team or queue.");
      }
    }

    // Fetch comments from standalone collection and filter based on user role
    const commentsQuery = { ticket: ticket._id };
    if (["customer", "requester", "employee"].includes(req.user.role)) {
      commentsQuery.isInternal = false;
    }
    const dbComments = await Comment.find(commentsQuery)
      .populate("author", "name email role")
      .sort({ createdAt: 1 });

    const ticketObj = ticket.toObject();
    ticketObj.comments = dbComments.map(c => ({
      _id: c._id,
      text: c.body,
      user: c.author,
      name: c.author ? c.author.name : "System",
      isInternal: c.isInternal,
      createdAt: c.createdAt
    }));

    res.status(200).json(ticketObj);
  } catch (error) {
    next(error);
  }
};

// Confirm Ticket Resolution (Requester/Creator only)
const confirmResolution = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket Not Found");
    }

    const isCreator = ticket.createdBy && ticket.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isCreator && !isAdmin) {
      res.status(403);
      throw new Error("Access Forbidden: Only the ticket owner can confirm resolution.");
    }

    if (ticket.status !== "Resolved") {
      res.status(400);
      throw new Error("Only resolved tickets can be closed.");
    }

    const beforeStatus = ticket.status;
    ticket.status = "Closed";
    ticket.resolvedAt = new Date();
    ticket.history.push({
      action: "Ticket Resolution Confirmed by Customer (Incident Closed)",
      performedBy: req.user.name,
    });
    await ticket.save();

    await logAction("Ticket", ticket._id, "Confirm Resolution", req.user._id, {
      before: { status: beforeStatus },
      after: { status: "Closed" }
    });

    res.status(200).json({ message: "Ticket closed successfully", ticket });
  } catch (error) {
    next(error);
  }
};

// Reopen Ticket (Requester/Creator only, when status is Resolved)
const reopenTicket = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket Not Found");
    }

    const isCreator = ticket.createdBy && ticket.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isCreator && !isAdmin) {
      res.status(403);
      throw new Error("Access Forbidden: Only the ticket owner can reopen a ticket.");
    }

    if (ticket.status !== "Resolved") {
      res.status(400);
      throw new Error("Only resolved tickets can be reopened.");
    }

    const beforeStatus = ticket.status;
    ticket.status = "In Progress";
    ticket.resolvedAt = undefined;
    ticket.history.push({
      action: "Ticket Reopened by Customer",
      performedBy: req.user.name,
    });
    await ticket.save();

    await logAction("Ticket", ticket._id, "Reopen Ticket", req.user._id, {
      before: { status: beforeStatus },
      after: { status: "In Progress" }
    });

    if (ticket.assignedTo) {
      try {
        await Notification.create({
          recipient: ticket.assignedTo,
          title: "Ticket Reopened by Customer",
          message: `Ticket "${ticket.title}" (${ticket.ticketNumber}) has been reopened by the client.`,
          ticketId: ticket._id
        });
      } catch (err) {
        console.error("Failed to notify agent about reopen:", err.message);
      }
    }

    res.status(200).json({ message: "Ticket reopened successfully", ticket });
  } catch (error) {
    next(error);
  }
};

// Submit Customer Satisfaction (CSAT) Rating (Customer / Creator only)
const submitCSATRating = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    const ticketId = req.params.id;

    const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket Not Found" });
    }

    if (ticket.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Forbidden: Only the ticket requester can submit CSAT rating." });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "CSAT rating must be a number between 1 and 5." });
    }

    ticket.csatRating = numericRating;
    ticket.csatFeedback = feedback ? String(feedback).trim() : "";

    ticket.history.push({
      action: "CSAT Feedback Submitted",
      performedBy: req.user.name,
      detail: `Rated ${numericRating}/5 stars.${feedback ? ' Feedback: ' + feedback : ''}`
    });

    await ticket.save();

    await logAction("Ticket", ticket._id, "CSAT_RATING_SUBMITTED", req.user._id, {
      details: { rating: numericRating, feedback }
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: "Thank you for your feedback!",
      ticket: {
        id: ticket._id,
        csatRating: ticket.csatRating,
        csatFeedback: ticket.csatFeedback
      }
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/tickets/:id/investigation ────────────────────────────────────────
// Save investigation details — engineer and admin only
const saveInvestigation = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    const filter = { _id: req.params.id, isDeleted: false };
    if (orgId && req.user.role !== "admin") {
      filter.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
    }
    const ticket = await Ticket.findOne(filter);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const { issueType, severity, reproducible, appVersion, technicalNotes } = req.body;

    // Merge into existing investigation sub-doc
    if (issueType      !== undefined) ticket.investigation.issueType     = issueType;
    if (severity       !== undefined) ticket.investigation.severity      = severity;
    if (reproducible   !== undefined) ticket.investigation.reproducible  = reproducible;
    if (appVersion     !== undefined) ticket.investigation.appVersion    = appVersion;
    if (technicalNotes !== undefined) ticket.investigation.technicalNotes = technicalNotes;

    ticket.investigation.investigatedBy = req.user._id;
    ticket.investigation.investigatedAt = new Date();

    // Also update top-level issueDetails if provided (sync with investigation)
    if (req.body.stepsToReproduce !== undefined) ticket.issueDetails.stepsToReproduce = req.body.stepsToReproduce;
    if (req.body.expectedBehavior !== undefined) ticket.issueDetails.expectedBehavior = req.body.expectedBehavior;
    if (req.body.actualBehavior   !== undefined) ticket.issueDetails.actualBehavior   = req.body.actualBehavior;

    ticket.history.push({
      action:      "Investigation Updated",
      performedBy: req.user.name,
      detail:      `Issue type: ${issueType || ticket.investigation.issueType}, Severity: ${severity || ticket.investigation.severity}`,
    });

    await ticket.save();

    await logAction("Ticket", ticket._id, "INVESTIGATION_SAVED", req.user._id, {
      after: { issueType, severity, reproducible, investigatedBy: req.user.name },
    }).catch(() => {});

    res.status(200).json({ success: true, message: "Investigation saved", investigation: ticket.investigation });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/tickets/:id/create-article ──────────────────────────────────────
// Convert a resolved ticket into a Knowledge Base article
const createArticleFromTicket = async (req, res, next) => {
  try {
    const KnowledgeArticle = require("../models/KnowledgeArticle");
    const orgId = req.user.organizationId?._id || req.user.organizationId;

    const filter = { _id: req.params.id, isDeleted: false };
    if (orgId && req.user.role !== "admin") {
      filter.$or = [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }];
    }
    const ticket = await Ticket.findOne(filter).populate("assignedTo", "name email");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (!["Resolved", "Closed"].includes(ticket.status)) {
      return res.status(422).json({ message: "Only Resolved or Closed tickets can be converted to knowledge articles" });
    }

    const { title, content, category, visibility, relatedBugIds } = req.body;

    // Auto-generate slug from title
    const slugify = (text) => text.toString().toLowerCase().trim()
      .replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-");

    const baseSlug = slugify(title || ticket.title);
    const slug = `${baseSlug}-${Date.now()}`;

    // Build default content from ticket fields if not provided
    const defaultContent = content || [
      `## Problem\n${ticket.description}`,
      ticket.issueDetails?.stepsToReproduce ? `## Steps to Reproduce\n${ticket.issueDetails.stepsToReproduce}` : "",
      ticket.issueDetails?.expectedBehavior ? `## Expected Behaviour\n${ticket.issueDetails.expectedBehavior}` : "",
      ticket.issueDetails?.actualBehavior   ? `## Actual Behaviour\n${ticket.issueDetails.actualBehavior}`   : "",
      ticket.resolutionSummary ? `## Solution\n${ticket.resolutionSummary}` : "",
    ].filter(Boolean).join("\n\n");

    const article = await KnowledgeArticle.create({
      organizationId: orgId,
      title:          title || ticket.title,
      slug,
      summary:        `Converted from ticket ${ticket.ticketNumber}: ${ticket.title}`,
      content:        defaultContent,
      category:       category || ticket.category || "Troubleshooting",
      visibility:     visibility || "internal",
      status:         "draft",
      author:         req.user._id,
      chunks:         [],
      // Module 8 linkage
      sourceTicketId: ticket._id,
      relatedBugIds:  relatedBugIds || ticket.bugReportIds || [],
      tags:           [ticket.category, ticket.priority].filter(Boolean),
    });

    await logAction("KnowledgeArticle", article._id, "ARTICLE_CREATED_FROM_TICKET", req.user._id, {
      after: { title: article.title, sourceTicketId: ticket._id, ticketNumber: ticket.ticketNumber },
    }).catch(() => {});

    res.status(201).json({ success: true, message: "Knowledge article created", article });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};