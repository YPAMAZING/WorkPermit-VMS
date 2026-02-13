// VMS Blacklist Controller
// Uses correct Prisma model names for VMS tables

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Blacklist reasons
const BLACKLIST_REASONS = [
  'MISCONDUCT',
  'THEFT',
  'VIOLENCE',
  'FRAUD',
  'TRESPASSING',
  'HARASSMENT',
  'POLICY_VIOLATION',
  'SECURITY_THREAT',
  'OTHER'
];

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
        { visitorName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { idNumber: { contains: search } },
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
      prisma.vMSBlacklist.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.vMSBlacklist.count({ where }),
    ]);

    res.json({
      entries: entries.map(e => ({
        id: e.id,
        visitorName: e.visitorName,
        phone: e.phone,
        email: e.email,
        idType: e.idType,
        idNumber: e.idNumber,
        reason: e.reason,
        description: e.description,
        isActive: e.isActive,
        isPermanent: e.isPermanent,
        expiresAt: e.expiresAt,
        addedBy: e.addedBy,
        createdAt: e.createdAt,
        removedAt: e.removedAt,
        removedBy: e.removedBy,
        removalReason: e.removalReason,
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
    res.status(500).json({ message: 'Failed to get blacklist entries', error: error.message });
  }
};

// Get single blacklist entry
exports.getBlacklistEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.vMSBlacklist.findUnique({
      where: { id },
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

// Check if visitor is blacklisted
exports.checkBlacklist = async (req, res) => {
  try {
    const { phone, idNumber } = req.query;

    if (!phone && !idNumber) {
      return res.status(400).json({ message: 'Phone or ID number is required' });
    }

    const orConditions = [];
    if (phone) orConditions.push({ phone: phone.replace(/\D/g, '') });
    if (idNumber) orConditions.push({ idNumber });

    const entry = await prisma.vMSBlacklist.findFirst({
      where: {
        OR: orConditions,
        isActive: true,
        OR: [
          { isPermanent: true },
          { expiresAt: { gte: new Date() } },
        ],
      },
    });

    if (entry) {
      res.json({
        isBlacklisted: true,
        entry: {
          id: entry.id,
          visitorName: entry.visitorName,
          reason: entry.reason,
          description: entry.description,
          isPermanent: entry.isPermanent,
          expiresAt: entry.expiresAt,
        },
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
      visitorName,
      phone,
      email,
      idType,
      idNumber,
      reason,
      description,
      isPermanent = true,
      expiresAt,
      visitorId,
    } = req.body;

    // Validation
    if (!visitorName || !phone || !reason) {
      return res.status(400).json({ 
        message: 'Missing required fields: visitorName, phone, reason' 
      });
    }

    if (!BLACKLIST_REASONS.includes(reason)) {
      return res.status(400).json({ 
        message: `Invalid reason. Must be one of: ${BLACKLIST_REASONS.join(', ')}` 
      });
    }

    // Check if already blacklisted
    const existing = await prisma.vMSBlacklist.findFirst({
      where: {
        phone: phone.replace(/\D/g, ''),
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
    const entry = await prisma.vMSBlacklist.create({
      data: {
        visitorName,
        phone: phone.replace(/\D/g, ''),
        email: email || null,
        idType: idType || null,
        idNumber: idNumber || null,
        reason,
        description: description || null,
        isPermanent,
        expiresAt: !isPermanent && expiresAt ? new Date(expiresAt) : null,
        visitorId: visitorId || null,
        addedBy: req.user?.userId || 'system',
        isActive: true,
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
      visitorName,
      phone,
      email,
      idType,
      idNumber,
      reason,
      description,
      isPermanent,
      expiresAt,
    } = req.body;

    const existing = await prisma.vMSBlacklist.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Blacklist entry not found' });
    }

    const entry = await prisma.vMSBlacklist.update({
      where: { id },
      data: {
        visitorName,
        phone: phone ? phone.replace(/\D/g, '') : undefined,
        email,
        idType,
        idNumber,
        reason,
        description,
        isPermanent,
        expiresAt: !isPermanent && expiresAt ? new Date(expiresAt) : null,
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

// Remove from blacklist (soft delete)
exports.removeFromBlacklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await prisma.vMSBlacklist.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Blacklist entry not found' });
    }

    if (!existing.isActive) {
      return res.status(400).json({ message: 'Entry is already removed from blacklist' });
    }

    const entry = await prisma.vMSBlacklist.update({
      where: { id },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy: req.user?.userId || 'system',
        removalReason: reason || 'Removed by admin',
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

    const existing = await prisma.vMSBlacklist.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Blacklist entry not found' });
    }

    await prisma.vMSBlacklist.delete({ where: { id } });

    res.json({ message: 'Blacklist entry deleted successfully' });
  } catch (error) {
    console.error('Delete blacklist entry error:', error);
    res.status(500).json({ message: 'Failed to delete entry', error: error.message });
  }
};

// Get blacklist statistics
exports.getBlacklistStats = async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total,
      active,
      removed,
      thisMonth,
    ] = await Promise.all([
      prisma.vMSBlacklist.count(),
      prisma.vMSBlacklist.count({ where: { isActive: true } }),
      prisma.vMSBlacklist.count({ where: { isActive: false } }),
      prisma.vMSBlacklist.count({ 
        where: { 
          createdAt: { gte: thisMonthStart } 
        } 
      }),
    ]);

    res.json({
      total,
      active,
      removed,
      thisMonth,
    });
  } catch (error) {
    console.error('Get blacklist stats error:', error);
    res.status(500).json({ message: 'Failed to get statistics', error: error.message });
  }
};

// Get blacklist reasons
exports.getBlacklistReasons = async (req, res) => {
  res.json({ reasons: BLACKLIST_REASONS });
};
