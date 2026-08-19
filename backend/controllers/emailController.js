const EmailConfiguration = require("../models/EmailConfiguration");
const EmailLog = require("../models/EmailLog");
const emailService = require("../services/emailService");
const { logAudit } = require("../utils/auditLogger");

// ── GET /api/email/config ─────────────────────────────────────────────────────
const getEmailConfig = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    const config = await emailService.getConfig(orgId);
    res.status(200).json(config);
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/email/config ─────────────────────────────────────────────────────
const updateEmailConfig = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId?._id || req.user.organizationId;
    let config = await emailService.getConfig(orgId);

    const { supportEmail, smtpHost, smtpPort, smtpUsername, smtpPassword, enabled, templates } = req.body;

    if (supportEmail) config.supportEmail = supportEmail.trim().toLowerCase();
    if (smtpHost) config.smtpHost = smtpHost.trim();
    if (smtpPort) config.smtpPort = Number(smtpPort);
    if (smtpUsername !== undefined) config.smtpUsername = smtpUsername.trim();
    if (smtpPassword !== undefined) config.smtpPassword = smtpPassword;
    if (enabled !== undefined) config.enabled = !!enabled;
    if (templates) config.templates = { ...config.templates, ...templates };

    await config.save();

    await logAudit({
      entity: "EmailConfiguration",
      entityId: config._id,
      action: "EMAIL_CONFIG_UPDATED",
      performedBy: req.user._id,
      details: { supportEmail: config.supportEmail, enabled: config.enabled }
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: "Email configuration saved successfully.",
      config
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/email/test ──────────────────────────────────────────────────────
const sendTestEmail = async (req, res, next) => {
  try {
    const { recipient } = req.body;
    const target = recipient || req.user.email;
    const orgId = req.user.organizationId?._id || req.user.organizationId;

    const subject = "Product Support Portal - SMTP Test Email";
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; padding: 24px; color: #f8fafc;">
        <div style="max-width: 500px; margin: auto; background: #1e293b; padding: 28px; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #38bdf8; margin-top: 0;">✓ SMTP Configuration Test Successful</h2>
          <p>Hello <strong>${req.user.name}</strong>,</p>
          <p>This is a test notification confirming that your enterprise email integration is active and properly configured.</p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 20px;">Sent at ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    const success = await emailService.sendEmail(target, subject, html, { organizationId: orgId });

    if (success) {
      res.status(200).json({ success: true, message: `Test email dispatched to ${target}.` });
    } else {
      res.status(500).json({ success: false, message: `Failed to send test email to ${target}. Check SMTP logs.` });
    }
  } catch (error) {
    next(error);
  }
};

// ── POST /api/email/inbound ───────────────────────────────────────────────────
const handleInboundWebhook = async (req, res, next) => {
  try {
    const result = await emailService.processInboundEmail(req.body);
    res.status(200).json({
      success: true,
      isNew: result.isNew,
      ticket: {
        id: result.ticket._id,
        ticketNumber: result.ticket.ticketNumber,
        title: result.ticket.title,
        status: result.ticket.status,
        source: result.ticket.source
      }
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/email/logs ───────────────────────────────────────────────────────
const getEmailLogs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.organizationId) {
      filter.organizationId = req.user.organizationId?._id || req.user.organizationId;
    }

    const logs = await EmailLog.find(filter)
      .populate("ticketId", "ticketNumber title")
      .sort({ sentAt: -1 })
      .limit(100);

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmailConfig,
  updateEmailConfig,
  sendTestEmail,
  handleInboundWebhook,
  getEmailLogs,
};
