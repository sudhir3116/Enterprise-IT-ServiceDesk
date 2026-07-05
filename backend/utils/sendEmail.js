const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, content) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const isHtml = /<[a-z][\s\S]*>/i.test(content);

    // Standardized footer tag additions
    let processedContent = content;
    const footerText = `
⸻
Employee IT Helpdesk System
Internal Support Platform

This is an automated message.
Please do not reply directly to this email.

© 2026 Employee IT Helpdesk System`;

    if (isHtml) {
      const footerHtml = `
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
      <div style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
        <p><strong>Employee IT Helpdesk System</strong><br />Internal Support Platform</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>&copy; 2026 Employee IT Helpdesk System</p>
      </div>`;
      
      // Inject footer inside container/body tags if they exist
      if (processedContent.includes("</div>\n      </body>")) {
        processedContent = processedContent.replace("</div>\n      </body>", `${footerHtml}</div>\n      </body>`);
      } else {
        processedContent += footerHtml;
      }
    } else {
      processedContent += footerText;
    }

    const mailOptions = {
      from: `"Employee IT Helpdesk Team" <${process.env.EMAIL_USER}>`,
      to,
      subject,
    };

    if (isHtml) {
      mailOptions.html = processedContent;
    } else {
      mailOptions.text = processedContent;
    }

    await transporter.sendMail(mailOptions);
    console.log("Email Sent Successfully");
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
};

module.exports = sendEmail;