const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const Notification = require("../models/Notification");
const { logAudit } = require("../utils/auditLogger");
const auditService = require("../services/auditService");
const { normalizeRole } = require("../middleware/authMiddleware");
const authService = require("../services/authService");

// Maps API-provided role strings back to DB enums
function mapRoleToDb(apiRole) {
  if (apiRole === "employee") return "requester";
  if (apiRole === "support_engineer") return "agent";
  return apiRole; // default/admin
}

// The Access Token and Refresh Token generators have been moved to authService.js

const registerUser = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body, req.headers.origin);
    res.status(201).json({
      message: "User Registered Successfully. Please check your email to verify your account.",
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
    if (error.message === "User already exists") res.status(400);
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || "";
    const { user, accessToken, refreshToken, rememberMe: isRemembered } = await authService.loginUser(
      email,
      password,
      req.headers["user-agent"],
      ipAddress,
      rememberMe
    );

    const maxAge = isRemembered ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    res.cookie("refreshToken", refreshToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge,
    });

    res.status(200).json({
      success: true,
      message: "Login Successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: normalizeRole(user.role),
        dbRole: user.role,
        organizationId: user.organizationId?._id || user.organizationId,
        organization: user.organizationId ? {
          id: user.organizationId._id,
          name: user.organizationId.name,
          slug: user.organizationId.slug,
          domain: user.organizationId.domain,
          plan: user.organizationId.plan,
          settings: user.organizationId.settings,
        } : null,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
        accountStatus: user.accountStatus,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.message.includes("Invalid")) res.status(400);
    if (error.message.includes("not verified")) res.status(403);
    if (error.message.includes("deactivated") || error.code === "PENDING_APPROVAL" || error.code === "ACCOUNT_REJECTED" || error.code === "ACCOUNT_SUSPENDED" || error.message.includes("pending") || error.message.includes("rejected") || error.message.includes("suspended")) {
      res.status(403);
    }
    next(error);
  }
};

// Get All Users — paginated and emits normalized roles
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter, "-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    const normalized = users.map(u => ({
      ...u.toObject(),
      role: normalizeRole(u.role),
      dbRole: u.role,
    }));

    res.status(200).json({
      data: normalized,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
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
      return res.status(404).json({ message: "User Not Found" });
    }

    if (req.body.name !== undefined) {
      const nameVal = String(req.body.name).trim();
      if (!nameVal || nameVal.length < 3 || nameVal.length > 50) {
        return res.status(400).json({ message: "Name must be between 3 and 50 characters long." });
      }
      
      const beforeName = user.name;
      user.name = nameVal;

      if (req.body.mobileNumber) user.mobileNumber = req.body.mobileNumber;
      if (req.body.department) user.department = req.body.department;
      if (req.body.designation) user.designation = req.body.designation;

      const updatedUser = await user.save();

      // Write AuditLog for PROFILE_UPDATED
      await logAudit({
        entity: "User",
        entityId: updatedUser._id,
        action: "PROFILE_UPDATED",
        performedBy: req.user._id,
        details: {
          changedFields: ["Name"],
          before: beforeName,
          after: updatedUser.name
        }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: normalizeRole(updatedUser.role),
          dbRole: updatedUser.role,
          accountStatus: updatedUser.accountStatus,
          registrationMethod: updatedUser.googleId ? "google" : "password",
          createdAt: updatedUser.createdAt
        }
      });
    } else {
      return res.status(400).json({ message: "No valid profile fields provided for update." });
    }
  } catch (error) {
    next(error);
  }
};

// Admin Edit User (Name, Role, Status, Organization)
const updateUserByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, accountStatus, organizationId } = req.body;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const before = {
      name: user.name,
      role: user.role,
      accountStatus: user.accountStatus,
      organizationId: user.organizationId
    };

    if (name) {
      const nameVal = String(name).trim();
      if (nameVal.length >= 3 && nameVal.length <= 50) user.name = nameVal;
    }

    if (role) {
      user.role = mapRoleToDb(role);
    }

    if (accountStatus) {
      user.accountStatus = accountStatus;
      if (accountStatus === "active") user.isApproved = true;
    }

    if (organizationId) {
      user.organizationId = organizationId;
    }

    const updatedUser = await user.save();

    await logAudit({
      entity: "User",
      entityId: updatedUser._id,
      action: "ADMIN_USER_UPDATED",
      performedBy: req.user._id,
      before,
      after: {
        name: updatedUser.name,
        role: updatedUser.role,
        accountStatus: updatedUser.accountStatus,
        organizationId: updatedUser.organizationId
      }
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `User ${updatedUser.name} updated successfully by admin.`,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: normalizeRole(updatedUser.role),
        dbRole: updatedUser.role,
        accountStatus: updatedUser.accountStatus,
        organizationId: updatedUser.organizationId
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update User Password (Self)
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }

    if (user.authProvider !== "local") {
      res.status(400);
      throw new Error("Social login accounts cannot change password.");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error("Incorrect current password.");
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400);
      throw new Error("Password must be at least 8 characters long, contain an uppercase letter, lowercase letter, number, and a special character.");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "Password Changed",
      performedBy: req.user._id,
      ipAddress: req.ip || req.connection?.remoteAddress || ""
    });

    res.status(200).json({ message: "Password updated successfully." });
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

    // Soft-delete tickets created by this user instead of hard delete
    await Ticket.updateMany(
      { createdBy: req.user._id, isDeleted: false },
      {
        $set: { isDeleted: true },
        $push: { history: { action: 'Ticket Deleted (Soft Delete)', performedBy: req.user.name, date: new Date() } }
      }
    );
    
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
    // Soft-delete tickets created by this user
    await Ticket.updateMany(
      { createdBy: user._id, isDeleted: false },
      {
        $set: { isDeleted: true },
        $push: { history: { action: 'Ticket Deleted (Soft Delete) by Admin', performedBy: req.user.name, date: new Date() } }
      }
    );
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

const forgotPassword = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";
    await authService.forgotPassword(req.body.email, req.headers.origin, ipAddress, userAgent);
    res.status(200).json({
      message: "If the email is registered in our system, a password reset link has been dispatched.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress || "";
    await authService.resetPassword(req.body.token, req.body.password, ipAddress);
    res.status(200).json({
      message: "Your password has been successfully updated. You may now sign in.",
    });
  } catch (error) {
    if (error.message.includes("invalid")) res.status(400);
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    await authService.verifyEmail(req.params.token);
    res.status(200).json({ message: "Email successfully verified. You may now log in." });
  } catch (error) {
    if (error.message.includes("Invalid or expired")) res.status(400);
    next(error);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    await authService.resendVerificationEmail(req.body.email, req.headers.origin);
    res.status(200).json({ message: "If the email is registered and unverified, a verification link has been dispatched." });
  } catch (error) {
    if (error.message.includes("already verified")) res.status(400);
    next(error);
  }
};

// Get Logged In User Profile — emits normalized role
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("organizationId").select("-password");
    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: normalizeRole(user.role), // normalized for frontend
        dbRole: user.role,
        organizationId: user.organizationId?._id || user.organizationId,
        organization: user.organizationId ? {
          id: user.organizationId._id,
          name: user.organizationId.name,
          slug: user.organizationId.slug,
          domain: user.organizationId.domain,
          plan: user.organizationId.plan,
          settings: user.organizationId.settings,
        } : null,
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

const refreshToken = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress || "";
    const { newAccessToken, newRefreshToken, rememberMe } = await authService.refreshToken(
      req.cookies.refreshToken,
      req.headers["user-agent"],
      ipAddress
    );

    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    res.cookie("refreshToken", newRefreshToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge,
    });

    res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    res.status(401);
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";
    await authService.logoutUser(req.cookies.refreshToken);
    // Structured audit: LOGOUT
    if (req.user) {
      auditService.auth.logout(req.user._id, req.user.email, ipAddress, userAgent);
    }
    res.clearCookie("refreshToken", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await authService.getActiveSessions(req.user._id, req.cookies.refreshToken);
    res.status(200).json({ sessions });
  } catch (error) {
    if (error.message === "User not found") res.status(404);
    next(error);
  }
};

const revokeSession = async (req, res, next) => {
  try {
    await authService.revokeSession(req.user._id, req.params.sessionId);
    res.status(200).json({ message: "Session revoked successfully" });
  } catch (error) {
    if (error.message.includes("not found")) res.status(404);
    next(error);
  }
};

const revokeAllSessions = async (req, res, next) => {
  try {
    await authService.revokeAllSessions(req.user._id, req.cookies.refreshToken);
    res.status(200).json({ message: "All other sessions revoked successfully" });
  } catch (error) {
    if (error.message === "User not found") res.status(404);
    next(error);
  }
};

// Get Current Authenticated Session Details (/api/auth/me)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("organizationId").select("-password");
    if (!user) {
      res.status(401);
      throw new Error("Not Authorized: User Not Found");
    }

    if (user.accountStatus === "suspended" || user.accountStatus === "rejected") {
      res.status(401);
      throw new Error(`Account access denied: status is ${user.accountStatus}`);
    }

    const normRole = normalizeRole(user.role);
    const permissions = [];
    if (normRole === "admin") {
      permissions.push("admin:all", "org:manage", "users:manage", "tickets:all", "reports:view");
    } else if (normRole === "support_engineer") {
      permissions.push("tickets:assigned", "tickets:update", "comments:internal");
    } else {
      permissions.push("tickets:create", "tickets:own");
    }

    const orgData = user.organizationId ? {
      id: user.organizationId._id,
      name: user.organizationId.name,
      slug: user.organizationId.slug,
      domain: user.organizationId.domain,
      plan: user.organizationId.plan,
      settings: user.organizationId.settings,
    } : null;

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: normRole,
        dbRole: user.role,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
        accountStatus: user.accountStatus,
        isApproved: user.isApproved !== false,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        isEmailVerified: user.isEmailVerified,
      },
      organization: orgData,
      permissions,
    });
  } catch (error) {
    res.status(401);
    next(error);
  }
};

// Get Account Approval Status (/api/auth/approval-status)
const getApprovalStatus = async (req, res, next) => {
  try {
    let user;
    if (req.user && req.user._id) {
      user = await User.findById(req.user._id).populate("organizationId").select("-password");
    } else if (req.query && req.query.email) {
      const email = req.query.email.toString().toLowerCase().trim();
      user = await User.findOne({ email }).populate("organizationId").select("-password");
    }

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const normRole = normalizeRole(user.role);
    const orgName = user.organizationId?.name || "Your Organization";

    res.status(200).json({
      status: user.accountStatus,
      isApproved: !!user.isApproved,
      role: normRole,
      dbRole: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        registrationMethod: user.googleId ? "Google OAuth" : "Email Registration"
      },
      organization: {
        name: orgName,
        slug: user.organizationId?.slug || null,
        domain: user.organizationId?.domain || null
      },
      requestedAt: user.createdAt,
      approvedAt: user.approvedAt || null
    });
  } catch (error) {
    next(error);
  }
};

// Get Users Awaiting Admin Approval
const getPendingUsers = async (req, res, next) => {
  try {
    const pendingUsers = await User.find({
      accountStatus: "pending_approval",
      isApproved: false
    }).populate("organizationId", "name slug").select("-password").sort({ createdAt: -1 });

    const normalized = pendingUsers.map(u => {
      const orgName = u.organizationId?.name || "Organization Pending Assignment";
      return {
        ...u.toObject(),
        name: u.name,
        email: u.email,
        registrationMethod: u.googleId || u.authProvider === "google" ? "Google OAuth" : "Email Registration",
        organization: {
          id: u.organizationId?._id || null,
          name: orgName,
          slug: u.organizationId?.slug || null
        },
        organizationName: orgName,
        createdAt: u.createdAt,
        status: u.accountStatus,
        role: normalizeRole(u.role),
        dbRole: u.role,
      };
    });

    res.status(200).json(normalized);
  } catch (error) {
    next(error);
  }
};

// Approve User Account Request
const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findById(id).populate("organizationId");
    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }

    const assignedRoleInput = role || user.requestedRole || "customer";
    const mappedDbRole = mapRoleToDb(assignedRoleInput);

    user.role = mappedDbRole;
    user.accountStatus = "active";
    user.isApproved = true;
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();

    await user.save();

    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "USER_APPROVED",
      performedBy: req.user._id,
      details: { role: normalizeRole(user.role), dbRole: user.role }
    }).catch(() => {});

    const { sendApprovalEmail } = require("../utils/sendEmail");
    const orgName = user.organizationId?.name || "Your Organization";
    await sendApprovalEmail(user, normalizeRole(user.role), orgName).catch(() => {});

    res.status(200).json({
      message: `User ${user.name} approved successfully as ${normalizeRole(user.role)}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        dbRole: user.role,
        accountStatus: user.accountStatus,
        isApproved: user.isApproved,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Reject User Account Request
const rejectUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }

    user.accountStatus = "rejected";
    user.isApproved = false;
    user.rejectedBy = req.user._id;
    user.rejectedAt = new Date();
    user.rejectionReason = reason || "";
    await user.save();

    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "USER_REJECTED",
      performedBy: req.user._id,
      details: { reason: reason || "" }
    }).catch(() => {});

    const { sendRejectionEmail } = require("../utils/sendEmail");
    await sendRejectionEmail(user, reason || "").catch(() => {});

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountStatus: user.accountStatus,
        isApproved: user.isApproved,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete Registration Request (DELETE /api/users/:id/request)
const deleteUserRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    if (user.accountStatus !== "pending_approval" && user.role === "admin") {
      return res.status(403).json({ message: "Administrative safety lock: Administrator accounts cannot be deleted." });
    }

    await logAudit({
      entity: "User",
      entityId: user._id,
      action: "USER_REQUEST_DELETED",
      performedBy: req.user._id,
      details: { email: user.email, name: user.name, status: user.accountStatus }
    }).catch(() => {});

    await user.deleteOne();

    res.status(200).json({
      message: `Registration request for ${user.name} permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  deleteUserRequest,
  createUserByAdmin,
  updateUserRole,
  updateUserProfile,
  updateUserByAdmin,
  deleteAccount,
  deleteUserByAdmin,
  forgotPassword,
  resetPassword,
  getProfile,
  getMe,
  getApprovalStatus,
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
  verifyEmail,
  resendVerificationEmail,
  updatePassword,
};