// MIS Meters Controller
const { misPrisma } = require('../../config/mis-prisma');

// Get all meter configurations
const getMeterConfigs = async (req, res) => {
  try {
    const { meterType, isActive } = req.query;
    
    const where = {};
    if (meterType) where.meterType = meterType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const configs = await misPrisma.meterConfig.findMany({
      where,
      orderBy: { meterName: 'asc' },
    });

    res.json(configs);
  } catch (error) {
    console.error('Get meter configs error:', error);
    res.status(500).json({ message: 'Failed to get meter configurations', error: error.message });
  }
};

// Create meter configuration
const createMeterConfig = async (req, res) => {
  try {
    const { meterType, meterName, meterSerial, location, buildingName, floorNumber, unit, multiplier, metadata } = req.body;

    const config = await misPrisma.meterConfig.create({
      data: {
        meterType,
        meterName,
        meterSerial,
        location,
        buildingName,
        floorNumber,
        unit,
        multiplier: multiplier || 1,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    res.status(201).json(config);
  } catch (error) {
    console.error('Create meter config error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Meter serial number already exists' });
    }
    res.status(500).json({ message: 'Failed to create meter configuration', error: error.message });
  }
};

// Get meter readings
const getReadings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      meterType, 
      meterSerial,
      startDate, 
      endDate,
      isVerified,
      status,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    if (meterType) where.meterType = meterType;
    if (meterSerial) where.meterSerial = meterSerial;
    if (isVerified !== undefined) where.isVerified = isVerified === 'true';
    if (status) where.status = status;
    if (startDate || endDate) {
      where.readingDate = {};
      if (startDate) where.readingDate.gte = new Date(startDate);
      if (endDate) where.readingDate.lte = new Date(endDate);
    }

    const [readings, total] = await Promise.all([
      misPrisma.meterReading.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { readingDate: 'desc' },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true, email: true },
          },
          verifiedByUser: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      misPrisma.meterReading.count({ where }),
    ]);

    res.json({
      readings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get readings error:', error);
    res.status(500).json({ message: 'Failed to get readings', error: error.message });
  }
};

// Create meter reading
const createReading = async (req, res) => {
  try {
    const {
      meterId,
      meterType,
      meterName,
      meterSerial,
      location,
      buildingName,
      floorNumber,
      readingDate,
      currentReading,
      previousReading,
      unit,
      multiplier,
      runningHours,
      fuelLevel,
      temperature,
      humidity,
      ocrReading,
      ocrConfidence,
      imageUrl,
      imageData,
      remarks,
    } = req.body;

    // Calculate consumption
    let consumption = null;
    if (currentReading !== null && previousReading !== null) {
      consumption = (currentReading - previousReading) * (multiplier || 1);
    }

    const reading = await misPrisma.meterReading.create({
      data: {
        meterId,
        meterType,
        meterName,
        meterSerial,
        location,
        buildingName,
        floorNumber,
        readingDate: new Date(readingDate),
        currentReading,
        previousReading,
        consumption,
        unit,
        multiplier: multiplier || 1,
        runningHours,
        fuelLevel,
        temperature,
        humidity,
        ocrReading,
        ocrConfidence,
        imageUrl,
        imageData,
        remarks,
        status: 'pending',
        createdById: req.user.userId,
      },
    });

    // Log the action
    try {
      await misPrisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'create',
          module: 'meters',
          resourceId: reading.id,
          details: JSON.stringify({ meterType, meterName, currentReading }),
        },
      });
    } catch (logError) {
      console.error('Audit log error:', logError);
    }

    res.status(201).json(reading);
  } catch (error) {
    console.error('Create reading error:', error);
    res.status(500).json({ message: 'Failed to create reading', error: error.message });
  }
};

// Update meter reading
const updateReading = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Recalculate consumption if reading values changed
    if (updates.currentReading !== undefined || updates.previousReading !== undefined) {
      const existing = await misPrisma.meterReading.findUnique({ where: { id } });
      const current = updates.currentReading ?? existing.currentReading;
      const previous = updates.previousReading ?? existing.previousReading;
      const multiplier = updates.multiplier ?? existing.multiplier ?? 1;
      
      if (current !== null && previous !== null) {
        updates.consumption = (current - previous) * multiplier;
      }
    }

    const reading = await misPrisma.meterReading.update({
      where: { id },
      data: updates,
    });

    // Log the action
    try {
      await misPrisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'update',
          module: 'meters',
          resourceId: id,
          details: JSON.stringify(updates),
        },
      });
    } catch (logError) {
      console.error('Audit log error:', logError);
    }

    res.json(reading);
  } catch (error) {
    console.error('Update reading error:', error);
    res.status(500).json({ message: 'Failed to update reading', error: error.message });
  }
};

// Verify meter reading
const verifyReading = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationNotes } = req.body;

    const reading = await misPrisma.meterReading.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedBy: req.user.userId,
        verifiedAt: new Date(),
        verificationNotes,
        status: 'verified',
      },
    });

    // Log the action
    try {
      await misPrisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'verify',
          module: 'meters',
          resourceId: id,
          details: JSON.stringify({ verificationNotes }),
        },
      });
    } catch (logError) {
      console.error('Audit log error:', logError);
    }

    res.json(reading);
  } catch (error) {
    console.error('Verify reading error:', error);
    res.status(500).json({ message: 'Failed to verify reading', error: error.message });
  }
};

// Delete meter reading
const deleteReading = async (req, res) => {
  try {
    const { id } = req.params;

    await misPrisma.meterReading.delete({
      where: { id },
    });

    // Log the action
    try {
      await misPrisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'delete',
          module: 'meters',
          resourceId: id,
        },
      });
    } catch (logError) {
      console.error('Audit log error:', logError);
    }

    res.json({ message: 'Reading deleted successfully' });
  } catch (error) {
    console.error('Delete reading error:', error);
    res.status(500).json({ message: 'Failed to delete reading', error: error.message });
  }
};

// Get reading by ID
const getReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    const reading = await misPrisma.meterReading.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        verifiedByUser: {
          select: { firstName: true, lastName: true },
        },
        meter: true,
      },
    });

    if (!reading) {
      return res.status(404).json({ message: 'Reading not found' });
    }

    res.json(reading);
  } catch (error) {
    console.error('Get reading error:', error);
    res.status(500).json({ message: 'Failed to get reading', error: error.message });
  }
};

module.exports = {
  getMeterConfigs,
  createMeterConfig,
  getReadings,
  createReading,
  updateReading,
  verifyReading,
  deleteReading,
  getReadingById,
};
