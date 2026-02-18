const vmsPrisma = require('../../config/vms-prisma');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { generateVisitorPassNumber, generateRequestNumber } = require('../../utils/passNumberGenerator');

// Helper to check if user is admin
const isUserAdmin = (user) => {
  if (!user) return false;
  // Check explicit admin flag
  if (user.isAdmin) return true;
  // Check admin roles
  const adminRoles = ['VMS_ADMIN', 'ADMIN', 'admin', 'FIREMAN', 'SUPER_ADMIN'];
  return adminRoles.includes(user.role);
};

// Helper to check if user is company user (can only manage their company's visitors)
const isCompanyUser = (user) => {
  if (!user) return false;
  const companyRoles = ['COMPANY_USER', 'company_user'];
  return companyRoles.includes(user.role) || (user.companyId && !isUserAdmin(user));
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
    console.log('\n========================================');
    console.log('📝 NEW VISITOR SUBMISSION REQUEST');
    console.log('========================================');
    console.log('Request body keys:', Object.keys(req.body));
    
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
    
    console.log('Parsed data:');
    console.log('  - visitorName:', visitorName);
    console.log('  - phone:', phone);
    console.log('  - companyId:', companyId);
    console.log('  - companyCode:', companyCode);
    console.log('  - purpose:', purpose);
    console.log('  - idProofType:', idProofType);
    console.log('  - hasPhoto:', !!photo);
    console.log('  - hasIdDoc:', !!idDocumentImage);
    
    // Validate required fields
    if (!phone || !purpose) {
      console.log('❌ Validation failed: missing phone or purpose');
      return res.status(400).json({ 
        message: 'Missing required fields: phone, purpose' 
      });
    }
    
    // Find company by ID or code
    let company;
    console.log('🔍 Looking for company...');
    if (companyId) {
      console.log('  - Searching by companyId:', companyId);
      company = await vmsPrisma.vMSCompany.findUnique({
        where: { id: companyId }
      });
    } else if (companyCode) {
      console.log('  - Searching by companyCode:', companyCode);
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
      console.log('❌ Company not found');
      return res.status(404).json({ message: 'Invalid company' });
    }
    
    console.log('✅ Company found:', company.id, company.displayName || company.name);
    console.log('   - requireApproval:', company.requireApproval);
    console.log('   - autoApproveVisitors:', company.autoApproveVisitors);
    console.log('   - isActive:', company.isActive);
    
    if (!company.isActive) {
      console.log('❌ Company is inactive');
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
    
    // Check for existing request within 8 hours (PENDING, APPROVED, CHECKED_IN, or REJECTED)
    const existingRequest = await vmsPrisma.vMSVisitor.findFirst({
      where: {
        companyId: company.id,
        phone,
        status: { in: ['PENDING', 'APPROVED', 'CHECKED_IN', 'REJECTED'] },
        createdAt: { gte: new Date(Date.now() - 8 * 60 * 60 * 1000) } // Within 8 hours
      },
      include: {
        gatepass: true,
        company: {
          select: { name: true, displayName: true, logo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (existingRequest) {
      // Generate QR code if approved/checked-in
      let qrCode = null;
      if (existingRequest.gatepass && ['APPROVED', 'CHECKED_IN'].includes(existingRequest.status)) {
        const qrData = JSON.stringify({ 
          gatepassNumber: existingRequest.gatepass.gatepassNumber, 
          visitorId: existingRequest.id 
        });
        qrCode = await QRCode.toDataURL(qrData);
      }
      
      // Return appropriate response based on status
      const statusMessages = {
        'PENDING': 'You already have a pending check-in request. Please wait for approval.',
        'APPROVED': 'Your visit has already been approved! Please show this pass to security.',
        'CHECKED_IN': 'You are already checked in. Show this pass if needed.',
        'REJECTED': 'Your previous request was rejected. Please contact the company or try again later.'
      };
      
      return res.status(200).json({ 
        success: true,
        existingRequest: true,
        message: statusMessages[existingRequest.status],
        status: existingRequest.status,
        visitorId: existingRequest.id,
        requestNumber: existingRequest.gatepass?.gatepassNumber || `RGDGTLRQ-${existingRequest.id.substring(0, 8).toUpperCase()}`,
        visitorName: existingRequest.visitorName,
        phone: existingRequest.phone,
        companyToVisit: existingRequest.companyToVisit,
        personToMeet: existingRequest.personToMeet,
        purpose: existingRequest.purpose,
        photo: existingRequest.photo,
        gatepass: existingRequest.gatepass ? {
          ...existingRequest.gatepass,
          qrCode
        } : null,
        gatepassNumber: existingRequest.gatepass?.gatepassNumber,
        validUntil: existingRequest.gatepass?.validUntil,
        checkInTime: existingRequest.gatepass?.validFrom || existingRequest.checkInTime,
        rejectionReason: existingRequest.rejectionReason,
        submittedAt: existingRequest.createdAt,
        approvedAt: existingRequest.approvedAt
      });
    }
    
    // Determine initial status based on company settings
    let status = 'PENDING';
    if (company.autoApproveVisitors || !company.requireApproval) {
      status = 'APPROVED';
    }
    
    // Check if pre-approved (status 'ACTIVE' means the pre-approval is valid)
    const preApproved = await vmsPrisma.vMSPreApproval.findFirst({
      where: {
        phone,
        status: 'ACTIVE',
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() }
      }
    });
    
    if (preApproved) {
      status = 'APPROVED';
    }
    
    // Construct visitor name
    const fullName = visitorName || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown Visitor';
    
    console.log('📝 Creating visitor record...');
    console.log('   - Name:', fullName);
    console.log('   - Status:', status);
    console.log('   - CompanyId:', company.id);
    
    // Generate request number in the format: RGDGTLRQ MMM YYYY - NNNN
    const formattedRequestNumber = await generateRequestNumber(vmsPrisma);
    
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
        idProofNumber: idProofNumber || '',
        idDocumentImage,
        photo,
        vehicleNumber,
        numberOfVisitors: numberOfVisitors || 1,
        status,
        entryType: preApproved ? 'PRE_APPROVED' : 'WALK_IN',
      }
    });
    
    console.log('   - Request Number:', formattedRequestNumber);
    
    console.log('✅ VISITOR CREATED SUCCESSFULLY!');
    console.log('   - Visitor ID:', visitor.id);
    console.log('   - Status:', visitor.status);
    console.log('   - CompanyId:', visitor.companyId);
    console.log('========================================\n');
    
    // If pre-approved, update used entries (if tracking)
    if (preApproved) {
      // Optional: track usage
    }
    
    // If auto-approved, create gatepass
    let gatepass = null;
    let qrCode = null;
    if (status === 'APPROVED' || status === 'CHECKED_IN') {
      // Generate pass number based on entry type
      // Pre-approved: Use guest pass format (RGDGTLGP)
      // Walk-in: Use visitor pass format (RGDGTLVP)
      const gatepassNumber = await generateVisitorPassNumber(vmsPrisma);
      const qrData = JSON.stringify({ gatepassNumber, visitorId: visitor.id });
      qrCode = await QRCode.toDataURL(qrData);
      
      gatepass = await vmsPrisma.vMSGatepass.create({
        data: {
          gatepassNumber,
          visitorId: visitor.id,
          companyId: company.id,
          validFrom: new Date(),
          validUntil: new Date(new Date().setHours(23, 59, 59, 999)),
          status: 'ACTIVE',
          // Note: qrCode is stored in visitor model, not gatepass
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
      requestNumber: formattedRequestNumber,
      visitorId: visitor.id,
      status,
      gatepass: gatepass ? { ...gatepass, qrCode } : null,
      qrCode,
      message: status === 'APPROVED' 
        ? 'Your visit has been approved! Please show this confirmation to security.'
        : 'Your check-in request has been submitted. Please wait for approval.',
      companyName: company.displayName || company.name,
    });
  } catch (error) {
    console.error('========================================');
    console.error('❌ SUBMIT CHECK-IN REQUEST ERROR');
    console.error('========================================');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.meta) {
      console.error('Error meta:', JSON.stringify(error.meta, null, 2));
    }
    console.error('Full error:', error);
    console.error('========================================');
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
    
    // Generate QR code for approved visitors
    let qrCode = null;
    if (visitor.gatepass && (visitor.status === 'APPROVED' || visitor.status === 'CHECKED_IN')) {
      const qrData = JSON.stringify({ gatepassNumber: visitor.gatepass.gatepassNumber, visitorId: visitor.id });
      qrCode = await QRCode.toDataURL(qrData);
    }
    
    res.json({
      requestNumber: visitor.id,
      status: visitor.status,
      visitorName: visitor.visitorName,
      phone: visitor.phone,
      companyName: visitor.company?.displayName || visitor.company?.name || visitor.companyToVisit,
      companyToVisit: visitor.companyToVisit,
      personToMeet: visitor.personToMeet,
      purpose: visitor.purpose,
      photo: visitor.photo,
      submittedAt: visitor.createdAt,
      approvedAt: visitor.approvedAt,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime,
      rejectionReason: visitor.rejectionReason,
      gatepass: visitor.gatepass ? { ...visitor.gatepass, qrCode } : null,
      gatepassNumber: visitor.gatepass?.gatepassNumber,
      qrCode,
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
    if (companyId && !isUserAdmin(user)) {
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
    if (companyId && !isUserAdmin(user)) {
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
    
    console.log('\\n📋 GET LIVE FEED');
    console.log('User:', user?.email, 'Role:', user?.role, 'CompanyId:', companyId);
    console.log('Is Admin:', isUserAdmin(user), 'Is Company User:', isCompanyUser(user));
    
    const baseWhere = {};
    
    // If user is company-scoped, filter by company
    // IMPORTANT: Company users without companyId should see NO visitors
    if (!isUserAdmin(user)) {
      if (companyId) {
        baseWhere.companyId = companyId;
        console.log('Filtering by companyId:', companyId);
      } else if (isCompanyUser(user)) {
        // Company user role without company assigned - show nothing
        console.log('⚠️ Company user without companyId - showing empty');
        return res.json({
          pending: [],
          approved: [],
          checkedIn: [],
          rejected: [],
          preApproved: [],
          recent: [],
          timestamp: new Date().toISOString(),
          counts: { pending: 0, approved: 0, checkedIn: 0, rejected: 0, preApproved: 0 },
          warning: 'No company assigned to your account. Please contact admin.'
        });
      }
      // Reception/Guard users without companyId can see all visitors
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Build preApproval where clause
    const preApprovalWhere = {
      status: 'ACTIVE',
      validFrom: { lte: new Date() },
      validUntil: { gte: new Date() }
    };
    
    // If user has companyId, filter pre-approvals by company
    if (baseWhere.companyId) {
      preApprovalWhere.companyId = baseWhere.companyId;
    }
    
    const [pending, approved, checkedIn, rejected, preApproved, recent] = await Promise.all([
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
          company: { select: { name: true, displayName: true } },
          gatepass: { select: { gatepassNumber: true, validUntil: true } }
        },
        orderBy: { approvedAt: 'desc' },
        take: 20
      }),
      // Currently inside (checked in but not out)
      vmsPrisma.vMSVisitor.findMany({
        where: { ...baseWhere, status: 'CHECKED_IN' },
        include: {
          company: { select: { name: true, displayName: true } },
          gatepass: { select: { gatepassNumber: true, validUntil: true } }
        },
        orderBy: { checkInTime: 'desc' },
        take: 50
      }),
      // Rejected (today)
      vmsPrisma.vMSVisitor.findMany({
        where: { 
          ...baseWhere, 
          status: 'REJECTED',
          createdAt: { gte: today }
        },
        include: {
          company: { select: { name: true, displayName: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      // Pre-approved visitors (active, valid for today)
      (async () => {
        const preApprovals = await vmsPrisma.vMSPreApproval.findMany({
          where: preApprovalWhere,
          orderBy: { validFrom: 'asc' },
          take: 30
        });
        
        // Fetch company info for each pre-approval
        if (preApprovals.length > 0) {
          const companyIds = [...new Set(preApprovals.map(pa => pa.companyId))];
          const companies = await vmsPrisma.vMSCompany.findMany({
            where: { id: { in: companyIds } },
            select: { id: true, name: true, displayName: true }
          });
          const companyMap = new Map(companies.map(c => [c.id, c]));
          
          return preApprovals.map(pa => ({
            ...pa,
            company: companyMap.get(pa.companyId) || null
          }));
        }
        return preApprovals;
      })(),
      // Recent activity (today)
      vmsPrisma.vMSVisitor.findMany({
        where: {
          ...baseWhere,
          createdAt: { gte: today }
        },
        include: {
          company: { select: { name: true, displayName: true } },
          gatepass: { select: { gatepassNumber: true, validUntil: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ]);
    
    // Format pre-approved entries for display
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const formattedPreApproved = preApproved.map(pa => {
      const createdDate = new Date(pa.createdAt);
      const month = months[createdDate.getMonth()];
      const year = createdDate.getFullYear();
      const passNumber = `RGDGTLGP ${month} ${year} - ${pa.id.substring(0, 4).toUpperCase()}`;
      
      return {
        id: pa.id,
        visitorName: pa.visitorName,
        phone: pa.phone,
        email: pa.email,
        companyFrom: pa.companyFrom,
        companyId: pa.companyId,
        companyToVisit: pa.company?.displayName || pa.company?.name,
        company: pa.company,
        purpose: pa.purpose,
        personToMeet: null,
        status: 'PRE_APPROVED',
        passNumber,
        approvalCode: passNumber,
        validFrom: pa.validFrom,
        validUntil: pa.validUntil,
        createdAt: pa.createdAt,
        entryType: 'PRE_APPROVED'
      };
    });
    
    console.log('📊 Live Feed Results:');
    console.log('   - Pending:', pending.length);
    console.log('   - Approved:', approved.length);
    console.log('   - CheckedIn:', checkedIn.length);
    console.log('   - Rejected:', rejected.length);
    console.log('   - PreApproved:', formattedPreApproved.length);
    console.log('   - Recent:', recent.length);
    if (pending.length > 0) {
      console.log('   - First pending visitor:', pending[0].visitorName, 'CompanyId:', pending[0].companyId);
    }
    
    res.json({
      pending,
      approved,
      checkedIn,
      rejected,
      preApproved: formattedPreApproved,
      recent,
      timestamp: new Date().toISOString(),
      counts: {
        pending: pending.length,
        approved: approved.length,
        checkedIn: checkedIn.length,
        rejected: rejected.length,
        preApproved: formattedPreApproved.length,
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
    if (companyId && !isUserAdmin(user)) {
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
    
    console.log('\n📋 APPROVE REQUEST');
    console.log('Visitor ID:', id);
    console.log('User:', user?.email, 'Role:', user?.role, 'CompanyId:', companyId);
    console.log('Is Admin:', isUserAdmin(user), 'Is Company User:', isCompanyUser(user));
    
    // First, find the visitor without company filter to check if it exists
    const visitorCheck = await vmsPrisma.vMSVisitor.findUnique({ where: { id } });
    
    if (!visitorCheck) {
      console.log('❌ Visitor not found with ID:', id);
      return res.status(404).json({ message: 'Visitor not found' });
    }
    
    console.log('Visitor found:', visitorCheck.visitorName, 'Status:', visitorCheck.status, 'CompanyId:', visitorCheck.companyId);
    
    // Check if already processed
    if (visitorCheck.status !== 'PENDING') {
      console.log('❌ Visitor already processed, status:', visitorCheck.status);
      return res.status(400).json({ message: `Request already ${visitorCheck.status.toLowerCase()}` });
    }
    
    // For company users, verify they can only approve their company's visitors
    if (isCompanyUser(user) && companyId) {
      if (visitorCheck.companyId !== companyId) {
        console.log('❌ Access denied - Company mismatch');
        console.log('User companyId:', companyId, 'Visitor companyId:', visitorCheck.companyId);
        return res.status(403).json({ message: 'Access denied. You can only approve visitors for your company.' });
      }
    }
    
    // For non-admin users without a company, deny access
    if (!isUserAdmin(user) && !companyId) {
      console.log('❌ Access denied - User has no company and is not admin');
      return res.status(403).json({ message: 'Access denied. You do not have permission to approve visitors.' });
    }
    
    const visitor = visitorCheck;
    
    console.log('✅ Permission check passed, approving visitor...');
    
    // Update visitor status
    const updated = await vmsPrisma.vMSVisitor.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user?.userId,
        approvedAt: new Date(),
      }
    });
    
    console.log('✅ Visitor status updated to APPROVED');
    
    // Create gatepass - use the visitor pass number generator
    const gatepassNumber = await generateVisitorPassNumber(vmsPrisma);
    
    // Use visitor's companyId, or user's companyId as fallback
    const gatepassCompanyId = visitor.companyId || companyId;
    
    const gatepass = await vmsPrisma.vMSGatepass.create({
      data: {
        gatepassNumber,
        visitorId: visitor.id,
        companyId: gatepassCompanyId,
        validFrom: new Date(),
        validUntil: new Date(new Date().setHours(23, 59, 59, 999)),
        status: 'ACTIVE',
      }
    });
    
    console.log('✅ Gatepass created:', gatepassNumber);
    
    res.json({
      success: true,
      message: 'Visitor approved for entry',
      visitor: updated,
      gatepass
    });
  } catch (error) {
    console.error('❌ Approve request error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to approve request', error: error.message, details: error.code });
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
    
    console.log('\n📋 REJECT REQUEST');
    console.log('Visitor ID:', id);
    console.log('User:', user?.email, 'Role:', user?.role, 'CompanyId:', companyId);
    
    // First, find the visitor without company filter to check if it exists
    const visitorCheck = await vmsPrisma.vMSVisitor.findUnique({ where: { id } });
    
    if (!visitorCheck) {
      console.log('❌ Visitor not found with ID:', id);
      return res.status(404).json({ message: 'Visitor not found' });
    }
    
    console.log('Visitor found:', visitorCheck.visitorName, 'Status:', visitorCheck.status, 'CompanyId:', visitorCheck.companyId);
    
    // Check if already processed
    if (visitorCheck.status !== 'PENDING') {
      console.log('❌ Visitor already processed, status:', visitorCheck.status);
      return res.status(400).json({ message: `Request already ${visitorCheck.status.toLowerCase()}` });
    }
    
    // For company users, verify they can only reject their company's visitors
    if (isCompanyUser(user) && companyId) {
      if (visitorCheck.companyId !== companyId) {
        console.log('❌ Access denied - Company mismatch');
        console.log('User companyId:', companyId, 'Visitor companyId:', visitorCheck.companyId);
        return res.status(403).json({ message: 'Access denied. You can only reject visitors for your company.' });
      }
    }
    
    // For non-admin users without a company, deny access
    if (!isUserAdmin(user) && !companyId) {
      console.log('❌ Access denied - User has no company and is not admin');
      return res.status(403).json({ message: 'Access denied. You do not have permission to reject visitors.' });
    }
    
    const visitor = visitorCheck;
    
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
// NOTE: Reception and Security Guard can check-in ANY approved visitor
// Company users can only check-in their company's visitors
exports.markCheckedIn = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const companyId = user?.companyId;
    const userRole = user?.role;
    
    console.log('\\n📋 CHECK-IN REQUEST');
    console.log('Visitor ID:', id);
    console.log('User:', user?.email, 'Role:', userRole, 'CompanyId:', companyId);
    
    // Reception and Security Guard roles can check-in ANY visitor
    const canCheckInAll = ['RECEPTION', 'reception', 'RECEPTIONIST', 'SECURITY_GUARD', 'security_guard', 'SECURITY_SUPERVISOR'].includes(userRole) || isUserAdmin(user);
    
    console.log('canCheckInAll:', canCheckInAll);
    
    // First find the visitor
    const visitor = await vmsPrisma.vMSVisitor.findUnique({ where: { id } });
    
    if (!visitor) {
      console.log('❌ Visitor not found');
      return res.status(404).json({ message: 'Visitor not found' });
    }
    
    console.log('Visitor found:', visitor.visitorName, 'Status:', visitor.status);
    
    if (visitor.status !== 'APPROVED') {
      console.log('❌ Visitor not approved, status:', visitor.status);
      return res.status(400).json({ message: `Cannot check-in. Visitor status is ${visitor.status.toLowerCase()}` });
    }
    
    // Company users can only check-in their company's visitors
    if (!canCheckInAll && isCompanyUser(user)) {
      if (!companyId) {
        console.log('❌ Company user without companyId');
        return res.status(403).json({ message: 'Access denied. No company assigned to your account.' });
      }
      if (visitor.companyId !== companyId) {
        console.log('❌ Company mismatch - User:', companyId, 'Visitor:', visitor.companyId);
        return res.status(403).json({ message: 'Access denied. You can only check-in visitors for your company.' });
      }
    }
    
    console.log('✅ Check-in authorized');
    
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
        status: 'USED',
        usedAt: new Date()
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
// NOTE: Reception and Security Guard can check-out ANY visitor
// Company users can only check-out their company's visitors
exports.markCheckedOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { securityRemarks } = req.body;
    const user = req.user;
    const companyId = user?.companyId;
    const userRole = user?.role;
    
    console.log('\\n📋 CHECK-OUT REQUEST');
    console.log('Visitor ID:', id);
    console.log('User:', user?.email, 'Role:', userRole);
    
    // Reception and Security Guard roles can check-out ANY visitor
    const canCheckOutAll = ['RECEPTION', 'reception', 'SECURITY_GUARD', 'security_guard'].includes(userRole) || isUserAdmin(user);
    
    // First find the visitor
    const visitor = await vmsPrisma.vMSVisitor.findUnique({ where: { id } });
    
    if (!visitor) {
      console.log('❌ Visitor not found');
      return res.status(404).json({ message: 'Visitor not found' });
    }
    
    console.log('Visitor found:', visitor.visitorName, 'Status:', visitor.status);
    
    if (visitor.status !== 'CHECKED_IN') {
      console.log('❌ Visitor not checked in, status:', visitor.status);
      return res.status(400).json({ message: `Cannot check-out. Visitor status is ${visitor.status.toLowerCase()}` });
    }
    
    // Company users can only check-out their company's visitors
    if (!canCheckOutAll && isCompanyUser(user)) {
      if (!companyId) {
        console.log('❌ Company user without companyId');
        return res.status(403).json({ message: 'Access denied. No company assigned to your account.' });
      }
      if (visitor.companyId !== companyId) {
        console.log('❌ Company mismatch');
        return res.status(403).json({ message: 'Access denied. You can only check-out visitors for your company.' });
      }
    }
    
    console.log('✅ Check-out authorized');
    
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
    if (companyId && !isUserAdmin(user)) {
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
    if (companyId && !isUserAdmin(user)) {
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

// Debug endpoint - check user and company data
exports.debugUserCompany = async (req, res) => {
  try {
    const user = req.user;
    
    console.log('\n========================================');
    console.log('🔍 DEBUG: User & Company Check');
    console.log('========================================');
    console.log('User from JWT:', {
      userId: user?.userId,
      email: user?.email,
      role: user?.role,
      companyId: user?.companyId,
      isAdmin: user?.isAdmin,
      isCompanyUser: user?.isCompanyUser
    });
    
    // Get user's company details if they have one
    let userCompany = null;
    if (user?.companyId) {
      userCompany = await vmsPrisma.vMSCompany.findUnique({
        where: { id: user.companyId }
      });
      console.log('User Company:', userCompany?.displayName || userCompany?.name, 'ID:', userCompany?.id);
    } else {
      console.log('⚠️ User has NO companyId assigned!');
    }
    
    // Get all companies for reference
    const allCompanies = await vmsPrisma.vMSCompany.findMany({
      select: { id: true, name: true, displayName: true, requireApproval: true, isActive: true }
    });
    console.log('All Companies:', allCompanies.length);
    
    // Get recent visitors for this user's company
    let recentVisitors = [];
    if (user?.companyId) {
      recentVisitors = await vmsPrisma.vMSVisitor.findMany({
        where: { companyId: user.companyId },
        select: { id: true, visitorName: true, phone: true, status: true, companyId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      console.log('Recent Visitors for User Company:', recentVisitors.length);
    }
    
    // Get all recent visitors (for admin view)
    const allRecentVisitors = await vmsPrisma.vMSVisitor.findMany({
      select: { id: true, visitorName: true, phone: true, status: true, companyId: true, companyToVisit: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log('All Recent Visitors:', allRecentVisitors.length);
    
    res.json({
      user: {
        userId: user?.userId,
        email: user?.email,
        role: user?.role,
        companyId: user?.companyId,
        isAdmin: isUserAdmin(user),
        isCompanyUser: isCompanyUser(user)
      },
      userCompany: userCompany ? {
        id: userCompany.id,
        name: userCompany.name,
        displayName: userCompany.displayName,
        requireApproval: userCompany.requireApproval
      } : null,
      allCompanies,
      recentVisitorsForUserCompany: recentVisitors,
      allRecentVisitors,
      diagnosis: {
        hasCompanyId: !!user?.companyId,
        canSeeVisitors: isUserAdmin(user) || !!user?.companyId,
        issue: !user?.companyId && isCompanyUser(user) 
          ? 'Company user has no companyId - will see empty dashboard' 
          : 'OK'
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ message: 'Debug error', error: error.message });
  }
};
