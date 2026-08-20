const nodemailer = require("nodemailer");
const EmailLog = require("../models/EmailLog");

const DEMO_DOMAINS = [
  "company.com",
  "test.com",
  "example.com",
  "example.org",
  "example.net",
  "cartrabbit.com",
  "shopdemo.com",
  "domain.com",
  "sample.com",
  "invalid",
  "localhost",
  "mydomain.com",
  "testdomain.com",
  "demo.com",
];

const isEmailNotificationsEnabled = () => {
  return process.env.ENABLE_EMAIL_NOTIFICATIONS === "true" || process.env.ENABLE_EMAIL_NOTIFICATIONS === "1";
};

const isValidRecipientEmail = (to) => {
  if (!to || typeof to !== "string") return false;
  const clean = to.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) return false;

  const domain = clean.split("@")[1];
  if (!domain || DEMO_DOMAINS.includes(domain)) {
    return false;
  }

  return true;
};

const recordEmailLog = async ({ recipient, subject, emailType, status, errorMessage, ticketId, organizationId }) => {
  try {
    await EmailLog.create({
      ticketId: ticketId || null,
      organizationId: organizationId || null,
      recipient: recipient || "unknown",
      subject: subject || "No Subject",
      emailType: emailType || subject || "general",
      status: status.toUpperCase(),
      sentAt: new Date(),
      timestamp: new Date(),
      errorMessage: errorMessage || "",
    });
  } catch (err) {
    console.error("[EmailLog] Log creation failed:", err.message);
  }
};

const sendEmail = async (to, subject, content, options = {}) => {
  const { ticketId, organizationId, emailType } = options;

  // 1. Check if email notifications are enabled globally
  if (!isEmailNotificationsEnabled()) {
    console.log(`[Email] SKIPPED (Notifications Disabled): to=${to} | subject="${subject}"`);
    await recordEmailLog({
      recipient: to,
      subject,
      emailType,
      status: "SKIPPED",
      errorMessage: "Email notifications disabled via ENABLE_EMAIL_NOTIFICATIONS=false",
      ticketId,
      organizationId,
    });
    return { success: false, status: "SKIPPED", reason: "disabled" };
  }

  // 2. Validate recipient email & check for fake/demo domains
  if (!isValidRecipientEmail(to)) {
    console.log(`[Email] SKIPPED (Invalid or Demo Domain): to=${to} | subject="${subject}"`);
    await recordEmailLog({
      recipient: to,
      subject,
      emailType,
      status: "SKIPPED",
      errorMessage: `Recipient '${to}' rejected: invalid format or fake demo domain`,
      ticketId,
      organizationId,
    });
    return { success: false, status: "SKIPPED", reason: "invalid_recipient" };
  }

  // 3. Test environment bypass
  if (process.env.NODE_ENV === "test") {
    console.log(`[Email] Test Mode — Bypassed actual SMTP send to ${to}`);
    await recordEmailLog({
      recipient: to,
      subject,
      emailType,
      status: "SENT",
      errorMessage: "Test mode mock send",
      ticketId,
      organizationId,
    });
    return { success: true, status: "SENT" };
  }

  // 4. Send via Nodemailer Transporter
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const isHtml = /<[a-z][\s\S]*>/i.test(content);

    let processedContent = content;
    const footerText = `
⸻
Product Support Portal
Enterprise Customer Operations

This is an automated message.
Please do not reply directly to this email.

© 2026 Product Support Portal`;

    if (isHtml) {
      const footerHtml = `
      <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0 20px 0;" />
      <div style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
        <p><strong>Product Support Portal</strong><br />Enterprise Customer Operations</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>&copy; 2026 Product Support Portal</p>
      </div>`;
      
      if (processedContent.includes("</div>\n      </body>")) {
        processedContent = processedContent.replace("</div>\n      </body>", `${footerHtml}</div>\n      </body>`);
      } else {
        processedContent += footerHtml;
      }
    } else {
      processedContent += footerText;
    }

    const mailOptions = {
      from: `"Product Support Portal" <${process.env.EMAIL_USER || "noreply@supportportal.io"}>`,
      to,
      subject,
    };

    if (isHtml) {
      mailOptions.html = processedContent;
    } else {
      mailOptions.text = processedContent;
    }

    await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent successfully to ${to}`);
    await recordEmailLog({
      recipient: to,
      subject,
      emailType,
      status: "SENT",
      errorMessage: "",
      ticketId,
      organizationId,
    });
    return { success: true, status: "SENT" };
  } catch (error) {
    console.error(`[Email] Error sending email to ${to}:`, error.message);
    await recordEmailLog({
      recipient: to,
      subject,
      emailType,
      status: "FAILED",
      errorMessage: error.message,
      ticketId,
      organizationId,
    });
    return { success: false, status: "FAILED", error: error.message };
  }
};

const sendApprovalEmail = async (user, assignedRole, orgName = "Acme Global Enterprise") => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const roleName = assignedRole === "admin" ? "Administrator" : assignedRole === "support_engineer" ? "Support Engineer" : "Customer";
  
  const subject = "Your Product Support Portal account has been approved";
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; background: #0f172a; padding: 30px; color: #f8fafc;">
      <div style="max-width: 560px; margin: auto; background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #38bdf8; margin-top: 0;">Account Request Approved</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Great news! Your account request for <strong>${orgName}</strong> has been approved by an administrator.</p>
        <div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 4px 0;"><strong>Assigned Role:</strong> ${roleName}</p>
          <p style="margin: 4px 0;"><strong>Organization:</strong> ${orgName}</p>
        </div>
        <p>You can now sign in to access your portal workspace:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${clientUrl}/login" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Sign In to Workspace
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
  await sendEmail(user.email, subject, html, { emailType: "account_approval" });
};

const sendRejectionEmail = async (user, reason = "") => {
  const subject = "Your Product Support Portal account request";
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; background: #0f172a; padding: 30px; color: #f8fafc;">
      <div style="max-width: 560px; margin: auto; background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #f43f5e; margin-top: 0;">Account Request Status Update</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your account registration request for the Product Support Portal could not be approved at this time.</p>
        ${reason ? `<div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin: 20px 0;"><p style="margin: 0;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
        <p>If you believe this is an error, please contact your organization administrator.</p>
      </div>
    </body>
    </html>
  `;
  await sendEmail(user.email, subject, html, { emailType: "account_rejection" });
};

module.exports = sendEmail;
module.exports.sendApprovalEmail = sendApprovalEmail;
module.exports.sendRejectionEmail = sendRejectionEmail;
module.exports.isEmailNotificationsEnabled = isEmailNotificationsEnabled;
module.exports.isValidRecipientEmail = isValidRecipientEmail;