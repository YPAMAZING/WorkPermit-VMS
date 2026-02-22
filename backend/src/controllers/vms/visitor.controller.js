// VMS Visitor Controller
// Handles VMSVisitor model for Visitor Management System
// Using direct PrismaClient to match dashboard controller
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to check if user is admin
const isUserAdmin = (user) => {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (user.isFromWorkPermit) return true;
  const adminRoles = ['VMS_ADMIN', 'ADMIN', 'admin', 'FIREMAN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'VMS Administrator'];
  if (adminRoles.includes(user.role) || adminRoles.includes(user.roleName)) return true;
  // Also check if role name contains 'admin' (case-insensitive)
  if (user.role?.toLowerCase().includes('admin') || user.roleName?.toLowerCase().includes('admin')) return true;
  return false;
};

// Get all VMS visitors with pagination and filters
// This now queries GATEPASSES to get all visitor passes (same as dashboard)
exports.getVisitors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      companyId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Check if user is admin
    const userIsAdmin = isUserAdmin(req.user);
    
    console.log('=== VISITORS API DEBUG ===');
    console.log('User:', {
      userId: req.user?.userId,
      role: req.user?.role,
      roleName: req.user?.roleName,
      isAdmin: req.user?.isAdmin,
      companyId: req.user?.companyId,
      userIsAdmin,
    });

    // Build where clause for gatepasses
    let where = {};
    
    // Company filter for non-admin users
    if (!userIsAdmin && req.user?.companyId) {
      where.companyId = req.user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }
    // Admin with no companyId filter = empty where = ALL gatepasses

    // Status filter on gatepass
    if (status && status.toUpperCase() !== 'ALL') {
      where.status = status.toUpperCase();
    }

    // Search filter - search in visitor fields
    if (search && search.trim()) {
      where.visitor = {
        OR: [
          { visitorName: { contains: search } },
          { phone: { contains: search } },
          { companyToVisit: { contains: search } },
          { personToMeet: { contains: search } },
          { companyFrom: { contains: search } },
        ]
      };
    }

    console.log('Where clause:', JSON.stringify(where));

    // Debug: Count ALL gatepasses in database (no filters)
    const totalAllGatepasses = await prisma.vMSGatepass.count({});
    console.log('Total gatepasses in DB (no filter):', totalAllGatepasses);

    // Query GATEPASSES with visitor info (same as dashboard "Recent Visitors")
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

    console.log(`Found ${gatepasses.length} gatepasses (filtered: ${total}, total in DB: ${totalAllGatepasses})`);
    console.log('=== END DEBUG ===');

    // Format response - transform gatepasses to visitor format for frontend compatibility
    const formattedVisitors = gatepasses.map(gp => ({
      id: gp.visitor?.id || gp.id,
      visitorName: gp.visitor?.visitorName || 'Unknown',
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
      status: gp.status, // Use gatepass status (ACTIVE, USED, etc.)
      visitorStatus: gp.visitor?.status || '', // Original visitor status
      approvedBy: gp.visitor?.approvedBy || '',
      approvedAt: gp.visitor?.approvedAt || null,
      rejectionReason: gp.visitor?.rejectionReason || '',
      checkInTime: gp.visitor?.checkInTime || gp.validFrom,
      checkOutTime: gp.visitor?.checkOutTime || null,
      entryType: gp.visitor?.entryType || 'WALK_IN',
      requestNumber: gp.gatepassNumber, // Use gatepass number as request number
      company: gp.company,
      gatepass: {
        id: gp.id,
        gatepassNumber: gp.gatepassNumber,
        validFrom: gp.validFrom,
        validUntil: gp.validUntil,
        status: gp.status,
        companyId: gp.companyId,
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
      _debug: {
        totalAllGatepasses,
        userIsAdmin,
        whereClause: where,
        source: 'gatepasses', // Indicate data source
      },
    });
  } catch (error) {
    console.error('Get VMS visitors error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to get visitors', 
      error: error.message,
      hint: 'Check if vms_gatepasses table exists and Prisma client is generated'
    });
  }
};

// Get single visitor by ID
exports.getVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.vMSVisitor.findUnique({
      where: { id },
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
        where: {
          phone,
          isActive: true,
        },
      });
      if (blacklistEntry) {
        isBlacklisted = true;
        blacklistReason = blacklistEntry.reason;
      }
    } catch (e) {
      // Blacklist table might not exist
      console.log('Blacklist check skipped:', e.message);
    }

    if (visitor) {
      res.json({
        found: true,
        visitor,
        isBlacklisted,
        blacklistReason,
      });
    } else if (isBlacklisted) {
      res.json({
        found: false,
        isBlacklisted: true,
        blacklistReason,
      });
    } else {
      res.json({ found: false, isBlacklisted: false });
    }
  } catch (error) {
    console.error('Search visitor error:', error);
    res.status(500).json({ message: 'Failed to search visitor', error: error.message });
  }
};

// Create visitor (manual entry by admin/reception)
exports.createVisitor = async (req, res) => {
  try {
    const {
      visitorName,
      phone,
      email,
      companyFrom,
      companyToVisit,
      companyId,
      personToMeet,
      purpose,
      idProofType,
      idProofNumber,
      photo,
      vehicleNumber,
      numberOfVisitors = 1,
    } = req.body;

    // Validation
    if (!visitorName || !phone || !companyToVisit || !purpose) {
      return res.status(400).json({ 
        message: 'Missing required fields: visitorName, phone, companyToVisit, purpose' 
      });
    }

    // Check if company requires approval
    let requireApproval = false;
    if (companyId) {
      try {
        const company = await prisma.vMSCompany.findUnique({
          where: { id: companyId },
          select: { requireApproval: true },
        });
        requireApproval = company?.requireApproval || false;
      } catch (e) {
        console.log('Company lookup failed:', e.message);
      }
    }

    const visitor = await prisma.vMSVisitor.create({
      data: {
        visitorName,
        phone,
        email,
        companyFrom,
        companyToVisit,
        companyId,
        personToMeet,
        purpose,
        idProofType: idProofType || 'OTHER',
        idProofNumber: idProofNumber || '',
        photo,
        vehicleNumber,
        numberOfVisitors,
        status: requireApproval ? 'PENDING' : 'APPROVED',
        entryType: 'WALK_IN',
        approvedAt: requireApproval ? null : new Date(),
        approvedBy: requireApproval ? null : req.user?.userId,
      },
    });

    res.status(201).json({
      success: true,
      message: requireApproval ? 'Visitor created, awaiting approval' : 'Visitor created and approved',
      visitor,
    });
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

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;

    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Visitor updated successfully',
      visitor,
    });
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

    // Check if visitor exists
    const visitor = await prisma.vMSVisitor.findUnique({
      where: { id },
    });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Delete gatepass first if exists
    try {
      await prisma.vMSGatepass.deleteMany({ where: { visitorId: id } });
    } catch (e) {
      console.log('No gatepass to delete or error:', e.message);
    }

    await prisma.vMSVisitor.delete({ where: { id } });

    res.json({ success: true, message: 'Visitor deleted successfully' });
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

    // Filter by company if user is not admin
    const userIsAdmin = isUserAdmin(req.user);
    const companyFilter = req.user?.companyId && !userIsAdmin 
      ? { companyId: req.user.companyId } 
      : {};

    const [
      pending,
      approved,
      rejected,
      checkedIn,
      checkedOut,
      todayTotal,
    ] = await Promise.all([
      prisma.vMSVisitor.count({ where: { ...companyFilter, status: { in: ['PENDING', 'PENDING_APPROVAL'] } } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { ...companyFilter, status: 'APPROVED' } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { ...companyFilter, status: 'REJECTED' } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { ...companyFilter, status: 'CHECKED_IN' } }).catch(() => 0),
      prisma.vMSVisitor.count({ where: { ...companyFilter, status: 'CHECKED_OUT' } }).catch(() => 0),
      prisma.vMSVisitor.count({
        where: {
          ...companyFilter,
          createdAt: { gte: today, lt: tomorrow },
        },
      }).catch(() => 0),
    ]);

    res.json({
      success: true,
      pending,
      approved,
      rejected,
      checkedIn,
      checkedOut,
      todayTotal,
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
      data: {
        status: 'APPROVED',
        approvedBy: req.user?.userId,
        approvedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Visitor approved successfully',
      visitor,
    });
  } catch (error) {
    console.error('Approve visitor error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Visitor not found' });
    }
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
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'No reason provided',
      },
    });

    res.json({
      success: true,
      message: 'Visitor rejected',
      visitor,
    });
  } catch (error) {
    console.error('Reject visitor error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Visitor not found' });
    }
    res.status(500).json({ message: 'Failed to reject visitor', error: error.message });
  }
};

// Check-in visitor
exports.checkInVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkInTime: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Visitor checked in',
      visitor,
    });
  } catch (error) {
    console.error('Check-in visitor error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Visitor not found' });
    }
    res.status(500).json({ message: 'Failed to check in visitor', error: error.message });
  }
};

// Check-out visitor
exports.checkOutVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.vMSVisitor.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        checkOutTime: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Visitor checked out',
      visitor,
    });
  } catch (error) {
    console.error('Check-out visitor error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Visitor not found' });
    }
    res.status(500).json({ message: 'Failed to check out visitor', error: error.message });
  }
};
