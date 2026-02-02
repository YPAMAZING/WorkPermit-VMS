// VMS Pre-approved Visitors Controller
const vmsPrisma = require('../../config/vms-prisma');
const { v4: uuidv4 } = require('uuid');

// Get all pre-approved visitors with pagination and filters
exports.getPreApprovedVisitors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      hostName,
      sortBy = 'approvedAt',
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
        { hostName: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (hostName) {
      where.hostName = { contains: hostName };
    }

    // Get entries with pagination
    const [entries, total] = await Promise.all([
      vmsPrisma.preApprovedVisitor.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          visitor: {
            select: {
              id: true,
              photo: true,
              visitorCode: true,
            },
          },
          approvedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      vmsPrisma.preApprovedVisitor.count({ where }),
    ]);

    res.json({
      entries: entries.map(e => ({
        ...e,
        approvedByName: e.approvedBy ? `${e.approvedBy.firstName} ${e.approvedBy.lastName}` : null,
        visitorPhoto: e.visitor?.photo,
        visitorCode: e.visitor?.visitorCode,
      })),
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

    const entry = await vmsPrisma.preApprovedVisitor.findUnique({
      where: { id },
      include: {
        visitor: true,
        approvedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!entry) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Get pre-approved visitor error:', error);
    res.status(500).json({ message: 'Failed to get entry', error: error.message });
  }
};

// Check if visitor is pre-approved
exports.checkPreApproval = async (req, res) => {
  try {
    const { phone, visitorId } = req.query;

    const now = new Date();
    const orConditions = [];
    if (phone) orConditions.push({ phone });
    if (visitorId) orConditions.push({ visitorId });

    if (orConditions.length === 0) {
      return res.status(400).json({ message: 'Phone or visitorId is required' });
    }

    const entry = await vmsPrisma.preApprovedVisitor.findFirst({
      where: {
        OR: orConditions,
        status: 'ACTIVE',
        validFrom: { lte: now },
        validUntil: { gte: now },
        OR: [
          { isMultiEntry: true },
          { usedEntries: { lt: vmsPrisma.raw('maxEntries') } },
        ],
      },
      include: {
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (entry) {
      res.json({
        isPreApproved: true,
        entry: {
          id: entry.id,
          hostName: entry.hostName,
          hostDepartment: entry.hostDepartment,
          purpose: entry.purpose,
          visitingArea: entry.visitingArea,
          validUntil: entry.validUntil,
          isMultiEntry: entry.isMultiEntry,
          remainingEntries: entry.maxEntries - entry.usedEntries,
          approvedByName: entry.approvedBy ? `${entry.approvedBy.firstName} ${entry.approvedBy.lastName}` : null,
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
      visitorId,
      firstName,
      lastName,
      phone,
      email,
      company,
      purpose,
      hostName,
      hostDepartment,
      hostPhone,
      hostEmail,
      validFrom,
      validUntil,
      visitingArea,
      isMultiEntry,
      maxEntries,
      remarks,
    } = req.body;

    // Check for existing active pre-approval
    const existing = await vmsPrisma.preApprovedVisitor.findFirst({
      where: {
        phone,
        status: 'ACTIVE',
        validUntil: { gte: new Date() },
      },
    });

    if (existing) {
      return res.status(400).json({
        message: 'An active pre-approval already exists for this visitor',
        existingEntryId: existing.id,
      });
    }

    // Check blacklist
    const blacklistEntry = await vmsPrisma.blacklistEntry.findFirst({
      where: {
        phone,
        isActive: true,
      },
    });

    if (blacklistEntry) {
      return res.status(400).json({
        message: 'Cannot pre-approve a blacklisted visitor',
        reason: blacklistEntry.reason,
      });
    }

    // Create pre-approval
    const entry = await vmsPrisma.preApprovedVisitor.create({
      data: {
        visitorId,
        firstName,
        lastName,
        phone,
        email,
        company,
        purpose,
        hostName,
        hostDepartment,
        hostPhone,
        hostEmail,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        visitingArea,
        isMultiEntry: isMultiEntry || false,
        maxEntries: maxEntries || 1,
        usedEntries: 0,
        status: 'ACTIVE',
        remarks,
        approvedById: req.user?.userId,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'PREAPPROVE_CREATE',
        entity: 'preapproved',
        entityId: entry.id,
        newValue: JSON.stringify(entry),
      },
    });

    res.status(201).json({
      message: 'Pre-approval created successfully',
      entry,
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
      purpose,
      hostName,
      hostDepartment,
      hostPhone,
      hostEmail,
      validFrom,
      validUntil,
      visitingArea,
      isMultiEntry,
      maxEntries,
      remarks,
    } = req.body;

    const existing = await vmsPrisma.preApprovedVisitor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    if (['USED', 'EXPIRED', 'CANCELLED'].includes(existing.status)) {
      return res.status(400).json({ message: 'Cannot update inactive pre-approval' });
    }

    const entry = await vmsPrisma.preApprovedVisitor.update({
      where: { id },
      data: {
        purpose,
        hostName,
        hostDepartment,
        hostPhone,
        hostEmail,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        visitingArea,
        isMultiEntry,
        maxEntries,
        remarks,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'PREAPPROVE_UPDATE',
        entity: 'preapproved',
        entityId: entry.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(entry),
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

    const existing = await vmsPrisma.preApprovedVisitor.findUnique({ where: { id } });
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

    // Increment used entries
    const newUsedEntries = existing.usedEntries + 1;
    const newStatus = existing.isMultiEntry && newUsedEntries < existing.maxEntries 
      ? 'ACTIVE' 
      : 'USED';

    const entry = await vmsPrisma.preApprovedVisitor.update({
      where: { id },
      data: {
        usedEntries: newUsedEntries,
        status: newStatus,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'PREAPPROVE_USE',
        entity: 'preapproved',
        entityId: entry.id,
        newValue: JSON.stringify({ usedEntries: newUsedEntries, status: newStatus }),
      },
    });

    res.json({
      message: 'Pre-approval used successfully',
      entry,
      remainingEntries: existing.maxEntries - newUsedEntries,
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

    const existing = await vmsPrisma.preApprovedVisitor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    if (existing.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Only active pre-approvals can be cancelled' });
    }

    const entry = await vmsPrisma.preApprovedVisitor.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        remarks: existing.remarks 
          ? `${existing.remarks}\n\nCancelled: ${reason || 'No reason provided'}` 
          : `Cancelled: ${reason || 'No reason provided'}`,
      },
    });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'PREAPPROVE_CANCEL',
        entity: 'preapproved',
        entityId: entry.id,
        newValue: JSON.stringify({ reason }),
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

    const existing = await vmsPrisma.preApprovedVisitor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Pre-approved visitor not found' });
    }

    await vmsPrisma.preApprovedVisitor.delete({ where: { id } });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'PREAPPROVE_DELETE',
        entity: 'preapproved',
        entityId: id,
        oldValue: JSON.stringify(existing),
      },
    });

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

    const [
      total,
      active,
      used,
      expired,
      cancelled,
      upcomingToday,
    ] = await Promise.all([
      vmsPrisma.preApprovedVisitor.count(),
      vmsPrisma.preApprovedVisitor.count({ where: { status: 'ACTIVE' } }),
      vmsPrisma.preApprovedVisitor.count({ where: { status: 'USED' } }),
      vmsPrisma.preApprovedVisitor.count({ where: { status: 'EXPIRED' } }),
      vmsPrisma.preApprovedVisitor.count({ where: { status: 'CANCELLED' } }),
      vmsPrisma.preApprovedVisitor.count({
        where: {
          status: 'ACTIVE',
          validFrom: {
            gte: new Date(now.setHours(0, 0, 0, 0)),
            lt: new Date(now.setHours(23, 59, 59, 999)),
          },
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
