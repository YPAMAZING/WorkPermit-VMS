// VMS Visitor Controller
const vmsPrisma = require('../../config/vms-prisma');
const { v4: uuidv4 } = require('uuid');

// Get all visitors with pagination and filters
exports.getVisitors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isBlacklisted,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
        { visitorCode: { contains: search } },
      ];
    }

    if (isBlacklisted !== undefined) {
      where.isBlacklisted = isBlacklisted === 'true';
    }

    // Get visitors with pagination
    const [visitors, total] = await Promise.all([
      vmsPrisma.visitor.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
          _count: {
            select: { gatepasses: true },
          },
        },
      }),
      vmsPrisma.visitor.count({ where }),
    ]);

    res.json({
      visitors: visitors.map(v => ({
        ...v,
        createdByName: v.createdBy ? `${v.createdBy.firstName} ${v.createdBy.lastName}` : null,
        totalGatepasses: v._count.gatepasses,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({ message: 'Failed to get visitors', error: error.message });
  }
};

// Get single visitor by ID
exports.getVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await vmsPrisma.visitor.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        gatepasses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        preApprovals: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    res.json(visitor);
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({ message: 'Failed to get visitor', error: error.message });
  }
};

// Search visitor by phone
exports.searchByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const visitor = await vmsPrisma.visitor.findFirst({
      where: { phone },
      include: {
        gatepasses: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        preApprovals: {
          where: {
            status: 'ACTIVE',
            validUntil: { gte: new Date() },
          },
        },
      },
    });

    // Check blacklist
    const blacklistEntry = await vmsPrisma.blacklistEntry.findFirst({
      where: {
        phone,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (visitor) {
      res.json({
        found: true,
        visitor,
        isBlacklisted: !!blacklistEntry,
        blacklistReason: blacklistEntry?.reason,
      });
    } else if (blacklistEntry) {
      res.json({
        found: false,
        isBlacklisted: true,
        blacklistReason: blacklistEntry.reason,
      });
    } else {
      res.json({ found: false, isBlacklisted: false });
    }
  } catch (error) {
    console.error('Search visitor error:', error);
    res.status(500).json({ message: 'Failed to search visitor', error: error.message });
  }
};

// Create visitor
exports.createVisitor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      designation,
      address,
      idProofType,
      idProofNumber,
      idProofImage,
      photo,
    } = req.body;

    // Check if phone already exists
    const existingVisitor = await vmsPrisma.visitor.findFirst({
      where: { phone },
    });

    if (existingVisitor) {
      return res.status(400).json({
        message: 'Visitor with this phone number already exists',
        existingVisitorId: existingVisitor.id,
      });
    }

    // Check blacklist
    const blacklistEntry = await vmsPrisma.blacklistEntry.findFirst({
      where: {
        OR: [
          { phone },
          { idProofNumber: idProofNumber || undefined },
        ],
        isActive: true,
      },
    });

    if (blacklistEntry) {
      return res.status(400).json({
        message: 'This visitor is blacklisted',
        reason: blacklistEntry.reason,
      });
    }

    // Generate visitor code
    const visitorCode = `VIS-${Date.now().toString(36).toUpperCase()}-${uuidv4().substring(0, 4).toUpperCase()}`;

    const visitor = await vmsPrisma.visitor.create({
      data: {
        visitorCode,
        firstName,
        lastName,
        email,
        phone,
        company,
        designation,
        address,
        idProofType,
        idProofNumber,
        idProofImage,
        photo,
        createdById: req.user?.userId,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'CREATE',
        entity: 'visitor',
        entityId: visitor.id,
        newValue: JSON.stringify(visitor),
      },
    });

    res.status(201).json({
      message: 'Visitor created successfully',
      visitor,
    });
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({ message: 'Failed to create visitor', error: error.message });
  }
};

// Update visitor
exports.updateVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      company,
      designation,
      address,
      idProofType,
      idProofNumber,
      idProofImage,
      photo,
    } = req.body;

    // Get existing visitor
    const existingVisitor = await vmsPrisma.visitor.findUnique({ where: { id } });
    if (!existingVisitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    const visitor = await vmsPrisma.visitor.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        company,
        designation,
        address,
        idProofType,
        idProofNumber,
        idProofImage,
        photo,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'UPDATE',
        entity: 'visitor',
        entityId: visitor.id,
        oldValue: JSON.stringify(existingVisitor),
        newValue: JSON.stringify(visitor),
      },
    });

    res.json({
      message: 'Visitor updated successfully',
      visitor,
    });
  } catch (error) {
    console.error('Update visitor error:', error);
    res.status(500).json({ message: 'Failed to update visitor', error: error.message });
  }
};

// Delete visitor
exports.deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await vmsPrisma.visitor.findUnique({ where: { id } });
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Check if visitor has active gatepasses
    const activeGatepasses = await vmsPrisma.gatepass.count({
      where: {
        visitorId: id,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
      },
    });

    if (activeGatepasses > 0) {
      return res.status(400).json({
        message: 'Cannot delete visitor with active gatepasses',
      });
    }

    await vmsPrisma.visitor.delete({ where: { id } });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'DELETE',
        entity: 'visitor',
        entityId: id,
        oldValue: JSON.stringify(visitor),
      },
    });

    res.json({ message: 'Visitor deleted successfully' });
  } catch (error) {
    console.error('Delete visitor error:', error);
    res.status(500).json({ message: 'Failed to delete visitor', error: error.message });
  }
};

// Get visitor statistics
exports.getVisitorStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalVisitors,
      blacklistedCount,
      newToday,
      frequentVisitors,
    ] = await Promise.all([
      vmsPrisma.visitor.count(),
      vmsPrisma.visitor.count({ where: { isBlacklisted: true } }),
      vmsPrisma.visitor.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      vmsPrisma.visitor.findMany({
        where: { totalVisits: { gte: 5 } },
        orderBy: { totalVisits: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          totalVisits: true,
        },
      }),
    ]);

    res.json({
      totalVisitors,
      blacklistedCount,
      newToday,
      frequentVisitors,
    });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics', error: error.message });
  }
};
