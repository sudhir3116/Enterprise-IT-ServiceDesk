const express = require("express");
const router = express.Router();
const { 
  getAllUsers, 
  getPendingUsers, 
  approveUser, 
  rejectUser, 
  deleteUserRequest,
  updateUserRole, 
  updateUserProfile,
  updateUserByAdmin,
  deleteUserByAdmin 
} = require("../controllers/authController");
const { protect, requireRole } = require("../middleware/authMiddleware");

// Self Profile Updates (PATCH /api/users/profile & PUT /api/users/profile)
router.patch("/profile", protect, updateUserProfile);
router.put("/profile", protect, updateUserProfile);

// GET /api/users - Admin & Support Engineer
router.get("/", protect, requireRole("admin", "support_engineer", "agent"), getAllUsers);

// GET /api/users/pending - Admin only
router.get("/pending", protect, requireRole("admin"), getPendingUsers);

// POST /api/users/:id/approve - Admin only
router.post("/:id/approve", protect, requireRole("admin"), approveUser);

// POST /api/users/:id/reject - Admin only
router.post("/:id/reject", protect, requireRole("admin"), rejectUser);

// DELETE /api/users/:id/request - Admin only
router.delete("/:id/request", protect, requireRole("admin"), deleteUserRequest);

// PUT /api/users/:id/admin-update - Admin only
router.put("/:id/admin-update", protect, requireRole("admin"), updateUserByAdmin);
router.put("/:id", protect, requireRole("admin"), updateUserByAdmin);

// PUT /api/users/:id/role - Admin only
router.put(
  "/:id/role",
  protect,
  requireRole("admin"),
  (req, res, next) => {
    if (req.body.role === "supportEngineer" || req.body.role === "support_engineer") {
      req.body.role = "support_engineer";
    }
    next();
  },
  updateUserRole
);

// DELETE /api/users/:id - Admin only
router.delete("/:id", protect, requireRole("admin"), deleteUserRequest);

module.exports = router;
