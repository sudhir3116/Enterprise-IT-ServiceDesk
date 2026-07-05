const express = require('express');
const router = express.Router();
const slaController = require('../controllers/slaController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const auditLogMiddleware = require('../middleware/auditLogMiddleware');

// Only Admins can manage SLAs
router.use(protect, requireRole('admin'));

router.get('/', slaController.getSLAs);
router.post('/', auditLogMiddleware('Create SLA'), slaController.createSLA);
router.put('/:id', auditLogMiddleware('Update SLA'), slaController.updateSLA);
router.delete('/:id', auditLogMiddleware('Delete SLA'), slaController.deleteSLA);

module.exports = router;
