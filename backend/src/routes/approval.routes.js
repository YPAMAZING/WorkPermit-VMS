const express = require('express');
const { body, param } = require('express-validator');
const {
  getAllApprovals,
  getPendingCount,
  getApprovalById,
  updateApprovalDecision,
  getApprovalStats,
  addSafetyRemarks,
  getPendingRemarks,
  autoCloseExpiredPermits,
} = require('../controllers/approval.controller');
const { authenticate, isSafetyOfficer, canApprove } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// All routes require authentication and Safety Officer or Admin role
router.use(authenticate);
router.use(isSafetyOfficer);

// Get all approvals
router.get('/', getAllApprovals);

// Get pending count
router.get('/pending-count', getPendingCount);

// Get approval statistics
router.get('/stats', getApprovalStats);

// Get permits pending safety remarks
router.get('/pending-remarks', getPendingRemarks);

// Trigger auto-close check for expired permits
router.post('/auto-close', autoCloseExpiredPermits);

// Get approval by ID
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid approval ID')],
  validate,
  getApprovalById
);

// Update approval decision (Approve/Reject) - Requires approvals.approve permission
router.put(
  '/:id/decision',
  canApprove, // Additional check for approve permission
  [
    param('id').isUUID().withMessage('Invalid approval ID'),
    body('decision')
      .isIn(['APPROVED', 'REJECTED'])
      .withMessage('Decision must be APPROVED or REJECTED'),
    body('comment').optional().trim(),
  ],
  validate,
  updateApprovalDecision
);

// Add safety remarks to a permit
router.post(
  '/remarks/:id',
  [
    param('id').isUUID().withMessage('Invalid permit ID'),
    body('safetyRemarks').notEmpty().withMessage('Safety remarks are required'),
  ],
  validate,
  addSafetyRemarks
);

module.exports = router;
