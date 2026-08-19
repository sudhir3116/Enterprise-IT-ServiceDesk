const express = require("express");
const router = express.Router();
const {
  getCurrentOrganization,
  updateCurrentOrganization,
  createOrganization,
  getAllOrganizations,
} = require("../controllers/organizationController");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.get("/current", protect, getCurrentOrganization);
router.put("/current", protect, requireRole("admin"), updateCurrentOrganization);

// Administrative organization routes
router.get("/all", protect, requireRole("admin"), getAllOrganizations);
router.post("/", protect, requireRole("admin"), createOrganization);

module.exports = router;
