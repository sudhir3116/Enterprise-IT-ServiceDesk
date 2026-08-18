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

// Strict rate limiter for authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 attempts per windowMs
  message: {
    message: "Too many authentication requests from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, registerValidator, registerUser);
router.post("/login", authLimiter, loginValidator, loginUser);
router.post("/logout", logoutUser);
router.post("/refresh", refreshToken);
router.post("/forgot-password", authLimiter, forgotPasswordValidator, forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordValidator, resetPassword);

// Email Verification
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerificationValidator, resendVerificationEmail);

// User & Profile Management
router.get("/profile", protect, getProfile);
router.get("/users", protect, requireRole("admin", "agent"), getAllUsers);
router.post("/users", protect, requireRole("admin"), createUserByAdmin);
router.put("/users/:id/role", protect, requireRole("admin"), updateUserRole);
router.delete("/users/:id", protect, requireRole("admin"), deleteUserByAdmin);
router.put("/profile", protect, updateUserProfile);
router.put("/users/:id/password", protect, updatePassword);
router.delete("/delete-account", protect, deleteAccount);

// Session Management
router.get("/sessions", protect, getActiveSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);
router.delete("/sessions", protect, revokeAllSessions);

module.exports = router;