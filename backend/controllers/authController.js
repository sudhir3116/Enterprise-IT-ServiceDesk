const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const Notification = require("../models/Notification");
const { logAudit } = require("../utils/auditLogger");
const { normalizeRole } = require("../middleware/authMiddleware");

// Maps API-provided role strings back to DB enums
function mapRoleToDb(apiRole) {
  if (apiRole === "employee") return "requester";
  if (apiRole === "support_engineer") return "agent";
  return apiRole; // default/admin
}

// Generate JWT Token
const generateToken = (id, timeoutMinutes = 60) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "mysecretkey",
    {
      expiresIn: `${timeoutMinutes}m`,
    }
  );
};

// Register User (Self registration: Locked to employee role)
const registerUser = async (req, res, next) => {
  try {
    const { name, email, mobileNumber, password, department, designation } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      mobileNumber,
      password: hashedPassword,
      role: "requester", // Enforce requester role for self-registration
      department: department || "General",
      designation: designation || "Staff",
      employeeId: "EMP-" + Math.floor(100000 + Math.random() * 90000),
    });

    // Write AuditLog for Self Registration
    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "Self Registration",
      performedBy: user._id,
      after: { name: user.name, email: user.email, role: user.role }
    });

    // Send Welcoming HTML Email
    try {
      const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to IT Helpdesk</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f5f6; color: #333333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
          .content { padding: 30px 20px; line-height: 1.6; }
          .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
          .card h3 { margin-top: 0; color: #1e293b; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
          .detail-row { display: flex; margin-bottom: 8px; font-size: 14px; }
          .detail-label { font-weight: 600; width: 100px; color: #64748b; }
          .detail-val { color: #0f172a; }
          .security-note { font-size: 12px; color: #64748b; border-left: 3px solid #fbbf24; padding-left: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>IT HelpDesk System</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; font-weight: 600; margin-top: 0;">Hello ${name},</p>
            <p>Welcome to the Employee IT Helpdesk System. Your account has been successfully initialized and prepared for operations.</p>
            
            <div class="card">
              <h3>Account Details</h3>
              <div class="detail-row">
                <div class="detail-label">Name:</div>
                <div class="detail-val">${name}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Employee ID:</div>
                <div class="detail-val">${user.employeeId}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-val">${email}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Role:</div>
                <div class="detail-val">Requester</div>
              </div>
            </div>

            <p><strong>With your account, you are empowered to:</strong></p>
            <ul style="padding-left: 20px; font-size: 14px; color: #475569;">
              <li>Instantly log support tickets for IT infrastructure</li>
              <li>Track ticket life cycles and statuses in real-time</li>
              <li>Add inline ticket comments to communicate directly with admins</li>
              <li>Receive automated tracking updates via system emails</li>
            </ul>

            <div class="security-note">
              <strong>Security Notice:</strong> Keep your login credentials confidential. Administrators will never ask for your password.
            </div>
          </div>
        </div>
      </body>
      </html>
      `;

      await sendEmail(email, "Welcome to Employee IT Helpdesk System", emailHtml);
      console.log(`Welcome HTML email successfully sent to ${email}`);
    } catch (emailError) {
      console.error(`Welcome HTML email failed to send to ${email}:`, emailError.message);
    }

    res.status(201).json({
      message: "User Registered Successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login User
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(400);
      throw new Error("Invalid email or password.");
    }

    if (user.accountStatus === "inactive") {
      res.status(403);
      throw new Error("Your account has been deactivated. Please contact support.");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(400);
      throw new Error("Invalid email or password.");
    }

    user.lastLogin = new Date();
    await user.save();

    // Fetch session timeout policy
    const Settings = require("../models/Settings");
    const settings = await Settings.findOne() || { sessionTimeoutMinutes: 60 };
    const timeout = settings.sessionTimeoutMinutes;

    // Log audit
    try {
      await logAudit({
        entity: "User", entityId: user._id,
        action: "Login",
        performedBy: user._id,
        after: { email: user.email, role: user.role }
      });
    } catch (_) {}

    const tokenStr = generateToken(user._id, timeout);

    // Set cookie expiration using the same value as JWT expiration
    res.cookie("token", tokenStr, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: timeout * 60 * 1000,
    });

    res.status(200).json({
      message: "Login Successful",
      token: tokenStr,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: normalizeRole(user.role), // always emit normalized role
        dbRole: user.role,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
        accountStatus: user.accountStatus,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get All Users — emits normalized roles
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    const normalized = users.map(u => ({
      ...u.toObject(),
      role: normalizeRole(u.role),
      dbRole: u.role,
    }));
    res.status(200).json(normalized);
  } catch (error) {
    next(error);
  }
};

// Admin User Creation Endpoint (Can assign support_engineer and admin roles)
const createUserByAdmin = async (req, res, next) => {
  try {
    const { name, email, mobileNumber, password, role, department, designation, employeeId } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password || "Helpdesk2026!", 10);

    const user = await User.create({
      name,
      email,
      mobileNumber,
      password: hashedPassword,
      role: role ? mapRoleToDb(role) : "requester",
      department: department || "General",
      designation: designation || "Staff",
      employeeId: employeeId || ("EMP-" + Math.floor(100000 + Math.random() * 90000)),
    });

    // Write AuditLog for admin user creation
    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "Admin Created User",
      performedBy: req.user._id,
      after: { name: user.name, email: user.email, role: user.role }
    });

    res.status(201).json({
      message: "User Created Successfully by Administrator",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update User Role & Status (admin only)
const updateUserRole = async (req, res, next) => {
  try {
    const { role, status, department, designation, employeeId } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }

    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("You cannot change your own role or status settings");
    }

    if (user.role === "admin" && req.user.role !== "admin") {
      res.status(403);
      throw new Error("Administrator privileges required");
    }

    const oldStatus = user.accountStatus;
    const before = {
      role: user.role,
      accountStatus: user.accountStatus,
      department: user.department,
      designation: user.designation,
      employeeId: user.employeeId
    };

    if (role) user.role = mapRoleToDb(role);
    if (status) user.accountStatus = status;
    if (department) user.department = department;
    if (designation) user.designation = designation;
    if (employeeId) user.employeeId = employeeId;
    
    await user.save();

    // Write AuditLog for admin updating settings
    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "Admin Updated User Settings",
      performedBy: req.user._id,
      before,
      after: {
        role: user.role,
        accountStatus: user.accountStatus,
        department: user.department,
        designation: user.designation,
        employeeId: user.employeeId
      }
    });

    // Send Activation/Deactivation alert email
    if (status && oldStatus !== status) {
      try {
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Account Status Updated</title>
          <style>
            body { font-family: sans-serif; background-color: #f4f5f6; color: #333; padding: 20px; }
            .card { background: #fff; padding: 24px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .status-tag { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: 600; text-transform: uppercase; font-size: 12px; }
            .status-active { background: #e6f7ed; color: #10b981; }
            .status-inactive { background: #fef2f2; color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>IT HelpDesk Support</h2>
            <p>Hello ${user.name},</p>
            <p>Your IT Helpdesk system account status has been updated by the system administrator:</p>
            <p>New Status: <span class="status-tag ${status === 'active' ? 'status-active' : 'status-inactive'}">${status}</span></p>
            ${status === 'inactive' ? '<p>Please contact IT Support Operations if you believe this was in error.</p>' : '<p>You may now sign in and access support tickets.</p>'}
          </div>
        </body>
        </html>
        `;
        await sendEmail(user.email, `IT Helpdesk Account ${status === 'active' ? 'Activated' : 'Deactivated'}`, emailHtml);
      } catch (err) {
        console.error("Status alert email failed:", err.message);
      }
    }

    res.status(200).json({
      message: "User Account Settings Updated Successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update User Profile (Self)
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }

    const before = {
      name: user.name,
      mobileNumber: user.mobileNumber,
      department: user.department,
      designation: user.designation
    };

    user.name = req.body.name || user.name;
    user.mobileNumber = req.body.mobileNumber || user.mobileNumber;
    user.department = req.body.department || user.department;
    user.designation = req.body.designation || user.designation;

    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10);
    }

    const updatedUser = await user.save();

    // Write AuditLog for self profile update
    await logAudit({
      entity: "User",
      entityId: updatedUser._id,
      action: "Self Updated Profile",
      performedBy: req.user._id,
      before,
      after: {
        name: updatedUser.name,
        mobileNumber: updatedUser.mobileNumber,
        department: updatedUser.department,
        designation: updatedUser.designation
      }
    });

    res.status(200).json({
      message: "Profile Updated Successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
        role: updatedUser.role,
        employeeId: updatedUser.employeeId,
        department: updatedUser.department,
        designation: updatedUser.designation,
        accountStatus: updatedUser.accountStatus,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete User Account (Self)
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }

    if (user.role === "admin") {
      res.status(400);
      throw new Error("System protection rule: Admin account cannot be deleted.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error("Invalid Password. Verification failed.");
    }

    await Ticket.deleteMany({ createdBy: req.user._id });
    
    // Write AuditLog for account deletion
    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "Self Account Deletion",
      performedBy: req.user._id,
      before: { name: user.name, email: user.email }
    });

    await user.deleteOne();

    res.status(200).json({
      message: "Account and associated tickets deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const deleteUserByAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }

    if (user.role === "admin") {
      res.status(403);
      throw new Error("Administrative safety lock: Administrator accounts cannot be deleted.");
    }

    // Cascading deletes for tickets, comments references, and notifications
    await Ticket.deleteMany({ createdBy: user._id });
    await Notification.deleteMany({ recipient: user._id });

    // Write AuditLog for admin deleting user
    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "Admin Deleted User",
      performedBy: req.user._id,
      before: { name: user.name, email: user.email }
    });

    await user.deleteOne();

    res.status(200).json({
      message: "User and associated tickets deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password Request Handler
const crypto = require("crypto");

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Security practice: do not leak whether a user exists.
      return res.status(200).json({
        message: "If the email is registered in our system, a password reset link has been dispatched.",
      });
    }

    // Fix legacy invalid roles before saving to pass mongoose enum validation
    if (user.role === "employee") user.role = "requester";
    if (user.role === "support_engineer") user.role = "agent";

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    // Reset Link URL
    const resetUrl = `${req.headers.origin || "http://localhost:5173"}/reset-password?token=${resetToken}`;

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body { font-family: sans-serif; background-color: #f4f5f6; color: #333; padding: 20px; }
        .card { background: #fff; padding: 24px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .btn { display: inline-block; background: #3b82f6; color: white !important; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>IT ServiceDesk Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested a password reset for your Employee IT Helpdesk account. Please click the button below to establish a new password:</p>
        <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This reset link is valid for 1 hour. If you did not initiate this request, you may securely ignore this message.</p>
      </div>
    </body>
    </html>
    `;

    try {
      await sendEmail(user.email, "Reset Your IT Helpdesk Password", emailHtml);
    } catch (err) {
      console.error("Failed to send reset email:", err.message);
    }

    res.status(200).json({
      message: "If the email is registered in our system, a password reset link has been dispatched.",
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password Execution Handler
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error("Password reset token is invalid or has expired.");
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Your password has been successfully updated. You may now sign in.",
    });
  } catch (error) {
    next(error);
  }
};

// Get Logged In User Profile — emits normalized role
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: normalizeRole(user.role), // normalized for frontend
        dbRole: user.role,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
        accountStatus: user.accountStatus,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        isEmailVerified: user.isEmailVerified,
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  createUserByAdmin,
  updateUserRole,
  updateUserProfile,
  deleteAccount,
  deleteUserByAdmin,
  forgotPassword,
  resetPassword,
  getProfile,
};