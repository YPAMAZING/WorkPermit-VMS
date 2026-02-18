// VMS Employee Pass Controller
// Manages temporary passes for new employees before ID card issuance

const vmsPrisma = require('../../config/vms-prisma');
const QRCode = require('qrcode');

// Generate pass number in format: RGDGTLEP MMM YYYY - XXXX
const generateEmployeePassNumber = async () => {
  const now = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  // Get count of passes this month for sequence number
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const count = await vmsPrisma.vMSEmployeePass.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `RGDGTLEP ${month} ${year} - ${sequence}`;
};

// Generate QR code
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(JSON.stringify(data), {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return null;
  }
};

// Auto-expire passes
const autoExpireEmployeePasses = async () => {
  try {
    const now = new Date();
    const result = await vmsPrisma.vMSEmployeePass.updateMany({
      where: {
        status: 'ACTIVE',
        validUntil: { lt: now }
      },
      data: { status: 'EXPIRED' }
    });
    if (result.count > 0) {
      console.log(`[EmployeePass] Auto-expired ${result.count} pass(es)`);
    }
  } catch (error) {
    console.error('Auto-expire error:', error);
  }
};

// Helper to check if user is admin or reception (can see all companies)
const canSeeAllCompanies = (user) => {
  if (!user) return false;
  if (user.isAdmin) return true;
  // Reception and Security Guard roles can see all companies
  const role = user.role?.toLowerCase() || '';
  return role.includes('reception') || role.includes('security') || role.includes('guard');
};

// Get all employee passes with pagination
exports.getEmployeePasses = async (req, res) => {
  try {
    await autoExpireEmployeePasses();
    
    const {
      page = 1,
      limit = 10,
      search,
      status,
      department,
      companyId: filterCompanyId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    // Company filtering based on user role
    // Admin and Reception can see all, Company users only see their own
    if (!canSeeAllCompanies(req.user)) {
      // Company user - can only see their own company's passes
      if (req.user?.companyId) {
        where.companyId = req.user.companyId;
      }
    } else if (filterCompanyId) {
      // Admin/Reception filtering by specific company
      where.companyId = filterCompanyId;
    }

    if (search) {
      where.OR = [
        { employeeName: { contains: search } },
        { phone: { contains: search } },
        { passNumber: { contains: search } },
        { department: { contains: search } },
        { employeeId: { contains: search } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = { contains: department };
    }

    const [passes, total] = await Promise.all([
      vmsPrisma.vMSEmployeePass.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder }
      }),
      vmsPrisma.vMSEmployeePass.count({ where })
    ]);

    // Fetch company info for all passes
    const companyIds = [...new Set(passes.map(p => p.companyId).filter(Boolean))];
    let companyMap = new Map();
    
    if (companyIds.length > 0) {
      const companies = await vmsPrisma.vMSCompany.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true, displayName: true, logo: true }
      });
      companyMap = new Map(companies.map(c => [c.id, c]));
    }

    // Attach company info to each pass
    const passesWithCompany = passes.map(pass => ({
      ...pass,
      company: companyMap.get(pass.companyId) || null,
      companyName: companyMap.get(pass.companyId)?.displayName || companyMap.get(pass.companyId)?.name || null
    }));

    res.json({
      passes: passesWithCompany,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Get employee passes error:', error);
    res.status(500).json({ message: 'Failed to get employee passes', error: error.message });
  }
};

// Get single employee pass
exports.getEmployeePass = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pass = await vmsPrisma.vMSEmployeePass.findUnique({
      where: { id }
    });

    if (!pass) {
      return res.status(404).json({ message: 'Employee pass not found' });
    }

    // Check access permissions
    if (!canSeeAllCompanies(req.user) && req.user?.companyId && pass.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Access denied to this employee pass' });
    }

    // Fetch company info
    let company = null;
    if (pass.companyId) {
      company = await vmsPrisma.vMSCompany.findUnique({
        where: { id: pass.companyId },
        select: { id: true, name: true, displayName: true, logo: true }
      });
    }

    // Generate QR code for the pass
    const qrCode = await generateQRCode({
      type: 'EMPLOYEE_PASS',
      pn: pass.passNumber,
      id: pass.id,
      t: Date.now()
    });

    res.json({ 
      ...pass, 
      qrCode,
      company,
      companyName: company?.displayName || company?.name || null
    });
  } catch (error) {
    console.error('Get employee pass error:', error);
    res.status(500).json({ message: 'Failed to get employee pass', error: error.message });
  }
};

// Get employee pass by pass number (for QR scan)
exports.getByPassNumber = async (req, res) => {
  try {
    const { passNumber } = req.params;
    
    const pass = await vmsPrisma.vMSEmployeePass.findUnique({
      where: { passNumber }
    });

    if (!pass) {
      return res.status(404).json({ message: 'Employee pass not found' });
    }

    const isExpired = new Date() > new Date(pass.validUntil);
    const isValid = pass.status === 'ACTIVE' && !isExpired;

    res.json({
      ...pass,
      isValid,
      isExpired,
      message: !isValid ? (isExpired ? 'Pass has expired' : 'Pass is not active') : 'Pass is valid'
    });
  } catch (error) {
    console.error('Get by pass number error:', error);
    res.status(500).json({ message: 'Failed to get employee pass', error: error.message });
  }
};

// Create employee pass
exports.createEmployeePass = async (req, res) => {
  try {
    const {
      employeeName,
      phone,
      email,
      photo,
      department,
      designation,
      employeeId,
      joiningDate,
      companyId,
      validFrom,
      validUntil
    } = req.body;

    // Determine companyId - use provided or user's company
    const effectiveCompanyId = companyId || req.user?.companyId;
    
    // Validation
    if (!employeeName || !phone || !department || !validUntil) {
      return res.status(400).json({
        message: 'Missing required fields: employeeName, phone, department, validUntil'
      });
    }

    // Company users must create passes for their own company
    if (!canSeeAllCompanies(req.user) && req.user?.companyId && effectiveCompanyId !== req.user.companyId) {
      return res.status(403).json({
        message: 'You can only create employee passes for your own company'
      });
    }

    // Check for existing active pass with same phone
    const existing = await vmsPrisma.vMSEmployeePass.findFirst({
      where: {
        phone: phone.replace(/\D/g, ''),
        status: 'ACTIVE',
        validUntil: { gte: new Date() }
      }
    });

    if (existing) {
      return res.status(400).json({
        message: 'An active employee pass already exists for this phone number',
        existingPassId: existing.id
      });
    }

    // Generate pass number
    const passNumber = await generateEmployeePassNumber();

    // Create pass
    const pass = await vmsPrisma.vMSEmployeePass.create({
      data: {
        passNumber,
        employeeName,
        phone: phone.replace(/\D/g, ''),
        email: email || null,
        photo: photo || null,
        department,
        designation: designation || null,
        employeeId: employeeId || null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        companyId: effectiveCompanyId || null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: new Date(validUntil),
        status: 'ACTIVE',
        createdBy: req.user?.userId || 'system'
      }
    });

    // Fetch company info for response
    let company = null;
    if (pass.companyId) {
      company = await vmsPrisma.vMSCompany.findUnique({
        where: { id: pass.companyId },
        select: { id: true, name: true, displayName: true, logo: true }
      });
    }

    // Generate QR code
    const qrCode = await generateQRCode({
      type: 'EMPLOYEE_PASS',
      pn: pass.passNumber,
      id: pass.id,
      t: Date.now()
    });

    res.status(201).json({
      success: true,
      message: 'Employee pass created successfully',
      pass: { 
        ...pass, 
        qrCode,
        company,
        companyName: company?.displayName || company?.name || null
      }
    });
  } catch (error) {
    console.error('Create employee pass error:', error);
    res.status(500).json({ message: 'Failed to create employee pass', error: error.message });
  }
};

// Update employee pass
exports.updateEmployeePass = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employeeName,
      phone,
      email,
      photo,
      department,
      designation,
      employeeId,
      joiningDate,
      validUntil
    } = req.body;

    const existing = await vmsPrisma.vMSEmployeePass.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Employee pass not found' });
    }

    if (existing.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Cannot update inactive pass' });
    }

    const pass = await vmsPrisma.vMSEmployeePass.update({
      where: { id },
      data: {
        employeeName: employeeName || undefined,
        phone: phone ? phone.replace(/\D/g, '') : undefined,
        email: email !== undefined ? email : undefined,
        photo: photo !== undefined ? photo : undefined,
        department: department || undefined,
        designation: designation !== undefined ? designation : undefined,
        employeeId: employeeId !== undefined ? employeeId : undefined,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined
      }
    });

    res.json({
      success: true,
      message: 'Employee pass updated successfully',
      pass
    });
  } catch (error) {
    console.error('Update employee pass error:', error);
    res.status(500).json({ message: 'Failed to update employee pass', error: error.message });
  }
};

// Revoke employee pass
exports.revokeEmployeePass = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await vmsPrisma.vMSEmployeePass.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Employee pass not found' });
    }

    if (existing.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Pass is already inactive' });
    }

    const pass = await vmsPrisma.vMSEmployeePass.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: req.user?.userId || 'system',
        revokeReason: reason || null
      }
    });

    res.json({
      success: true,
      message: 'Employee pass revoked successfully',
      pass
    });
  } catch (error) {
    console.error('Revoke employee pass error:', error);
    res.status(500).json({ message: 'Failed to revoke employee pass', error: error.message });
  }
};

// Delete employee pass
exports.deleteEmployeePass = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await vmsPrisma.vMSEmployeePass.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Employee pass not found' });
    }

    await vmsPrisma.vMSEmployeePass.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Employee pass deleted successfully'
    });
  } catch (error) {
    console.error('Delete employee pass error:', error);
    res.status(500).json({ message: 'Failed to delete employee pass', error: error.message });
  }
};

// Mark pass as shared
exports.markAsShared = async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body; // WHATSAPP, EMAIL, SMS

    const pass = await vmsPrisma.vMSEmployeePass.update({
      where: { id },
      data: {
        sharedVia: method || 'WHATSAPP',
        sharedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Pass marked as shared',
      pass
    });
  } catch (error) {
    console.error('Mark as shared error:', error);
    res.status(500).json({ message: 'Failed to update pass', error: error.message });
  }
};

// Get employee pass statistics
exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Company filter based on user role
    const companyFilter = {};
    if (!canSeeAllCompanies(req.user) && req.user?.companyId) {
      companyFilter.companyId = req.user.companyId;
    } else if (req.query.companyId) {
      // Admin/Reception can filter by specific company
      companyFilter.companyId = req.query.companyId;
    }

    const [total, active, expired, revoked, createdToday, expiringThisWeek] = await Promise.all([
      vmsPrisma.vMSEmployeePass.count({ where: companyFilter }),
      vmsPrisma.vMSEmployeePass.count({ where: { ...companyFilter, status: 'ACTIVE' } }),
      vmsPrisma.vMSEmployeePass.count({ where: { ...companyFilter, status: 'EXPIRED' } }),
      vmsPrisma.vMSEmployeePass.count({ where: { ...companyFilter, status: 'REVOKED' } }),
      vmsPrisma.vMSEmployeePass.count({
        where: {
          ...companyFilter,
          createdAt: { gte: today, lt: tomorrow }
        }
      }),
      vmsPrisma.vMSEmployeePass.count({
        where: {
          ...companyFilter,
          status: 'ACTIVE',
          validUntil: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      total,
      active,
      expired,
      revoked,
      createdToday,
      expiringThisWeek
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics', error: error.message });
  }
};
