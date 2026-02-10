// VMS Company Settings Controller
// Handles company-specific settings including approval-based gatepass feature
const vmsPrisma = require('../../config/vms-prisma');

// Get all VMS companies with settings
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await vmsPrisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            visitors: true,
            gatepasses: true,
          },
        },
      },
    });
    
    res.json({
      success: true,
      companies: companies.map(c => ({
        ...c,
        totalVisitors: c._count.visitors,
        totalGatepasses: c._count.gatepasses,
      })),
    });
  } catch (error) {
    console.error('Error fetching VMS companies:', error);
    res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
  }
};

// Get company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const company = await vmsPrisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            visitors: true,
            gatepasses: true,
            users: true,
          },
        },
        departments: true,
      },
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json({
      success: true,
      company: {
        ...company,
        totalVisitors: company._count.visitors,
        totalGatepasses: company._count.gatepasses,
        totalUsers: company._count.users,
      },
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ message: 'Failed to fetch company', error: error.message });
  }
};

// Get company by name (for visitor registration flow)
exports.getCompanyByName = async (req, res) => {
  try {
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);
    
    const company = await vmsPrisma.company.findFirst({
      where: { 
        OR: [
          { name: decodedName },
          { displayName: decodedName },
        ]
      },
    });
    
    // Return settings even if company not found (use defaults)
    if (!company) {
      return res.json({
        success: true,
        company: null,
        settings: {
          requireGatepassApproval: true, // Default: require approval
          autoApprove: false,
          requireIdProof: true,
          requirePhoto: true,
        },
      });
    }
    
    res.json({
      success: true,
      company: {
        id: company.id,
        code: company.code,
        name: company.name,
        displayName: company.displayName,
      },
      settings: {
        requireGatepassApproval: company.requireGatepassApproval,
        autoApprove: company.autoApprove,
        requireIdProof: company.requireIdProof,
        requirePhoto: company.requirePhoto,
      },
    });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({ message: 'Failed to fetch company settings', error: error.message });
  }
};

// Get company by code (for QR check-in)
exports.getCompanyByCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    const company = await vmsPrisma.company.findUnique({
      where: { code },
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json({
      success: true,
      company: {
        id: company.id,
        code: company.code,
        name: company.name,
        displayName: company.displayName,
        logo: company.logo,
        welcomeMessage: company.welcomeMessage,
        primaryColor: company.primaryColor,
      },
      settings: {
        requireGatepassApproval: company.requireGatepassApproval,
        autoApprove: company.autoApprove,
        requireIdProof: company.requireIdProof,
        requirePhoto: company.requirePhoto,
      },
    });
  } catch (error) {
    console.error('Error fetching company by code:', error);
    res.status(500).json({ message: 'Failed to fetch company', error: error.message });
  }
};

// Create new company with settings
exports.createCompany = async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      logo,
      address,
      phone,
      email,
      website,
      requireGatepassApproval = true, // Default: require approval
      autoApprove = false,
      requireIdProof = true,
      requirePhoto = true,
      notifyHost = true,
    } = req.body;
    
    // Generate unique code
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) + 
                 '-' + Date.now().toString(36).toUpperCase();
    
    // Check if company already exists
    const existing = await vmsPrisma.company.findFirst({
      where: { 
        OR: [
          { name },
          { code },
        ]
      },
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Company with this name already exists' });
    }
    
    const company = await vmsPrisma.company.create({
      data: {
        code,
        name,
        displayName: displayName || name,
        description,
        logo,
        address,
        phone,
        email,
        website,
        requireGatepassApproval,
        autoApprove,
        requireIdProof,
        requirePhoto,
        notifyHost,
      },
    });
    
    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      company,
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Failed to create company', error: error.message });
  }
};

// Update company settings
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.code;
    delete updateData.createdAt;
    
    const company = await vmsPrisma.company.update({
      where: { id },
      data: updateData,
    });
    
    res.json({
      success: true,
      message: 'Company updated successfully',
      company,
    });
  } catch (error) {
    console.error('Error updating company:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.status(500).json({ message: 'Failed to update company', error: error.message });
  }
};

// Toggle approval requirement for a company
// This is the main feature: enable/disable approval-based gatepass
exports.toggleApprovalRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { requireGatepassApproval } = req.body;
    
    if (typeof requireGatepassApproval !== 'boolean') {
      return res.status(400).json({ message: 'requireGatepassApproval must be a boolean' });
    }
    
    const company = await vmsPrisma.company.update({
      where: { id },
      data: {
        requireGatepassApproval,
        // If no approval required, auto-approve can be true
        autoApprove: !requireGatepassApproval,
      },
    });
    
    // Log the change
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: requireGatepassApproval ? 'ENABLE_APPROVAL' : 'DISABLE_APPROVAL',
        entity: 'company',
        entityId: company.id,
        newValue: JSON.stringify({ requireGatepassApproval }),
      },
    });
    
    res.json({
      success: true,
      message: requireGatepassApproval 
        ? `Approval-based gatepass enabled for ${company.displayName}. Visitors will need approval before getting gatepass.`
        : `Approval-based gatepass disabled for ${company.displayName}. Visitors can directly get gatepass (like Vodafone).`,
      company,
    });
  } catch (error) {
    console.error('Error toggling approval:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.status(500).json({ message: 'Failed to toggle approval setting', error: error.message });
  }
};

// Delete company
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if company has visitors or gatepasses
    const company = await vmsPrisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            visitors: true,
            gatepasses: true,
          },
        },
      },
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    if (company._count.visitors > 0 || company._count.gatepasses > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete company with visitors or gatepasses. Deactivate instead.',
        visitorCount: company._count.visitors,
        gatepassCount: company._count.gatepasses,
      });
    }
    
    await vmsPrisma.company.delete({
      where: { id },
    });
    
    res.json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: 'Failed to delete company', error: error.message });
  }
};

// Sync companies from visitor registration list
// This creates Company records for all companies in the frontend list
exports.syncCompanies = async (req, res) => {
  try {
    const { companies } = req.body;
    
    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ message: 'Companies array is required' });
    }
    
    const results = {
      created: 0,
      existing: 0,
      skipped: 0,
    };
    
    for (const companyName of companies) {
      // Skip "Other" option
      if (companyName === 'Other') {
        results.skipped++;
        continue;
      }
      
      // Check if company exists
      const existing = await vmsPrisma.company.findFirst({
        where: { 
          OR: [
            { name: companyName },
            { displayName: companyName },
          ]
        },
      });
      
      if (existing) {
        results.existing++;
      } else {
        // Generate unique code
        const code = companyName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) + 
                     '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        
        await vmsPrisma.company.create({
          data: {
            code,
            name: companyName,
            displayName: companyName,
            requireGatepassApproval: true, // Default: require approval
            autoApprove: false,
            notifyHost: true,
            isActive: true,
          },
        });
        results.created++;
      }
    }
    
    res.json({
      success: true,
      message: `Synced companies: ${results.created} created, ${results.existing} already exist, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    console.error('Error syncing companies:', error);
    res.status(500).json({ message: 'Failed to sync companies', error: error.message });
  }
};

// Get companies with approval settings for admin view
exports.getCompaniesWithApprovalSettings = async (req, res) => {
  try {
    const companies = await vmsPrisma.company.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        displayName: true,
        requireGatepassApproval: true,
        autoApprove: true,
        isActive: true,
        _count: {
          select: {
            visitors: true,
            gatepasses: true,
          },
        },
      },
    });
    
    res.json({
      success: true,
      companies: companies.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        displayName: c.displayName,
        requireGatepassApproval: c.requireGatepassApproval,
        autoApprove: c.autoApprove,
        isActive: c.isActive,
        totalVisitors: c._count.visitors,
        totalGatepasses: c._count.gatepasses,
        approvalStatus: c.requireGatepassApproval ? 'Requires Approval' : 'Direct Gatepass',
      })),
    });
  } catch (error) {
    console.error('Error fetching companies with approval settings:', error);
    res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
  }
};

// Bulk update approval settings
exports.bulkUpdateApprovalSettings = async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ message: 'Updates array is required' });
    }
    
    const results = [];
    
    for (const update of updates) {
      const { companyId, requireGatepassApproval } = update;
      
      if (!companyId || typeof requireGatepassApproval !== 'boolean') {
        results.push({ companyId, success: false, error: 'Invalid data' });
        continue;
      }
      
      try {
        const company = await vmsPrisma.company.update({
          where: { id: companyId },
          data: {
            requireGatepassApproval,
            autoApprove: !requireGatepassApproval,
          },
        });
        results.push({ companyId, success: true, companyName: company.displayName });
      } catch (err) {
        results.push({ companyId, success: false, error: err.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `Updated ${successCount} companies, ${failCount} failed`,
      results,
    });
  } catch (error) {
    console.error('Error bulk updating approval settings:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};
