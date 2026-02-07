const vmsDb = require('../../config/vms-prisma');
const QRCode = require('qrcode');
const { v4: uuid } = require('uuid');

// Helper function to generate portal ID
const generatePortalId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'P-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ================================
// PUBLIC OPEN ACCESS ENDPOINTS
// ================================

// Get all recent visitors (open dashboard)
exports.getAllVisitors = async (req, res) => {
  try {
    const { date = 'today', status = 'all', search = '', limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const now = new Date();

    // Build where clause properly for Prisma
    const whereConditions = [];
    
    if (date === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      whereConditions.push({ submittedAt: { gte: startOfDay } });
    } else if (date === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      whereConditions.push({ submittedAt: { gte: startOfWeek } });
    } else if (date === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      whereConditions.push({ submittedAt: { gte: startOfMonth } });
    }
    
    if (status !== 'all') {
      whereConditions.push({ status });
    }
    
    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Fetch visitors
    const visitors = await vmsDb.checkInRequest.findMany({
      where: whereClause,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            displayName: true,
            logo: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: parseInt(limit)
    });
    
    // Get total count separately
    const total = await vmsDb.checkInRequest.count({ where: whereClause });

    // Map visitors to include pass number
    const mappedVisitors = visitors.map(v => ({
      id: v.id,
      visitorName: v.visitorName || `${v.firstName} ${v.lastName}`,
      visitorPhone: v.visitorPhone || v.phone,
      visitorEmail: v.visitorEmail || v.email,
      visitorCompany: v.visitorCompany,
      visitPurpose: v.visitPurpose || v.purpose,
      hostName: v.hostName,
      department: v.department || v.hostDepartment,
      status: v.status,
      requestNumber: v.requestNumber,
      passNumber: v.requestNumber,
      photo: v.photo,
      checkInTime: v.checkInTime || v.checkInAt,
      checkOutTime: v.checkOutTime || v.checkOutAt,
      createdAt: v.submittedAt,
      company: v.company
    }));

    res.json({
      visitors: mappedVisitors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ message: 'Failed to fetch visitors', error: error.message });
  }
};

// Get visitor statistics
exports.getVisitorStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount, currentlyInside, pendingCount, companies] = await Promise.all([
      vmsDb.checkInRequest.count({ where: { submittedAt: { gte: startOfDay } } }),
      vmsDb.checkInRequest.count({ where: { submittedAt: { gte: startOfWeek } } }),
      vmsDb.checkInRequest.count({ where: { submittedAt: { gte: startOfMonth } } }),
      vmsDb.checkInRequest.count({ where: { status: 'CHECKED_IN' } }),
      vmsDb.checkInRequest.count({ where: { status: 'PENDING' } }),
      vmsDb.company.count({ where: { isActive: true } })
    ]);

    res.json({
      today: todayCount,
      week: weekCount,
      month: monthCount,
      currentlyInside,
      pending: pendingCount,
      companies
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
};

// Get pass by pass number or ID
exports.getPassByNumber = async (req, res) => {
  try {
    const { passId } = req.params;

    // Try to find by gatepass number first
    let gatepass = await vmsDb.gatepass.findFirst({
      where: {
        OR: [
          { gatepassNumber: passId },
          { id: passId }
        ]
      },
      include: {
        visitor: true,
        company: {
          select: {
            id: true,
            name: true,
            displayName: true,
            logo: true
          }
        }
      }
    });

    if (gatepass) {
      return res.json({
        id: gatepass.id,
        passNumber: gatepass.gatepassNumber,
        visitorName: gatepass.visitor?.name || gatepass.visitorName,
        visitorPhone: gatepass.visitor?.phone || gatepass.visitorPhone,
        visitorEmail: gatepass.visitor?.email,
        visitPurpose: gatepass.purpose,
        hostName: gatepass.hostName,
        department: gatepass.department,
        status: gatepass.status,
        qrCode: gatepass.qrCode,
        checkInTime: gatepass.checkInTime,
        checkOutTime: gatepass.checkOutTime,
        validDate: gatepass.validFrom,
        expiresAt: gatepass.validUntil,
        createdAt: gatepass.issuedAt,
        company: gatepass.company
      });
    }

    // Try to find by check-in request number
    const checkInRequest = await vmsDb.checkInRequest.findFirst({
      where: {
        OR: [
          { requestNumber: passId },
          { id: passId }
        ]
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            displayName: true,
            logo: true
          }
        },
        gatepass: true
      }
    });

    if (checkInRequest) {
      // Generate QR code if not exists
      let qrCode = checkInRequest.gatepass?.qrCode;
      if (!qrCode) {
        const qrData = JSON.stringify({
          type: 'visitor-pass',
          passNumber: checkInRequest.requestNumber,
          visitorName: checkInRequest.visitorName,
          timestamp: new Date().toISOString()
        });
        qrCode = await QRCode.toDataURL(qrData, { width: 200 });
      }

      return res.json({
        id: checkInRequest.id,
        passNumber: checkInRequest.gatepass?.gatepassNumber || checkInRequest.requestNumber,
        requestNumber: checkInRequest.requestNumber,
        visitorName: checkInRequest.visitorName,
        visitorPhone: checkInRequest.visitorPhone,
        visitorEmail: checkInRequest.visitorEmail,
        visitorCompany: checkInRequest.visitorCompany,
        visitPurpose: checkInRequest.visitPurpose,
        hostName: checkInRequest.hostName,
        department: checkInRequest.department,
        status: checkInRequest.status,
        qrCode: qrCode,
        photo: checkInRequest.photo,
        checkInTime: checkInRequest.checkInTime,
        checkOutTime: checkInRequest.checkOutTime,
        validDate: checkInRequest.submittedAt,
        expiresAt: checkInRequest.expiresAt,
        createdAt: checkInRequest.submittedAt,
        company: checkInRequest.company
      });
    }

    res.status(404).json({ message: 'Pass not found' });
  } catch (error) {
    console.error('Error fetching pass:', error);
    res.status(500).json({ message: 'Failed to fetch pass', error: error.message });
  }
};

// Verify pass (for guards)
exports.verifyPass = async (req, res) => {
  try {
    const { passId } = req.params;

    // Try gatepass first
    let gatepass = await vmsDb.gatepass.findFirst({
      where: {
        OR: [
          { gatepassNumber: passId },
          { id: passId }
        ]
      },
      include: {
        visitor: true,
        company: {
          select: { id: true, name: true, displayName: true }
        }
      }
    });

    if (gatepass) {
      const isValid = ['ACTIVE', 'APPROVED', 'CHECKED_IN'].includes(gatepass.status);
      const isExpired = gatepass.validUntil && new Date(gatepass.validUntil) < new Date();

      return res.json({
        valid: isValid && !isExpired,
        status: gatepass.status,
        passNumber: gatepass.gatepassNumber,
        visitorName: gatepass.visitor?.name || gatepass.visitorName,
        visitorPhone: gatepass.visitor?.phone || gatepass.visitorPhone,
        company: gatepass.company?.displayName || gatepass.company?.name,
        checkInTime: gatepass.checkInTime,
        message: isExpired ? 'Pass has expired' : isValid ? 'Valid pass' : 'Invalid pass status'
      });
    }

    // Try check-in request
    const checkInRequest = await vmsDb.checkInRequest.findFirst({
      where: {
        OR: [
          { requestNumber: passId },
          { id: passId }
        ]
      },
      include: {
        company: {
          select: { id: true, name: true, displayName: true }
        }
      }
    });

    if (checkInRequest) {
      const isValid = ['APPROVED', 'CHECKED_IN', 'PENDING'].includes(checkInRequest.status);
      const isExpired = checkInRequest.expiresAt && new Date(checkInRequest.expiresAt) < new Date();

      return res.json({
        valid: isValid && !isExpired,
        status: checkInRequest.status,
        passNumber: checkInRequest.requestNumber,
        visitorName: checkInRequest.visitorName,
        visitorPhone: checkInRequest.visitorPhone,
        company: checkInRequest.company?.displayName || checkInRequest.company?.name,
        checkInTime: checkInRequest.checkInTime,
        message: isExpired ? 'Request has expired' : isValid ? 'Valid request' : 'Invalid request status'
      });
    }

    res.json({
      valid: false,
      message: 'Pass not found in system'
    });
  } catch (error) {
    console.error('Error verifying pass:', error);
    res.status(500).json({ message: 'Failed to verify pass', error: error.message });
  }
};

// ================================
// COMPANY PORTAL ENDPOINTS
// ================================

// Get company portal data
exports.getCompanyPortal = async (req, res) => {
  try {
    const { portalId } = req.params;

    // Find company by portal ID
    const company = await vmsDb.company.findFirst({
      where: {
        OR: [
          { portalId: portalId },
          { code: portalId }
        ]
      },
      select: {
        id: true,
        code: true,
        name: true,
        displayName: true,
        logo: true,
        portalId: true,
        subscriptionActive: true,
        subscriptionPlan: true,
        subscriptionEnd: true,
        isActive: true
      }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company portal not found' });
    }

    // Check subscription status
    if (!company.subscriptionActive) {
      return res.status(403).json({
        subscriptionActive: false,
        company: {
          name: company.name,
          displayName: company.displayName,
          logo: company.logo
        },
        message: 'Subscription is inactive. Contact admin for more.'
      });
    }

    // Get visitors for this company
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [visitors, todayCount, weekCount, monthCount, currentlyInside] = await Promise.all([
      vmsDb.checkInRequest.findMany({
        where: {
          companyId: company.id,
          submittedAt: { gte: startOfDay }
        },
        orderBy: { submittedAt: 'desc' },
        take: 50
      }),
      vmsDb.checkInRequest.count({
        where: { companyId: company.id, submittedAt: { gte: startOfDay } }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId: company.id, submittedAt: { gte: startOfWeek } }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId: company.id, submittedAt: { gte: startOfMonth } }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId: company.id, status: 'CHECKED_IN' }
      })
    ]);

    res.json({
      subscriptionActive: true,
      company: {
        id: company.id,
        name: company.name,
        displayName: company.displayName,
        logo: company.logo,
        portalId: company.portalId,
        subscriptionPlan: company.subscriptionPlan
      },
      visitors: visitors.map(v => ({
        id: v.id,
        visitorName: v.visitorName,
        visitorPhone: v.visitorPhone,
        visitorEmail: v.visitorEmail,
        visitorCompany: v.visitorCompany,
        visitPurpose: v.visitPurpose,
        hostName: v.hostName,
        department: v.department,
        status: v.status,
        passNumber: v.requestNumber,
        checkInTime: v.checkInTime || v.checkInAt,
        checkOutTime: v.checkOutTime || v.checkOutAt,
        createdAt: v.submittedAt
      })),
      stats: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
        currentlyInside
      }
    });
  } catch (error) {
    console.error('Error fetching portal:', error);
    res.status(500).json({ message: 'Failed to fetch portal data', error: error.message });
  }
};

// Get company visitors with filters
exports.getCompanyVisitors = async (req, res) => {
  try {
    const { portalId } = req.params;
    const { date = 'today', status = 'all' } = req.query;

    // Find company
    const company = await vmsDb.company.findFirst({
      where: {
        OR: [
          { portalId: portalId },
          { code: portalId }
        ]
      }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (!company.subscriptionActive) {
      return res.status(403).json({ message: 'Subscription inactive' });
    }

    // Build date filter
    let dateFilter = {};
    const now = new Date();
    if (date === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { submittedAt: { gte: startOfDay } };
    } else if (date === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      dateFilter = { submittedAt: { gte: startOfWeek } };
    } else if (date === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { submittedAt: { gte: startOfMonth } };
    }

    // Build status filter
    let statusFilter = {};
    if (status !== 'all') {
      statusFilter = { status };
    }

    const visitors = await vmsDb.checkInRequest.findMany({
      where: {
        companyId: company.id,
        ...dateFilter,
        ...statusFilter
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Get updated stats
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount, currentlyInside] = await Promise.all([
      vmsDb.checkInRequest.count({ where: { companyId: company.id, submittedAt: { gte: startOfDay } } }),
      vmsDb.checkInRequest.count({ where: { companyId: company.id, submittedAt: { gte: startOfWeek } } }),
      vmsDb.checkInRequest.count({ where: { companyId: company.id, submittedAt: { gte: startOfMonth } } }),
      vmsDb.checkInRequest.count({ where: { companyId: company.id, status: 'CHECKED_IN' } })
    ]);

    res.json({
      visitors: visitors.map(v => ({
        id: v.id,
        visitorName: v.visitorName || `${v.firstName} ${v.lastName}`,
        visitorPhone: v.visitorPhone || v.phone,
        visitorEmail: v.visitorEmail || v.email,
        visitorCompany: v.visitorCompany,
        visitPurpose: v.visitPurpose || v.purpose,
        hostName: v.hostName,
        department: v.department || v.hostDepartment,
        status: v.status,
        passNumber: v.requestNumber,
        checkInTime: v.checkInTime || v.checkInAt,
        checkOutTime: v.checkOutTime || v.checkOutAt,
        createdAt: v.submittedAt
      })),
      stats: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
        currentlyInside
      }
    });
  } catch (error) {
    console.error('Error fetching company visitors:', error);
    res.status(500).json({ message: 'Failed to fetch visitors', error: error.message });
  }
};

// ================================
// ADMIN ENDPOINTS
// ================================

// Toggle company subscription
exports.toggleCompanySubscription = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { active, plan, endDate } = req.body;

    const company = await vmsDb.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const updatedCompany = await vmsDb.company.update({
      where: { id: companyId },
      data: {
        subscriptionActive: active !== undefined ? active : !company.subscriptionActive,
        subscriptionPlan: plan || company.subscriptionPlan,
        subscriptionEnd: endDate ? new Date(endDate) : company.subscriptionEnd,
        subscriptionStart: active && !company.subscriptionStart ? new Date() : company.subscriptionStart
      }
    });

    res.json({
      message: `Subscription ${updatedCompany.subscriptionActive ? 'activated' : 'deactivated'}`,
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        displayName: updatedCompany.displayName,
        subscriptionActive: updatedCompany.subscriptionActive,
        subscriptionPlan: updatedCompany.subscriptionPlan,
        subscriptionEnd: updatedCompany.subscriptionEnd
      }
    });
  } catch (error) {
    console.error('Error toggling subscription:', error);
    res.status(500).json({ message: 'Failed to update subscription', error: error.message });
  }
};

// Get all companies (admin)
exports.getAllCompaniesAdmin = async (req, res) => {
  try {
    const companies = await vmsDb.company.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        displayName: true,
        logo: true,
        portalId: true,
        subscriptionActive: true,
        subscriptionPlan: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        maxVisitorsPerMonth: true,
        maxUsers: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            checkInRequests: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      companies: companies.map(c => ({
        ...c,
        userCount: c._count.users,
        visitorCount: c._count.checkInRequests
      }))
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
  }
};

// Generate portal ID for company
exports.generatePortalId = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await vmsDb.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const newPortalId = generatePortalId();

    const updatedCompany = await vmsDb.company.update({
      where: { id: companyId },
      data: { portalId: newPortalId }
    });

    res.json({
      message: 'Portal ID generated',
      portalId: updatedCompany.portalId,
      portalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vms/portal/${updatedCompany.portalId}`
    });
  } catch (error) {
    console.error('Error generating portal ID:', error);
    res.status(500).json({ message: 'Failed to generate portal ID', error: error.message });
  }
};

// Update company settings
exports.updateCompanySettings = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { 
      name, 
      displayName, 
      logo, 
      maxVisitorsPerMonth, 
      maxUsers, 
      subscriptionPlan,
      subscriptionActive,
      subscriptionEnd,
      isActive 
    } = req.body;

    const updatedCompany = await vmsDb.company.update({
      where: { id: companyId },
      data: {
        ...(name && { name }),
        ...(displayName && { displayName }),
        ...(logo && { logo }),
        ...(maxVisitorsPerMonth && { maxVisitorsPerMonth }),
        ...(maxUsers && { maxUsers }),
        ...(subscriptionPlan && { subscriptionPlan }),
        ...(subscriptionActive !== undefined && { subscriptionActive }),
        ...(subscriptionEnd && { subscriptionEnd: new Date(subscriptionEnd) }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      message: 'Company updated',
      company: updatedCompany
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ message: 'Failed to update company', error: error.message });
  }
};
