const express = require('express');
const { body, param } = require('express-validator');
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  assignRoleToUser,
} = require('../controllers/role.controller');
const { authenticate, checkPermission } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all permissions (Admin only)
router.get('/permissions', checkPermission('roles.view'), getAllPermissions);

// Get all roles
// Note: This requires 'roles.view' permission, but ADMIN role bypasses this check
router.get('/', checkPermission('roles.view'), getAllRoles);

// Get role by ID
router.get(
  '/:id',
  checkPermission('roles.view'),
  [param('id').notEmpty().withMessage('Role ID is required')],
  validate,
  getRoleById
);

// Create role (Admin only)
router.post(
  '/',
  checkPermission('roles.create'),
  [
    body('name').notEmpty().trim().withMessage('Role name is required'),
    body('displayName').notEmpty().trim().withMessage('Display name is required'),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  ],
  validate,
  createRole
);

// Update role
router.put(
  '/:id',
  checkPermission('roles.edit'),
  [
    param('id').notEmpty().withMessage('Role ID is required'),
    body('displayName').optional().trim(),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  ],
  validate,
  updateRole
);

// Delete role (Admin only)
router.delete(
  '/:id',
  checkPermission('roles.delete'),
  [param('id').notEmpty().withMessage('Role ID is required')],
  validate,
  deleteRole
);

// Assign role to user
router.post(
  '/assign',
  checkPermission('users.edit'),
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('roleId').notEmpty().withMessage('Role ID is required'),
  ],
  validate,
  assignRoleToUser
);

module.exports = router;
