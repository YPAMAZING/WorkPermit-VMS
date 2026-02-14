const vmsPrisma = require('../../config/vms-prisma');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Generate request number
const generateRequestNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CHK-${dateStr}-${random}`;
};

// Generate visitor code
const generateVisitorCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'V';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate gatepass number
const generateGatepassNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `GP-${dateStr}-${random}`;
};

// ================================
// PUBLIC ENDPOINTS
// ================================

// Get all active companies (for single QR check-in)
exports.getAllActiveCompanies = async (req, res) => {
  try {
    const companies = await vmsPrisma.vMSCompany.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        logo: true,
        contactPerson: true,
        contactEmail: true,
        contactPhone: true,
        requireApproval: true,
        autoApproveVisitors: true,
      },
      orderBy: { displayName: 'asc' }
    });
    
    res.json({ companies });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
  }
};

// Get company info by code/name (for QR form)
exports.getCompanyByCode = async (req, res) => {
  try {
    const { companyCode } = req.params;
    
    // Try to find by name or displayName (since we don't have a code field)
    const company = await vmsPrisma.vMSCompany.findFirst({
      where: {
        OR: [
          { name: companyCode },
          { displayName: companyCode }
        ]
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        logo: true,
        contactPerson: true,
        contactEmail: true,
        contactPhone: true,
        requireApproval: true,
        autoApproveVisitors: true,
        isActive: true,
      }
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    if (!company.isActive) {
      return res.status(400).json({ message: 'Company is not accepting visitors at this time' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Get company by code error:', error);
    res.status(500).json({ message: 'Failed to fetch company information', error: error.message });
  }
};

// Submit self check-in request (PUBLIC - no auth)
exports.submitCheckInRequest = async (req, res) => {
  try {
    const {
      companyCode,
      companyId,
      visitorName,
      firstName,
      lastName,
      email,
      phone,
      companyFrom,
      visitorCompany,
      personToMeet,
      idProofType,
      idProofNumber,
      idDocumentImage,
      photo,
      purpose,
      vehicleNumber,
      numberOfVisitors,
    } = req.body;
    
    // Validate required fields
    if (!phone || !purpose) {
      return res.status(400).json({ 
        message: 'Missing required fields: phone, purpose' 
      });
    }
    
    // Find company by ID or code
    let company;
    if (companyId) {
      company = await vmsPrisma.vMSCompany.findUnique({
        where: { id: companyId }
      });
    } else if (companyCode) {
      company = await vmsPrisma.vMSCompany.findFirst({
        where: {
          OR: [
            { name: companyCode },
            { displayName: companyCode }
          ]
        }
      });
    }
    
    if (!company) {
      return res.status(404).json({ message: 'Invalid company' });
    }
    
    if (!company.isActive) {
      return res.status(400).json({ message: 'Company is not accepting visitors' });
    }
    
    // Check if visitor is blacklisted
    const blacklisted = await vmsPrisma.vMSBlacklist.findFirst({
      where: {
        OR: [
          { phone, isActive: true },
          ...(idProofNumber ? [{ idNumber: idProofNumber, isActive: true }] : [])
        ]
      }
    });
    
    if (blacklisted) {
      return res.status(403).json({ 
        message: 'Entry not permitted. Please contact security.',
        code: 'BLACKLISTED'
      });
    }
    
    // Check for duplicate pending request
    const existingPending = await vmsPrisma.vMSVisitor.findFirst({
      where: {
        companyId: company.id,
        phone,
        status: { in: ['PENDING', 'APPROVED'] },
        createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } // Within 4 hours
      }
    });
    
    if (existingPending) {
      return res.status(400).json({ 
        message: 'You already have a pending check-in request',
        requestNumber: existingPending.id
      });
    }
    
    // Determine initial status based on company settings
    let status = 'PENDING';
    if (company.autoApproveVisitors || !company.requireApproval) {
      status = 'APPROVED';
    }
    
    // Check if pre-approved
    const preApproved = await vmsPrisma.vMSPreApproval.findFirst({
      where: {
        phone,
        status: 'APPROVED',
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() }
      }
    });
    
    if (preApproved) {
      status = 'APPROVED';
    }
    
    // Construct visitor name
    const fullName = visitorName || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown Visitor';
    
    // Create visitor record
    const visitor = await vmsPrisma.vMSVisitor.create({
      data: {
        visitorName: fullName,
        phone,
        email,
        companyFrom: companyFrom || visitorCompany,
        companyToVisit: company.displayName || company.name,
        companyId: company.id,
        personToMeet: personToMeet || 'Reception',
        purpose,
        idProofType: idProofType || 'NONE',
        idProofNumber,
        idDocumentImage,
        photo,
        vehicleNumber,
        numberOfVisitors: numberOfVisitors || 1,
        status,
        entryType: preApproved ? 'PRE_APPROVED' : 'WALK_IN',
      }
    });
    
    // If pre-approved, update used entries (if tracking)
    if (preApproved) {
      // Optional: track usage
    }
    
    // If auto-approved, create gatepass
    let gatepass = null;
    if (status === 'APPROVED' || status === 'CHECKED_IN') {
      const gatepassNumber = generateGatepassNumber();
      const qrData = JSON.stringify({ gatepassNumber, visitorId: visitor.id });
      const qrCode = await QRCode.toDataURL(qrData);
      
      gatepass = await vmsPrisma.vMSGatepass.create({
        data: {
          gatepassNumber,
          visitorId: visitor.id,
          companyId: company.id,
          validFrom: new Date(),
          validUntil: new Date(new Date().setHours(23, 59, 59, 999)),
          status: 'ACTIVE',
          qrCode,
        }
      });
      
      // Update visitor with gatepass reference
      await vmsPrisma.vMSVisitor.update({
        where: { id: visitor.id },
        data: { status: 'APPROVED' }
      });
    }
    
    res.status(201).json({
      success: true,
      requestNumber: visitor.id,
      visitorId: visitor.id,
      status,
      gatepass,
      message: status === 'APPROVED' 
        ? 'Your visit has been approved! Please show this confirmation to security.'
        : 'Your check-in request has been submitted. Please wait for approval.',
      companyName: company.displayName || company.name,
    });
  } catch (error) {
    console.error('Submit check-in request error:', error);
    res.status(500).json({ message: 'Failed to submit check-in request', error: error.message });
  }
};

// Get check-in request status (PUBLIC)
exports.getCheckInStatus = async (req, res) => {
  try {
    const { requestNumber } = req.params;
    
    const visitor = await vmsPrisma.vMSVisitor.findUnique({
      where: { id: requestNumber },
      include: {
        company: {
          select: { name: true, displayName: true, logo: true }
        },
        gatepass: true
      }
    });
    
    if (!visitor) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json({
      requestNumber: visitor.id,
      status: visitor.status,
      visitorName: visitor.visitorName,
      companyName: visitor.company?.displayName || visitor.company?.name || visitor.companyToVisit,
      submittedAt: visitor.createdAt,
      approvedAt: visitor.approvedAt,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime,
      gatepass: visitor.gatepass || null,
    });
  } catch (error) {
    console.error('Get check-in status error:', error);
    res.status(500).json({ message: 'Failed to fetch status', error: error.message });
  }
};

// ================================
// PROTECTED ENDPOINTS (Guard/Reception)
// ================================

// Get pending requests for guard dashboard
exports.getPendingRequests = async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    
    const where = {
      status: 'PENDING',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    };
    
    // If user is company-scoped, filter by company
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      where.companyId = companyId;
    }
    
    const requests = await vmsPrisma.vMSVisitor.findMany({
      where,
      include: {
        company: {
          select: { name: true, displayName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json(requests);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'Failed to fetch pending requests', error: error.message });
  }
};

// Get all requests with filters
exports.getAllRequests = async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    const { 
      status, 
      search, 
      date, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const where = {};
    
    // If user is company-scoped, filter by company
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      where.companyId = companyId;
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { visitorName: { contains: search } },
        { phone: { contains: search } },
        { companyFrom: { contains: search } },
        { personToMeet: { contains: search } },
      ];
    }
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startDate, lte: endDate };
    }
    
    const [requests, total] = await Promise.all([
      vmsPrisma.vMSVisitor.findMany({
        where,
        include: {
          company: {
            select: { name: true, displayName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      vmsPrisma.vMSVisitor.count({ where })
    ]);
    
    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
};

// Get live feed (for guard dashboard - real-time updates)
exports.getLiveFeed = async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    const { since } = req.query;
    
    const baseWhere = {};
    
    // If user is company-scoped, filter by company
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      baseWhere.companyId = companyId;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [pending, approved, checkedIn, recent] = await Promise.all([
      // Pending requests (last 24 hours)
      vmsPrisma.vMSVisitor.findMany({
        where: { 
          ...baseWhere, 
          status: 'PENDING',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        include: {
          company: { select: { name: true, displayName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      // Approved (ready for entry)
      vmsPrisma.vMSVisitor.findMany({
        where: { 
          ...baseWhere, 
          status: 'APPROVED',
          createdAt: { gte: today }
        },
        include: {
          company: { select: { name: true, displayName: true } }
        },
        orderBy: { approvedAt: 'desc' },
        take: 20
      }),
      // Currently inside (checked in but not out)
      vmsPrisma.vMSVisitor.findMany({
        where: { ...baseWhere, status: 'CHECKED_IN' },
        include: {
          company: { select: { name: true, displayName: true } }
        },
        orderBy: { checkInTime: 'desc' },
        take: 50
      }),
      // Recent activity (today)
      vmsPrisma.vMSVisitor.findMany({
        where: {
          ...baseWhere,
          createdAt: { gte: today }
        },
        include: {
          company: { select: { name: true, displayName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ]);
    
    res.json({
      pending,
      approved,
      checkedIn,
      recent,
      timestamp: new Date().toISOString(),
      counts: {
        pending: pending.length,
        approved: approved.length,
        checkedIn: checkedIn.length,
      }
    });
  } catch (error) {
    console.error('Get live feed error:', error);
    res.status(500).json({ message: 'Failed to fetch live feed', error: error.message });
  }
};

// Get single request by ID
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const companyId = user?.companyId;
    
    const where = { id };
    
    // If user is company-scoped, ensure they can only see their company's visitors
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      where.companyId = companyId;
    }
    
    const visitor = await vmsPrisma.vMSVisitor.findFirst({
      where,
      include: {
        company: {
          select: { name: true, displayName: true }
        },
        gatepass: true
      }
    });
    
    if (!visitor) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json(visitor);
  } catch (error) {
    console.error('Get request by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch request', error: error.message });
  }
};

// Approve check-in request
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const user = req.user;
    const companyId = user?.companyId;
    
    const where = { id, status: 'PENDING' };
    
    // If user is company-scoped, ensure they can only approve their company's visitors
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      where.companyId = companyId;
    }
    
    const visitor = await vmsPrisma.vMSVisitor.findFirst({ where });
    
    if (!visitor) {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }
    
    // Update visitor status
    const updated = await vmsPrisma.vMSVisitor.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user?.id,
        approvedAt: new Date(),
      }
    });
    
    // Create gatepass
    const gatepassNumber = generateGatepassNumber();
    const qrData = JSON.stringify({ gatepassNumber, visitorId: visitor.id });
    const qrCode = await QRCode.toDataURL(qrData);
    
    const gatepass = await vmsPrisma.vMSGatepass.create({
      data: {
        gatepassNumber,
        visitorId: visitor.id,
        companyId: visitor.companyId,
        validFrom: new Date(),
        validUntil: new Date(new Date().setHours(23, 59, 59, 999)),
        status: 'ACTIVE',
        qrCode,
      }
    });
    
    res.json({
      success: true,
      message: 'Visitor approved for entry',
      visitor: updated,
      gatepass
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
};

// Reject check-in request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;
    const companyId = user?.companyId;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const where = { id, status: 'PENDING' };
    
    // If user is company-scoped, ensure they can only reject their company's visitors
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      where.companyId = companyId;
    }
    
    const visitor = await vmsPrisma.vMSVisitor.findFirst({ where });
    
    if (!visitor) {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }
    
    const updated = await vmsPrisma.vMSVisitor.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      }
    });
    
    res.json({
      success: true,
      message: 'Visitor entry rejected',
      visitor: updated
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Failed to reject request', error: error.message });
  }
};

// Mark visitor as checked in
exports.markCheckedIn = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const companyId = user?.companyId;
    
    const where = { id, status: 'APPROVED' };
    
    // If user is company-scoped, filter by company
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      where.companyId = companyId;
    }
    
    const visitor = await vmsPrisma.vMSVisitor.findFirst({ where });
    
    if (!visitor) {
      return res.status(404).json({ message: 'Request not found or not approved' });
    }
    
    // Update visitor status
    const updated = await vmsPrisma.vMSVisitor.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkInTime: new Date(),
      }
    });
    
    // Update gatepass if exists
    await vmsPrisma.vMSGatepass.updateMany({
      where: { visitorId: id },
      data: { 
        status: 'ACTIVE',
        checkInTime: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Visitor checked in successfully',
      visitor: updated
    });
  } catch (error) {
    console.error('Mark checked in error:', error);
    res.status(500).json({ message: 'Failed to check in visitor', error: error.message });
  }
};

// Mark visitor as checked out
exports.markCheckedOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { securityRemarks } = req.body;
    const user = req.user;
    const companyId = user?.companyId;
    
    const where = { id, status: 'CHECKED_IN' };
    
    // If user is company-scoped, filter by company
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      where.companyId = companyId;
    }
    
    const visitor = await vmsPrisma.vMSVisitor.findFirst({ where });
    
    if (!visitor) {
      return res.status(404).json({ message: 'Request not found or not checked in' });
    }
    
    // Update visitor
    const updated = await vmsPrisma.vMSVisitor.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        checkOutTime: new Date(),
      }
    });
    
    // Update gatepass
    await vmsPrisma.vMSGatepass.updateMany({
      where: { visitorId: id },
      data: {
        status: 'COMPLETED',
        checkOutTime: new Date(),
      }
    });
    
    res.json({
      success: true,
      message: 'Visitor checked out successfully',
      visitor: updated
    });
  } catch (error) {
    console.error('Mark checked out error:', error);
    res.status(500).json({ message: 'Failed to check out visitor', error: error.message });
  }
};

// Get check-in statistics
exports.getCheckInStats = async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const baseWhere = {};
    
    // If user is company-scoped, filter by company
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      baseWhere.companyId = companyId;
    }
    
    const [
      todayTotal,
      todayPending,
      todayApproved,
      todayCheckedIn,
      todayCheckedOut,
      todayRejected,
      currentlyInside
    ] = await Promise.all([
      vmsPrisma.vMSVisitor.count({
        where: { ...baseWhere, createdAt: { gte: today } }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { ...baseWhere, createdAt: { gte: today }, status: 'PENDING' }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { ...baseWhere, createdAt: { gte: today }, status: 'APPROVED' }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { ...baseWhere, createdAt: { gte: today }, status: 'CHECKED_IN' }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { ...baseWhere, createdAt: { gte: today }, status: 'CHECKED_OUT' }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { ...baseWhere, createdAt: { gte: today }, status: 'REJECTED' }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { ...baseWhere, status: 'CHECKED_IN' }
      })
    ]);
    
    res.json({
      today: {
        total: todayTotal,
        pending: todayPending,
        approved: todayApproved,
        checkedIn: todayCheckedIn,
        checkedOut: todayCheckedOut,
        rejected: todayRejected,
      },
      currentlyInside
    });
  } catch (error) {
    console.error('Get check-in stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
};

// Search visitor by phone/name
exports.searchVisitor = async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    const { q } = req.query;
    
    if (!q || q.length < 3) {
      return res.json([]);
    }
    
    const where = {
      OR: [
        { phone: { contains: q } },
        { visitorName: { contains: q } },
        { email: { contains: q } },
        { companyFrom: { contains: q } },
      ]
    };
    
    // If user is company-scoped, filter by company
    if (companyId && !['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) {
      where.companyId = companyId;
    }
    
    const visitors = await vmsPrisma.vMSVisitor.findMany({
      where,
      include: {
        company: { select: { name: true, displayName: true } }
      },
      take: 10
    });
    
    res.json(visitors);
  } catch (error) {
    console.error('Search visitor error:', error);
    res.status(500).json({ message: 'Failed to search visitors', error: error.message });
  }
};
