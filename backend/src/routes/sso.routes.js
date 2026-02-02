const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const {
  generateSSOToken,
  verifySSOToken,
  validateExternalToken,
  getSSOConfig,
} = require('../controllers/sso.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { validate: validateRequest } = require('../middleware/validate.middleware');

/**
 * SSO Routes - Single Sign-On for MIS Integration
 * 
 * Flow 1: Token-based SSO (Server-to-Server)
 * 1. External MIS calls POST /api/sso/generate with user info
 * 2. Returns SSO token valid for 5 minutes
 * 3. Redirect user to /api/sso/verify?token=xxx
 * 4. Returns JWT token for authenticated session
 * 
 * Flow 2: External JWT Validation (Embedded/iframe)
 * 1. External MIS embeds Work Permit module
 * 2. Passes existing JWT to POST /api/sso/validate-external
 * 3. Returns internal JWT token for authenticated session
 */

// Get SSO configuration
router.get('/config', getSSOConfig);

// Generate SSO token (called by external MIS system)
// Requires API key or admin authentication
router.post(
  '/generate',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('role').optional().isIn(['ADMIN', 'FIREMAN', 'SAFETY_OFFICER', 'REQUESTOR', 'SITE_ENGINEER']),
    body('externalUserId').optional().trim(),
    body('externalSystem').optional().trim(),
  ],
  validateRequest,
  generateSSOToken
);

// Verify SSO token and get JWT (called by browser after redirect)
router.get(
  '/verify',
  [
    query('token').notEmpty().withMessage('SSO token is required'),
  ],
  validateRequest,
  verifySSOToken
);

// Validate external JWT token (for embedded iframe usage)
router.post(
  '/validate-external',
  [
    body('externalToken').notEmpty().withMessage('External token is required'),
    body('secret').optional().trim(),
    body('algorithm').optional().isIn(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']),
  ],
  validateRequest,
  validateExternalToken
);

module.exports = router;
