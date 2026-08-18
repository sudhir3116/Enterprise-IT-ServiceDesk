const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const Notification = require("../models/Notification");
const { logAudit } = require("../utils/auditLogger");
const UAParser = require("ua-parser-js");
const crypto = require("crypto");
const { normalizeRole } = require("../middleware/authMiddleware");
const Session = require("../models/Session");

class AuthService {
  hashToken(token) {
    if (!token) return "";
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  // Helpers
  getDeviceInfo(userAgent) {
    if (!userAgent) return "Unknown Device";
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    const browser = result.browser.name ? `${result.browser.name} ${result.browser.major || ''}`.trim() : "Unknown Browser";
    const os = result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : "Unknown OS";
    return `${browser} on ${os}`;
  }

  generateAccessToken(id, timeoutMinutes = 15) {
    return jwt.sign({ id }, process.env.JWT_SECRET || "mysecretkey", { expiresIn: `${timeoutMinutes}m` });
  }

  generateRefreshToken(id, timeoutDays = 7) {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || "myrefreshsecretkey", { expiresIn: `${timeoutDays}d` });
  }

  async getSessionTimeout() {
    const Settings = require("../models/Settings");
    const settings = await Settings.findOne() || { sessionTimeoutMinutes: 60 };
    return settings.sessionTimeoutMinutes;
  }

  // Business Logic
  async registerUser({ name, email, mobileNumber, password, department, designation }, origin) {
    const userExists = await User.findOne({ email });
    if (userExists) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      mobileNumber,
      password: hashedPassword,
      role: "requester",
      department: department || "General",
      designation: designation || "Staff",
      employeeId: "EMP-" + Math.floor(100000 + Math.random() * 90000),
      emailVerificationToken: verificationToken,
      emailVerificationExpires: Date.now() + 24 * 3600000, // 24 hours
      isEmailVerified: false,
    });

    await logAudit({
      entity: "User", entityId: user._id, action: "Self Registration", performedBy: user._id,
      after: { name: user.name, email: user.email, role: user.role }
    });

    // Fire & Forget Verification Email
    this.sendVerificationEmail(user, verificationToken, origin).catch(err => console.error("Verification email failed:", err.message));

    return user;
  }

  async sendVerificationEmail(user, token, origin) {
    const verifyUrl = `${origin || "http://localhost:5173"}/verify-email?token=${token}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #f4f5f6; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 8px;">
          <h2>Verify Your Email Address</h2>
          <p>Hello ${user.name},</p>
          <p>Please click the button below to verify your email address and activate your IT Helpdesk account.</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px;">Verify Email</a>
          <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This link expires in 24 hours.</p>
        </div>
      </body>
      </html>
    `;
    await sendEmail(user.email, "Verify Your IT Helpdesk Account", emailHtml);
  }

  async verifyEmail(token) {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) throw new Error("Invalid or expired verification token.");

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await logAudit({
      entity: "User", entityId: user._id, action: "Email Verified", performedBy: user._id
    });
  }

  async resendVerificationEmail(email, origin) {
    const user = await User.findOne({ email });
    if (!user) return; // Security: do not leak existence

    if (user.isEmailVerified) throw new Error("Email is already verified.");

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 3600000;
    await user.save();

    await this.sendVerificationEmail(user, verificationToken, origin);
  }

  async sendWelcomeEmail(user) {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #f4f5f6; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 8px;">
          <h2>Welcome ${user.name}</h2>
          <p>Your Employee IT Helpdesk account has been created.</p>
          <p>Employee ID: ${user.employeeId}</p>
        </div>
      </body>
      </html>
    `;
    await sendEmail(user.email, "Welcome to Employee IT Helpdesk System", emailHtml);
  }

  async loginUser(email, password, userAgent, ipAddress = "", rememberMe = false) {
    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid email or password.");
    if (!user.isEmailVerified) throw new Error("Email not verified");
    if (user.accountStatus === "inactive") throw new Error("Account deactivated. Contact support.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid email or password.");

    user.lastLogin = new Date();
    await user.save();

    const timeout = await this.getSessionTimeout();

    await logAudit({
      entity: "User", entityId: user._id, action: "Login", performedBy: user._id,
      after: { email: user.email, role: user.role }
    }).catch(()=>{});

    const accessToken = this.generateAccessToken(user._id, timeout);
    const durationDays = rememberMe ? 30 : 1;
    const refreshToken = this.generateRefreshToken(user._id, durationDays);

    const deviceInfo = this.getDeviceInfo(userAgent);
    const tokenHash = this.hashToken(refreshToken);

    await Session.create({
      userId: user._id,
      tokenHash,
      deviceInformation: deviceInfo,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      rememberMe,
    });

    return { user, accessToken, refreshToken, rememberMe };
  }

  async refreshToken(rToken, userAgent, ipAddress = "") {
    if (!rToken) throw new Error("No refresh token provided.");
    const decoded = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || "myrefreshsecretkey");
    const user = await User.findById(decoded.id);
    if (!user) throw new Error("User not found.");

    const tokenHash = this.hashToken(rToken);
    const session = await Session.findOne({ tokenHash, userId: user._id });

    if (!session || session.revokedAt) {
      // Token Reuse Detection: Force logout on all devices if reuse detected
      await Session.deleteMany({ userId: user._id });
      throw new Error("Invalid refresh token. All sessions revoked for security.");
    }

    const rememberMe = session.rememberMe || false;

    // Rotate token: Delete the used session
    await Session.deleteOne({ _id: session._id });

    const timeout = await this.getSessionTimeout();
    const newAccessToken = this.generateAccessToken(user._id, timeout);
    const durationDays = rememberMe ? 30 : 1;
    const newRefreshToken = this.generateRefreshToken(user._id, durationDays);

    const deviceInfo = this.getDeviceInfo(userAgent);
    const newHash = this.hashToken(newRefreshToken);

    await Session.create({
      userId: user._id,
      tokenHash: newHash,
      deviceInformation: deviceInfo,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      rememberMe,
    });

    return { newAccessToken, newRefreshToken, rememberMe };
  }

  async logoutUser(rToken) {
    if (!rToken) return;
    const tokenHash = this.hashToken(rToken);
    await Session.deleteOne({ tokenHash });
  }

  async getActiveSessions(userId, currentToken) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const sessions = await Session.find({ userId: user._id, revokedAt: null });
    const currentHash = currentToken ? this.hashToken(currentToken) : null;

    return sessions.map(s => ({
      _id: s._id,
      deviceInfo: s.deviceInformation || "Unknown Device",
      ipAddress: s.ipAddress || "Unknown IP",
      createdAt: s.createdAt,
      isCurrentSession: s.tokenHash === currentHash,
    }));
  }

  async revokeSession(userId, sessionId) {
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) throw new Error("Session not found");
    await Session.deleteOne({ _id: sessionId });

    await logAudit({ entity: "Session", entityId: sessionId, action: "Revoked Specific Session", performedBy: userId });
  }

  async revokeAllSessions(userId, currentToken) {
    const currentHash = currentToken ? this.hashToken(currentToken) : null;
    if (currentHash) {
      await Session.deleteMany({ userId, tokenHash: { $ne: currentHash } });
    } else {
      await Session.deleteMany({ userId });
    }

    await logAudit({ entity: "Session", entityId: userId, action: "Revoked All Other Sessions", performedBy: userId });
  }

  async forgotPassword(email, origin) {
    const user = await User.findOne({ email });
    if (!user) return; // Security: Don't leak existence

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${origin || "http://localhost:5173"}/reset-password?token=${resetToken}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
          <div style="height: 36px; width: 36px; display: flex; align-items: center; justify-content: center; background: #2563eb; border-radius: 10px; color: #ffffff; font-weight: bold; font-size: 16px;">⚡</div>
          <span style="font-weight: 750; font-size: 14px; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase;">Product Support Portal</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Reset Your Password</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px;">Hello ${user.name},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px;">We received a request to reset the password for your Product Support Portal account. Click the button below to set a new password. This link is valid for 1 hour.</p>
        <div style="margin-bottom: 28px;">
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">If you did not make this request, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `;
    await sendEmail(user.email, "Reset Your Password", emailHtml).catch(console.error);
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) throw new Error("Token invalid or expired");

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  }
}

module.exports = new AuthService();
