const Ticket = require("../models/Ticket");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const AuditReport = require("../models/AuditReport");

class ReportService {
  /**
   * Generates CSV string for requested reportType.
   */
  async generateCSVReport(reportType, organizationId) {
    const filter = { isDeleted: false };
    if (organizationId) {
      filter.organizationId = organizationId;
    }

    if (reportType === "ticket") {
      const tickets = await Ticket.find(filter)
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 });

      const headers = ["Ticket ID", "Title", "Category", "Priority", "Status", "Created By", "Assigned To", "SLA Breached", "CSAT Rating", "Created At"];
      const rows = tickets.map(t => [
        t.ticketNumber || t._id.toString(),
        `"${(t.title || "").replace(/"/g, '""')}"`,
        t.category || "General",
        t.priority || "Medium",
        t.status || "Open",
        t.createdBy ? `"${t.createdBy.name} (${t.createdBy.email})"` : "N/A",
        t.assignedTo ? `"${t.assignedTo.name} (${t.assignedTo.email})"` : "Unassigned",
        t.slaBreached ? "YES" : "NO",
        t.csatRating ? `${t.csatRating}/5` : "N/A",
        new Date(t.createdAt).toISOString()
      ]);

      return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    }

    if (reportType === "sla") {
      const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
      const headers = ["Ticket ID", "Priority", "Status", "First Response Due", "Resolution Due", "Response Breached", "Resolution Breached", "Overall Breached"];
      const rows = tickets.map(t => [
        t.ticketNumber || t._id.toString(),
        t.priority || "Medium",
        t.status || "Open",
        t.sla?.firstResponseDue ? new Date(t.sla.firstResponseDue).toISOString() : "N/A",
        t.sla?.resolutionDue ? new Date(t.sla.resolutionDue).toISOString() : "N/A",
        t.sla?.responseBreached ? "YES" : "NO",
        t.sla?.resolutionBreached ? "YES" : "NO",
        t.slaBreached || t.sla?.breached ? "YES" : "NO"
      ]);

      return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    }

    if (reportType === "engineer") {
      const engineers = await User.find({
        role: { $in: ["support_engineer", "agent"] },
        accountStatus: "active"
      });

      const headers = ["Engineer Name", "Email", "Department", "Current Workload", "Availability", "Status"];
      const rows = engineers.map(e => [
        `"${(e.name || "").replace(/"/g, '""')}"`,
        e.email,
        e.department || "General",
        e.currentWorkload || 0,
        e.availability || "available",
        e.accountStatus
      ]);

      return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    }

    if (reportType === "audit") {
      const logs = await AuditLog.find(organizationId ? { organizationId } : {})
        .populate("performedBy", "name email")
        .sort({ timestamp: -1 })
        .limit(500);

      const headers = ["Timestamp", "Entity", "Action", "Performed By", "IP Address", "User Agent"];
      const rows = logs.map(l => [
        new Date(l.timestamp).toISOString(),
        l.entity || "System",
        l.action,
        l.performedBy ? `"${l.performedBy.name} (${l.performedBy.email})"` : "System",
        l.ipAddress || "127.0.0.1",
        `"${(l.userAgent || "").replace(/"/g, '""')}"`
      ]);

      return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    }

    throw new Error(`Unsupported report type: ${reportType}`);
  }

  /**
   * Records generated report metadata in database history.
   */
  async recordReportGeneration(reportType, user, format = "csv", recordCount = 0) {
    return await AuditReport.create({
      organizationId: user.organizationId?._id || user.organizationId,
      generatedBy: user._id,
      reportType,
      format,
      recordCount
    });
  }
}

module.exports = new ReportService();
