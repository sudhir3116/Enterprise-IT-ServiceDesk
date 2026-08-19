const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Notification = require("../models/Notification");
const sendEmail = require("../utils/sendEmail");
const { logAudit } = require("../utils/auditLogger");

class TicketService {
  async createTicket(payload, user) {
    const {
      title,
      description,
      category,
      impact,
      urgency,
      department,
      tags,
      environment,
      issueDetails,
      attachments,
    } = payload;

    const orgId = user.organizationId?._id || user.organizationId;
    let mappedCategory = category || "General";
    if (mappedCategory === "Access/Login") mappedCategory = "Access";

    const ticket = new Ticket({
      title,
      description,
      category: mappedCategory,
      impact: impact || "Medium",
      urgency: urgency || "Medium",
      department: department || user.department || "General",
      tags: tags || [],
      organizationId: orgId,
      createdBy: user._id,
      environment: environment || {},
      issueDetails: issueDetails || {},
      attachments: attachments || [],
      history: [
        {
          action: "Ticket Created",
          performedBy: user.name,
        },
      ],
    });

    // Workload-Aware & Skill-Based Automatic Routing and SLA Calculation
    try {
      const slaService = require("./slaService");
      const routingService = require("./routingService");

      const slaDeadlines = await slaService.calculateDeadlines(orgId, ticket.priority);
      ticket.sla = slaDeadlines;
      if (slaDeadlines.resolutionDue) {
        ticket.dueDate = slaDeadlines.resolutionDue;
      }

      await routingService.autoAssignTicket(ticket);
    } catch (routeErr) {
      console.error("[TicketService] SLA/Routing engine error:", routeErr.message);
    }

    // Save ticket — triggers Mongoose pre-save hook for ticketNumber & SLA dueDate
    await ticket.save();

    // Trigger Workflow Automations Engine
    try {
      const automationService = require("./automationService");
      await automationService.triggerAutomations("ticket_created", ticket);
    } catch (autoErr) {
      console.error("[TicketService] Automation engine trigger error:", autoErr.message);
    }

    // Async Notifications & Email Alerts
    this.sendNotificationsAndEmails(ticket, user).catch((err) =>
      console.error("[TicketService] Notification error:", err.message)
    );

    // Write Audit Log
    logAudit({
      entity: "Ticket",
      entityId: ticket._id,
      action: "Created Ticket",
      performedBy: user._id,
      after: { ticketNumber: ticket.ticketNumber, title: ticket.title, priority: ticket.priority },
    }).catch(console.error);

    return ticket;
  }

  async sendNotificationsAndEmails(ticket, creator) {
    const orgId = ticket.organizationId;
    
    // In-App Notifications
    try {
      const receivers = [];
      const admins = await User.find({ organizationId: orgId, role: "admin" });
      receivers.push(...admins.map((a) => a._id));
      if (ticket.assignedTo) {
        receivers.push(ticket.assignedTo);
      }

      const notifPromises = [...new Set(receivers)].map((userId) =>
        Notification.create({
          recipient: userId,
          title: "Incident Activated",
          message: `Ticket "${ticket.title}" (${ticket.ticketNumber}) has been logged.`,
          ticketId: ticket._id,
        })
      );
      await Promise.all(notifPromises);
    } catch (err) {
      console.error("[TicketService] Notification creation failed:", err.message);
    }

    // HTML Email to Customer
    try {
      const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-radius: 14px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
          <div style="height: 36px; width: 36px; display: flex; align-items: center; justify-content: center; background: #2563eb; border-radius: 10px; color: #ffffff; font-weight: bold; font-size: 16px;">⚡</div>
          <span style="font-weight: 750; font-size: 14px; color: #0f172a; text-transform: uppercase;">Product Support Portal</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Ticket Created</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your support ticket <strong>${ticket.ticketNumber}</strong> has been logged in our queue.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #475569;"><strong style="color: #0f172a;">Title:</strong> ${ticket.title}</p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #475569;"><strong style="color: #0f172a;">Category:</strong> ${ticket.category}</p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #475569;"><strong style="color: #0f172a;">Priority:</strong> ${ticket.priority}</p>
          ${ticket.dueDate ? `<p style="margin: 0; font-size: 13px; color: #475569;"><strong style="color: #0f172a;">Target SLA Resolution:</strong> ${new Date(ticket.dueDate).toLocaleString()}</p>` : ""}
        </div>
      </div>
      `;

      await sendEmail(creator.email, `Support Ticket Logged: ${ticket.ticketNumber}`, emailHtml);
    } catch (mailErr) {
      console.error("[TicketService] Customer email failed:", mailErr.message);
    }
  }
}

module.exports = new TicketService();
