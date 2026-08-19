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

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.replace("Bearer ", "").trim();

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecretkey");

      const user = await User.findById(decoded.id).populate("organizationId").select("-password");

      if (!user) {
        return res.status(401).json({ message: "User Not Found" });
      }

      const isApprovalStatusCheck = (req.path && req.path.includes("/approval-status")) || (req.originalUrl && req.originalUrl.includes("/approval-status"));

      if ((user.accountStatus === "pending_approval" || !user.isApproved) && !isApprovalStatusCheck) {
        return res.status(403).json({
          message: "Access Forbidden: Account is pending administrator approval.",
          code: "PENDING_APPROVAL",
        });
      }

      if (user.accountStatus === "rejected") {
        return res.status(403).json({
          message: "Access Forbidden: Account request was rejected.",
          code: "ACCOUNT_REJECTED",
        });
      }

      if (user.accountStatus === "suspended" || user.accountStatus === "inactive") {
        return res.status(403).json({
          message: "Access Forbidden: Account is suspended or inactive.",
          code: "ACCOUNT_SUSPENDED",
        });
      }

      req.user = user;
      req.user.dbRole = user.role;
      req.user.role = normalizeRole(user.role);
      req.organizationId = user.organizationId?._id || user.organizationId;

      return next();
    }

    return res.status(401).json({ message: "No Token Provided" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "jwt expired", error: "TokenExpiredError" });
    }
    return res.status(401).json({ message: "Not Authorized" });
  }
};

// Role-based Authorization Middleware
// Accepts EITHER normalized API roles (employee / support_engineer / admin)
// OR legacy DB roles (requester / agent) for backward compatibility.
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not Authenticated" });
    }

    const userRole = req.user.role; // normalized
    const dbRole   = req.user.dbRole; // raw

    const expandedAllowed = new Set(allowedRoles);
    if (expandedAllowed.has("customer") || expandedAllowed.has("employee")) {
      expandedAllowed.add("customer");
      expandedAllowed.add("employee");
      expandedAllowed.add("requester");
    }
    if (expandedAllowed.has("support_engineer") || expandedAllowed.has("agent")) {
      expandedAllowed.add("support_engineer");
      expandedAllowed.add("agent");
    }

    const allowed = expandedAllowed.has(userRole) || expandedAllowed.has(dbRole);

    if (allowed) return next();

    return res.status(403).json({
      message: `Access Forbidden: Required roles [${allowedRoles.join(", ")}]`,
    });
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
    message: "Access Forbidden: Agent or Admin access level required",
  });
};

module.exports = { protect, requireRole, adminOnly, normalizeRole };