// VMS Visitor Controller
// Handles VMSVisitor model for Visitor Management System
const vmsPrisma = require('../../config/vms-prisma');

// Helper to check if user is admin
const isUserAdmin = (user) => {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (user.isFromWorkPermit) return true;
  const adminRoles = ['VMS_ADMIN', 'ADMIN', 'admin', 'FIREMAN', 'SUPER_ADMIN'];
  return adminRoles.includes(user.role);
};

// Get all VMS visitors with pagination and filters
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

    // Build where clause
    const where = {};

    // Filter by company if user is not admin
    const userIsAdmin = isUserAdmin(req.user);
    console.log('User admin check:', { 
      userId: req.user?.userId, 
      role: req.user?.role, 
      isAdmin: req.user?.isAdmin, 
      isFromWorkPermit: req.user?.isFromWorkPermit,
      userIsAdmin 
    });
    
    if (req.user?.companyId && !userIsAdmin) {
      where.companyId = req.user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    // Status filter - handle different formats
    if (status) {
      const statusUpper = status.toUpperCase();
      if (statusUpper === 'PENDING' || statusUpper === 'PENDING_APPROVAL') {
        where.status = { in: ['PENDING', 'PENDING_APPROVAL'] };
      } else if (statusUpper === 'CHECKEDIN' || statusUpper === 'CHECKED_IN') {
        where.status = 'CHECKED_IN';
      } else if (statusUpper !== 'ALL') {
        where.status = statusUpper;
      }
    }

    // Search filter - using simple contains (MySQL is case-insensitive by default)
    if (search && search.trim()) {
      where.OR = [
        { visitorName: { contains: search } },
        { phone: { contains: search } },
        { companyToVisit: { contains: search } },
        { personToMeet: { contains: search } },
      ];
    }

    console.log('Fetching visitors with where:', JSON.stringify(where));

    // Get visitors with pagination - include gatepass relationship
    const [visitors, total] = await Promise.all([
      vmsPrisma.vMSVisitor.findMany({
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
            }
          }
        }
      }),
      vmsPrisma.vMSVisitor.count({ where }),
    ]);

    console.log(`Found ${visitors.length} visitors out of ${total} total`);

    // Format response
    const formattedVisitors = visitors.map(v => ({
      id: v.id,
      visitorName: v.visitorName,
      phone: v.phone,
      email: v.email,
      companyFrom: v.companyFrom,
      companyToVisit: v.companyToVisit,
      companyId: v.companyId,
      personToMeet: v.personToMeet,
      purpose: v.purpose,
      idProofType: v.idProofType,
      idProofNumber: v.idProofNumber,
      photo: v.photo,
      vehicleNumber: v.vehicleNumber,
      numberOfVisitors: v.numberOfVisitors,
      status: v.status,
      approvedBy: v.approvedBy,
      approvedAt: v.approvedAt,
      rejectionReason: v.rejectionReason,
      checkInTime: v.checkInTime,
      checkOutTime: v.checkOutTime,
      entryType: v.entryType,
      requestNumber: v.id?.slice(0, 8)?.toUpperCase(), // Generate a short request number
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
    console.error('Get VMS visitors error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to get visitors', 
      error: error.message,
      hint: 'Check if vms_visitors table exists and Prisma client is generated'
    });
  }
};

// Get single visitor by ID
exports.getVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await vmsPrisma.vMSVisitor.findUnique({
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

    const visitor = await vmsPrisma.vMSVisitor.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    // Check blacklist
    let isBlacklisted = false;
    let blacklistReason = null;
    try {
      const blacklistEntry = await vmsPrisma.vMSBlacklist.findFirst({
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
        const company = await vmsPrisma.vMSCompany.findUnique({
          where: { id: companyId },
          select: { requireApproval: true },
        });
        requireApproval = company?.requireApproval || false;
      } catch (e) {
        console.log('Company lookup failed:', e.message);
      }
    }

    const visitor = await vmsPrisma.vMSVisitor.create({
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

    const visitor = await vmsPrisma.vMSVisitor.update({
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
    const visitor = await vmsPrisma.vMSVisitor.findUnique({
      where: { id },
    });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Delete gatepass first if exists
    try {
      await vmsPrisma.vMSGatepass.deleteMany({ where: { visitorId: id } });
    } catch (e) {
      console.log('No gatepass to delete or error:', e.message);
    }

    await vmsPrisma.vMSVisitor.delete({ where: { id } });

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
      vmsPrisma.vMSVisitor.count({ where: { ...companyFilter, status: { in: ['PENDING', 'PENDING_APPROVAL'] } } }).catch(() => 0),
      vmsPrisma.vMSVisitor.count({ where: { ...companyFilter, status: 'APPROVED' } }).catch(() => 0),
      vmsPrisma.vMSVisitor.count({ where: { ...companyFilter, status: 'REJECTED' } }).catch(() => 0),
      vmsPrisma.vMSVisitor.count({ where: { ...companyFilter, status: 'CHECKED_IN' } }).catch(() => 0),
      vmsPrisma.vMSVisitor.count({ where: { ...companyFilter, status: 'CHECKED_OUT' } }).catch(() => 0),
      vmsPrisma.vMSVisitor.count({
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

    const visitor = await vmsPrisma.vMSVisitor.update({
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

    const visitor = await vmsPrisma.vMSVisitor.update({
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

    const visitor = await vmsPrisma.vMSVisitor.update({
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

    const visitor = await vmsPrisma.vMSVisitor.update({
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
