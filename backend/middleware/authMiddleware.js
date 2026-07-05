const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Maps DB-stored role strings to the canonical API role strings the frontend expects.
// DB: requester | agent | admin  →  API: employee | support_engineer | admin
function normalizeRole(dbRole) {
  if (dbRole === "requester") return "employee";
  if (dbRole === "agent")     return "support_engineer";
  return dbRole; // admin stays admin
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

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({ message: "User Not Found" });
      }

      if (user.accountStatus === "inactive") {
        return res.status(403).json({
          message: "Your account is deactivated. Please contact support.",
        });
      }

      // Attach a normalized role so all controllers and the frontend share a single role vocabulary.
      // dbRole = what is stored in MongoDB (requester / agent / admin)
      // req.user.role = normalized API role (employee / support_engineer / admin)
      req.user = user;
      req.user.dbRole = user.role; // preserve raw value if ever needed
      req.user.role = normalizeRole(user.role);

      return next();
    }

    return res.status(401).json({ message: "No Token Provided" });
  } catch (error) {
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

    const allowed =
      allowedRoles.includes(userRole) ||
      allowedRoles.includes(dbRole);

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