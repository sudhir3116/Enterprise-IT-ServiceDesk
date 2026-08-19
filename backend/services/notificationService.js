const Notification = require("../models/Notification");
const sendEmail = require("../utils/sendEmail");

class NotificationService {
  /**
   * Dispatches in-app notification and optional email.
   */
  async createNotification({ userId, title, message, type = "general", ticketId, userEmail }) {
    try {
      // 1. In-App Notification
      const notif = await Notification.create({
        userId,
        title,
        message,
        type,
        ticketId,
      });

      // 2. Email Notification (if email provided)
      if (userEmail) {
        await sendEmail(userEmail, title, message).catch(err => {
          console.warn(`[Notification] Failed to send email to ${userEmail}:`, err.message);
        });
      }

      return notif;
    } catch (err) {
      console.error("[Notification] Error creating notification:", err.message);
    }
  }

  async notifyTicketCreated(ticket, user) {
    if (!user) return;
    const title = `Ticket Created: #${ticket.ticketNumber}`;
    const message = `Your support ticket "${ticket.title}" has been created successfully. Our team will review it shortly.`;
    
    await this.createNotification({
      userId: user._id,
      title,
      message,
      type: "ticket_created",
      ticketId: ticket._id,
      userEmail: user.email,
    });
  }

  async notifyTicketAssigned(ticket, engineer) {
    if (!engineer) return;
    const title = `New Ticket Assigned: #${ticket.ticketNumber}`;
    const message = `You have been assigned to ticket "${ticket.title}" (Priority: ${ticket.priority}).`;

    await this.createNotification({
      userId: engineer._id,
      title,
      message,
      type: "ticket_assigned",
      ticketId: ticket._id,
      userEmail: engineer.email,
    });
  }

  async notifySlaBreach(ticket, breachType = "resolution") {
    if (!ticket) return;
    const title = `🚨 SLA ${breachType === "response" ? "Response" : "Resolution"} Breached: #${ticket.ticketNumber}`;
    const message = `Ticket "${ticket.title}" (${ticket.priority} Priority) has breached its SLA ${breachType} target deadline. Immediate attention required.`;

    if (ticket.assignedTo) {
      await this.createNotification({
        userId: ticket.assignedTo._id || ticket.assignedTo,
        title,
        message,
        type: "sla_breached",
        ticketId: ticket._id,
        userEmail: ticket.assignedTo.email,
      });
    }
  }

  async notifyTicketResolved(ticket, customer) {
    if (!customer) return;
    const title = `Ticket Resolved: #${ticket.ticketNumber}`;
    const message = `Your support ticket "${ticket.title}" has been marked as Resolved. Please let us know if you require further assistance.`;

    await this.createNotification({
      userId: customer._id || customer,
      title,
      message,
      type: "ticket_resolved",
      ticketId: ticket._id,
      userEmail: customer.email,
    });
  }
}

module.exports = new NotificationService();
