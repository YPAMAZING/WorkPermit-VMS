const express = require('express');
const { body, param } = require('express-validator');
const {
  getAllPermits,
  getPermitById,
  createPermit,
  updatePermit,
  deletePermit,
  getWorkTypes,
  getPublicPermitInfo,
  registerWorkers,
  extendPermit,
  revokePermit,
  reapprovePermit,
  transferPermit,
  closePermit,
  updateMeasures,
  addWorkers,
  getPermitActionHistory,
} = require('../controllers/permit.controller');
const { generatePermitPDF } = require('../controllers/pdf.controller');
const { authenticate, isRequestor, authorize, checkPermission, checkAnyPermission } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// Public routes (no auth required)
router.get('/work-types', getWorkTypes);

// Public permit info for QR code scanning
router.get(
  '/:id/public',
  [param('id').isUUID().withMessage('Invalid permit ID')],
  validate,
  getPublicPermitInfo
);

// Public PDF download (for QR code scanning - no auth required)
router.get(
  '/:id/public-pdf',
  [param('id').isUUID().withMessage('Invalid permit ID')],
  validate,
  generatePermitPDF
);

// Register workers via QR code (public)
router.post(
  '/:id/workers',
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('contractor').isObject().withMessage('Contractor info required'),
    body('workers').isArray().withMessage('Workers list required'),
  ],
  validate,
  registerWorkers
);

// Protected routes
router.use(authenticate);

// Get all permits
router.get('/', getAllPermits);

// Get permit by ID
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid permit ID')],
  validate,
  getPermitById
);

// Create permit (Requestor, Safety Officer, Admin)
router.post(
  '/',
  isRequestor,
  [
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('description').notEmpty().trim().withMessage('Description is required'),
    body('location').notEmpty().trim().withMessage('Location is required'),
    body('workType').notEmpty().withMessage('Work type is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid priority'),
    body('hazards').optional().isArray().withMessage('Hazards must be an array'),
    body('precautions').optional().isArray().withMessage('Precautions must be an array'),
    body('equipment').optional().isArray().withMessage('Equipment must be an array'),
  ],
  validate,
  createPermit
);

// Update permit
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('location').optional().trim(),
    body('workType').optional(),
    body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid priority'),
  ],
  validate,
  updatePermit
);

// Delete permit
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid permit ID')],
  validate,
  deletePermit
);

// Workflow actions (Fireman and Admin, or users with appropriate permissions)
// Extend permit
router.post(
  '/:id/extend',
  checkAnyPermission(['permits.extend', 'permits.view_all']),
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('extendedUntil').isISO8601().withMessage('Valid extension date required'),
  ],
  validate,
  extendPermit
);

// Revoke permit
router.post(
  '/:id/revoke',
  checkPermission('permits.revoke'),
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('reason').optional(),
    body('comment').optional(),
  ],
  validate,
  revokePermit
);

// Re-approve revoked permit
router.post(
  '/:id/reapprove',
  checkAnyPermission(['permits.reapprove', 'approvals.reapprove']),
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('comment').optional(),
    body('signature').optional(),
  ],
  validate,
  reapprovePermit
);

// Get permit action history
router.get(
  '/:id/action-history',
  [param('id').isUUID().withMessage('Invalid permit ID')],
  validate,
  getPermitActionHistory
);

// Transfer permit
router.post(
  '/:id/transfer',
  authorize(['ADMIN']),
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('newOwnerId').isUUID().withMessage('Valid new owner ID required'),
  ],
  validate,
  transferPermit
);

// Close permit with checklist
router.post(
  '/:id/close',
  checkPermission('permits.close'),
  [param('id').isUUID().withMessage('Invalid permit ID')],
  validate,
  closePermit
);

// Update measures
router.put(
  '/:id/measures',
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('measures').isArray().withMessage('Measures must be an array'),
  ],
  validate,
  updateMeasures
);

// Add workers (authenticated)
router.post(
  '/:id/add-workers',
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('workers').isArray().withMessage('Workers must be an array'),
  ],
  validate,
  addWorkers
);

// Generate PDF
router.get(
  '/:id/pdf',
  [param('id').isUUID().withMessage('Invalid permit ID')],
  validate,
  generatePermitPDF
);

module.exports = router;
