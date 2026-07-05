const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const auditLogMiddleware = require('../middleware/auditLogMiddleware');

// Get settings (public/unprotected for login screen like org name? Actually, keep it protected for now)
router.get('/', protect, settingsController.getSettings);

// Update settings (Admin only)
router.use(protect, requireRole('admin'));
router.put('/', auditLogMiddleware('Update System Settings'), settingsController.updateSettings);

module.exports = router;
