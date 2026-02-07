const vmsDb = require('../../config/vms-prisma');
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

// ================================
// PUBLIC ENDPOINTS
// ================================

// Get all active companies (for single QR check-in)
exports.getAllActiveCompanies = async (req, res) => {
  try {
    const companies = await vmsDb.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        displayName: true,
        description: true,
        logo: true,
        primaryColor: true,
        welcomeMessage: true,
        termsAndConditions: true,
        requireIdProof: true,
        requirePhoto: true,
        departments: {
          where: { isActive: true },
          select: { id: true, name: true, floor: true, building: true }
        }
      },
      orderBy: { displayName: 'asc' }
    });
    
    res.json({ companies });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
};

// Get company info by code (for QR form)
exports.getCompanyByCode = async (req, res) => {
  try {
    const { companyCode } = req.params;
    
    const company = await vmsDb.company.findUnique({
      where: { code: companyCode },
      select: {
        id: true,
        code: true,
        name: true,
        displayName: true,
        logo: true,
        primaryColor: true,
        welcomeMessage: true,
        termsAndConditions: true,
        requireIdProof: true,
        requirePhoto: true,
        isActive: true,
        departments: {
          where: { isActive: true },
          select: { id: true, name: true, floor: true, building: true }
        }
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
    res.status(500).json({ message: 'Failed to fetch company information' });
  }
};

// Submit self check-in request (PUBLIC - no auth)
exports.submitCheckInRequest = async (req, res) => {
  try {
    const {
      companyCode,
      firstName,
      lastName,
      email,
      phone,
      visitorCompany,
      designation,
      idProofType,
      idProofNumber,
      idProofImage,
      photo,
      purpose,
      purposeDetails,
      hostName,
      hostDepartment,
      hostPhone,
      hostEmail,
      hasVehicle,
      vehicleNumber,
      vehicleType,
      itemsCarried,
    } = req.body;
    
    // Validate required fields
    if (!companyCode || !firstName || !lastName || !phone || !purpose) {
      return res.status(400).json({ 
        message: 'Missing required fields: companyCode, firstName, lastName, phone, purpose' 
      });
    }
    
    // Find company
    const company = await vmsDb.company.findUnique({
      where: { code: companyCode }
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Invalid company code' });
    }
    
    if (!company.isActive) {
      return res.status(400).json({ message: 'Company is not accepting visitors' });
    }
    
    // Check if visitor is blacklisted
    const blacklisted = await vmsDb.blacklistEntry.findFirst({
      where: {
        OR: [
          { companyId: company.id, phone, isActive: true },
          { isGlobal: true, phone, isActive: true },
          { companyId: company.id, idProofNumber, isActive: true },
          { isGlobal: true, idProofNumber, isActive: true },
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
    const existingPending = await vmsDb.checkInRequest.findFirst({
      where: {
        companyId: company.id,
        phone,
        status: { in: ['PENDING', 'APPROVED'] },
        expiresAt: { gt: new Date() }
      }
    });
    
    if (existingPending) {
      return res.status(400).json({ 
        message: 'You already have a pending check-in request',
        requestNumber: existingPending.requestNumber
      });
    }
    
    // Create request number
    const requestNumber = generateRequestNumber();
    
    // Set expiry (4 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);
    
    // Determine initial status
    let status = 'PENDING';
    if (company.autoApprove) {
      status = 'APPROVED';
    }
    
    // Check if pre-approved
    const preApproved = await vmsDb.preApprovedVisitor.findFirst({
      where: {
        companyId: company.id,
        phone,
        status: 'ACTIVE',
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() }
      }
    });
    
    if (preApproved) {
      status = 'APPROVED';
    }
    
    // Create check-in request
    const checkInRequest = await vmsDb.checkInRequest.create({
      data: {
        requestNumber,
        companyId: company.id,
        visitorName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        email,
        phone,
        visitorPhone: phone,
        visitorEmail: email,
        visitorCompany,
        designation,
        idProofType,
        idProofNumber,
        idProofImage,
        photo,
        purpose,
        visitPurpose: purpose,
        purposeDetails,
        hostName,
        hostDepartment,
        department: hostDepartment,
        hostPhone,
        hostEmail,
        hasVehicle: hasVehicle === true,
        vehicleNumber,
        vehicleType,
        itemsCarried: JSON.stringify(itemsCarried || []),
        status,
        expiresAt,
        deviceInfo: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
      }
    });
    
    // If pre-approved, update used entries
    if (preApproved) {
      await vmsDb.preApprovedVisitor.update({
        where: { id: preApproved.id },
        data: { usedEntries: { increment: 1 } }
      });
    }
    
    res.status(201).json({
      success: true,
      requestNumber,
      status,
      message: status === 'APPROVED' 
        ? 'Your visit has been approved! Please show this confirmation to security.'
        : 'Your check-in request has been submitted. Please wait for approval.',
      companyName: company.displayName || company.name,
      expiresAt,
    });
  } catch (error) {
    console.error('Submit check-in request error:', error);
    res.status(500).json({ message: 'Failed to submit check-in request' });
  }
};

// Get check-in request status (PUBLIC)
exports.getCheckInStatus = async (req, res) => {
  try {
    const { requestNumber } = req.params;
    
    const request = await vmsDb.checkInRequest.findUnique({
      where: { requestNumber },
      include: {
        company: {
          select: { name: true, displayName: true, logo: true }
        }
      }
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json({
      requestNumber: request.requestNumber,
      status: request.status,
      visitorName: `${request.firstName} ${request.lastName}`,
      companyName: request.company.displayName || request.company.name,
      submittedAt: request.submittedAt,
      expiresAt: request.expiresAt,
      processedAt: request.processedAt,
      checkInAt: request.checkInAt,
      checkOutAt: request.checkOutAt,
    });
  } catch (error) {
    console.error('Get check-in status error:', error);
    res.status(500).json({ message: 'Failed to fetch status' });
  }
};

// ================================
// PROTECTED ENDPOINTS (Guard/Reception)
// ================================

// Get pending requests for guard dashboard
exports.getPendingRequests = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const requests = await vmsDb.checkInRequest.findMany({
      where: {
        companyId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      orderBy: { submittedAt: 'desc' },
      take: 50
    });
    
    res.json(requests);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
};

// Get all requests with filters
exports.getAllRequests = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { 
      status, 
      search, 
      date, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const where = { companyId };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { requestNumber: { contains: search } },
        { hostName: { contains: search } },
      ];
    }
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.submittedAt = { gte: startDate, lte: endDate };
    }
    
    const [requests, total] = await Promise.all([
      vmsDb.checkInRequest.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      vmsDb.checkInRequest.count({ where })
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
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// Get live feed (for guard dashboard - real-time updates)
exports.getLiveFeed = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { since } = req.query; // Timestamp to get updates since
    
    const where = {
      companyId,
      expiresAt: { gt: new Date() }
    };
    
    if (since) {
      where.updatedAt = { gt: new Date(since) };
    }
    
    const [pending, approved, checkedIn, recent] = await Promise.all([
      // Pending requests
      vmsDb.checkInRequest.findMany({
        where: { ...where, status: 'PENDING' },
        orderBy: { submittedAt: 'desc' },
        take: 20
      }),
      // Approved (ready for entry)
      vmsDb.checkInRequest.findMany({
        where: { ...where, status: 'APPROVED' },
        orderBy: { processedAt: 'desc' },
        take: 20
      }),
      // Currently inside (checked in but not out)
      vmsDb.checkInRequest.findMany({
        where: { companyId, status: 'CHECKED_IN' },
        orderBy: { checkInAt: 'desc' },
        take: 50
      }),
      // Recent activity (last 2 hours)
      vmsDb.checkInRequest.findMany({
        where: {
          companyId,
          submittedAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
        },
        orderBy: { submittedAt: 'desc' },
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
    res.status(500).json({ message: 'Failed to fetch live feed' });
  }
};

// Get single request by ID
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    const request = await vmsDb.checkInRequest.findFirst({
      where: { id, companyId },
      include: {
        processedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json(request);
  } catch (error) {
    console.error('Get request by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch request' });
  }
};

// Approve check-in request
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const companyId = req.user.companyId;
    
    const request = await vmsDb.checkInRequest.findFirst({
      where: { id, companyId, status: 'PENDING' }
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }
    
    // Update request
    const updated = await vmsDb.checkInRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        processedById: req.user.id,
        processedAt: new Date(),
        processingNote: note,
      }
    });
    
    res.json({
      success: true,
      message: 'Visitor approved for entry',
      request: updated
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Failed to approve request' });
  }
};

// Reject check-in request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const companyId = req.user.companyId;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const request = await vmsDb.checkInRequest.findFirst({
      where: { id, companyId, status: 'PENDING' }
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }
    
    const updated = await vmsDb.checkInRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        processedById: req.user.id,
        processedAt: new Date(),
        rejectionReason: reason,
      }
    });
    
    res.json({
      success: true,
      message: 'Visitor entry rejected',
      request: updated
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Failed to reject request' });
  }
};

// Mark visitor as checked in
exports.markCheckedIn = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    const request = await vmsDb.checkInRequest.findFirst({
      where: { id, companyId, status: 'APPROVED' }
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found or not approved' });
    }
    
    // Create or update visitor record
    let visitor = await vmsDb.visitor.findFirst({
      where: { companyId, phone: request.phone }
    });
    
    if (!visitor) {
      visitor = await vmsDb.visitor.create({
        data: {
          companyId,
          visitorCode: generateVisitorCode(),
          firstName: request.firstName,
          lastName: request.lastName,
          email: request.email,
          phone: request.phone,
          visitorCompany: request.visitorCompany,
          designation: request.designation,
          idProofType: request.idProofType,
          idProofNumber: request.idProofNumber,
          idProofImage: request.idProofImage,
          photo: request.photo,
          totalVisits: 1,
          lastVisitDate: new Date(),
        }
      });
    } else {
      await vmsDb.visitor.update({
        where: { id: visitor.id },
        data: {
          totalVisits: { increment: 1 },
          lastVisitDate: new Date(),
          // Update photo/ID if provided
          ...(request.photo && { photo: request.photo }),
          ...(request.idProofImage && { idProofImage: request.idProofImage }),
        }
      });
    }
    
    // Create gatepass
    const gatepassNumber = `GP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const validUntil = new Date();
    validUntil.setHours(23, 59, 59, 999); // Valid until end of day
    
    const qrData = JSON.stringify({ gatepassNumber, visitorId: visitor.id });
    const qrCode = await QRCode.toDataURL(qrData);
    
    const gatepass = await vmsDb.gatepass.create({
      data: {
        companyId,
        gatepassNumber,
        visitorId: visitor.id,
        checkInRequestId: id,
        purpose: request.purpose,
        purposeDetails: request.purposeDetails,
        hostName: request.hostName,
        hostDepartment: request.hostDepartment,
        hostPhone: request.hostPhone,
        hostEmail: request.hostEmail,
        expectedDate: new Date(),
        validFrom: new Date(),
        validUntil,
        actualCheckIn: new Date(),
        status: 'ACTIVE',
        qrCode,
        qrCodeData: qrData,
        vehicleNumber: request.vehicleNumber,
        vehicleType: request.vehicleType,
        itemsCarried: request.itemsCarried,
        issuedById: req.user.id,
        approvedById: req.user.id,
      }
    });
    
    // Update check-in request
    const updated = await vmsDb.checkInRequest.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkInAt: new Date(),
        checkInTime: new Date(),
        gatepassId: gatepass.id,
      }
    });
    
    res.json({
      success: true,
      message: 'Visitor checked in successfully',
      request: updated,
      gatepass,
      visitor
    });
  } catch (error) {
    console.error('Mark checked in error:', error);
    res.status(500).json({ message: 'Failed to check in visitor' });
  }
};

// Mark visitor as checked out
exports.markCheckedOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { securityRemarks } = req.body;
    const companyId = req.user.companyId;
    
    const request = await vmsDb.checkInRequest.findFirst({
      where: { id, companyId, status: 'CHECKED_IN' }
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found or not checked in' });
    }
    
    // Update check-in request
    const updated = await vmsDb.checkInRequest.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        checkOutAt: new Date(),
        checkOutTime: new Date(),
      }
    });
    
    // Update gatepass if exists
    if (request.gatepassId) {
      await vmsDb.gatepass.update({
        where: { id: request.gatepassId },
        data: {
          status: 'COMPLETED',
          actualCheckOut: new Date(),
          securityRemarks,
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Visitor checked out successfully',
      request: updated
    });
  } catch (error) {
    console.error('Mark checked out error:', error);
    res.status(500).json({ message: 'Failed to check out visitor' });
  }
};

// Get check-in statistics
exports.getCheckInStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      todayTotal,
      todayPending,
      todayApproved,
      todayCheckedIn,
      todayCheckedOut,
      todayRejected,
      currentlyInside
    ] = await Promise.all([
      vmsDb.checkInRequest.count({
        where: { companyId, submittedAt: { gte: today } }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId, submittedAt: { gte: today }, status: 'PENDING' }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId, submittedAt: { gte: today }, status: 'APPROVED' }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId, submittedAt: { gte: today }, status: 'CHECKED_IN' }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId, submittedAt: { gte: today }, status: 'CHECKED_OUT' }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId, submittedAt: { gte: today }, status: 'REJECTED' }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId, status: 'CHECKED_IN' }
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
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

// Search visitor by phone/name
exports.searchVisitor = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { q } = req.query;
    
    if (!q || q.length < 3) {
      return res.json([]);
    }
    
    const visitors = await vmsDb.visitor.findMany({
      where: {
        companyId,
        OR: [
          { phone: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ]
      },
      take: 10
    });
    
    res.json(visitors);
  } catch (error) {
    console.error('Search visitor error:', error);
    res.status(500).json({ message: 'Failed to search visitors' });
  }
};
