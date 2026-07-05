const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const auditLogMiddleware = require('../middleware/auditLogMiddleware');

// Get categories (could be public/protected depending on need, but let's keep it protected)
router.get('/', protect, categoryController.getCategories);

// Only Admins can modify categories
router.use(protect, requireRole('admin'));
router.post('/', auditLogMiddleware('Create Category'), categoryController.createCategory);
router.put('/:id', auditLogMiddleware('Update Category'), categoryController.updateCategory);
router.delete('/:id', auditLogMiddleware('Delete Category'), categoryController.deleteCategory);

module.exports = router;
