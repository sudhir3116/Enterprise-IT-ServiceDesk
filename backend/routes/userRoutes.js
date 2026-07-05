const express = require("express");
const router = express.Router();
const { getAllUsers, updateUserRole, deleteUserByAdmin } = require("../controllers/authController");
const { protect, requireRole } = require("../middleware/authMiddleware");

// GET /api/users - Admin only
router.get("/", protect, requireRole("admin"), getAllUsers);

// PUT /api/users/:id/role - Admin only
router.put(
  "/:id/role",
  protect,
  requireRole("admin"),
  (req, res, next) => {
    // Map legacy role strings or formats to the new agent role
    if (req.body.role === "supportEngineer" || req.body.role === "support_engineer") {
      req.body.role = "agent";
    }
    next();
  },
  updateUserRole
);

// DELETE /api/users/:id - Admin only
router.delete("/:id", protect, requireRole("admin"), deleteUserByAdmin);

module.exports = router;
