const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const auditLogMiddleware = require('../middleware/auditLogMiddleware');

// Only Admins can manage departments
router.use(protect, requireRole('admin'));

router.get('/', departmentController.getDepartments);
router.post('/', auditLogMiddleware('Create Department'), departmentController.createDepartment);
router.put('/:id', auditLogMiddleware('Update Department'), departmentController.updateDepartment);
router.delete('/:id', auditLogMiddleware('Delete Department'), departmentController.deleteDepartment);

module.exports = router;
