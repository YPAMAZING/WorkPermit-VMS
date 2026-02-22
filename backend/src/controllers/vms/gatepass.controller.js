// VMS Gatepass Controller
const vmsPrisma = require('../../config/vms-prisma');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { generateVisitorPassNumber } = require('../../utils/passNumberGenerator');

// Generate QR code for gatepass
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(JSON.stringify(data), {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return null;
  }
};

// Helper: Check if user is admin (can see all companies)
const isUserAdmin = (userRole) => {
  const adminRoles = ['ADMIN', 'VMS_ADMIN', 'SECURITY_SUPERVISOR'];
  return adminRoles.includes(userRole);
};

// Get all gatepasses with pagination and filters
exports.getGatepasses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      date,
      purpose,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    // Company-based filtering: Non-admin users see only their company's gatepasses
    if (req.user && !isUserAdmin(req.user.role) && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    if (search) {
      where.OR = [
        { gatepassNumber: { contains: search } },
        { visitor: { visitorName: { contains: search } } },
        { visitor: { phone: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (date) {
      const dateObj = new Date(date);
      // Only apply date filter if date is valid
      if (!isNaN(dateObj.getTime())) {
        const nextDay = new Date(dateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        where.createdAt = {
          gte: dateObj,
          lt: nextDay,
        };
      }
    }

    // Get gatepasses with pagination
    const [gatepasses, total] = await Promise.all([
      vmsPrisma.vMSGatepass.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          visitor: {
            select: {
              id: true,
              visitorName: true,
              phone: true,
              companyFrom: true,
              photo: true,
            },
          },
        },
      }),
      vmsPrisma.vMSGatepass.count({ where }),
    ]);

    res.json({
      gatepasses: gatepasses.map(g => ({
        ...g,
        visitorName: g.visitor?.visitorName,
        visitorPhone: g.visitor?.phone,
        visitorCompany: g.visitor?.companyFrom,
        visitorPhoto: g.visitor?.photo,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get gatepasses error:', error);
    res.status(500).json({ message: 'Failed to get gatepasses', error: error.message });
  }
};

// Get single gatepass by ID
exports.getGatepass = async (req, res) => {
  try {
    const { id } = req.params;

    const gatepass = await vmsPrisma.vMSGatepass.findUnique({
      where: { id },
      include: {
        visitor: true,
      },
    });

    if (!gatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }

    res.json(gatepass);
  } catch (error) {
    console.error('Get gatepass error:', error);
    res.status(500).json({ message: 'Failed to get gatepass', error: error.message });
  }
};

// Get gatepass by number (for QR scan)
exports.getGatepassByNumber = async (req, res) => {
  try {
    const { gatepassNumber } = req.params;

    const gatepass = await vmsPrisma.vMSGatepass.findUnique({
      where: { gatepassNumber },
      include: {
        visitor: true,
      },
    });

    if (!gatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }

    // Check if expired
    if (new Date() > new Date(gatepass.validUntil)) {
      return res.json({
        ...gatepass,
        isExpired: true,
        message: 'This gatepass has expired',
      });
    }

    res.json({
      ...gatepass,
      isValid: gatepass.status === 'ACTIVE',
    });
  } catch (error) {
    console.error('Get gatepass by number error:', error);
    res.status(500).json({ message: 'Failed to get gatepass', error: error.message });
  }
};

// Create gatepass
exports.createGatepass = async (req, res) => {
  try {
    const {
      visitorId,
      companyId,
      validFrom,
      validUntil,
      remarks,
    } = req.body;

    // Get visitor
    const visitor = await vmsPrisma.vMSVisitor.findUnique({ where: { id: visitorId } });
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Check if visitor is blacklisted
    const blacklistEntry = await vmsPrisma.vMSBlacklist.findFirst({
      where: {
        OR: [
          { phone: visitor.phone },
        ],
        isActive: true,
      },
    });

    if (blacklistEntry) {
      return res.status(400).json({
        message: 'This visitor is in the blacklist',
        reason: blacklistEntry.reason,
      });
    }

    // Generate gatepass number using new format (RGDGTLVP)
    const gatepassNumber = await generateVisitorPassNumber(vmsPrisma);

    // Calculate validity with date validation
    let validFromDate = new Date();
    if (validFrom) {
      const parsed = new Date(validFrom);
      if (!isNaN(parsed.getTime())) {
        validFromDate = parsed;
      }
    }
    
    let validUntilDate = new Date(validFromDate.getTime() + 8 * 60 * 60 * 1000); // Default 8 hours
    if (validUntil) {
      const parsed = new Date(validUntil);
      if (!isNaN(parsed.getTime())) {
        validUntilDate = parsed;
      }
    }

    // Generate QR code data
    const qrData = {
      gp: gatepassNumber,
      v: visitorId,
      t: Date.now(),
    };
    const qrCode = await generateQRCode(qrData);

    // Create gatepass
    const gatepass = await vmsPrisma.vMSGatepass.create({
      data: {
        gatepassNumber,
        visitorId,
        companyId: companyId || visitor.companyId,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        status: 'ACTIVE',
      },
      include: {
        visitor: true,
      },
    });

    res.status(201).json({
      message: 'Gatepass created successfully',
      gatepass: {
        ...gatepass,
        qrCode,
      },
    });
  } catch (error) {
    console.error('Create gatepass error:', error);
    res.status(500).json({ message: 'Failed to create gatepass', error: error.message });
  }
};

// Update gatepass
exports.updateGatepass = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      validUntil,
      status,
    } = req.body;

    // Get existing gatepass
    const existingGatepass = await vmsPrisma.vMSGatepass.findUnique({ where: { id } });
    if (!existingGatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }

    // Cannot update cancelled gatepasses
    if (existingGatepass.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot update cancelled gatepass' });
    }

    const gatepass = await vmsPrisma.vMSGatepass.update({
      where: { id },
      data: {
        validUntil: validUntil ? new Date(validUntil) : undefined,
        status: status || undefined,
      },
      include: {
        visitor: true,
      },
    });

    res.json({
      message: 'Gatepass updated successfully',
      gatepass,
    });
  } catch (error) {
    console.error('Update gatepass error:', error);
    res.status(500).json({ message: 'Failed to update gatepass', error: error.message });
  }
};

// Update gatepass status
exports.updateGatepassStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const existingGatepass = await vmsPrisma.vMSGatepass.findUnique({ where: { id } });
    if (!existingGatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }

    const gatepass = await vmsPrisma.vMSGatepass.update({
      where: { id },
      data: { status },
    });

    res.json({
      message: `Gatepass status updated to ${status}`,
      gatepass,
    });
  } catch (error) {
    console.error('Update gatepass status error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

// Cancel gatepass
exports.cancelGatepass = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existingGatepass = await vmsPrisma.vMSGatepass.findUnique({ where: { id } });
    if (!existingGatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }

    if (existingGatepass.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Gatepass is already cancelled' });
    }

    const gatepass = await vmsPrisma.vMSGatepass.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    res.json({
      message: 'Gatepass cancelled successfully',
      gatepass,
    });
  } catch (error) {
    console.error('Cancel gatepass error:', error);
    res.status(500).json({ message: 'Failed to cancel gatepass', error: error.message });
  }
};

// Get today's gatepasses summary
exports.getTodaySummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    };

    const [
      total,
      active,
      used,
      expired,
      cancelled,
    ] = await Promise.all([
      vmsPrisma.vMSGatepass.count({ where }),
      vmsPrisma.vMSGatepass.count({ where: { ...where, status: 'ACTIVE' } }),
      vmsPrisma.vMSGatepass.count({ where: { ...where, status: 'USED' } }),
      vmsPrisma.vMSGatepass.count({ where: { ...where, status: 'EXPIRED' } }),
      vmsPrisma.vMSGatepass.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    res.json({
      date: today.toISOString().slice(0, 10),
      total,
      byStatus: { active, used, expired, cancelled },
    });
  } catch (error) {
    console.error('Get today summary error:', error);
    res.status(500).json({ message: 'Failed to get summary', error: error.message });
  }
};

// Get gatepass statistics
exports.getGatepassStats = async (req, res) => {
  try {
    const { period = '7' } = req.query;
    
    // Handle different period formats
    let days = 7; // default
    if (period === 'month') {
      days = 30;
    } else if (period === 'week') {
      days = 7;
    } else if (period === 'year') {
      days = 365;
    } else {
      const parsed = parseInt(period);
      if (!isNaN(parsed) && parsed > 0) {
        days = parsed;
      }
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalPeriod,
      todayTotal,
      todayActive,
      byStatus,
    ] = await Promise.all([
      vmsPrisma.vMSGatepass.count({
        where: { createdAt: { gte: startDate } },
      }).catch(() => 0),
      vmsPrisma.vMSGatepass.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }).catch(() => 0),
      vmsPrisma.vMSGatepass.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: 'ACTIVE',
        },
      }).catch(() => 0),
      vmsPrisma.vMSGatepass.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { status: true },
      }).catch(() => []),
    ]);

    res.json({
      period: days,
      totalPeriod,
      todayTotal,
      todayActive,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.status })),
    });
  } catch (error) {
    console.error('Get gatepass stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics', error: error.message });
  }
};
