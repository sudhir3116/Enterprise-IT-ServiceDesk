const Ticket = require("../models/Ticket");
const { logAudit } = require("../utils/auditLogger");
const notificationService = require("./notificationService");

const VALID_TRANSITIONS = {
  New: ["Assigned", "In Progress", "Pending", "Waiting for Customer", "Closed"],
  Assigned: ["In Progress", "Waiting for Customer", "Pending", "Resolved", "Closed"],
  "In Progress": ["Waiting for Customer", "Pending", "Resolved", "Closed", "Assigned"],
  Pending: ["In Progress", "Assigned", "Resolved", "Closed", "Waiting for Customer"],
  "Waiting for Customer": ["In Progress", "Assigned", "Resolved", "Closed"],
  Resolved: ["Closed", "In Progress", "Assigned"],
  Closed: ["In Progress"] // Allowed with explicit admin/agent action
};

class TicketStatusService {
  /**
    * Validates whether a status transition is permitted.
    */
  isValidTransition(currentStatus, targetStatus, userRole = "customer") {
    if (currentStatus === targetStatus) return true;
    if (userRole === "admin") return true; // Admin override permitted
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
    * Updates ticket status, records history timeline, logs audit event, and dispatches notifications.
    */
  async updateStatus(ticket, newStatus, user, options = {}) {
    const oldStatus = ticket.status;

    if (oldStatus === newStatus) return ticket;

    if (!this.isValidTransition(oldStatus, newStatus, user.role)) {
      throw new Error(`Invalid status transition from '${oldStatus}' to '${newStatus}'.`);
    }

    ticket.status = newStatus;

    if (newStatus === "Resolved" || newStatus === "Closed") {
      if (!ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }
      if (options.resolutionSummary) {
        ticket.resolutionSummary = options.resolutionSummary;
      }
    }

    // Add entry to history timeline
    if (!ticket.history) ticket.history = [];
    ticket.history.push({
      action: "Status Changed",
      performedBy: user.name || user.email || "System",
      detail: `Status updated from '${oldStatus}' to '${newStatus}'.`,
      date: new Date()
    });

    await ticket.save();

    // Log Audit Event
    await logAudit({
      entity: "Ticket",
      entityId: ticket._id,
      action: "STATUS_CHANGED",
      performedBy: user._id || user.id,
      details: {
        ticketNumber: ticket.ticketNumber,
        oldStatus,
        newStatus,
        updatedBy: user.email
      }
    }).catch(() => {});

    // Dispatch Notifications
    if (newStatus === "Resolved") {
      await notificationService.notifyTicketResolved(ticket, user).catch(() => {});
    } else {
      await notificationService.notifyStatusChanged(ticket, oldStatus, newStatus).catch(() => {});
    }

    return ticket;
  }
}

module.exports = new TicketStatusService();
