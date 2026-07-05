const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const auditLogMiddleware = require('../middleware/auditLogMiddleware');

// Only Admins can manage roles
router.use(protect, requireRole('admin'));

router.get('/', roleController.getRoles);
router.post('/', auditLogMiddleware('Create Role'), roleController.createRole);
router.put('/:id', auditLogMiddleware('Update Role'), roleController.updateRole);
router.delete('/:id', auditLogMiddleware('Delete Role'), roleController.deleteRole);

module.exports = router;
