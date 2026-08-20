const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Maps DB-stored role strings to the canonical API role strings the frontend expects.
// DB: requester | agent | admin  →  API: employee | support_engineer | admin
function normalizeRole(dbRole) {
  if (dbRole === "requester" || dbRole === "employee") return "customer";
  if (dbRole === "agent")     return "support_engineer";
  if (dbRole === "developer") return "developer"; // Module 8: developer role
  return dbRole; // customer, support_engineer, admin, developer
}

function isRequesterRole(role, dbRole) {
  const values = [role, dbRole];
  return values.some((r) => ["customer", "requester", "employee"].includes(r));
}

function isStaffRole(role, dbRole) {
  const values = [role, dbRole];
  return values.some((r) => ["admin", "support_engineer", "agent"].includes(r));
}

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return "mysecretkey";
}

function extractToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return req.headers.authorization.replace("Bearer ", "").trim();
  }
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
}

const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "No Token Provided" });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    const user = await User.findById(decoded.id).populate("organizationId").select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User Not Found" });
    }

    const isApprovalStatusCheck = (req.path && req.path.includes("/approval-status")) || (req.originalUrl && req.originalUrl.includes("/approval-status"));

    if ((user.accountStatus === "pending_approval" || !user.isApproved) && !isApprovalStatusCheck) {
      return res.status(403).json({
        success: false,
        message: "Access Forbidden: Account is pending administrator approval.",
        code: "PENDING_APPROVAL",
      });
    }

    if (user.accountStatus === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Access Forbidden: Account request was rejected.",
        code: "ACCOUNT_REJECTED",
      });
    }

    if (user.accountStatus === "suspended" || user.accountStatus === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Access Forbidden: Account is suspended or inactive.",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    req.user = user;
    req.user.dbRole = user.role;
    req.user.role = normalizeRole(user.role);
    req.organizationId = user.organizationId?._id || user.organizationId;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "jwt expired", error: "TokenExpiredError" });
    }
    if (error.message && error.message.includes("JWT_SECRET")) {
      return res.status(500).json({ success: false, message: "Server authentication is misconfigured" });
    }
    return res.status(401).json({ success: false, message: "Not Authorized" });
  }
};

// Role-based Authorization Middleware
// Accepts EITHER normalized API roles (employee / support_engineer / admin)
// OR legacy DB roles (requester / agent) for backward compatibility.
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // If protect() wasn't executed earlier in the chain, attempt to authenticate here
      if (!req.user) {
        const token = extractToken(req);
        if (!token) return res.status(401).json({ success: false, message: "Not Authenticated" });
        const decoded = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decoded.id).populate("organizationId").select("-password");
        if (!user) return res.status(401).json({ success: false, message: "User Not Found" });
        req.user = user;
        req.user.dbRole = user.role;
        req.user.role = normalizeRole(user.role);
        req.organizationId = user.organizationId?._id || user.organizationId;
      }

      // If no specific roles requested, allow any authenticated user
      if (!allowedRoles || allowedRoles.length === 0) return next();

      const userRole = (req.user.role || '').toString().toLowerCase(); // normalized
      const dbRole = (req.user.dbRole || '').toString().toLowerCase();

      const expandedAllowed = new Set(allowedRoles.map(r => (r || '').toString().toLowerCase()));
      // Expansion for common role aliases
      if (expandedAllowed.has('customer') || expandedAllowed.has('employee') || expandedAllowed.has('requester')) {
        expandedAllowed.add('customer'); expandedAllowed.add('employee'); expandedAllowed.add('requester');
      }
      if (expandedAllowed.has('support_engineer') || expandedAllowed.has('agent') || expandedAllowed.has('support_agent')) {
        expandedAllowed.add('support_engineer'); expandedAllowed.add('agent'); expandedAllowed.add('support_agent');
      }

      const allowed = expandedAllowed.has(userRole) || expandedAllowed.has(dbRole);
      if (allowed) return next();

      return res.status(403).json({ success: false, message: "Forbidden" });
    } catch (err) {
      if (err && err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'jwt expired', error: 'TokenExpiredError' });
      }
      return res.status(401).json({ success: false, message: 'Not Authenticated' });
    }
  };
};

// Admin/Agent helper — supports both normalized and legacy role names
const adminOnly = (req, res, next) => {
  const role = req.user?.role;
  const dbRole = req.user?.dbRole;
  if (
    ["admin", "support_engineer", "agent"].includes(role) ||
    ["admin", "agent"].includes(dbRole)
  ) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Forbidden",
  });
};

module.exports = { protect, requireRole, adminOnly, normalizeRole, isRequesterRole, isStaffRole, getJwtSecret };
