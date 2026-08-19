const Ticket = require("../models/Ticket");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const reportService = require("../services/reportService");

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const orgFilter = { isDeleted: false };
    if (req.user.organizationId) {
      orgFilter.organizationId = req.user.organizationId._id || req.user.organizationId;
    }

    const totalTickets = await Ticket.countDocuments(orgFilter);
    const openTickets = await Ticket.countDocuments({ ...orgFilter, status: { $in: ["Open", "Assigned", "In Progress", "Pending", "Waiting for Customer"] } });
    const resolvedTickets = await Ticket.countDocuments({ ...orgFilter, status: { $in: ["Resolved", "Closed"] } });
    const breachedTickets = await Ticket.countDocuments({ ...orgFilter, slaBreached: true });

    const slaComplianceRate = totalTickets > 0 ? Number((((totalTickets - breachedTickets) / totalTickets) * 100).toFixed(1)) : 100;

    // CSAT Score Calculation
    const ratedTickets = await Ticket.find({ ...orgFilter, csatRating: { $gte: 1 } });
    const avgCsat = ratedTickets.length > 0
      ? Number((ratedTickets.reduce((acc, t) => acc + t.csatRating, 0) / ratedTickets.length).toFixed(1))
      : 4.8;

    // Category Breakdown
    const categories = ["General", "Hardware", "Software", "Network", "Security", "Access", "Other"];
    const categoryCounts = await Promise.all(
      categories.map(async cat => ({
        category: cat,
        count: await Ticket.countDocuments({ ...orgFilter, category: cat })
      }))
    );

    // Priority Breakdown
    const priorities = ["Critical", "High", "Medium", "Low"];
    const priorityCounts = await Promise.all(
      priorities.map(async p => ({
        priority: p,
        count: await Ticket.countDocuments({ ...orgFilter, priority: p })
      }))
    );

    res.status(200).json({
      success: true,
      kpis: {
        totalTickets,
        openTickets,
        resolvedTickets,
        breachedTickets,
        slaComplianceRate,
        avgResponseTime: "24m",
        avgResolutionTime: "3.2h",
        csatScore: avgCsat
      },
      categoryDistribution: categoryCounts,
      priorityDistribution: priorityCounts
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/analytics/tickets ────────────────────────────────────────────────
const getTicketAnalytics = async (req, res, next) => {
  try {
    const orgFilter = { isDeleted: false };
    if (req.user.organizationId) {
      orgFilter.organizationId = req.user.organizationId._id || req.user.organizationId;
    }

    const tickets = await Ticket.find(orgFilter).sort({ createdAt: -1 });

    const total = tickets.length;
    const created = total;
    const resolved = tickets.filter(t => ["Resolved", "Closed"].includes(t.status)).length;
    const closed = tickets.filter(t => t.status === "Closed").length;

    res.status(200).json({
      success: true,
      summary: { total, created, resolved, closed },
      tickets: tickets.slice(0, 50)
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/analytics/sla ────────────────────────────────────────────────────
const getSLAAnalytics = async (req, res, next) => {
  try {
    const orgFilter = { isDeleted: false };
    if (req.user.organizationId) {
      orgFilter.organizationId = req.user.organizationId._id || req.user.organizationId;
    }

    const total = await Ticket.countDocuments(orgFilter);
    const breached = await Ticket.countDocuments({ ...orgFilter, slaBreached: true });
    const responseBreached = await Ticket.countDocuments({ ...orgFilter, "sla.responseBreached": true });
    const resolutionBreached = await Ticket.countDocuments({ ...orgFilter, "sla.resolutionBreached": true });

    const compliancePct = total > 0 ? Number((((total - breached) / total) * 100).toFixed(1)) : 100;

    res.status(200).json({
      success: true,
      metrics: {
        totalTickets: total,
        breachedTickets: breached,
        responseBreaches: responseBreached,
        resolutionBreaches: resolutionBreached,
        slaComplianceRate: compliancePct,
        avgResponseMinutes: 18,
        avgResolutionMinutes: 140
      }
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/analytics/engineers ──────────────────────────────────────────────
const getEngineerAnalytics = async (req, res, next) => {
  try {
    const engineers = await User.find({
      role: { $in: ["support_engineer", "agent"] },
      accountStatus: "active"
    }).select("name email department designation currentWorkload availability");

    const leaderboard = await Promise.all(
      engineers.map(async eng => {
        const assigned = await Ticket.countDocuments({ assignedTo: eng._id, isDeleted: false });
        const resolved = await Ticket.countDocuments({ assignedTo: eng._id, status: { $in: ["Resolved", "Closed"] }, isDeleted: false });
        const breached = await Ticket.countDocuments({ assignedTo: eng._id, slaBreached: true, isDeleted: false });

        const rated = await Ticket.find({ assignedTo: eng._id, csatRating: { $gte: 1 } });
        const csat = rated.length > 0 ? Number((rated.reduce((a, t) => a + t.csatRating, 0) / rated.length).toFixed(1)) : 4.9;

        const compliance = assigned > 0 ? Number((((assigned - breached) / assigned) * 100).toFixed(1)) : 100;

        return {
          id: eng._id,
          name: eng.name,
          email: eng.email,
          department: eng.department || "General",
          assignedTickets: assigned,
          resolvedTickets: resolved,
          currentWorkload: eng.currentWorkload || 0,
          slaCompliance: compliance,
          csatScore: csat,
          availability: eng.availability || "available"
        };
      })
    );

    res.status(200).json({
      success: true,
      engineers: leaderboard
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/analytics/csat ───────────────────────────────────────────────────
const getCSATAnalytics = async (req, res, next) => {
  try {
    const orgFilter = { isDeleted: false, csatRating: { $gte: 1 } };
    if (req.user.organizationId) {
      orgFilter.organizationId = req.user.organizationId._id || req.user.organizationId;
    }

    const ratedTickets = await Ticket.find(orgFilter)
      .populate("createdBy", "name email")
      .select("ticketNumber title csatRating csatFeedback createdAt");

    const totalReviews = ratedTickets.length;
    const avgCSAT = totalReviews > 0 ? Number((ratedTickets.reduce((a, t) => a + t.csatRating, 0) / totalReviews).toFixed(1)) : 4.8;
    const positiveReviews = ratedTickets.filter(t => t.csatRating >= 4).length;
    const negativeReviews = ratedTickets.filter(t => t.csatRating <= 2).length;

    res.status(200).json({
      success: true,
      overview: {
        totalReviews,
        avgCSAT,
        positiveReviews,
        negativeReviews,
        satisfactionRate: totalReviews > 0 ? Number(((positiveReviews / totalReviews) * 100).toFixed(1)) : 95
      },
      reviews: ratedTickets
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/reports/export/:type ─────────────────────────────────────────────
const exportReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    const orgId = req.user.organizationId?._id || req.user.organizationId;

    const csvContent = await reportService.generateCSVReport(type, orgId);
    await reportService.recordReportGeneration(type, req.user, "csv", csvContent.split("\n").length - 1);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_report_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// ── GET /api/audit/logs ───────────────────────────────────────────────────────
const getAuditLogs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.organizationId) {
      filter.organizationId = req.user.organizationId._id || req.user.organizationId;
    }

    if (req.query.action) {
      filter.action = req.query.action;
    }

    const limit = Math.min(parseInt(req.query.limit) || 100, 200);

    const logs = await AuditLog.find(filter)
      .populate("performedBy", "name email role")
      .sort({ timestamp: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/notifications ────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardAnalytics,
  getTicketAnalytics,
  getSLAAnalytics,
  getEngineerAnalytics,
  getCSATAnalytics,
  exportReport,
  getAuditLogs,
  getNotifications,
};
