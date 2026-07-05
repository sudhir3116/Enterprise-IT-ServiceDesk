const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAllRead,
  markSingleRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getNotifications);
router.put("/read", protect, markAllRead);
router.put("/:id/read", protect, markSingleRead);

module.exports = router;
