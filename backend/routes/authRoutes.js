const express = require("express");

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
} = require("../controllers/authController");

const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  resendVerificationValidator,
} = require("../validators/authValidator");

router.post("/register", registerValidator, registerUser);
router.post("/login", loginValidator, loginUser);
router.post("/logout", logoutUser);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPasswordValidator, forgotPassword);
router.post("/reset-password", resetPasswordValidator, resetPassword);

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
router.delete("/delete-account", protect, deleteAccount);

// Session Management
router.get("/sessions", protect, getActiveSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);
router.delete("/sessions", protect, revokeAllSessions);

module.exports = router;