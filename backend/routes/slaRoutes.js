const express = require("express");
const router = express.Router();
const {
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy,
  seedDefaultSlaPolicies,
} = require("../controllers/slaController");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.get("/", requireRole(), getSlaPolicies);
router.post("/", protect, requireRole("admin"), createSlaPolicy);
router.post("/seed-defaults", protect, requireRole("admin"), seedDefaultSlaPolicies);
router.put("/:id", protect, requireRole("admin"), updateSlaPolicy);
router.delete("/:id", protect, requireRole("admin"), deleteSlaPolicy);

module.exports = router;
