// VMS User Management Routes
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/vms/user.controller');
const { vmsAuthMiddleware } = require('../../middleware/vms-auth');

// All routes require authentication
router.use(vmsAuthMiddleware);

// Get all users
router.get('/', controller.getAllUsers);

// Get user by ID
router.get('/:id', controller.getUserById);

// Get users by company
router.get('/company/:companyId', controller.getUsersByCompany);

// Create new user
router.post('/', controller.createUser);

// Update user
router.put('/:id', controller.updateUser);

// Toggle user status
router.patch('/:id/status', controller.toggleUserStatus);

// Delete user
router.delete('/:id', controller.deleteUser);

module.exports = router;
