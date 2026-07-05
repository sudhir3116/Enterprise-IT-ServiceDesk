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
  forgotPassword,
  resetPassword,
  getProfile,
} = require("../controllers/authController");

const { protect, requireRole } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// User & Profile Management
router.get("/profile", protect, getProfile);
router.get("/users", protect, requireRole("admin", "agent"), getAllUsers);
router.post("/users", protect, requireRole("admin"), createUserByAdmin);
router.put("/users/:id/role", protect, requireRole("admin"), updateUserRole);
router.delete("/users/:id", protect, requireRole("admin"), deleteUserByAdmin);
router.put("/profile", protect, updateUserProfile);
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;