const Ticket = require("../models/Ticket");
const User = require("../models/User");
const KnowledgeArticle = require("../models/KnowledgeArticle");
const AuditLog = require("../models/AuditLog");

const getStats = async (req, res, next) => {
  try {
    const base = { isDeleted: false }; // always exclude soft-deleted

    // ── Core KPI counts ────────────────────────────────────────────
    const [
      totalTickets,
      openTickets,
      assignedTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      activeAgents,
      totalUsers,
      totalRequesters,
      totalAgents,
      kbCount,
    ] = await Promise.all([
      Ticket.countDocuments(base),
      Ticket.countDocuments({ ...base, status: "Open" }),
      Ticket.countDocuments({ ...base, status: "Assigned" }),
      Ticket.countDocuments({ ...base, status: "In Progress" }),
      Ticket.countDocuments({ ...base, status: "Pending" }),
      Ticket.countDocuments({ ...base, status: "Resolved" }),
      Ticket.countDocuments({ ...base, status: "Closed" }),
      User.countDocuments({ role: { $in: ["agent", "admin"] }, accountStatus: "active" }),
      User.countDocuments(),
      User.countDocuments({ role: "requester" }),
      User.countDocuments({ role: "agent" }),
      KnowledgeArticle.countDocuments(),
    ]);

    // ── SLA breach count (High/Critical not yet Resolved/Closed, past due date) ──
    const now = new Date();
    const slaBreachedCount = await Ticket.countDocuments({
      ...base,
      status: { $nin: ["Resolved", "Closed"] },
      $or: [
        { dueDate: { $lt: now } },
        { priority: "Critical", createdAt: { $lt: new Date(now - 4 * 3600000) } },
        { priority: "High",     createdAt: { $lt: new Date(now - 24 * 3600000) } },
      ]
    });

    // ── Recent Activities (Audit Logs) ──────────────────────────────
    const recentActivitiesRaw = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(8)
      .populate("performedBy", "name email profilePhoto");
    
    // Process recent activities to ensure they don't break if performedBy is null
    const recentActivities = recentActivitiesRaw.map(log => ({
      _id: log._id,
      action: log.action,
      entity: log.entity,
      details: log.details,
      timestamp: log.timestamp,
      performedBy: log.performedBy ? {
        name: log.performedBy.name,
        email: log.performedBy.email,
        profilePhoto: log.performedBy.profilePhoto
      } : { name: "System" }
    }));

    // ── System Health (Mocked for now) ──────────────────────────────
    const systemHealth = {
      uptime: "99.98%",
      dbLatency: "12ms",
      apiLatency: "45ms",
      activeConnections: Math.floor(Math.random() * 50) + 10,
      cpuUsage: "32%",
      memoryUsage: "48%",
      lastBackup: new Date(now - 3600000).toISOString()
    };

    // ── Category breakdown ─────────────────────────────────────────
    const byCategory = await Ticket.aggregate([
      { $match: base },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── Priority breakdown ─────────────────────────────────────────
    const byPriority = await Ticket.aggregate([
      { $match: base },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── Status breakdown ───────────────────────────────────────────
    const byStatus = await Ticket.aggregate([
      { $match: base },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── Last 7 days ticket creation trend ─────────────────────────
    const sevenDaysAgo = new Date(now - 7 * 24 * 3600000);
    const trendRaw = await Ticket.aggregate([
      { $match: { ...base, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in zeros for missing days
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const found = trendRaw.find(r => r._id === dateStr);
      trend.push({ date: dateStr, count: found ? found.count : 0 });
    }

    // ── Average resolution time (hours) ───────────────────────────
    const resolutionAgg = await Ticket.aggregate([
      {
        $match: {
          ...base,
          status: { $in: ["Resolved", "Closed"] },
          updatedAt: { $exists: true }
        }
      },
      {
        $project: {
          resolutionHrs: {
            $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 3600000]
          }
        }
      },
      { $group: { _id: null, avgHrs: { $avg: "$resolutionHrs" } } }
    ]);
    const avgResolutionHrs = resolutionAgg.length > 0
      ? Math.round(resolutionAgg[0].avgHrs * 10) / 10
      : null;

    res.status(200).json({
      // Core KPIs
      totalTickets,
      openTickets,
      assignedTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      activeAgents,
      totalUsers,
      totalRequesters,
      totalAgents,
      slaBreachedCount,
      avgResolutionHrs,
      kbCount,
      systemHealth,
      recentActivities,
      
      // Breakdowns
      byCategory: Object.fromEntries(byCategory.map(b => [b._id, b.count])),
      byPriority: Object.fromEntries(byPriority.map(b => [b._id, b.count])),
      byStatus: Object.fromEntries(byStatus.map(b => [b._id, b.count])),
      trend,
      
      // Backward-compatible aliases
      totalEmployees: totalRequesters,
      totalEngineers: totalAgents,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
