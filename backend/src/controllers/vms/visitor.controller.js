// VMS Visitor Controller
// Shows visitor data from VMSVisitor table
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all visitors - queries VMSVisitor table directly
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

    console.log('========================================');
    console.log('=== VISITORS API REQUEST ===');
    console.log('User:', req.user?.email, 'Role:', req.user?.roleName);
    console.log('Query params:', { page, limit, search, status });
    console.log('========================================');

    // Build where clause for visitors
    let where = {};

    // Status filter
    if (status && status.toUpperCase() !== 'ALL') {
      where.status = status.toUpperCase();
    }

    // Search filter - only add if search is provided and not empty
    if (search && search.trim()) {
      where.OR = [
        { visitorName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { companyToVisit: { contains: search } },
        { personToMeet: { contains: search } },
      ];
    }

    console.log('Where clause:', JSON.stringify(where));

    // Count total
    const total = await prisma.vMSVisitor.count({ where });
    console.log('Total visitors matching query:', total);

    // Query VISITORS directly
    const visitors = await prisma.vMSVisitor.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        gatepass: true,
        company: {
          select: {
            id: true,
            name: true,
            displayName: true,
          }
        }
      }
    });

    console.log(`Found ${visitors.length} visitors`);

    // Format visitor records for frontend
    const formattedVisitors = visitors.map(v => ({
      id: v.id,
      visitorName: v.visitorName || 'Unknown Visitor',
      phone: v.phone || '',
      email: v.email || '',
      companyFrom: v.companyFrom || '',
      companyToVisit: v.companyToVisit || v.company?.displayName || v.company?.name || '',
      companyId: v.companyId,
      personToMeet: v.personToMeet || '',
      purpose: v.purpose || '',
      idProofType: v.idProofType || '',
      idProofNumber: v.idProofNumber || '',
      photo: v.photo || null,
      vehicleNumber: v.vehicleNumber || '',
      numberOfVisitors: v.numberOfVisitors || 1,
      status: v.status,
      checkInTime: v.checkInTime,
      checkOutTime: v.checkOutTime,
      entryType: v.entryType || 'WALK_IN',
      requestNumber: v.gatepass?.gatepassNumber || v.id?.slice(0, 8)?.toUpperCase(),
      company: v.company,
      gatepass: v.gatepass ? {
        id: v.gatepass.id,
        gatepassNumber: v.gatepass.gatepassNumber,
        validFrom: v.gatepass.validFrom,
        validUntil: v.gatepass.validUntil,
        status: v.gatepass.status,
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

    const [total, todayTotal, pending, approved, checkedIn, checkedOut] = await Promise.all([
      prisma.vMSVisitor.count({}),
      prisma.vMSVisitor.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.vMSVisitor.count({ where: { status: 'PENDING' } }),
      prisma.vMSVisitor.count({ where: { status: 'APPROVED' } }),
      prisma.vMSVisitor.count({ where: { status: 'CHECKED_IN' } }),
      prisma.vMSVisitor.count({ where: { status: 'CHECKED_OUT' } }),
    ]);

    res.json({ success: true, total, todayTotal, pending, approved, checkedIn, checkedOut });
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
