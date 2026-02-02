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
  [param('id').isUUID().withMessage('Invalid role ID')],
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
    param('id').isUUID().withMessage('Invalid role ID'),
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
  [param('id').isUUID().withMessage('Invalid role ID')],
  validate,
  deleteRole
);

// Assign role to user
router.post(
  '/assign',
  checkPermission('users.assign_role'),
  [
    body('userId').isUUID().withMessage('Invalid user ID'),
    body('roleId').isUUID().withMessage('Invalid role ID'),
  ],
  validate,
  assignRoleToUser
);

module.exports = router;
