const { PrismaClient } = require('@prisma/client');
const { createAuditLog } = require('../services/audit.service');

const prisma = new PrismaClient();

/**
 * Meter Reading Controller - For Site Engineers
 * Handles meter reading uploads, OCR processing, and analytics
 */

// Get all meter readings (with filters)
const getAllReadings = async (req, res) => {
  try {
    const { page = 1, limit = 20, meterType, location, startDate, endDate, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    // Site engineers can only see their own readings unless admin/fireman
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FIREMAN' && req.user.role !== 'SAFETY_OFFICER') {
      where.siteEngineerId = req.user.id;
    }

    if (meterType) where.meterType = meterType;
    if (location) where.location = { contains: location };
    if (startDate || endDate) {
      where.readingDate = {};
      if (startDate) where.readingDate.gte = new Date(startDate);
      if (endDate) where.readingDate.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { meterName: { contains: search } },
        { meterSerial: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [readings, total] = await Promise.all([
      prisma.meterReading.findMany({
        where,
        orderBy: { readingDate: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.meterReading.count({ where }),
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
    console.error('Get all readings error:', error);
    res.status(500).json({ message: 'Error fetching readings' });
  }
};

// Get single reading
const getReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    const reading = await prisma.meterReading.findUnique({
      where: { id },
    });

    if (!reading) {
      return res.status(404).json({ message: 'Reading not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FIREMAN' && req.user.role !== 'SAFETY_OFFICER' && reading.siteEngineerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(reading);
  } catch (error) {
    console.error('Get reading error:', error);
    res.status(500).json({ message: 'Error fetching reading' });
  }
};

// Create meter reading (with OCR data from frontend)
const createReading = async (req, res) => {
  try {
    const {
      meterType,
      meterName,
      meterSerial,
      location,
      readingValue,
      unit,
      imageUrl,
      ocrRawText,
      ocrConfidence,
      notes,
      readingDate,
    } = req.body;

    // Get previous reading for consumption calculation
    const previousReading = await prisma.meterReading.findFirst({
      where: {
        meterSerial: meterSerial || undefined,
        meterName,
        meterType,
      },
      orderBy: { readingDate: 'desc' },
    });

    const consumption = previousReading ? readingValue - previousReading.readingValue : null;

    const reading = await prisma.meterReading.create({
      data: {
        siteEngineerId: req.user.id,
        meterType,
        meterName,
        meterSerial,
        location,
        readingValue: parseFloat(readingValue),
        unit,
        imageUrl,
        ocrRawText,
        ocrConfidence: ocrConfidence ? parseFloat(ocrConfidence) : null,
        previousReading: previousReading?.readingValue || null,
        consumption,
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        notes,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'METER_READING',
      entityId: reading.id,
      oldValue: null,
      newValue: reading,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      message: 'Reading created successfully',
      reading,
      consumption,
      previousReading: previousReading?.readingValue,
    });
  } catch (error) {
    console.error('Create reading error:', error);
    res.status(500).json({ message: 'Error creating reading' });
  }
};

// Update meter reading
const updateReading = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.meterReading.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Reading not found' });
    }

    // Only creator or admin can update
    if (req.user.role !== 'ADMIN' && existing.siteEngineerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reading = await prisma.meterReading.update({
      where: { id },
      data: {
        ...updateData,
        readingValue: updateData.readingValue ? parseFloat(updateData.readingValue) : undefined,
        readingDate: updateData.readingDate ? new Date(updateData.readingDate) : undefined,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'METER_READING',
      entityId: reading.id,
      oldValue: existing,
      newValue: reading,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Reading updated', reading });
  } catch (error) {
    console.error('Update reading error:', error);
    res.status(500).json({ message: 'Error updating reading' });
  }
};

// Delete meter reading
const deleteReading = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.meterReading.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Reading not found' });
    }

    // Only creator or admin can delete
    if (req.user.role !== 'ADMIN' && existing.siteEngineerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.meterReading.delete({ where: { id } });

    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'METER_READING',
      entityId: id,
      oldValue: existing,
      newValue: null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Reading deleted' });
  } catch (error) {
    console.error('Delete reading error:', error);
    res.status(500).json({ message: 'Error deleting reading' });
  }
};

// Verify reading (admin/safety officer only)
const verifyReading = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, notes } = req.body;

    if (req.user.role !== 'ADMIN' && req.user.role !== 'FIREMAN' && req.user.role !== 'SAFETY_OFFICER') {
      return res.status(403).json({ message: 'Only admins and firemen can verify readings' });
    }

    const reading = await prisma.meterReading.update({
      where: { id },
      data: {
        isVerified,
        verifiedBy: req.user.id,
        verifiedAt: isVerified ? new Date() : null,
        notes: notes || undefined,
      },
    });

    res.json({ message: 'Reading verification updated', reading });
  } catch (error) {
    console.error('Verify reading error:', error);
    res.status(500).json({ message: 'Error verifying reading' });
  }
};

// Get meter types
const getMeterTypes = async (req, res) => {
  try {
    const types = [
      { value: 'electricity', label: 'Electricity Meter', unit: 'kWh', icon: 'Zap' },
      { value: 'water', label: 'Water Meter', unit: 'm³', icon: 'Droplets' },
      { value: 'gas', label: 'Gas Meter', unit: 'm³', icon: 'Flame' },
      { value: 'transmitter', label: 'Transmitter', unit: 'dBm', icon: 'Radio' },
      { value: 'temperature', label: 'Temperature Sensor', unit: '°C', icon: 'Thermometer' },
      { value: 'pressure', label: 'Pressure Gauge', unit: 'PSI', icon: 'Gauge' },
      { value: 'fuel', label: 'Fuel Meter', unit: 'L', icon: 'Fuel' },
      { value: 'flow', label: 'Flow Meter', unit: 'L/min', icon: 'Activity' },
      { value: 'voltage', label: 'Voltage Meter', unit: 'V', icon: 'Battery' },
      { value: 'current', label: 'Current Meter', unit: 'A', icon: 'CircleDot' },
      { value: 'power', label: 'Power Meter', unit: 'W', icon: 'Power' },
      { value: 'frequency', label: 'Frequency Meter', unit: 'Hz', icon: 'Waves' },
      { value: 'humidity', label: 'Humidity Sensor', unit: '%', icon: 'CloudRain' },
      { value: 'custom', label: 'Custom/Other', unit: '', icon: 'Settings' },
    ];

    res.json(types);
  } catch (error) {
    console.error('Get meter types error:', error);
    res.status(500).json({ message: 'Error fetching meter types' });
  }
};

// Get analytics/dashboard data
const getAnalytics = async (req, res) => {
  try {
    const { meterType, period = '30d', groupBy = 'day' } = req.query;

    const where = {};
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FIREMAN' && req.user.role !== 'SAFETY_OFFICER') {
      where.siteEngineerId = req.user.id;
    }
    if (meterType) where.meterType = meterType;

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(startDate.getDate() - 7); break;
      case '30d': startDate.setDate(startDate.getDate() - 30); break;
      case '90d': startDate.setDate(startDate.getDate() - 90); break;
      case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
      default: startDate.setDate(startDate.getDate() - 30);
    }
    where.readingDate = { gte: startDate };

    // Get all readings in period
    const readings = await prisma.meterReading.findMany({
      where,
      orderBy: { readingDate: 'asc' },
    });

    // Calculate statistics
    const stats = {
      totalReadings: readings.length,
      totalConsumption: readings.reduce((sum, r) => sum + (r.consumption || 0), 0),
      avgConsumption: readings.length > 0
        ? readings.reduce((sum, r) => sum + (r.consumption || 0), 0) / readings.filter(r => r.consumption).length
        : 0,
      maxReading: Math.max(...readings.map(r => r.readingValue), 0),
      minReading: Math.min(...readings.map(r => r.readingValue), Infinity),
      verifiedCount: readings.filter(r => r.isVerified).length,
      pendingVerification: readings.filter(r => !r.isVerified).length,
    };

    // Group by meter type
    const byMeterType = readings.reduce((acc, r) => {
      if (!acc[r.meterType]) {
        acc[r.meterType] = { count: 0, totalConsumption: 0, readings: [] };
      }
      acc[r.meterType].count++;
      acc[r.meterType].totalConsumption += r.consumption || 0;
      acc[r.meterType].readings.push({
        date: r.readingDate,
        value: r.readingValue,
        consumption: r.consumption,
      });
      return acc;
    }, {});

    // Group by date for chart
    const byDate = readings.reduce((acc, r) => {
      const dateKey = r.readingDate.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, totalReadings: 0, totalConsumption: 0, readings: [] };
      }
      acc[dateKey].totalReadings++;
      acc[dateKey].totalConsumption += r.consumption || 0;
      acc[dateKey].readings.push(r.readingValue);
      return acc;
    }, {});

    // Recent readings
    const recentReadings = await prisma.meterReading.findMany({
      where: req.user.role === 'ADMIN' || req.user.role === 'FIREMAN' || req.user.role === 'SAFETY_OFFICER'
        ? {}
        : { siteEngineerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Alerts (high consumption, anomalies)
    const alerts = readings
      .filter(r => {
        if (!r.consumption || !r.previousReading) return false;
        const changePercent = (r.consumption / r.previousReading) * 100;
        return changePercent > 50 || changePercent < -30; // Significant changes
      })
      .map(r => ({
        id: r.id,
        type: r.consumption > 0 ? 'HIGH_CONSUMPTION' : 'LOW_CONSUMPTION',
        meterName: r.meterName,
        location: r.location,
        consumption: r.consumption,
        date: r.readingDate,
      }));

    res.json({
      stats,
      byMeterType,
      chartData: Object.values(byDate),
      recentReadings,
      alerts,
      period,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
};

// Export readings to spreadsheet format
const exportReadings = async (req, res) => {
  try {
    const { format = 'json', meterType, startDate, endDate } = req.query;

    const where = {};
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FIREMAN' && req.user.role !== 'SAFETY_OFFICER') {
      where.siteEngineerId = req.user.id;
    }
    if (meterType) where.meterType = meterType;
    if (startDate || endDate) {
      where.readingDate = {};
      if (startDate) where.readingDate.gte = new Date(startDate);
      if (endDate) where.readingDate.lte = new Date(endDate);
    }

    const readings = await prisma.meterReading.findMany({
      where,
      orderBy: { readingDate: 'desc' },
    });

    if (format === 'csv') {
      const headers = ['Date', 'Meter Type', 'Meter Name', 'Serial', 'Location', 'Reading', 'Unit', 'Previous', 'Consumption', 'Verified', 'Notes'];
      const csvRows = [headers.join(',')];

      readings.forEach(r => {
        csvRows.push([
          r.readingDate.toISOString(),
          r.meterType,
          `"${r.meterName}"`,
          r.meterSerial || '',
          `"${r.location}"`,
          r.readingValue,
          r.unit,
          r.previousReading || '',
          r.consumption || '',
          r.isVerified ? 'Yes' : 'No',
          `"${r.notes || ''}"`,
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=meter_readings.csv');
      return res.send(csvRows.join('\n'));
    }

    // JSON format for Power BI or other tools
    res.json({
      exportDate: new Date().toISOString(),
      totalRecords: readings.length,
      data: readings.map(r => ({
        id: r.id,
        date: r.readingDate,
        meterType: r.meterType,
        meterName: r.meterName,
        meterSerial: r.meterSerial,
        location: r.location,
        readingValue: r.readingValue,
        unit: r.unit,
        previousReading: r.previousReading,
        consumption: r.consumption,
        isVerified: r.isVerified,
        notes: r.notes,
      })),
    });
  } catch (error) {
    console.error('Export readings error:', error);
    res.status(500).json({ message: 'Error exporting readings' });
  }
};

// Bulk import readings (from spreadsheet)
const bulkImportReadings = async (req, res) => {
  try {
    const { readings } = req.body;

    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ message: 'Readings array is required' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const reading of readings) {
      try {
        await prisma.meterReading.create({
          data: {
            siteEngineerId: req.user.id,
            meterType: reading.meterType,
            meterName: reading.meterName,
            meterSerial: reading.meterSerial,
            location: reading.location,
            readingValue: parseFloat(reading.readingValue),
            unit: reading.unit,
            readingDate: reading.readingDate ? new Date(reading.readingDate) : new Date(),
            notes: reading.notes,
          },
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ reading, error: err.message });
      }
    }

    res.json({
      message: `Import completed: ${results.success} success, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ message: 'Error importing readings' });
  }
};

module.exports = {
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
};
