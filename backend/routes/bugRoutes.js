const express = require("express");
const router = express.Router();

const {
  getBugs,
  getBugById,
  createBug,
  updateBug,
  addComment,
  deleteBug,
} = require("../controllers/bugController");

const { protect, requireRole } = require("../middleware/authMiddleware");

// All bug routes require authentication + internal roles only
// Customers (employees/requesters) are blocked at the router level
const internalRoles = ["support_engineer", "agent", "developer", "admin"];

router.get(  "/",           protect, requireRole(...internalRoles), getBugs);
router.get(  "/:id",        protect, requireRole(...internalRoles), getBugById);
router.post( "/",           protect, requireRole("support_engineer", "agent", "admin"), createBug);
router.put(  "/:id",        protect, requireRole(...internalRoles), updateBug);
router.post( "/:id/comments", protect, requireRole(...internalRoles), addComment);
router.delete("/:id",       protect, requireRole("admin"), deleteBug);

module.exports = router;
