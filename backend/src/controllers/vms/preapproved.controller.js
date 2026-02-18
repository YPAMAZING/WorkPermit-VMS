// VMS Pre-approved Visitors Controller
// Uses correct Prisma model names for VMS tables

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateGuestPassNumber } = require('../../utils/passNumberGenerator');

// Helper to generate pass number for display (not stored in DB)
const generateDisplayPassNumber = async () => {
  try {
    return await generateGuestPassNumber(prisma);
  } catch (error) {
    // Fallback format
    const now = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    return `RGDGTLGP ${month} ${year} - ${timestamp}`;
  }
};

// Auto-expire pre-approvals that have passed their validUntil date
const autoExpirePreApprovals = async () => {
  try {
    const now = new Date();
    const result = await prisma.vMSPreApproval.updateMany({
      where: {
        status: 'ACTIVE',
        validUntil: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });
    if (result.count > 0) {
      console.log(`[PreApproved] Auto-expired ${result.count} pre-approval(s)`);
    }
  } catch (error) {
    console.error('Auto-expire pre-approvals error:', error);
  }
};

// Get all pre-approved visitors with pagination and filters
exports.getPreApprovedVisitors = async (req, res) => {
  try {
    // Auto-expire before fetching
    await autoExpirePreApprovals();
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    // COMPANY FILTERING: Non-admin users can only see their company's pre-approvals
    // Admin users (isAdmin = true or no companyId) can see all
    if (req.user && req.user.companyId && !req.user.isAdmin) {
      where.companyId = req.user.companyId;
    }

    if (search) {
      where.OR = [
        { visitorName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { companyFrom: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Get entries with pagination
    const [entries, total] = await Promise.all([
      prisma.vMSPreApproval.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.vMSPreApproval.count({ where }),
    ]);

    // Fetch company data separately (no relation in schema)
    const companyIds = [...new Set(entries.map(e => e.companyId).filter(Boolean))];
    const companies = companyIds.length > 0 ? await prisma.vMSCompany.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true, displayName: true, logo: true }
    }) : [];
    const companyMap = new Map(companies.map(c => [c.id, c]));

    // Use stored pass numbers, or generate fallback for old entries
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    res.json({
      entries: entries.map((e, index) => {
        // Use stored pass number if available, otherwise generate fallback
        let passNumber = e.passNumber;
        if (!passNumber) {
          const createdDate = new Date(e.createdAt);
          const month = months[createdDate.getMonth()];
          const year = createdDate.getFullYear();
          passNumber = `RGDGTLGP ${month} ${year} - ${String(e.id.substring(0, 4)).toUpperCase()}`;
        }
        const company = companyMap.get(e.companyId);
        
        return {
          id: e.id,
          passNumber,
          approvalCode: passNumber,
          visitorName: e.visitorName,
          phone: e.phone,
          email: e.email,
          companyFrom: e.companyFrom,
          companyId: e.companyId,
          companyName: company?.displayName || company?.name,
          purpose: e.purpose,
          validFrom: e.validFrom,
          validUntil: e.validUntil,
          status: e.status,
          usedAt: e.usedAt,
          sharedVia: e.sharedVia,
          sharedAt: e.sharedAt,
          createdAt: e.createdAt,
          createdBy: e.createdBy,
        };
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get pre-approved visitors error:', error);
    res.status(500).json({ message: 'Failed to get pre-approved visitors', error: error.message });
  }
};

// Get single pre-approved visitor
exports.getPreApprovedVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.vMSPreApproval.findUnique({
      where: { id },
    });

    if (!entry) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    // Fetch company name separately (no relation in schema)
    let companyName = null;
    if (entry.companyId) {
      try {
        const company = await prisma.vMSCompany.findUnique({
          where: { id: entry.companyId },
          select: { name: true, displayName: true }
        });
        companyName = company?.displayName || company?.name || null;
      } catch (e) {
        console.log('Could not fetch company data:', e.message);
      }
    }

    // Generate pass number for display (use stored one if available, otherwise generate)
    let passNumber = entry.passNumber;
    if (!passNumber) {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const createdDate = new Date(entry.createdAt);
      const month = months[createdDate.getMonth()];
      const year = createdDate.getFullYear();
      passNumber = `RGDGTLGP ${month} ${year} - ${String(entry.id.substring(0, 4)).toUpperCase()}`;
    }

    res.json({
      ...entry,
      companyName,
      passNumber,
      approvalCode: passNumber
    });
  } catch (error) {
    console.error('Get pre-approved visitor error:', error);
    res.status(500).json({ message: 'Failed to get entry', error: error.message });
  }
};

// Check if visitor is pre-approved
exports.checkPreApproval = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ message: 'Phone is required' });
    }

    const now = new Date();
    const entry = await prisma.vMSPreApproval.findFirst({
      where: {
        phone,
        status: 'ACTIVE',
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    });

    if (entry) {
      res.json({
        isPreApproved: true,
        entry: {
          id: entry.id,
          visitorName: entry.visitorName,
          purpose: entry.purpose,
          validUntil: entry.validUntil,
          companyId: entry.companyId,
        },
      });
    } else {
      res.json({ isPreApproved: false });
    }
  } catch (error) {
    console.error('Check pre-approval error:', error);
    res.status(500).json({ message: 'Failed to check pre-approval', error: error.message });
  }
};

// Create pre-approved visitor
exports.createPreApprovedVisitor = async (req, res) => {
  try {
    const {
      visitorName,
      phone,
      email,
      companyFrom,
      companyId,
      personToMeet,
      purpose,
      validFrom,
      validUntil,
      remarks,
    } = req.body;

    // Validation
    if (!visitorName || !phone || !companyId || !purpose || !validFrom || !validUntil) {
      return res.status(400).json({ 
        message: 'Missing required fields: visitorName, phone, companyId, purpose, validFrom, validUntil' 
      });
    }

    // Check for existing active pre-approval with same phone
    const existing = await prisma.vMSPreApproval.findFirst({
      where: {
        phone: phone.replace(/\D/g, ''),
        status: 'ACTIVE',
        validUntil: { gte: new Date() },
      },
    });

    if (existing) {
      return res.status(400).json({
        message: 'An active pre-approval already exists for this phone number',
        existingEntryId: existing.id,
      });
    }

    // Generate pass number for this pre-approval
    const passNumber = await generateDisplayPassNumber();

    // Create pre-approval with stored pass number
    const entry = await prisma.vMSPreApproval.create({
      data: {
        passNumber, // Store the pass number in database
        visitorName,
        phone: phone.replace(/\D/g, ''),
        email: email || null,
        companyFrom: companyFrom || null,
        companyId,
        personToMeet: personToMeet || null,
        purpose,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        status: 'ACTIVE',
        createdBy: req.user?.userId || 'system',
      }
    });

    // Fetch company data separately (no relation in schema)
    let companyData = null;
    try {
      companyData = await prisma.vMSCompany.findUnique({
        where: { id: companyId },
        select: { name: true, displayName: true, logo: true }
      });
    } catch (e) {
      console.log('Could not fetch company data:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Pre-approval created successfully',
      entry: {
        ...entry,
        passNumber, // Include generated pass number
        company: companyData
      },
      preApproval: {
        id: entry.id,
        approvalCode: passNumber,
        passNumber,
        visitorName: entry.visitorName,
        phone: entry.phone,
        email: entry.email,
        companyFrom: entry.companyFrom,
        companyId: entry.companyId,
        companyToVisit: companyData?.displayName || companyData?.name,
        purpose: entry.purpose,
        validFrom: entry.validFrom,
        validUntil: entry.validUntil,
        status: entry.status,
        createdAt: entry.createdAt,
      }
    });
  } catch (error) {
    console.error('Create pre-approved visitor error:', error);
    res.status(500).json({ message: 'Failed to create pre-approval', error: error.message });
  }
};

// Update pre-approved visitor
exports.updatePreApprovedVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      visitorName,
      phone,
      email,
      companyFrom,
      purpose,
      validFrom,
      validUntil,
    } = req.body;

    const existing = await prisma.vMSPreApproval.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    if (['USED', 'EXPIRED', 'CANCELLED'].includes(existing.status)) {
      return res.status(400).json({ message: 'Cannot update inactive pre-approval' });
    }

    const entry = await prisma.vMSPreApproval.update({
      where: { id },
      data: {
        visitorName,
        phone: phone ? phone.replace(/\D/g, '') : undefined,
        email,
        companyFrom,
        purpose,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
      },
    });

    res.json({
      message: 'Pre-approval updated successfully',
      entry,
    });
  } catch (error) {
    console.error('Update pre-approved visitor error:', error);
    res.status(500).json({ message: 'Failed to update pre-approval', error: error.message });
  }
};

// Use pre-approval (when visitor arrives)
exports.usePreApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.vMSPreApproval.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    if (existing.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Pre-approval is not active' });
    }

    const now = new Date();
    if (now < new Date(existing.validFrom) || now > new Date(existing.validUntil)) {
      return res.status(400).json({ message: 'Pre-approval is not valid at this time' });
    }

    const entry = await prisma.vMSPreApproval.update({
      where: { id },
      data: {
        status: 'USED',
        usedAt: now,
      },
    });

    res.json({
      message: 'Pre-approval used successfully',
      entry,
    });
  } catch (error) {
    console.error('Use pre-approval error:', error);
    res.status(500).json({ message: 'Failed to use pre-approval', error: error.message });
  }
};

// Cancel pre-approval
exports.cancelPreApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await prisma.vMSPreApproval.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    if (existing.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Only active pre-approvals can be cancelled' });
    }

    const entry = await prisma.vMSPreApproval.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    res.json({
      message: 'Pre-approval cancelled successfully',
      entry,
    });
  } catch (error) {
    console.error('Cancel pre-approval error:', error);
    res.status(500).json({ message: 'Failed to cancel pre-approval', error: error.message });
  }
};

// Delete pre-approved visitor
exports.deletePreApprovedVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.vMSPreApproval.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    await prisma.vMSPreApproval.delete({ where: { id } });

    res.json({ message: 'Pre-approval deleted successfully' });
  } catch (error) {
    console.error('Delete pre-approved visitor error:', error);
    res.status(500).json({ message: 'Failed to delete pre-approval', error: error.message });
  }
};

// Get pre-approval statistics
exports.getPreApprovalStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // COMPANY FILTERING: Non-admin users can only see their company's stats
    const companyFilter = {};
    if (req.user && req.user.companyId && !req.user.isAdmin) {
      companyFilter.companyId = req.user.companyId;
    }

    const [
      total,
      active,
      used,
      expired,
      cancelled,
      upcomingToday,
    ] = await Promise.all([
      prisma.vMSPreApproval.count({ where: companyFilter }),
      prisma.vMSPreApproval.count({ where: { ...companyFilter, status: 'ACTIVE' } }),
      prisma.vMSPreApproval.count({ where: { ...companyFilter, status: 'USED' } }),
      prisma.vMSPreApproval.count({ 
        where: { 
          ...companyFilter,
          status: 'ACTIVE',
          validUntil: { lt: now }
        } 
      }),
      prisma.vMSPreApproval.count({ where: { ...companyFilter, status: 'CANCELLED' } }),
      prisma.vMSPreApproval.count({
        where: {
          ...companyFilter,
          status: 'ACTIVE',
          validFrom: { lte: tomorrow },
          validUntil: { gte: today },
        },
      }),
    ]);

    res.json({
      total,
      active,
      used,
      expired,
      cancelled,
      upcomingToday,
    });
  } catch (error) {
    console.error('Get pre-approval stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics', error: error.message });
  }
};
