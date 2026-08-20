const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
  registerUser,
  loginUser,
  getAllUsers,
  createUserByAdmin,
  updateUserRole,
  updateUserProfile,
  deleteAccount,
  deleteUserByAdmin,
  logoutUser,
  refreshToken,
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
} = require("../controllers/authController");

const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  resendVerificationValidator,
} = require("../validators/authValidator");

const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, registerValidator, registerUser);
router.post("/login", authLimiter, loginValidator, loginUser);
router.post("/logout", requireRole(), logoutUser);
router.post("/refresh", refreshToken);
router.post("/forgot-password", authLimiter, forgotPasswordValidator, forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordValidator, resetPassword);

// Email Verification
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerificationValidator, resendVerificationEmail);

// User & Profile Management
router.get("/me", requireRole(), getMe);
router.get("/approval-status", (req, res, next) => {
  if (req.query && req.query.email) {
    return getApprovalStatus(req, res, next);
  }
  return protect(req, res, () => getApprovalStatus(req, res, next));
});
router.get("/profile", requireRole(), getProfile);
router.get("/users", protect, requireRole("admin", "agent"), getAllUsers);
router.post("/users", protect, requireRole("admin"), createUserByAdmin);
router.put("/users/:id/role", protect, requireRole("admin"), updateUserRole);
router.delete("/users/:id", protect, requireRole("admin"), deleteUserByAdmin);
router.put("/profile", requireRole(), updateUserProfile);
router.patch("/profile", requireRole(), updateUserProfile);
router.put("/users/:id/password", requireRole(), updatePassword);
router.delete("/delete-account", requireRole(), deleteAccount);

// Session Management
router.get("/sessions", requireRole(), getActiveSessions);
router.delete("/sessions/:sessionId", requireRole(), revokeSession);
router.delete("/sessions", requireRole(), revokeAllSessions);

module.exports = router;