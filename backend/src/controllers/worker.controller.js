const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

// Get all workers
const getAllWorkers = async (req, res) => {
  try {
    const { search, company, limit = 50 } = req.query;

    const where = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { badgeNumber: { contains: search } },
      ];
    }

    if (company) {
      where.company = company;
    }

    const workers = await prisma.worker.findMany({
      where,
      take: parseInt(limit),
      orderBy: { name: 'asc' },
    });

    res.json({ workers });
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ message: 'Error fetching workers' });
  }
};

// Get worker by ID
const getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    res.json({ worker });
  } catch (error) {
    console.error('Get worker error:', error);
    res.status(500).json({ message: 'Error fetching worker' });
  }
};

// Create worker
const createWorker = async (req, res) => {
  try {
    const { name, phone, email, company, trade, badgeNumber, photo } = req.body;

    const worker = await prisma.worker.create({
      data: {
        name,
        phone,
        email,
        company,
        trade,
        badgeNumber,
        photo,
      },
    });

    res.status(201).json({ message: 'Worker created successfully', worker });
  } catch (error) {
    console.error('Create worker error:', error);
    res.status(500).json({ message: 'Error creating worker' });
  }
};

// Update worker
const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, company, trade, badgeNumber, photo, isActive } = req.body;

    const worker = await prisma.worker.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        company,
        trade,
        badgeNumber,
        photo,
        isActive,
      },
    });

    res.json({ message: 'Worker updated successfully', worker });
  } catch (error) {
    console.error('Update worker error:', error);
    res.status(500).json({ message: 'Error updating worker' });
  }
};

// Delete worker (soft delete)
const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.worker.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Worker deleted successfully' });
  } catch (error) {
    console.error('Delete worker error:', error);
    res.status(500).json({ message: 'Error deleting worker' });
  }
};

// Generate QR code for public PDF download
const generateWorkerQR = async (req, res) => {
  try {
    const { permitId } = req.params;
    
    // Get permit details
    const permit = await prisma.permitRequest.findUnique({
      where: { id: permitId },
    });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    // Generate URL for public PDF download (no auth required)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const pdfDownloadUrl = `${baseUrl}/api/permits/${permitId}/public-pdf`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(pdfDownloadUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });

    res.json({
      qrCode: qrCodeDataUrl,
      pdfUrl: pdfDownloadUrl,
      permitNumber: permit.permitNumber,
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ message: 'Error generating QR code' });
  }
};

// Register worker via QR code (public endpoint)
const registerWorkerViaQR = async (req, res) => {
  try {
    const { permitId } = req.params;
    const { name, phone, company, trade, badgeNumber } = req.body;

    // Verify permit exists
    const permit = await prisma.permitRequest.findUnique({
      where: { id: permitId },
    });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    if (permit.status === 'CLOSED' || permit.status === 'REJECTED') {
      return res.status(400).json({ message: 'Cannot add workers to closed or rejected permit' });
    }

    // Create or find worker
    let worker = await prisma.worker.findFirst({
      where: {
        OR: [
          { phone: phone || undefined },
          { badgeNumber: badgeNumber || undefined },
        ],
      },
    });

    if (!worker) {
      worker = await prisma.worker.create({
        data: { name, phone, company, trade, badgeNumber },
      });
    }

    // Add worker to permit
    const currentWorkers = JSON.parse(permit.workers || '[]');
    if (!currentWorkers.find(w => w.id === worker.id)) {
      currentWorkers.push({
        id: worker.id,
        name: worker.name,
        phone: worker.phone,
        company: worker.company,
        trade: worker.trade,
        badgeNumber: worker.badgeNumber,
        addedAt: new Date().toISOString(),
      });

      await prisma.permitRequest.update({
        where: { id: permitId },
        data: { workers: JSON.stringify(currentWorkers) },
      });
    }

    res.json({ message: 'Worker registered successfully', worker });
  } catch (error) {
    console.error('Register worker error:', error);
    res.status(500).json({ message: 'Error registering worker' });
  }
};

module.exports = {
  getAllWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  generateWorkerQR,
  registerWorkerViaQR,
};
