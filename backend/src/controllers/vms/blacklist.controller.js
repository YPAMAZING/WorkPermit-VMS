// VMS Blacklist Controller
const vmsPrisma = require('../../config/vms-prisma');
const { v4: uuidv4 } = require('uuid');

// Get all blacklist entries with pagination and filters
exports.getBlacklist = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      reason,
      isActive,
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
        { idProofNumber: { contains: search } },
      ];
    }

    if (reason) {
      where.reason = reason;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get entries with pagination
    const [entries, total] = await Promise.all([
      vmsPrisma.blacklistEntry.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      vmsPrisma.blacklistEntry.count({ where }),
    ]);

    res.json({
      entries: entries.map(e => ({
        ...e,
        createdByName: e.createdBy ? `${e.createdBy.firstName} ${e.createdBy.lastName}` : null,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get blacklist error:', error);
    res.status(500).json({ message: 'Failed to get blacklist', error: error.message });
  }
};

// Get single blacklist entry
exports.getBlacklistEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await vmsPrisma.blacklistEntry.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!entry) {
      return res.status(404).json({ message: 'Blacklist entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Get blacklist entry error:', error);
    res.status(500).json({ message: 'Failed to get entry', error: error.message });
  }
};

// Check if person is blacklisted
exports.checkBlacklist = async (req, res) => {
  try {
    const { phone, email, idProofNumber } = req.query;

    const orConditions = [];
    if (phone) orConditions.push({ phone });
    if (email) orConditions.push({ email });
    if (idProofNumber) orConditions.push({ idProofNumber });

    if (orConditions.length === 0) {
      return res.status(400).json({ message: 'At least one identifier is required' });
    }

    const entry = await vmsPrisma.blacklistEntry.findFirst({
      where: {
        OR: orConditions,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (entry) {
      res.json({
        isBlacklisted: true,
        reason: entry.reason,
        reasonDetails: entry.reasonDetails,
        incidentDate: entry.incidentDate,
      });
    } else {
      res.json({ isBlacklisted: false });
    }
  } catch (error) {
    console.error('Check blacklist error:', error);
    res.status(500).json({ message: 'Failed to check blacklist', error: error.message });
  }
};

// Add to blacklist
exports.addToBlacklist = async (req, res) => {
  try {
    const {
      visitorId,
      firstName,
      lastName,
      phone,
      email,
      idProofType,
      idProofNumber,
      photo,
      reason,
      reasonDetails,
      incidentDate,
      incidentLocation,
      expiresAt,
    } = req.body;

    // Check if already blacklisted
    const existing = await vmsPrisma.blacklistEntry.findFirst({
      where: {
        OR: [
          phone ? { phone } : undefined,
          idProofNumber ? { idProofNumber } : undefined,
          visitorId ? { visitorId } : undefined,
        ].filter(Boolean),
        isActive: true,
      },
    });

    if (existing) {
      return res.status(400).json({
        message: 'This person is already blacklisted',
        existingEntryId: existing.id,
      });
    }

    // Create blacklist entry
    const entry = await vmsPrisma.blacklistEntry.create({
      data: {
        visitorId,
        firstName,
        lastName,
        phone,
        email,
        idProofType,
        idProofNumber,
        photo,
        reason,
        reasonDetails,
        incidentDate: incidentDate ? new Date(incidentDate) : null,
        incidentLocation,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        createdById: req.user?.userId,
      },
    });

    // If visitorId is provided, update the visitor record
    if (visitorId) {
      await vmsPrisma.visitor.update({
        where: { id: visitorId },
        data: {
          isBlacklisted: true,
          blacklistReason: reason,
        },
      });
    }

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'BLACKLIST_ADD',
        entity: 'blacklist',
        entityId: entry.id,
        newValue: JSON.stringify(entry),
      },
    });

    res.status(201).json({
      message: 'Added to blacklist successfully',
      entry,
    });
  } catch (error) {
    console.error('Add to blacklist error:', error);
    res.status(500).json({ message: 'Failed to add to blacklist', error: error.message });
  }
};

// Update blacklist entry
exports.updateBlacklistEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reason,
      reasonDetails,
      incidentDate,
      incidentLocation,
      expiresAt,
      isActive,
    } = req.body;

    const existing = await vmsPrisma.blacklistEntry.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Blacklist entry not found' });
    }

    const entry = await vmsPrisma.blacklistEntry.update({
      where: { id },
      data: {
        reason,
        reasonDetails,
        incidentDate: incidentDate ? new Date(incidentDate) : undefined,
        incidentLocation,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
      },
    });

    // Update associated visitor if exists
    if (existing.visitorId) {
      await vmsPrisma.visitor.update({
        where: { id: existing.visitorId },
        data: {
          isBlacklisted: isActive ?? true,
          blacklistReason: isActive === false ? null : reason,
        },
      });
    }

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'BLACKLIST_UPDATE',
        entity: 'blacklist',
        entityId: entry.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(entry),
      },
    });

    res.json({
      message: 'Blacklist entry updated successfully',
      entry,
    });
  } catch (error) {
    console.error('Update blacklist entry error:', error);
    res.status(500).json({ message: 'Failed to update entry', error: error.message });
  }
};

// Remove from blacklist (soft delete - deactivate)
exports.removeFromBlacklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await vmsPrisma.blacklistEntry.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Blacklist entry not found' });
    }

    const entry = await vmsPrisma.blacklistEntry.update({
      where: { id },
      data: {
        isActive: false,
        reasonDetails: existing.reasonDetails 
          ? `${existing.reasonDetails}\n\nRemoved: ${reason || 'No reason provided'}` 
          : `Removed: ${reason || 'No reason provided'}`,
      },
    });

    // Update associated visitor if exists
    if (existing.visitorId) {
      await vmsPrisma.visitor.update({
        where: { id: existing.visitorId },
        data: {
          isBlacklisted: false,
          blacklistReason: null,
        },
      });
    }

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'BLACKLIST_REMOVE',
        entity: 'blacklist',
        entityId: entry.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify({ reason }),
      },
    });

    res.json({
      message: 'Removed from blacklist successfully',
      entry,
    });
  } catch (error) {
    console.error('Remove from blacklist error:', error);
    res.status(500).json({ message: 'Failed to remove from blacklist', error: error.message });
  }
};

// Delete blacklist entry (hard delete)
exports.deleteBlacklistEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await vmsPrisma.blacklistEntry.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Blacklist entry not found' });
    }

    // Update associated visitor if exists
    if (existing.visitorId) {
      await vmsPrisma.visitor.update({
        where: { id: existing.visitorId },
        data: {
          isBlacklisted: false,
          blacklistReason: null,
        },
      });
    }

    await vmsPrisma.blacklistEntry.delete({ where: { id } });

    // Log action
    await vmsPrisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'BLACKLIST_DELETE',
        entity: 'blacklist',
        entityId: id,
        oldValue: JSON.stringify(existing),
      },
    });

    res.json({ message: 'Blacklist entry deleted successfully' });
  } catch (error) {
    console.error('Delete blacklist entry error:', error);
    res.status(500).json({ message: 'Failed to delete entry', error: error.message });
  }
};

// Get blacklist statistics
exports.getBlacklistStats = async (req, res) => {
  try {
    const [
      total,
      active,
      byReason,
      recentAdditions,
    ] = await Promise.all([
      vmsPrisma.blacklistEntry.count(),
      vmsPrisma.blacklistEntry.count({ where: { isActive: true } }),
      vmsPrisma.blacklistEntry.groupBy({
        by: ['reason'],
        where: { isActive: true },
        _count: { reason: true },
      }),
      vmsPrisma.blacklistEntry.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          reason: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      total,
      active,
      inactive: total - active,
      byReason: byReason.map(r => ({ reason: r.reason, count: r._count.reason })),
      recentAdditions,
    });
  } catch (error) {
    console.error('Get blacklist stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics', error: error.message });
  }
};

// Blacklist reasons enum
exports.getBlacklistReasons = (req, res) => {
  const reasons = [
    { value: 'THEFT', label: 'Theft' },
    { value: 'MISBEHAVIOR', label: 'Misbehavior' },
    { value: 'SECURITY_THREAT', label: 'Security Threat' },
    { value: 'FRAUD', label: 'Fraud' },
    { value: 'TRESPASSING', label: 'Trespassing' },
    { value: 'VIOLENCE', label: 'Violence' },
    { value: 'HARASSMENT', label: 'Harassment' },
    { value: 'OTHER', label: 'Other' },
  ];
  res.json(reasons);
};
