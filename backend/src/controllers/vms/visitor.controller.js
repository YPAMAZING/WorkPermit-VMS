// VMS Visitor Controller
// Shows visitor data from GATEPASSES table (where actual visitor data exists)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all visitors - queries GATEPASSES table which has visitor info
exports.getVisitors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    console.log('=== VISITORS API (from Gatepasses) ===');

    // Build where clause for gatepasses
    let where = {};

    // Status filter
    if (status && status.toUpperCase() !== 'ALL') {
      where.status = status.toUpperCase();
    }

    // Search filter - search in related visitor fields
    if (search && search.trim()) {
      where.OR = [
        { gatepassNumber: { contains: search } },
        { visitor: { visitorName: { contains: search } } },
        { visitor: { phone: { contains: search } } },
        { visitor: { companyToVisit: { contains: search } } },
        { visitor: { personToMeet: { contains: search } } },
        { visitor: { companyFrom: { contains: search } } },
      ];
    }

    // Count totals
    const totalGatepasses = await prisma.vMSGatepass.count({});
    const totalVisitors = await prisma.vMSVisitor.count({});
    console.log('Total gatepasses:', totalGatepasses);
    console.log('Total visitors:', totalVisitors);

    // Query GATEPASSES with visitor info
    const [gatepasses, total] = await Promise.all([
      prisma.vMSGatepass.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          visitor: true,
          company: {
            select: {
              id: true,
              name: true,
              displayName: true,
            }
          }
        }
      }),
      prisma.vMSGatepass.count({ where }),
    ]);

    console.log(`Found ${gatepasses.length} gatepasses`);

    // Format as visitor records for frontend
    const formattedVisitors = gatepasses.map(gp => ({
      id: gp.visitor?.id || gp.id,
      visitorName: gp.visitor?.visitorName || 'Unknown Visitor',
      phone: gp.visitor?.phone || '',
      email: gp.visitor?.email || '',
      companyFrom: gp.visitor?.companyFrom || '',
      companyToVisit: gp.visitor?.companyToVisit || gp.company?.displayName || gp.company?.name || '',
      companyId: gp.companyId,
      personToMeet: gp.visitor?.personToMeet || '',
      purpose: gp.visitor?.purpose || '',
      idProofType: gp.visitor?.idProofType || '',
      idProofNumber: gp.visitor?.idProofNumber || '',
      photo: gp.visitor?.photo || null,
      vehicleNumber: gp.visitor?.vehicleNumber || '',
      numberOfVisitors: gp.visitor?.numberOfVisitors || 1,
      status: gp.status,
      checkInTime: gp.visitor?.checkInTime || gp.validFrom,
      checkOutTime: gp.visitor?.checkOutTime || null,
      entryType: gp.visitor?.entryType || 'WALK_IN',
      requestNumber: gp.gatepassNumber,
      company: gp.company,
      gatepass: {
        id: gp.id,
        gatepassNumber: gp.gatepassNumber,
        validFrom: gp.validFrom,
        validUntil: gp.validUntil,
        status: gp.status,
      },
      createdAt: gp.createdAt,
      updatedAt: gp.updatedAt,
    }));

    res.json({
      success: true,
      visitors: formattedVisitors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
      _debug: { totalGatepasses, totalVisitors },
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({ message: 'Failed to get visitors', error: error.message });
  }
};

// Get single visitor by ID
exports.getVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find gatepass first
    let gatepass = await prisma.vMSGatepass.findFirst({
      where: { OR: [{ id }, { visitorId: id }] },
      include: { visitor: true, company: true }
    });

    if (gatepass) {
      return res.json({
        success: true,
        visitor: {
          ...gatepass.visitor,
          gatepass: {
            id: gatepass.id,
            gatepassNumber: gatepass.gatepassNumber,
            validFrom: gatepass.validFrom,
            validUntil: gatepass.validUntil,
            status: gatepass.status,
          },
          company: gatepass.company,
        }
      });
    }

    // Fallback to visitor table
    const visitor = await prisma.vMSVisitor.findUnique({
      where: { id },
      include: { gatepass: true, company: true }
    });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    res.json({ success: true, visitor });
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({ message: 'Failed to get visitor', error: error.message });
  }
};

// Search visitor by phone
exports.searchByPhone = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const visitor = await prisma.vMSVisitor.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    let isBlacklisted = false;
    let blacklistReason = null;
    try {
      const blacklistEntry = await prisma.vMSBlacklist.findFirst({
        where: { phone, isActive: true },
      });
      if (blacklistEntry) {
        isBlacklisted = true;
        blacklistReason = blacklistEntry.reason;
      }
    } catch (e) {}

    res.json({
      found: !!visitor,
      visitor: visitor || null,
      isBlacklisted,
      blacklistReason,
    });
  } catch (error) {
    console.error('Search visitor error:', error);
    res.status(500).json({ message: 'Failed to search visitor', error: error.message });
  }
};

// Create visitor
exports.createVisitor = async (req, res) => {
  try {
    const { visitorName, phone, email, companyFrom, companyToVisit, companyId,
      personToMeet, purpose, idProofType, idProofNumber, photo, vehicleNumber,
      numberOfVisitors = 1 } = req.body;

    if (!visitorName || !phone || !companyToVisit || !purpose) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const visitor = await prisma.vMSVisitor.create({
      data: {
        visitorName, phone, email, companyFrom, companyToVisit, companyId,
        personToMeet, purpose, idProofType: idProofType || 'OTHER',
        idProofNumber: idProofNumber || '', photo, vehicleNumber, numberOfVisitors,
        status: 'APPROVED', entryType: 'WALK_IN', approvedAt: new Date(),
      },
    });

    res.status(201).json({ success: true, visitor });
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({ message: 'Failed to create visitor', error: error.message });
  }
};

// Update visitor
exports.updateVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.createdAt;

    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, visitor });
  } catch (error) {
    console.error('Update visitor error:', error);
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to update visitor', error: error.message });
  }
};

// Delete visitor
exports.deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete gatepass first
    await prisma.vMSGatepass.deleteMany({ where: { visitorId: id } }).catch(() => {});
    await prisma.vMSVisitor.delete({ where: { id } });
    
    res.json({ success: true, message: 'Visitor deleted' });
  } catch (error) {
    console.error('Delete visitor error:', error);
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to delete visitor', error: error.message });
  }
};

// Get visitor statistics
exports.getVisitorStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, todayTotal, active, used, cancelled] = await Promise.all([
      prisma.vMSGatepass.count({}),
      prisma.vMSGatepass.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.vMSGatepass.count({ where: { status: 'ACTIVE' } }),
      prisma.vMSGatepass.count({ where: { status: 'USED' } }),
      prisma.vMSGatepass.count({ where: { status: 'CANCELLED' } }),
    ]);

    res.json({ success: true, total, todayTotal, active, used, cancelled });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to get stats', error: error.message });
  }
};

// Approve visitor
exports.approveVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    res.json({ success: true, visitor });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to approve', error: error.message });
  }
};

// Reject visitor
exports.rejectVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason || 'No reason' },
    });
    res.json({ success: true, visitor });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to reject', error: error.message });
  }
};

// Check-in visitor
exports.checkInVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: { status: 'CHECKED_IN', checkInTime: new Date() },
    });
    res.json({ success: true, visitor });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to check in', error: error.message });
  }
};

// Check-out visitor
exports.checkOutVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: { status: 'CHECKED_OUT', checkOutTime: new Date() },
    });
    res.json({ success: true, visitor });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to check out', error: error.message });
  }
};
