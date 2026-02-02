const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const {
  getAllReadings,
  getReadingById,
  createReading,
  updateReading,
  deleteReading,
  verifyReading,
  getMeterTypes,
  getAnalytics,
  exportReadings,
  bulkImportReadings,
} = require('../controllers/meter.controller');
const { authenticate, authorize, checkPermission } = require('../middleware/auth.middleware');
const { validate: validateRequest } = require('../middleware/validate.middleware');

/**
 * Meter Reading Routes - For Site Engineers
 * 
 * Site Engineers can:
 * - Upload meter/transmitter photos
 * - Submit readings (with AI OCR auto-fill)
 * - View their own readings
 * - Export data to spreadsheet
 * 
 * Admins/Safety Officers can:
 * - View all readings
 * - Verify readings
 * - Access analytics dashboard
 */

// Public: Get meter types
router.get('/types', getMeterTypes);

// Protected routes
router.use(authenticate);

// Get analytics dashboard data
router.get('/analytics', getAnalytics);

// Export readings (CSV/JSON for Power BI)
router.get('/export', exportReadings);

// Get all readings (filtered by role)
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('meterType').optional().trim(),
    query('location').optional().trim(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('search').optional().trim(),
  ],
  validateRequest,
  getAllReadings
);

// Get single reading
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  getReadingById
);

// Create new reading
router.post(
  '/',
  [
    body('meterType').notEmpty().withMessage('Meter type is required'),
    body('meterName').notEmpty().withMessage('Meter name is required'),
    body('meterSerial').optional().trim(),
    body('location').notEmpty().withMessage('Location is required'),
    body('readingValue').isNumeric().withMessage('Reading value must be a number'),
    body('unit').notEmpty().withMessage('Unit is required'),
    body('imageUrl').optional().isURL(),
    body('ocrRawText').optional().trim(),
    body('ocrConfidence').optional().isFloat({ min: 0, max: 1 }),
    body('notes').optional().trim(),
    body('readingDate').optional().isISO8601(),
  ],
  validateRequest,
  createReading
);

// Bulk import readings
router.post(
  '/bulk-import',
  [
    body('readings').isArray({ min: 1 }).withMessage('Readings array is required'),
    body('readings.*.meterType').notEmpty(),
    body('readings.*.meterName').notEmpty(),
    body('readings.*.location').notEmpty(),
    body('readings.*.readingValue').isNumeric(),
    body('readings.*.unit').notEmpty(),
  ],
  validateRequest,
  bulkImportReadings
);

// Update reading
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('meterName').optional().trim(),
    body('meterSerial').optional().trim(),
    body('location').optional().trim(),
    body('readingValue').optional().isNumeric(),
    body('unit').optional().trim(),
    body('notes').optional().trim(),
  ],
  validateRequest,
  updateReading
);

// Verify reading (admin/fireman only)
router.patch(
  '/:id/verify',
  authorize('ADMIN', 'FIREMAN', 'SAFETY_OFFICER'),
  [
    param('id').isUUID(),
    body('isVerified').isBoolean(),
    body('notes').optional().trim(),
  ],
  validateRequest,
  verifyReading
);

// Delete reading
router.delete(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  deleteReading
);

module.exports = router;
