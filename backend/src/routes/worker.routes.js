const express = require('express');
const router = express.Router();
const {
  getAllWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  generateWorkerQR,
  registerWorkerViaQR,
} = require('../controllers/worker.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public route for vendor worker registration via QR
router.post('/register/:permitId', registerWorkerViaQR);

// Protected routes
router.use(authenticate);

// Get all workers
router.get('/', getAllWorkers);

// Get worker by ID
router.get('/:id', getWorkerById);

// Generate QR code for permit
router.get('/qr/:permitId', generateWorkerQR);

// Create worker (Admin and Fireman only)
router.post('/', authorize(['ADMIN', 'FIREMAN', 'SAFETY_OFFICER']), createWorker);

// Update worker
router.put('/:id', authorize(['ADMIN', 'FIREMAN', 'SAFETY_OFFICER']), updateWorker);

// Delete worker (Admin only)
router.delete('/:id', authorize(['ADMIN']), deleteWorker);

module.exports = router;
