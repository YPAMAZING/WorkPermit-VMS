const express = require('express');
const { body, param } = require('express-validator');
const {
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  toggleVMSAccess,
  getVMSUsers,
} = require('../controllers/user.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// IMPORTANT: Static routes MUST come before dynamic :id routes
// ============================================

// Get user stats (Admin only)
router.get('/stats', isAdmin, getUserStats);

// Get pending approval users (Admin only)
router.get('/pending', isAdmin, getPendingUsers);

// Get all users with VMS access (Admin only) - MUST be before /:id
router.get('/vms-users', isAdmin, getVMSUsers);

// Get all users (Admin only)
router.get('/', isAdmin, getAllUsers);

// Create user (Admin or users with user management permission)
router.post(
  '/',
  isAdmin,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().trim().withMessage('First name is required'),
    body('lastName').notEmpty().trim().withMessage('Last name is required'),
    body('role').optional().trim(),
  ],
  validate,
  createUser
);

// ============================================
// Dynamic :id routes come AFTER static routes
// ============================================

// Get user by ID (Admin only)
router.get(
  '/:id',
  isAdmin,
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  getUserById
);

// Approve user registration (Admin only)
router.post(
  '/:id/approve',
  isAdmin,
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  approveUser
);

// Reject user registration (Admin only)
router.post(
  '/:id/reject',
  isAdmin,
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('reason').optional().trim(),
  ],
  validate,
  rejectUser
);

// Toggle VMS access for a user (Admin only)
router.post(
  '/:id/vms-access',
  isAdmin,
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('hasVMSAccess').optional().isBoolean().withMessage('hasVMSAccess must be boolean'),
    body('companyName').optional().trim(),
  ],
  validate,
  toggleVMSAccess
);

// Update user
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('role').optional().trim(),
  ],
  validate,
  updateUser
);

// Delete user (Admin only)
router.delete(
  '/:id',
  isAdmin,
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  deleteUser
);

module.exports = router;
