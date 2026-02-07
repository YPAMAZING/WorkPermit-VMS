const vmsDb = require('../../config/vms-prisma');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Generate unique company code
const generateCompanyCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let exists = true;
  
  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await vmsDb.company.findUnique({ where: { code } });
    exists = !!existing;
  }
  
  return code;
};

// Get all companies (super admin)
exports.getAllCompanies = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    
    const [companies, total] = await Promise.all([
      vmsDb.company.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              visitors: true,
              gatepasses: true,
            }
          }
        }
      }),
      vmsDb.company.count({ where })
    ]);
    
    res.json({
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
};

// Get current user's company
exports.getCurrentCompany = async (req, res) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ message: 'User not associated with any company' });
    }
    
    const company = await vmsDb.company.findUnique({
      where: { id: req.user.companyId },
      include: {
        departments: { where: { isActive: true } },
        _count: {
          select: {
            users: true,
            visitors: true,
            gatepasses: true,
            checkInRequests: true,
          }
        }
      }
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Get current company error:', error);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
};

// Get company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check access
    if (!req.user.isSuperAdmin && req.user.companyId !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const company = await vmsDb.company.findUnique({
      where: { id },
      include: {
        departments: { where: { isActive: true } },
        _count: {
          select: {
            users: true,
            visitors: true,
            gatepasses: true,
            checkInRequests: true,
          }
        }
      }
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Get company by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
};

// Create new company
exports.createCompany = async (req, res) => {
  try {
    const {
      name,
      displayName,
      logo,
      address,
      city,
      state,
      country,
      pincode,
      phone,
      email,
      website,
      subscriptionPlan,
      primaryColor,
      welcomeMessage,
      termsAndConditions,
      requireIdProof,
      requirePhoto,
      autoApprove,
    } = req.body;
    
    const code = await generateCompanyCode();
    
    const company = await vmsDb.company.create({
      data: {
        code,
        name,
        displayName: displayName || name,
        logo,
        address,
        city,
        state,
        country,
        pincode,
        phone,
        email,
        website,
        subscriptionPlan: subscriptionPlan || 'FREE',
        subscriptionStart: new Date(),
        primaryColor,
        welcomeMessage,
        termsAndConditions,
        requireIdProof: requireIdProof !== false,
        requirePhoto: requirePhoto !== false,
        autoApprove: autoApprove === true,
      }
    });
    
    // Generate QR code
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vms/visitor-checkin/${code}`;
    const qrCode = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
    
    await vmsDb.company.update({
      where: { id: company.id },
      data: { qrCode, qrCodeUrl: qrUrl }
    });
    
    res.status(201).json({
      ...company,
      qrCode,
      qrCodeUrl: qrUrl
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Failed to create company' });
  }
};

// Update company
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check access
    if (!req.user.isSuperAdmin && req.user.companyId !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const {
      name,
      displayName,
      logo,
      address,
      city,
      state,
      country,
      pincode,
      phone,
      email,
      website,
      primaryColor,
      welcomeMessage,
      termsAndConditions,
      requireIdProof,
      requirePhoto,
      autoApprove,
      notifyOnCheckIn,
      isActive,
    } = req.body;
    
    const company = await vmsDb.company.update({
      where: { id },
      data: {
        name,
        displayName,
        logo,
        address,
        city,
        state,
        country,
        pincode,
        phone,
        email,
        website,
        primaryColor,
        welcomeMessage,
        termsAndConditions,
        requireIdProof,
        requirePhoto,
        autoApprove,
        notifyOnCheckIn,
        isActive,
      }
    });
    
    res.json(company);
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Failed to update company' });
  }
};

// Generate/Regenerate QR code
exports.generateCompanyQR = async (req, res) => {
  try {
    const { id } = req.params;
    
    const company = await vmsDb.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vms/visitor-checkin/${company.code}`;
    const qrCode = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: company.primaryColor || '#000000', light: '#ffffff' }
    });
    
    await vmsDb.company.update({
      where: { id },
      data: { qrCode, qrCodeUrl: qrUrl }
    });
    
    res.json({ qrCode, qrCodeUrl: qrUrl });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
};

// Get company QR code
exports.getCompanyQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    
    const company = await vmsDb.company.findUnique({
      where: { id },
      select: { qrCode: true, qrCodeUrl: true, code: true, name: true }
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ message: 'Failed to fetch QR code' });
  }
};

// Get company statistics
exports.getCompanyStats = async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalVisitors,
      totalGatepasses,
      todayCheckIns,
      pendingRequests,
      activeVisitors,
      monthlyVisits
    ] = await Promise.all([
      vmsDb.visitor.count({ where: { companyId: id } }),
      vmsDb.gatepass.count({ where: { companyId: id } }),
      vmsDb.checkInRequest.count({
        where: { companyId: id, submittedAt: { gte: today } }
      }),
      vmsDb.checkInRequest.count({
        where: { companyId: id, status: 'PENDING' }
      }),
      vmsDb.gatepass.count({
        where: { companyId: id, status: 'ACTIVE' }
      }),
      vmsDb.gatepass.count({
        where: {
          companyId: id,
          issuedAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) }
        }
      })
    ]);
    
    res.json({
      totalVisitors,
      totalGatepasses,
      todayCheckIns,
      pendingRequests,
      activeVisitors,
      monthlyVisits
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

// Get departments
exports.getDepartments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const departments = await vmsDb.department.findMany({
      where: { companyId: id, isActive: true },
      orderBy: { name: 'asc' }
    });
    
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
};

// Create department
exports.createDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, floor, building } = req.body;
    
    const department = await vmsDb.department.create({
      data: { companyId: id, name, floor, building }
    });
    
    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Failed to create department' });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    const { deptId } = req.params;
    const { name, floor, building, isActive } = req.body;
    
    const department = await vmsDb.department.update({
      where: { id: deptId },
      data: { name, floor, building, isActive }
    });
    
    res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Failed to update department' });
  }
};

// Delete department
exports.deleteDepartment = async (req, res) => {
  try {
    const { deptId } = req.params;
    
    await vmsDb.department.update({
      where: { id: deptId },
      data: { isActive: false }
    });
    
    res.json({ message: 'Department deleted' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Failed to delete department' });
  }
};
