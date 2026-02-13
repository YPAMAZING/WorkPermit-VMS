// VMS Company Settings Controller
// Handles company-specific settings including approval-based visitor feature
const vmsPrisma = require('../../config/vms-prisma');

// Get all VMS companies with settings
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await vmsPrisma.vMSCompany.findMany({
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
        id: c.id,
        name: c.name,
        displayName: c.displayName,
        description: c.description,
        contactPerson: c.contactPerson,
        contactEmail: c.contactEmail,
        contactPhone: c.contactPhone,
        address: c.address,
        logo: c.logo,
        requireApproval: c.requireApproval,
        autoApproveVisitors: c.autoApproveVisitors,
        notifyOnVisitor: c.notifyOnVisitor,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
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
    
    const company = await vmsPrisma.vMSCompany.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            visitors: true,
            gatepasses: true,
            users: true,
          },
        },
      },
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        displayName: company.displayName,
        description: company.description,
        contactPerson: company.contactPerson,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        address: company.address,
        logo: company.logo,
        requireApproval: company.requireApproval,
        autoApproveVisitors: company.autoApproveVisitors,
        notifyOnVisitor: company.notifyOnVisitor,
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
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
    
    const company = await vmsPrisma.vMSCompany.findFirst({
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
          requireApproval: false, // Default: approval OFF (auto-approve)
          autoApproveVisitors: true,
        },
      });
    }
    
    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        displayName: company.displayName,
      },
      settings: {
        requireApproval: company.requireApproval,
        autoApproveVisitors: company.autoApproveVisitors,
      },
    });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({ message: 'Failed to fetch company settings', error: error.message });
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
      contactPerson,
      contactEmail,
      contactPhone,
      address,
      requireApproval = false, // Default: approval OFF (auto-approve)
      autoApproveVisitors = true,
      notifyOnVisitor = true,
    } = req.body;
    
    // Check if company already exists
    const existing = await vmsPrisma.vMSCompany.findFirst({
      where: { 
        OR: [
          { name },
          { displayName: displayName || name },
        ]
      },
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Company with this name already exists' });
    }
    
    const company = await vmsPrisma.vMSCompany.create({
      data: {
        name,
        displayName: displayName || name,
        description,
        logo,
        contactPerson,
        contactEmail,
        contactPhone,
        address,
        requireApproval,
        autoApproveVisitors: !requireApproval ? true : autoApproveVisitors,
        notifyOnVisitor,
        isActive: true,
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
    delete updateData.createdAt;
    
    const company = await vmsPrisma.vMSCompany.update({
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
// This is the main feature: enable/disable approval-based visitor entry
exports.toggleApprovalRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { requireApproval } = req.body;
    
    if (typeof requireApproval !== 'boolean') {
      return res.status(400).json({ message: 'requireApproval must be a boolean' });
    }
    
    const company = await vmsPrisma.vMSCompany.update({
      where: { id },
      data: {
        requireApproval,
        // If no approval required, auto-approve can be true
        autoApproveVisitors: !requireApproval,
      },
    });
    
    // Try to log the change, but don't fail if audit log doesn't exist
    try {
      await vmsPrisma.auditLog.create({
        data: {
          userId: req.user?.userId,
          action: requireApproval ? 'ENABLE_APPROVAL' : 'DISABLE_APPROVAL',
          entity: 'company',
          entityId: company.id,
          newValue: JSON.stringify({ requireApproval }),
        },
      });
    } catch (auditError) {
      console.log('Audit log not available:', auditError.message);
    }
    
    res.json({
      success: true,
      message: requireApproval 
        ? `Approval enabled for ${company.displayName}. Visitors will need approval before entry.`
        : `Approval disabled for ${company.displayName}. Visitors will be auto-approved.`,
      company: {
        id: company.id,
        name: company.name,
        displayName: company.displayName,
        requireApproval: company.requireApproval,
        autoApproveVisitors: company.autoApproveVisitors,
      },
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
    const company = await vmsPrisma.vMSCompany.findUnique({
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
    
    await vmsPrisma.vMSCompany.delete({
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
      const existing = await vmsPrisma.vMSCompany.findFirst({
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
        await vmsPrisma.vMSCompany.create({
          data: {
            name: companyName,
            displayName: companyName,
            requireApproval: false, // Default: approval OFF (auto-approve)
            autoApproveVisitors: true,
            notifyOnVisitor: true,
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
    console.log('Fetching companies with approval settings...');
    
    const companies = await vmsPrisma.vMSCompany.findMany({
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        contactEmail: true,
        contactPhone: true,
        requireApproval: true,
        autoApproveVisitors: true,
        isActive: true,
        _count: {
          select: {
            visitors: true,
            gatepasses: true,
          },
        },
      },
    });
    
    console.log(`Found ${companies.length} companies`);
    
    res.json({
      success: true,
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        displayName: c.displayName,
        contactEmail: c.contactEmail,
        contactPhone: c.contactPhone,
        requireApproval: c.requireApproval ?? false,  // Default to false if undefined
        autoApproveVisitors: c.autoApproveVisitors ?? true,  // Default to true if undefined
        isActive: c.isActive,
        totalVisitors: c._count.visitors,
        totalGatepasses: c._count.gatepasses,
        approvalStatus: c.requireApproval ? 'Requires Approval' : 'Auto-Approve',
      })),
    });
  } catch (error) {
    console.error('Error fetching companies with approval settings:', error);
    res.status(500).json({ 
      message: 'Failed to fetch companies', 
      error: error.message,
      hint: 'Run "npx prisma generate" and "npx prisma db push" on the server'
    });
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
      const { companyId, requireApproval } = update;
      
      if (!companyId || typeof requireApproval !== 'boolean') {
        results.push({ companyId, success: false, error: 'Invalid data' });
        continue;
      }
      
      try {
        const company = await vmsPrisma.vMSCompany.update({
          where: { id: companyId },
          data: {
            requireApproval,
            autoApproveVisitors: !requireApproval,
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

// Get all companies for dropdown selection (public - used in forms)
exports.getCompaniesForDropdown = async (req, res) => {
  try {
    const companies = await vmsPrisma.vMSCompany.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        requireApproval: true,
      },
    });
    
    res.json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error('Error fetching companies for dropdown:', error);
    res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
  }
};

// Predefined list of companies to seed
const DEFAULT_COMPANIES = [
  'Adani Enterprises',
  'Aquity Solutions',
  'AWFIS Solutions Spaces',
  'Azelis',
  'Baker Huges Oilfield Services',
  'Bharat Serum & Vaccines',
  'Birla Management Centre',
  'Brueckner Group India',
  'Clariant Chemicals',
  'Clover Infotech',
  'Covestro',
  'Creative IT',
  'DSP Integrated Services',
  'ECI Telecom',
  'EFC',
  'EFC Office Infra',
  'EFC Office Spaces',
  'EFC Tech Spaces',
  'ESDS',
  'Garmercy Tech Park',
  'Godrej',
  'Hansa Direct',
  'HCL Technologies',
  'Hindustan Fields Services',
  'Holcim Services',
  'Home Credit',
  'Icra',
  'Inchcap Shipping Services',
  'Indian Commodity Exchange',
  'Invenio Business Solution',
  'ISSGF',
  'Jacobs Solutions',
  'Kyndryl Solutions',
  'Lupin',
  'Maersk Global Service Centre',
  'Magic Bus',
  'NMDC Data Centre',
  'Nouryon Chemicals',
  'Quess Corp',
  'RBL Bank',
  'Reliance General Insurance',
  'Rubicon Maritime India',
  'Sify Infinity Spaces',
  'Spocto Business Solutions',
  'Suki Solution',
  'Sulzer Tech',
  'Sutherland Global Services',
  'Taldar Hotels & Resorts',
  'Tata Consulting Engineering',
  'Technics Reunidas',
  'Universal Sompo',
  'Vodafone Idea',
  'Yes Bank',
];

// Seed default companies (admin only)
// POST /api/vms/company-settings/seed-defaults
exports.seedDefaultCompanies = async (req, res) => {
  try {
    console.log('Starting to seed default companies...');
    
    const results = {
      created: 0,
      existing: 0,
      failed: 0,
      companies: [],
      errors: [],
    };

    for (const companyName of DEFAULT_COMPANIES) {
      try {
        // Check if company already exists
        const existing = await vmsPrisma.vMSCompany.findFirst({
          where: {
            OR: [
              { name: companyName },
              { displayName: companyName },
            ],
          },
        });

        if (existing) {
          results.existing++;
          results.companies.push({ name: companyName, status: 'exists', id: existing.id });
          continue;
        }

        // Create the company with minimal fields for better compatibility
        const company = await vmsPrisma.vMSCompany.create({
          data: {
            name: companyName,
            displayName: companyName,
            requireApproval: false,       // Default: approval OFF (auto-approve)
            autoApproveVisitors: true,    // Default: auto-approve enabled
            notifyOnVisitor: true,        // Default: send notifications
            isActive: true,
          },
        });

        results.created++;
        results.companies.push({ name: companyName, status: 'created', id: company.id });
        console.log(`Created company: ${companyName}`);
      } catch (companyError) {
        console.error(`Failed to create company ${companyName}:`, companyError.message);
        results.failed++;
        results.errors.push({ name: companyName, error: companyError.message });
      }
    }

    console.log(`Seeding complete: ${results.created} created, ${results.existing} existing, ${results.failed} failed`);
    
    res.json({
      success: true,
      message: `Seeded ${results.created} companies (${results.existing} already existed, ${results.failed} failed)`,
      results,
    });
  } catch (error) {
    console.error('Error seeding default companies:', error);
    res.status(500).json({ 
      message: 'Failed to seed companies', 
      error: error.message,
      hint: 'Make sure to run "npx prisma generate" and "npx prisma db push" after pulling changes'
    });
  }
};
