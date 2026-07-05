const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const { protect, requireRole } = require("../middleware/authMiddleware");

// GET /api/audit-logs - Admin only, paginated, and filterable
router.get("/", protect, requireRole("admin"), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by entity (e.g., Ticket)
    if (req.query.entity) {
      filter.entity = req.query.entity;
    }

    // Filter by performedBy (Mongoose ObjectId)
    if (req.query.performedBy) {
      filter.performedBy = req.query.performedBy;
    }

    // Filter by date range (timestamp)
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) {
        filter.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        // Set to end of day if only date is passed
        const endD = new Date(req.query.endDate);
        if (req.query.endDate.length <= 10) {
          endD.setHours(23, 59, 59, 999);
        }
        filter.timestamp.$lte = endD;
      }
    }

    const totalLogs = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate("performedBy", "name email role employeeId")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      logs,
      page,
      limit,
      totalPages: Math.ceil(totalLogs / limit),
      totalLogs,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
