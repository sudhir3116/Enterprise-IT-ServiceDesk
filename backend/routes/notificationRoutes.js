const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAllRead,
  markSingleRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", requireRole(), getNotifications);
router.put("/read", requireRole(), markAllRead);
router.put("/:id/read", requireRole(), markSingleRead);

module.exports = router;
