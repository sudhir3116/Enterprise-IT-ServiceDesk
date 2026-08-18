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

class AuthService {
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

  async loginUser(email, password, userAgent) {
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
    const refreshToken = this.generateRefreshToken(user._id, 7);

    const deviceInfo = this.getDeviceInfo(userAgent);
    user.refreshTokens.push({ token: refreshToken, deviceInfo });
    await user.save();

    return { user, accessToken, refreshToken };
  }

  async refreshToken(rToken, userAgent) {
    if (!rToken) throw new Error("No refresh token provided.");
    const decoded = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || "myrefreshsecretkey");
    const user = await User.findById(decoded.id);
    if (!user) throw new Error("User not found.");

    const tokenExists = user.refreshTokens.find((rt) => rt.token === rToken);
    if (!tokenExists) {
      user.refreshTokens = [];
      await user.save();
      throw new Error("Invalid refresh token. All sessions revoked for security.");
    }

    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== rToken);
    const timeout = await this.getSessionTimeout();
    const newAccessToken = this.generateAccessToken(user._id, timeout);
    const newRefreshToken = this.generateRefreshToken(user._id, 7);

    const deviceInfo = this.getDeviceInfo(userAgent);
    user.refreshTokens.push({ token: newRefreshToken, deviceInfo });
    await user.save();

    return { newAccessToken, newRefreshToken };
  }

  async logoutUser(rToken) {
    if (!rToken) return;
    const decoded = jwt.decode(rToken);
    if (decoded && decoded.id) {
      await User.findByIdAndUpdate(decoded.id, {
        $pull: { refreshTokens: { token: rToken } },
      });
    }
  }

  async getActiveSessions(userId, currentToken) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    return user.refreshTokens.map(rt => ({
      _id: rt._id,
      deviceInfo: rt.deviceInfo,
      createdAt: rt.createdAt,
      isCurrentSession: rt.token === currentToken,
    }));
  }

  async revokeSession(userId, sessionId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const sessionExists = user.refreshTokens.find(rt => rt._id.toString() === sessionId);
    if (!sessionExists) throw new Error("Session not found");

    user.refreshTokens = user.refreshTokens.filter(rt => rt._id.toString() !== sessionId);
    await user.save();

    await logAudit({ entity: "Session", entityId: sessionId, action: "Revoked Specific Session", performedBy: user._id });
  }

  async revokeAllSessions(userId, currentToken) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.refreshTokens = user.refreshTokens.filter(rt => rt.token === currentToken);
    await user.save();

    await logAudit({ entity: "Session", entityId: user._id, action: "Revoked All Other Sessions", performedBy: user._id });
  }

  async forgotPassword(email, origin) {
    const user = await User.findOne({ email });
    if (!user) return; // Security: Don't leak existence

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${origin || "http://localhost:5173"}/reset-password?token=${resetToken}`;
    const emailHtml = `<a href="${resetUrl}">Reset Password</a>`;
    await sendEmail(user.email, "Reset Password", emailHtml).catch(console.error);
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
