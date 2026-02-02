const { PrismaClient } = require('@prisma/client');
const { createAuditLog } = require('../services/audit.service');
const { transformPermitResponse } = require('../utils/arrayHelpers');

const prisma = new PrismaClient();

// Helper to transform approval with permit
const transformApproval = (approval) => {
  if (!approval) return null;
  return {
    ...approval,
    permit: approval.permit ? transformPermitResponse(approval.permit) : null,
  };
};

// Get all approvals (Safety Officer & Admin only)
const getAllApprovals = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      decision,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    
    if (decision) {
      where.decision = decision;
    }

    if (search) {
      where.permit = {
        OR: [
          { title: { contains: search } },
          { location: { contains: search } },
        ],
      };
    }

    const [approvals, total] = await Promise.all([
      prisma.permitApproval.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          permit: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  department: true,
                },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.permitApproval.count({ where }),
    ]);

    res.json({
      approvals: approvals.map(transformApproval),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ message: 'Error fetching approvals' });
  }
};

// Get pending approvals count
const getPendingCount = async (req, res) => {
  try {
    const count = await prisma.permitApproval.count({
      where: { decision: 'PENDING' },
    });

    res.json({ count });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({ message: 'Error fetching pending count' });
  }
};

// Get approval by ID
const getApprovalById = async (req, res) => {
  try {
    const { id } = req.params;

    const approval = await prisma.permitApproval.findUnique({
      where: { id },
      include: {
        permit: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!approval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    res.json({ approval: transformApproval(approval) });
  } catch (error) {
    console.error('Get approval error:', error);
    res.status(500).json({ message: 'Error fetching approval' });
  }
};

// Update approval decision (Approve/Reject)
const updateApprovalDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;
    const user = req.user;

    // Validate decision
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ 
        message: 'Invalid decision. Must be APPROVED or REJECTED' 
      });
    }

    const existingApproval = await prisma.permitApproval.findUnique({
      where: { id },
      include: { permit: true },
    });

    if (!existingApproval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    if (existingApproval.decision !== 'PENDING') {
      return res.status(400).json({ 
        message: 'This approval has already been processed' 
      });
    }

    // Update approval and permit status in transaction
    const [updatedApproval, updatedPermit] = await prisma.$transaction([
      // Update approval record
      prisma.permitApproval.update({
        where: { id },
        data: {
          decision,
          comment,
          approverName: `${user.firstName} ${user.lastName}`,
          approvedAt: new Date(),
        },
      }),
      // Update permit status
      prisma.permitRequest.update({
        where: { id: existingApproval.permitId },
        data: { status: decision },
      }),
    ]);

    // Fetch complete approval with relations
    const completeApproval = await prisma.permitApproval.findUnique({
      where: { id },
      include: {
        permit: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                department: true,
              },
            },
          },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: decision === 'APPROVED' ? 'PERMIT_APPROVED' : 'PERMIT_REJECTED',
      entity: 'PermitApproval',
      entityId: id,
      oldValue: { decision: 'PENDING' },
      newValue: { decision, comment, approverName: `${user.firstName} ${user.lastName}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: `Permit ${decision.toLowerCase()} successfully`,
      approval: transformApproval(completeApproval),
    });
  } catch (error) {
    console.error('Update approval error:', error);
    res.status(500).json({ message: 'Error updating approval' });
  }
};

// Get approval statistics
const getApprovalStats = async (req, res) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      prisma.permitApproval.count({ where: { decision: 'PENDING' } }),
      prisma.permitApproval.count({ where: { decision: 'APPROVED' } }),
      prisma.permitApproval.count({ where: { decision: 'REJECTED' } }),
      prisma.permitApproval.count(),
    ]);

    // Get recent approvals
    const recentApprovals = await prisma.permitApproval.findMany({
      where: {
        decision: { not: 'PENDING' },
      },
      take: 5,
      orderBy: { approvedAt: 'desc' },
      include: {
        permit: {
          select: {
            title: true,
            workType: true,
          },
        },
      },
    });

    res.json({
      stats: {
        pending,
        approved,
        rejected,
        total,
        approvalRate: total > 0 ? ((approved / (approved + rejected)) * 100).toFixed(1) : 0,
      },
      recentApprovals,
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({ message: 'Error fetching approval stats' });
  }
};

// Add safety officer remarks to permit (can be added even after closure)
const addSafetyRemarks = async (req, res) => {
  try {
    const { id } = req.params; // permit ID
    const { safetyRemarks } = req.body;
    const user = req.user;

    if (!safetyRemarks || !safetyRemarks.trim()) {
      return res.status(400).json({ message: 'Safety remarks are required' });
    }

    const permit = await prisma.permitRequest.findUnique({
      where: { id },
    });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    // Allow remarks on approved, closed, or pending_remarks permits
    const allowedStatuses = ['APPROVED', 'PENDING_REMARKS', 'CLOSED'];
    if (!allowedStatuses.includes(permit.status)) {
      return res.status(400).json({ 
        message: 'Remarks can only be added to approved or closed permits' 
      });
    }

    // Update permit with remarks
    const updatedPermit = await prisma.permitRequest.update({
      where: { id },
      data: {
        safetyRemarks: safetyRemarks.trim(),
        remarksAddedBy: `${user.firstName} ${user.lastName}`,
        remarksAddedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        approvals: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'SAFETY_REMARKS_ADDED',
      entity: 'PermitRequest',
      entityId: id,
      newValue: { safetyRemarks: safetyRemarks.trim(), remarksAddedBy: `${user.firstName} ${user.lastName}` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: 'Safety remarks added successfully',
      permit: transformPermitResponse(updatedPermit),
    });
  } catch (error) {
    console.error('Add safety remarks error:', error);
    res.status(500).json({ message: 'Error adding safety remarks' });
  }
};

// Get permits pending remarks (approved but no remarks yet, and past end time)
const getPendingRemarks = async (req, res) => {
  try {
    const now = new Date();
    
    const permits = await prisma.permitRequest.findMany({
      where: {
        status: 'APPROVED',
        safetyRemarks: null,
        endDate: { lte: now },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        approvals: true,
      },
      orderBy: { endDate: 'asc' },
    });

    res.json({
      permits: permits.map(transformPermitResponse),
      count: permits.length,
    });
  } catch (error) {
    console.error('Get pending remarks error:', error);
    res.status(500).json({ message: 'Error fetching pending remarks' });
  }
};

// Auto-close expired permits (called by cron or on-demand)
const autoCloseExpiredPermits = async (req, res) => {
  try {
    const now = new Date();
    
    // Auto-close non-extended permits based on endDate
    const regularResult = await prisma.permitRequest.updateMany({
      where: {
        status: 'APPROVED',
        isExtended: false,
        endDate: { lte: now },
        closedAt: null,
      },
      data: {
        status: 'CLOSED',
        closedAt: now,
        autoClosedAt: now,
      },
    });

    // Auto-close extended permits based on extendedUntil date
    const extendedResult = await prisma.permitRequest.updateMany({
      where: {
        status: { in: ['EXTENDED', 'REAPPROVED'] },
        isExtended: true,
        extendedUntil: { lte: now },
        closedAt: null,
      },
      data: {
        status: 'CLOSED',
        closedAt: now,
        autoClosedAt: now,
      },
    });

    res.json({
      message: 'Auto-close check completed',
      closedCount: regularResult.count + extendedResult.count,
      regularClosed: regularResult.count,
      extendedClosed: extendedResult.count,
    });
  } catch (error) {
    console.error('Auto-close permits error:', error);
    res.status(500).json({ message: 'Error auto-closing permits' });
  }
};

// Check and update permit statuses based on time
const checkPermitStatuses = async () => {
  const now = new Date();
  
  try {
    // Auto-close non-extended permits based on endDate
    const regularResult = await prisma.permitRequest.updateMany({
      where: {
        status: 'APPROVED',
        isExtended: false,
        endDate: { lte: now },
        closedAt: null,
      },
      data: {
        status: 'CLOSED',
        closedAt: now,
        autoClosedAt: now,
      },
    });

    // Auto-close extended permits based on extendedUntil date
    const extendedResult = await prisma.permitRequest.updateMany({
      where: {
        status: { in: ['EXTENDED', 'REAPPROVED'] },
        isExtended: true,
        extendedUntil: { lte: now },
        closedAt: null,
      },
      data: {
        status: 'CLOSED',
        closedAt: now,
        autoClosedAt: now,
      },
    });

    const totalClosed = regularResult.count + extendedResult.count;
    if (totalClosed > 0) {
      console.log(`[Auto-Close] ${totalClosed} permit(s) auto-closed at`, now.toISOString());
      console.log(`  - Regular permits: ${regularResult.count}`);
      console.log(`  - Extended permits: ${extendedResult.count}`);
    }
  } catch (error) {
    console.error('[Auto-Close] Error checking permit statuses:', error);
  }
};

module.exports = {
  getAllApprovals,
  getPendingCount,
  getApprovalById,
  updateApprovalDecision,
  getApprovalStats,
  addSafetyRemarks,
  getPendingRemarks,
  autoCloseExpiredPermits,
  checkPermitStatuses,
};
