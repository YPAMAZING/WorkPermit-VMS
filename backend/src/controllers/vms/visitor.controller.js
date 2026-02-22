// VMS Visitor Controller
// Handles VMSVisitor model for Visitor Management System
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all VMS visitors with pagination and filters
// NO company filtering - show ALL visitors to ALL users
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

    console.log('=== VISITORS API DEBUG ===');
    console.log('Query params:', { page, limit, search, status, sortBy, sortOrder });

    // Build where clause - NO company filter
    let where = {};

    // Status filter
    if (status && status.toUpperCase() !== 'ALL') {
      const statusUpper = status.toUpperCase();
      if (statusUpper === 'PENDING' || statusUpper === 'PENDING_APPROVAL') {
        where.status = { in: ['PENDING', 'PENDING_APPROVAL'] };
      } else if (statusUpper === 'CHECKEDIN' || statusUpper === 'CHECKED_IN') {
        where.status = 'CHECKED_IN';
      } else {
        where.status = statusUpper;
      }
    }

    // Search filter
    if (search && search.trim()) {
      where.OR = [
        { visitorName: { contains: search } },
        { phone: { contains: search } },
        { companyToVisit: { contains: search } },
        { personToMeet: { contains: search } },
        { companyFrom: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Count ALL visitors in database (no filters)
    const totalAllVisitors = await prisma.vMSVisitor.count({});
    console.log('Total visitors in DB (no filter):', totalAllVisitors);
    console.log('Where clause:', JSON.stringify(where));

    // Query VISITORS
    const [visitors, total] = await Promise.all([
      prisma.vMSVisitor.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          gatepass: {
            select: {
              id: true,
              gatepassNumber: true,
              validFrom: true,
              validUntil: true,
              status: true,
              companyId: true,
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              displayName: true,
            }
          }
        }
      }),
      prisma.vMSVisitor.count({ where }),
    ]);

    console.log(`Found ${visitors.length} visitors (filtered: ${total}, total in DB: ${totalAllVisitors})`);
    console.log('=== END DEBUG ===');

    // Format response
    const formattedVisitors = visitors.map(v => ({
      id: v.id,
      visitorName: v.visitorName || 'Unknown',
      phone: v.phone || '',
      email: v.email || '',
      companyFrom: v.companyFrom || '',
      companyToVisit: v.companyToVisit || v.company?.displayName || v.company?.name || '',
      companyId: v.companyId,
      personToMeet: v.personToMeet || '',
      purpose: v.purpose || '',
      idProofType: v.idProofType || '',
      idProofNumber: v.idProofNumber || '',
      idDocumentImage: v.idDocumentImage || null,
      photo: v.photo || null,
      vehicleNumber: v.vehicleNumber || '',
      numberOfVisitors: v.numberOfVisitors || 1,
      status: v.status || 'PENDING',
      approvedBy: v.approvedBy || '',
      approvedAt: v.approvedAt || null,
      rejectionReason: v.rejectionReason || '',
      checkInTime: v.checkInTime || null,
      checkOutTime: v.checkOutTime || null,
      entryType: v.entryType || 'WALK_IN',
      requestNumber: v.gatepass?.gatepassNumber || `VIS-${v.id?.slice(0, 8).toUpperCase()}`,
      company: v.company,
      gatepass: v.gatepass ? {
        id: v.gatepass.id,
        gatepassNumber: v.gatepass.gatepassNumber,
        validFrom: v.gatepass.validFrom,
        validUntil: v.gatepass.validUntil,
        status: v.gatepass.status,
        companyId: v.gatepass.companyId,
      } : null,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
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
      _debug: {
        totalAllVisitors,
        whereClause: where,
      },
    });
  } catch (error) {
    console.error('Get VMS visitors error:', error);
    res.status(500).json({ 
      message: 'Failed to get visitors', 
      error: error.message,
    });
  }
};

// Get single visitor by ID
exports.getVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.vMSVisitor.findUnique({
      where: { id },
      include: {
        gatepass: true,
        company: true,
      }
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

    // Check blacklist
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
    } catch (e) {
      console.log('Blacklist check skipped:', e.message);
    }

    if (visitor) {
      res.json({ found: true, visitor, isBlacklisted, blacklistReason });
    } else if (isBlacklisted) {
      res.json({ found: false, isBlacklisted: true, blacklistReason });
    } else {
      res.json({ found: false, isBlacklisted: false });
    }
  } catch (error) {
    console.error('Search visitor error:', error);
    res.status(500).json({ message: 'Failed to search visitor', error: error.message });
  }
};

// Create visitor
exports.createVisitor = async (req, res) => {
  try {
    const {
      visitorName, phone, email, companyFrom, companyToVisit, companyId,
      personToMeet, purpose, idProofType, idProofNumber, photo, vehicleNumber,
      numberOfVisitors = 1,
    } = req.body;

    if (!visitorName || !phone || !companyToVisit || !purpose) {
      return res.status(400).json({ 
        message: 'Missing required fields: visitorName, phone, companyToVisit, purpose' 
      });
    }

    const visitor = await prisma.vMSVisitor.create({
      data: {
        visitorName, phone, email, companyFrom, companyToVisit, companyId,
        personToMeet, purpose,
        idProofType: idProofType || 'OTHER',
        idProofNumber: idProofNumber || '',
        photo, vehicleNumber, numberOfVisitors,
        status: 'APPROVED',
        entryType: 'WALK_IN',
        approvedAt: new Date(),
        approvedBy: req.user?.userId,
      },
    });

    res.status(201).json({ success: true, message: 'Visitor created', visitor });
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({ message: 'Failed to create visitor', error: error.message });
  }
};

// Update visitor
exports.updateVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData.id;
    delete updateData.createdAt;

    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, message: 'Visitor updated', visitor });
  } catch (error) {
    console.error('Update visitor error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Visitor not found' });
    }
    res.status(500).json({ message: 'Failed to update visitor', error: error.message });
  }
};

// Delete visitor
exports.deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.vMSVisitor.findUnique({ where: { id } });
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Delete gatepass first if exists
    try {
      await prisma.vMSGatepass.deleteMany({ where: { visitorId: id } });
    } catch (e) {
      console.log('No gatepass to delete');
    }

    await prisma.vMSVisitor.delete({ where: { id } });
    res.json({ success: true, message: 'Visitor deleted' });
  } catch (error) {
    console.error('Delete visitor error:', error);
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

    const [pending, approved, rejected, checkedIn, checkedOut, todayTotal] = await Promise.all([
      prisma.vMSVisitor.count({ where: { status: { in: ['PENDING', 'PENDING_APPROVAL'] } } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { status: 'APPROVED' } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { status: 'REJECTED' } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { status: 'CHECKED_IN' } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { status: 'CHECKED_OUT' } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { createdAt: { gte: today, lt: tomorrow } } }).catch(() => 0),
    ]);

    res.json({
      success: true,
      pending, approved, rejected, checkedIn, checkedOut, todayTotal,
      total: pending + approved + rejected + checkedIn + checkedOut,
    });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics', error: error.message });
  }
};

// Approve visitor
exports.approveVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: req.user?.userId, approvedAt: new Date() },
    });
    res.json({ success: true, message: 'Visitor approved', visitor });
  } catch (error) {
    console.error('Approve visitor error:', error);
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to approve visitor', error: error.message });
  }
};

// Reject visitor
exports.rejectVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason || 'No reason provided' },
    });
    res.json({ success: true, message: 'Visitor rejected', visitor });
  } catch (error) {
    console.error('Reject visitor error:', error);
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to reject visitor', error: error.message });
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
    res.json({ success: true, message: 'Visitor checked in', visitor });
  } catch (error) {
    console.error('Check-in visitor error:', error);
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to check in visitor', error: error.message });
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
    res.json({ success: true, message: 'Visitor checked out', visitor });
  } catch (error) {
    console.error('Check-out visitor error:', error);
    if (error.code === 'P2025') return res.status(404).json({ message: 'Visitor not found' });
    res.status(500).json({ message: 'Failed to check out visitor', error: error.message });
  }
};
