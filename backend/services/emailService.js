const nodemailer = require("nodemailer");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Organization = require("../models/Organization");
const Comment = require("../models/Comment");
const EmailLog = require("../models/EmailLog");
const EmailConfiguration = require("../models/EmailConfiguration");
const { logAudit } = require("../utils/auditLogger");
const slaService = require("./slaService");
const routingService = require("./routingService");
const automationService = require("./automationService");

class EmailService {
  /**
   * Fetches or creates default EmailConfiguration for an organization.
   */
  async getConfig(organizationId) {
    if (!organizationId) {
      let config = await EmailConfiguration.findOne({ organizationId: null });
      if (!config) {
        config = await EmailConfiguration.create({
          supportEmail: "support@productportal.com",
          enabled: true
        });
      }
      return config;
    }

    let config = await EmailConfiguration.findOne({ organizationId });
    if (!config) {
      config = await EmailConfiguration.create({
        organizationId,
        supportEmail: "support@productportal.com",
        enabled: true
      });
    }
    return config;
  }

  /**
   * Core email dispatcher with SMTP integration, template formatting, and EmailLog auditing.
   */
  async sendEmail(to, subject, content, options = {}) {
    const { organizationId, ticketId, messageId, emailType } = options;
    const { isEmailNotificationsEnabled, isValidRecipientEmail } = require("../utils/sendEmail");

    let status = "SENT";
    let errorMessage = "";

    // 1. Check global flag
    if (!isEmailNotificationsEnabled()) {
      status = "SKIPPED";
      errorMessage = "Email notifications disabled via ENABLE_EMAIL_NOTIFICATIONS=false";
      console.log(`[EmailService] SKIPPED (Notifications Disabled): to=${to} | subject="${subject}"`);
      await EmailLog.create({
        ticketId: ticketId || null,
        organizationId: organizationId || null,
        recipient: to || "unknown",
        subject: subject || "No Subject",
        emailType: emailType || subject || "general",
        status: "SKIPPED",
        sentAt: new Date(),
        timestamp: new Date(),
        errorMessage,
      }).catch(() => {});
      return false;
    }

    // 2. Validate recipient address & fake/demo domain
    if (!isValidRecipientEmail(to)) {
      status = "SKIPPED";
      errorMessage = `Recipient '${to}' rejected: invalid format or fake demo domain`;
      console.log(`[EmailService] SKIPPED (Invalid or Demo Domain): to=${to} | subject="${subject}"`);
      await EmailLog.create({
        ticketId: ticketId || null,
        organizationId: organizationId || null,
        recipient: to || "unknown",
        subject: subject || "No Subject",
        emailType: emailType || subject || "general",
        status: "SKIPPED",
        sentAt: new Date(),
        timestamp: new Date(),
        errorMessage,
      }).catch(() => {});
      return false;
    }

    try {
      const config = await this.getConfig(organizationId);

      const isHtml = /<[a-z][\s\S]*>/i.test(content);
      let processedContent = content;

      const footerHtml = `
      <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0 20px 0;" />
      <div style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
        <p><strong>Product Support Portal</strong><br />Enterprise Customer Operations</p>
        <p>Support Email: ${config.supportEmail || "support@productportal.com"}</p>
        <p>This is an automated support notification. Replies will update your ticket thread.</p>
        <p>&copy; 2026 Product Support Portal. All rights reserved.</p>
      </div>`;

      if (isHtml) {
        if (processedContent.includes("</body>")) {
          processedContent = processedContent.replace("</body>", `${footerHtml}</body>`);
        } else {
          processedContent += footerHtml;
        }
      }

      // If SMTP credentials are configure-enabled, send via Nodemailer
      if (config.enabled && config.smtpUsername && config.smtpPassword) {
        const transporter = nodemailer.createTransport({
          host: config.smtpHost || "smtp.gmail.com",
          port: config.smtpPort || 587,
          secure: config.smtpPort === 465,
          auth: {
            user: config.smtpUsername,
            pass: config.smtpPassword
          }
        });

        const mailOptions = {
          from: `"Product Support Portal" <${config.supportEmail || process.env.EMAIL_USER || "noreply@productportal.com"}>`,
          to,
          subject,
          [isHtml ? "html" : "text"]: processedContent,
          headers: messageId ? { "In-Reply-To": messageId, "References": messageId } : {}
        };

        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Sent via SMTP to ${to} (${subject})`);
      } else {
        // Fallback logger mode
        console.log(`[EmailService Mock] Dispatching email to ${to} | Subject: "${subject}"`);
      }
    } catch (err) {
      status = "FAILED";
      errorMessage = err.message;
      console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    } finally {
      // Record outbound message in EmailLog
      await EmailLog.create({
        ticketId: ticketId || null,
        organizationId: organizationId || null,
        recipient: to,
        subject,
        emailType: emailType || subject || "general",
        status,
        sentAt: new Date(),
        timestamp: new Date(),
        errorMessage
      }).catch(() => {});
    }

    return status === "SENT";
  }

  // ── Outbound Notification Triggers ─────────────────────────────────────────

  async sendTicketCreatedNotification(ticket, user) {
    const subject = `Your ticket has been created - ${ticket.ticketNumber || ticket._id}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; padding: 24px; color: #f8fafc;">
        <div style="max-width: 560px; margin: auto; background: #1e293b; padding: 28px; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #38bdf8; margin-top: 0;">Support Ticket Received</h2>
          <p>Hello <strong>${user.name || "Valued Customer"}</strong>,</p>
          <p>Your support ticket has been registered successfully. Our operations team is actively reviewing your request.</p>
          <div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
            <p style="margin: 4px 0;"><strong>Title:</strong> ${ticket.title}</p>
            <p style="margin: 4px 0;"><strong>Priority:</strong> ${ticket.priority}</p>
            <p style="margin: 4px 0;"><strong>Source:</strong> ${ticket.source || "email"}</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">Replying directly to this email will append your message to ticket thread <strong>${ticket.ticketNumber}</strong>.</p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(user.email, subject, html, { organizationId: ticket.organizationId, ticketId: ticket._id });
  }

  async sendEngineerReplyNotification(ticket, commentText, engineerName) {
    const recipientEmail = ticket.createdBy?.email;
    if (!recipientEmail) return;

    const subject = `New response on your ticket ${ticket.ticketNumber} - ${ticket.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; padding: 24px; color: #f8fafc;">
        <div style="max-width: 560px; margin: auto; background: #1e293b; padding: 28px; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #38bdf8; margin-top: 0;">Support Response Received</h2>
          <p><strong>${engineerName || "Support Specialist"}</strong> posted a new response to your incident request <strong>${ticket.ticketNumber}</strong>:</p>
          <div style="background: #0f172a; padding: 16px; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 20px 0; font-size: 13px; line-height: 1.6;">
            ${commentText.replace(/\n/g, "<br />")}
          </div>
          <p style="font-size: 12px; color: #94a3b8;">Reply to this email to continue the support conversation.</p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(recipientEmail, subject, html, { organizationId: ticket.organizationId, ticketId: ticket._id });
  }

  async sendStatusChangeNotification(ticket, oldStatus, newStatus) {
    const recipientEmail = ticket.createdBy?.email;
    if (!recipientEmail) return;

    const subject = `Your ticket ${ticket.ticketNumber} status changed to ${newStatus}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; padding: 24px; color: #f8fafc;">
        <div style="max-width: 560px; margin: auto; background: #1e293b; padding: 28px; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #38bdf8; margin-top: 0;">Ticket Status Transition</h2>
          <p>The status of your support ticket <strong>${ticket.ticketNumber}</strong> ("${ticket.title}") has changed from <strong>${oldStatus}</strong> to <strong style="color: #38bdf8;">${newStatus}</strong>.</p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(recipientEmail, subject, html, { organizationId: ticket.organizationId, ticketId: ticket._id });
  }

  async sendSlaWarningNotification(ticket, warningType = "resolution") {
    const recipientEmail = ticket.assignedTo?.email || ticket.createdBy?.email;
    if (!recipientEmail) return;

    const subject = `SLA Warning: Ticket ${ticket.ticketNumber} requires attention`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; padding: 24px; color: #f8fafc;">
        <div style="max-width: 560px; margin: auto; background: #1e293b; padding: 28px; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #f59e0b; margin-top: 0;">⚠️ SLA Expiry Warning</h2>
          <p>Support ticket <strong>${ticket.ticketNumber}</strong> ("${ticket.title}") is approaching its ${warningType} deadline target.</p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(recipientEmail, subject, html, { organizationId: ticket.organizationId, ticketId: ticket._id });
  }

  async sendTicketResolvedNotification(ticket) {
    const recipientEmail = ticket.createdBy?.email;
    if (!recipientEmail) return;

    const subject = `Your ticket ${ticket.ticketNumber} has been resolved`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; padding: 24px; color: #f8fafc;">
        <div style="max-width: 560px; margin: auto; background: #1e293b; padding: 28px; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #10b981; margin-top: 0;">✓ Ticket Resolved</h2>
          <p>Your support request <strong>${ticket.ticketNumber}</strong> ("${ticket.title}") has been marked as resolved by our support team.</p>
          <p>Please let us know if your issue requires further attention by replying to this email.</p>
        </div>
      </body>
      </html>
    `;
    await this.sendEmail(recipientEmail, subject, html, { organizationId: ticket.organizationId, ticketId: ticket._id });
  }

  // ── Inbound Email Processing Engine ────────────────────────────────────────

  async processInboundEmail(payload) {
    const { from, fromName, to, subject = "", body = "", messageId, inReplyTo, attachments = [] } = payload;

    if (!from) {
      throw new Error("Inbound email must include a valid 'from' email address.");
    }

    const cleanFrom = from.trim().toLowerCase();
    const cleanSubject = subject.trim() || "No Subject (Email Support Request)";
    const cleanBody = body.trim() || "(Empty email body)";
    const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Check if subject or headers match an existing ticket thread (e.g. TKT-1024 or inReplyTo)
    const match = cleanSubject.match(/TKT-\d+/i);
    let existingTicket = null;

    if (match) {
      const ticketNum = match[0].toUpperCase();
      existingTicket = await Ticket.findOne({ ticketNumber: ticketNum, isDeleted: false });
    }

    if (!existingTicket && inReplyTo && typeof inReplyTo === "string" && inReplyTo.trim() !== "") {
      existingTicket = await Ticket.findOne({
        $or: [
          { externalMessageId: inReplyTo },
          { emailThreadId: inReplyTo },
          { "emailConversationHistory.messageId": inReplyTo }
        ],
        isDeleted: false
      });
    }

    // ── CASE A: Reply to Existing Ticket ──────────────────────────────────────
    if (existingTicket) {
      let senderUser = await User.findOne({ email: cleanFrom });
      if (!senderUser) {
        senderUser = existingTicket.createdBy || { name: fromName || cleanFrom, email: cleanFrom, _id: existingTicket.createdBy };
      }

      // Add comment into standalone Comment model & embedded comments
      await Comment.create({
        ticket: existingTicket._id,
        author: senderUser._id || existingTicket.createdBy,
        body: `[Email Reply from ${fromName || cleanFrom}]\n\n${cleanBody}`,
        isInternal: false,
        type: "public_reply"
      });

      if (!existingTicket.emailConversationHistory) existingTicket.emailConversationHistory = [];
      existingTicket.emailConversationHistory.push({
        messageId: msgId,
        from: cleanFrom,
        to: to || "support@productportal.com",
        subject: cleanSubject,
        body: cleanBody,
        sentAt: new Date(),
        isOutbound: false
      });

      // Update status if ticket was pending customer
      if (["Waiting for Customer", "Pending", "Resolved"].includes(existingTicket.status)) {
        existingTicket.status = "In Progress";
      }

      existingTicket.history.push({
        action: "Customer Email Reply Appended",
        performedBy: fromName || cleanFrom,
        detail: `Email received from ${cleanFrom}`
      });

      await existingTicket.save();

      // Trigger workflow automations for customer reply
      await automationService.triggerAutomations("customer_replied", existingTicket).catch(() => {});

      await logAudit({
        entity: "Ticket",
        entityId: existingTicket._id,
        action: "EMAIL_REPLY_RECEIVED",
        performedBy: senderUser._id || existingTicket.createdBy,
        details: { ticketNumber: existingTicket.ticketNumber, from: cleanFrom }
      }).catch(() => {});

      return { isNew: false, ticket: existingTicket };
    }

    // ── CASE B: New Ticket Creation from Email ────────────────────────────────
    let customerUser = await User.findOne({ email: cleanFrom });
    let organizationId = null;

    if (customerUser) {
      organizationId = customerUser.organizationId?._id || customerUser.organizationId;
    } else {
      // Find or assign default organization
      let defaultOrg = await Organization.findOne({ isDefault: true });
      if (!defaultOrg) {
        defaultOrg = await Organization.findOne();
      }
      organizationId = defaultOrg ? defaultOrg._id : null;

      // Auto-provision user record for email customer
      try {
        customerUser = await User.create({
          name: fromName || cleanFrom.split("@")[0],
          email: cleanFrom,
          mobileNumber: "+15550001111",
          password: "EmailAuth123!TemporaryPass",
          role: "customer",
          accountStatus: "active",
          isApproved: true,
          organizationId: organizationId,
          authProvider: "local"
        });
      } catch (createErr) {
        customerUser = await User.findOne({ email: cleanFrom });
      }
    }

    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newTicket = new Ticket({
      title: cleanSubject,
      description: cleanBody,
      category: "General",
      priority: "Medium",
      source: "email",
      status: "Open",
      organizationId: organizationId,
      createdBy: customerUser._id,
      emailThreadId: threadId,
      externalMessageId: msgId,
      emailConversationHistory: [
        {
          messageId: msgId,
          from: cleanFrom,
          to: to || "support@productportal.com",
          subject: cleanSubject,
          body: cleanBody,
          sentAt: new Date(),
          isOutbound: false
        }
      ],
      attachments: attachments.map(a => ({
        name: a.name || a.filename || "attachment",
        url: a.url || a.path || "#",
        fileType: a.contentType || "document",
        size: a.size || 0
      })),
      history: [
        {
          action: "Ticket Created via Email",
          performedBy: fromName || cleanFrom,
          detail: `Inbound email received from ${cleanFrom}`
        }
      ]
    });

    // 1. Calculate SLA Deadlines
    try {
      const slaDeadlines = await slaService.calculateDeadlines(organizationId, newTicket.priority);
      newTicket.sla = slaDeadlines;
      if (slaDeadlines.resolutionDue) {
        newTicket.dueDate = slaDeadlines.resolutionDue;
      }
    } catch (err) {
      console.error("[EmailService] SLA Calculation Error:", err.message);
    }

    // 2. Auto-assign Engineer via Routing Engine
    try {
      await routingService.autoAssignTicket(newTicket);
    } catch (err) {
      console.error("[EmailService] Auto-routing Error:", err.message);
    }

    // Save Ticket (triggers Mongoose pre-save hook for ticketNumber: e.g. TKT-1024)
    await newTicket.save();

    // 3. Trigger Workflow Automations Engine
    try {
      await automationService.triggerAutomations("ticket_created", newTicket);
    } catch (err) {
      console.error("[EmailService] Automation Engine Trigger Error:", err.message);
    }

    // 4. Audit Logging
    await logAudit({
      entity: "Ticket",
      entityId: newTicket._id,
      action: "TICKET_CREATED_VIA_EMAIL",
      performedBy: customerUser._id,
      details: { ticketNumber: newTicket.ticketNumber, title: newTicket.title, from: cleanFrom }
    }).catch(() => {});

    // 5. Send Outbound Ticket Created Email Confirmation
    await this.sendTicketCreatedNotification(newTicket, customerUser).catch(() => {});

    return { isNew: true, ticket: newTicket };
  }
}

module.exports = new EmailService();
