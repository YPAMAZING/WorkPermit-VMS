// VMS Gatepass Controller
const vmsPrisma = require('../../config/vms-prisma');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Generate gatepass number
const generateGatepassNumber = async () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count for today
  const todayStart = new Date(date.setHours(0, 0, 0, 0));
  const todayEnd = new Date(date.setHours(23, 59, 59, 999));
  
  const count = await vmsPrisma.gatepass.count({
    where: {
      issuedAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `GP-${dateStr}-${sequence}`;
};

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
      sortBy = 'issuedAt',
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
        { hostName: { contains: search } },
        { visitor: { firstName: { contains: search } } },
        { visitor: { lastName: { contains: search } } },
        { visitor: { phone: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (purpose) {
      where.purpose = purpose;
    }

    if (date) {
      const dateObj = new Date(date);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      where.expectedDate = {
        gte: dateObj,
        lt: nextDay,
      };
    }

    // Get gatepasses with pagination
    const [gatepasses, total] = await Promise.all([
      vmsPrisma.gatepass.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          visitor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              company: true,
              photo: true,
              isBlacklisted: true,
            },
          },
          issuedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      vmsPrisma.gatepass.count({ where }),
    ]);

    res.json({
      gatepasses: gatepasses.map(g => ({
        ...g,
        visitorName: `${g.visitor.firstName} ${g.visitor.lastName}`,
        visitorPhone: g.visitor.phone,
        visitorCompany: g.visitor.company,
        visitorPhoto: g.visitor.photo,
        isBlacklisted: g.visitor.isBlacklisted,
        issuedByName: g.issuedBy ? `${g.issuedBy.firstName} ${g.issuedBy.lastName}` : null,
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

    const gatepass = await vmsPrisma.gatepass.findUnique({
      where: { id },
      include: {
        visitor: true,
        issuedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
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

    const gatepass = await vmsPrisma.gatepass.findUnique({
      where: { gatepassNumber },
      include: {
        visitor: true,
        issuedBy: {
          select: { firstName: true, lastName: true },
        },
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

    // Check if visitor is blacklisted
    if (gatepass.visitor.isBlacklisted) {
      return res.json({
        ...gatepass,
        isBlacklisted: true,
        message: 'This visitor is blacklisted',
      });
    }

    res.json({
      ...gatepass,
      isValid: gatepass.status === 'SCHEDULED' || gatepass.status === 'ACTIVE',
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
      purpose,
      purposeDetails,
      hostName,
      hostDepartment,
      hostPhone,
      hostEmail,
      entryGate,
      visitingArea,
      expectedDate,
      expectedTimeIn,
      expectedTimeOut,
      validFrom,
      validUntil,
      vehicleNumber,
      vehicleType,
      itemsCarried,
      remarks,
    } = req.body;

    // Get visitor
    const visitor = await vmsPrisma.visitor.findUnique({ where: { id: visitorId } });
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Check if visitor is blacklisted
    if (visitor.isBlacklisted) {
      return res.status(400).json({ message: 'Cannot create gatepass for blacklisted visitor' });
    }

    // Also check blacklist table
    const blacklistEntry = await vmsPrisma.blacklistEntry.findFirst({
      where: {
        OR: [
          { visitorId },
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

    // Generate gatepass number
    const gatepassNumber = await generateGatepassNumber();

    // Calculate validity
    const validFromDate = validFrom ? new Date(validFrom) : new Date();
    const validUntilDate = validUntil ? new Date(validUntil) : new Date(validFromDate.getTime() + 8 * 60 * 60 * 1000); // Default 8 hours

    // Generate QR code data
    const qrData = {
      gp: gatepassNumber,
      v: visitorId,
      t: Date.now(),
    };
    const qrCode = await generateQRCode(qrData);

    // Create gatepass
    const gatepass = await vmsPrisma.gatepass.create({
      data: {
        gatepassNumber,
        visitorId,
        purpose,
        purposeDetails,
        hostName,
        hostDepartment,
        hostPhone,
        hostEmail,
        entryGate,
        visitingArea,
        expectedDate: new Date(expectedDate),
        expectedTimeIn,
        expectedTimeOut,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        vehicleNumber,
        vehicleType,
        itemsCarried: JSON.stringify(itemsCarried || []),
        remarks,
        qrCode,
        qrCodeData: JSON.stringify(qrData),
        issuedById: req.user?.userId,
        status: 'SCHEDULED',
      },
      include: {
        visitor: true,
      },
    });

    // Update visitor stats
    await vmsPrisma.visitor.update({
      where: { id: visitorId },
      data: {
        totalVisits: { increment: 1 },
        lastVisitDate: new Date(),
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'GATEPASS_ISSUE',
        entity: 'gatepass',
        entityId: gatepass.id,
        newValue: JSON.stringify(gatepass),
      },
    });

    res.status(201).json({
      message: 'Gatepass created successfully',
      gatepass,
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
      purpose,
      purposeDetails,
      hostName,
      hostDepartment,
      hostPhone,
      hostEmail,
      entryGate,
      visitingArea,
      expectedDate,
      expectedTimeIn,
      expectedTimeOut,
      validUntil,
      vehicleNumber,
      vehicleType,
      itemsCarried,
      remarks,
      securityRemarks,
    } = req.body;

    // Get existing gatepass
    const existingGatepass = await vmsPrisma.gatepass.findUnique({ where: { id } });
    if (!existingGatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }

    // Cannot update completed or cancelled gatepasses
    if (['COMPLETED', 'CANCELLED'].includes(existingGatepass.status)) {
      return res.status(400).json({ message: 'Cannot update completed or cancelled gatepass' });
    }

    const gatepass = await vmsPrisma.gatepass.update({
      where: { id },
      data: {
        purpose,
        purposeDetails,
        hostName,
        hostDepartment,
        hostPhone,
        hostEmail,
        entryGate,
        visitingArea,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        expectedTimeIn,
        expectedTimeOut,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        vehicleNumber,
        vehicleType,
        itemsCarried: itemsCarried ? JSON.stringify(itemsCarried) : undefined,
        remarks,
        securityRemarks,
      },
      include: {
        visitor: true,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'UPDATE',
        entity: 'gatepass',
        entityId: gatepass.id,
        oldValue: JSON.stringify(existingGatepass),
        newValue: JSON.stringify(gatepass),
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
    const { status, securityRemarks } = req.body;

    const validStatuses = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const existingGatepass = await vmsPrisma.gatepass.findUnique({ where: { id } });
    if (!existingGatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }

    const gatepass = await vmsPrisma.gatepass.update({
      where: { id },
      data: {
        status,
        securityRemarks: securityRemarks || existingGatepass.securityRemarks,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: `GATEPASS_${status}`,
        entity: 'gatepass',
        entityId: gatepass.id,
        oldValue: JSON.stringify({ status: existingGatepass.status }),
        newValue: JSON.stringify({ status }),
      },
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

    const existingGatepass = await vmsPrisma.gatepass.findUnique({ where: { id } });
    if (!existingGatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }

    if (['COMPLETED', 'CANCELLED'].includes(existingGatepass.status)) {
      return res.status(400).json({ message: 'Cannot cancel this gatepass' });
    }

    const gatepass = await vmsPrisma.gatepass.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        remarks: reason || existingGatepass.remarks,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'GATEPASS_CANCEL',
        entity: 'gatepass',
        entityId: gatepass.id,
        newValue: JSON.stringify({ reason }),
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
      expectedDate: {
        gte: today,
        lt: tomorrow,
      },
    };

    const [
      total,
      scheduled,
      active,
      completed,
      cancelled,
      noShow,
      byPurpose,
    ] = await Promise.all([
      vmsPrisma.gatepass.count({ where }),
      vmsPrisma.gatepass.count({ where: { ...where, status: 'SCHEDULED' } }),
      vmsPrisma.gatepass.count({ where: { ...where, status: 'ACTIVE' } }),
      vmsPrisma.gatepass.count({ where: { ...where, status: 'COMPLETED' } }),
      vmsPrisma.gatepass.count({ where: { ...where, status: 'CANCELLED' } }),
      vmsPrisma.gatepass.count({ where: { ...where, status: 'NO_SHOW' } }),
      vmsPrisma.gatepass.groupBy({
        by: ['purpose'],
        where,
        _count: { purpose: true },
      }),
    ]);

    res.json({
      date: today.toISOString().slice(0, 10),
      total,
      byStatus: { scheduled, active, completed, cancelled, noShow },
      byPurpose: byPurpose.map(p => ({ purpose: p.purpose, count: p._count.purpose })),
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
    const days = parseInt(period);
    
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
      byPurpose,
      dailyTrend,
    ] = await Promise.all([
      vmsPrisma.gatepass.count({
        where: { issuedAt: { gte: startDate } },
      }),
      vmsPrisma.gatepass.count({
        where: { expectedDate: { gte: today, lt: tomorrow } },
      }),
      vmsPrisma.gatepass.count({
        where: {
          expectedDate: { gte: today, lt: tomorrow },
          status: { in: ['SCHEDULED', 'ACTIVE'] },
        },
      }),
      vmsPrisma.gatepass.groupBy({
        by: ['status'],
        where: { issuedAt: { gte: startDate } },
        _count: { status: true },
      }),
      vmsPrisma.gatepass.groupBy({
        by: ['purpose'],
        where: { issuedAt: { gte: startDate } },
        _count: { purpose: true },
      }),
      // Get daily counts for trend
      vmsPrisma.$queryRaw`
        SELECT DATE(issuedAt) as date, COUNT(*) as count 
        FROM gatepasses 
        WHERE issuedAt >= ${startDate.toISOString()}
        GROUP BY DATE(issuedAt)
        ORDER BY date ASC
      `,
    ]);

    res.json({
      period: days,
      totalPeriod,
      todayTotal,
      todayActive,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.status })),
      byPurpose: byPurpose.map(p => ({ purpose: p.purpose, count: p._count.purpose })),
      dailyTrend,
    });
  } catch (error) {
    console.error('Get gatepass stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics', error: error.message });
  }
};
