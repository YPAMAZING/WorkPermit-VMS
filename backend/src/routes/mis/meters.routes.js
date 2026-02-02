// MIS Meters Routes
const express = require('express');
const router = express.Router();
const metersController = require('../../controllers/mis/meters.controller');
const { misAuthMiddleware, misPermissionMiddleware } = require('../../middleware/mis-auth');

// All meters routes require authentication
router.use(misAuthMiddleware);

// Meter configurations
router.get('/configs', misPermissionMiddleware('mis.config.view'), metersController.getMeterConfigs);
router.post('/configs', misPermissionMiddleware('mis.config.create'), metersController.createMeterConfig);

// Meter readings
router.get('/readings', misPermissionMiddleware('mis.meters.view'), metersController.getReadings);
router.get('/readings/:id', misPermissionMiddleware('mis.meters.view'), metersController.getReadingById);
router.post('/readings', misPermissionMiddleware('mis.meters.create'), metersController.createReading);
router.put('/readings/:id', misPermissionMiddleware('mis.meters.edit'), metersController.updateReading);
router.delete('/readings/:id', misPermissionMiddleware('mis.meters.delete'), metersController.deleteReading);

// Verification
router.post('/readings/:id/verify', misPermissionMiddleware('mis.meters.verify'), metersController.verifyReading);

module.exports = router;
