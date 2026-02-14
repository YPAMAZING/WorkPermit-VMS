const vmsPrisma = require('../../config/vms-prisma');
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
      whereConditions.push({ createdAt: { gte: startOfDay } });
    } else if (date === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      whereConditions.push({ createdAt: { gte: startOfWeek } });
    } else if (date === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      whereConditions.push({ createdAt: { gte: startOfMonth } });
    }
    
    if (status !== 'all') {
      whereConditions.push({ status });
    }
    
    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Fetch visitors using correct model name: vMSVisitor
    const visitors = await vmsPrisma.vMSVisitor.findMany({
      where: whereClause,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            displayName: true,
            logo: true
          }
        },
        gatepass: {
          select: {
            id: true,
            gatepassNumber: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });
    
    // Get total count separately
    const total = await vmsPrisma.vMSVisitor.count({ where: whereClause });

    // Map visitors to expected format
    const mappedVisitors = visitors.map(v => ({
      id: v.id,
      visitorName: v.visitorName,
      visitorPhone: v.phone,
      visitorEmail: v.email,
      visitorCompany: v.companyFrom,
      visitPurpose: v.purpose,
      hostName: v.personToMeet,
      department: null,
      status: v.status,
      requestNumber: v.gatepass?.gatepassNumber || v.id.substring(0, 8).toUpperCase(),
      passNumber: v.gatepass?.gatepassNumber || v.id.substring(0, 8).toUpperCase(),
      photo: v.photo,
      checkInTime: v.checkInTime,
      checkOutTime: v.checkOutTime,
      createdAt: v.createdAt,
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
      vmsPrisma.vMSVisitor.count({ where: { createdAt: { gte: startOfDay } } }),
      vmsPrisma.vMSVisitor.count({ where: { createdAt: { gte: startOfWeek } } }),
      vmsPrisma.vMSVisitor.count({ where: { createdAt: { gte: startOfMonth } } }),
      vmsPrisma.vMSVisitor.count({ where: { status: 'CHECKED_IN' } }),
      vmsPrisma.vMSVisitor.count({ where: { status: 'PENDING' } }),
      vmsPrisma.vMSCompany.count({ where: { isActive: true } })
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
    let gatepass = await vmsPrisma.vMSGatepass.findFirst({
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
        visitorName: gatepass.visitor?.visitorName,
        visitorPhone: gatepass.visitor?.phone,
        visitorEmail: gatepass.visitor?.email,
        visitPurpose: gatepass.visitor?.purpose,
        hostName: gatepass.visitor?.personToMeet,
        department: null,
        status: gatepass.status,
        qrCode: gatepass.qrCode,
        checkInTime: gatepass.visitor?.checkInTime,
        checkOutTime: gatepass.visitor?.checkOutTime,
        validDate: gatepass.validFrom,
        expiresAt: gatepass.validUntil,
        createdAt: gatepass.createdAt,
        company: gatepass.company
      });
    }

    // Try to find by visitor ID
    const visitor = await vmsPrisma.vMSVisitor.findFirst({
      where: {
        OR: [
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

    if (visitor) {
      // Generate QR code if not exists
      let qrCode = visitor.gatepass?.qrCode;
      if (!qrCode) {
        const qrData = JSON.stringify({
          type: 'visitor-pass',
          passNumber: visitor.gatepass?.gatepassNumber || visitor.id.substring(0, 8).toUpperCase(),
          visitorName: visitor.visitorName,
          timestamp: new Date().toISOString()
        });
        qrCode = await QRCode.toDataURL(qrData, { width: 200 });
      }

      return res.json({
        id: visitor.id,
        passNumber: visitor.gatepass?.gatepassNumber || visitor.id.substring(0, 8).toUpperCase(),
        requestNumber: visitor.id.substring(0, 8).toUpperCase(),
        visitorName: visitor.visitorName,
        visitorPhone: visitor.phone,
        visitorEmail: visitor.email,
        visitorCompany: visitor.companyFrom,
        visitPurpose: visitor.purpose,
        hostName: visitor.personToMeet,
        department: null,
        status: visitor.status,
        qrCode: qrCode,
        photo: visitor.photo,
        checkInTime: visitor.checkInTime,
        checkOutTime: visitor.checkOutTime,
        validDate: visitor.createdAt,
        expiresAt: null,
        createdAt: visitor.createdAt,
        company: visitor.company
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
    let gatepass = await vmsPrisma.vMSGatepass.findFirst({
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
        visitorName: gatepass.visitor?.visitorName,
        visitorPhone: gatepass.visitor?.phone,
        company: gatepass.company?.displayName || gatepass.company?.name,
        checkInTime: gatepass.visitor?.checkInTime,
        message: isExpired ? 'Pass has expired' : isValid ? 'Valid pass' : 'Invalid pass status'
      });
    }

    // Try visitor record
    const visitor = await vmsPrisma.vMSVisitor.findFirst({
      where: {
        OR: [
          { id: passId }
        ]
      },
      include: {
        company: {
          select: { id: true, name: true, displayName: true }
        }
      }
    });

    if (visitor) {
      const isValid = ['APPROVED', 'CHECKED_IN', 'PENDING'].includes(visitor.status);

      return res.json({
        valid: isValid,
        status: visitor.status,
        passNumber: visitor.id.substring(0, 8).toUpperCase(),
        visitorName: visitor.visitorName,
        visitorPhone: visitor.phone,
        company: visitor.company?.displayName || visitor.company?.name,
        checkInTime: visitor.checkInTime,
        message: isValid ? 'Valid request' : 'Invalid request status'
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

    // Find company by portal ID or code
    const company = await vmsPrisma.vMSCompany.findFirst({
      where: {
        OR: [
          { id: portalId },
          { name: portalId }
        ],
        isActive: true
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        logo: true,
        isActive: true
      }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company portal not found' });
    }

    // Get visitors for this company
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [visitors, todayCount, weekCount, monthCount, currentlyInside] = await Promise.all([
      vmsPrisma.vMSVisitor.findMany({
        where: {
          companyId: company.id,
          createdAt: { gte: startOfDay }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      vmsPrisma.vMSVisitor.count({
        where: { companyId: company.id, createdAt: { gte: startOfDay } }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { companyId: company.id, createdAt: { gte: startOfWeek } }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { companyId: company.id, createdAt: { gte: startOfMonth } }
      }),
      vmsPrisma.vMSVisitor.count({
        where: { companyId: company.id, status: 'CHECKED_IN' }
      })
    ]);

    res.json({
      subscriptionActive: true,
      company: {
        id: company.id,
        name: company.name,
        displayName: company.displayName,
        logo: company.logo
      },
      visitors: visitors.map(v => ({
        id: v.id,
        visitorName: v.visitorName,
        visitorPhone: v.phone,
        visitorEmail: v.email,
        visitorCompany: v.companyFrom,
        visitPurpose: v.purpose,
        hostName: v.personToMeet,
        department: null,
        status: v.status,
        passNumber: v.id.substring(0, 8).toUpperCase(),
        checkInTime: v.checkInTime,
        checkOutTime: v.checkOutTime,
        createdAt: v.createdAt
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
    const company = await vmsPrisma.vMSCompany.findFirst({
      where: {
        OR: [
          { id: portalId },
          { name: portalId }
        ]
      }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Build date filter
    let dateFilter = {};
    const now = new Date();
    if (date === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { createdAt: { gte: startOfDay } };
    } else if (date === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      dateFilter = { createdAt: { gte: startOfWeek } };
    } else if (date === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { gte: startOfMonth } };
    }

    // Build status filter
    let statusFilter = {};
    if (status !== 'all') {
      statusFilter = { status };
    }

    const visitors = await vmsPrisma.vMSVisitor.findMany({
      where: {
        companyId: company.id,
        ...dateFilter,
        ...statusFilter
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get updated stats
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount, currentlyInside] = await Promise.all([
      vmsPrisma.vMSVisitor.count({ where: { companyId: company.id, createdAt: { gte: startOfDay } } }),
      vmsPrisma.vMSVisitor.count({ where: { companyId: company.id, createdAt: { gte: startOfWeek } } }),
      vmsPrisma.vMSVisitor.count({ where: { companyId: company.id, createdAt: { gte: startOfMonth } } }),
      vmsPrisma.vMSVisitor.count({ where: { companyId: company.id, status: 'CHECKED_IN' } })
    ]);

    res.json({
      visitors: visitors.map(v => ({
        id: v.id,
        visitorName: v.visitorName,
        visitorPhone: v.phone,
        visitorEmail: v.email,
        visitorCompany: v.companyFrom,
        visitPurpose: v.purpose,
        hostName: v.personToMeet,
        department: null,
        status: v.status,
        passNumber: v.id.substring(0, 8).toUpperCase(),
        checkInTime: v.checkInTime,
        checkOutTime: v.checkOutTime,
        createdAt: v.createdAt
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
    const { active } = req.body;

    const company = await vmsPrisma.vMSCompany.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const updatedCompany = await vmsPrisma.vMSCompany.update({
      where: { id: companyId },
      data: {
        isActive: active !== undefined ? active : !company.isActive
      }
    });

    res.json({
      message: `Company ${updatedCompany.isActive ? 'activated' : 'deactivated'}`,
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        displayName: updatedCompany.displayName,
        isActive: updatedCompany.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling subscription:', error);
    res.status(500).json({ message: 'Failed to update company status', error: error.message });
  }
};

// Get all companies (admin)
exports.getAllCompaniesAdmin = async (req, res) => {
  try {
    const companies = await vmsPrisma.vMSCompany.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        logo: true,
        isActive: true,
        requireApproval: true,
        autoApproveVisitors: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            visitors: true,
            gatepasses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      companies: companies.map(c => ({
        ...c,
        userCount: c._count.users,
        visitorCount: c._count.visitors,
        gatepassCount: c._count.gatepasses
      }))
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
  }
};

// Generate portal ID for company (not used with current schema, kept for compatibility)
exports.generatePortalId = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await vmsPrisma.vMSCompany.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Just return the company ID as portal ID since schema doesn't have portalId field
    res.json({
      message: 'Portal ID generated',
      portalId: company.id,
      portalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vms/portal/${company.id}`
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
      requireApproval,
      autoApproveVisitors,
      isActive 
    } = req.body;

    const updatedCompany = await vmsPrisma.vMSCompany.update({
      where: { id: companyId },
      data: {
        ...(name && { name }),
        ...(displayName && { displayName }),
        ...(logo && { logo }),
        ...(requireApproval !== undefined && { requireApproval }),
        ...(autoApproveVisitors !== undefined && { autoApproveVisitors }),
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
