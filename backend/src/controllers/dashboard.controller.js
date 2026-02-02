const { PrismaClient } = require('@prisma/client');
const { transformPermitResponse } = require('../utils/arrayHelpers');

const prisma = new PrismaClient();

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    const isAdmin = user.role === 'ADMIN';
    const isFireman = user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER';
    const isSafetyOfficer = isFireman; // Alias for backward compatibility
    const isRequestor = user.role === 'REQUESTOR';

    // Base where clause for requestor
    const permitWhere = isRequestor ? { createdBy: user.id } : {};

    // Get permit counts
    const [
      totalPermits,
      pendingPermits,
      approvedPermits,
      rejectedPermits,
      pendingApprovals,
      totalUsers,
    ] = await Promise.all([
      prisma.permitRequest.count({ where: permitWhere }),
      prisma.permitRequest.count({ where: { ...permitWhere, status: 'PENDING' } }),
      prisma.permitRequest.count({ where: { ...permitWhere, status: 'APPROVED' } }),
      prisma.permitRequest.count({ where: { ...permitWhere, status: 'REJECTED' } }),
      prisma.permitApproval.count({ where: { decision: 'PENDING' } }),
      isAdmin ? prisma.user.count() : 0,
    ]);

    // Get permits by work type
    const permitsByWorkType = await prisma.permitRequest.groupBy({
      by: ['workType'],
      where: permitWhere,
      _count: { workType: true },
    });

    // Get recent permits
    const recentPermitsRaw = await prisma.permitRequest.findMany({
      where: permitWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        approvals: {
          select: {
            decision: true,
          },
        },
      },
    });

    const recentPermits = recentPermitsRaw.map(transformPermitResponse);

    // Get monthly permit trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await prisma.permitRequest.groupBy({
      by: ['status'],
      where: {
        ...permitWhere,
        createdAt: { gte: sixMonthsAgo },
      },
      _count: { status: true },
    });

    // Get work type distribution
    const workTypeLabels = {
      HOT_WORK: 'Hot Work',
      CONFINED_SPACE: 'Confined Space',
      ELECTRICAL: 'Electrical',
      WORKING_AT_HEIGHT: 'Working at Height',
      EXCAVATION: 'Excavation',
      LIFTING: 'Lifting',
      CHEMICAL: 'Chemical',
      RADIATION: 'Radiation',
      GENERAL: 'General',
    };

    const workTypeData = permitsByWorkType.map((item) => ({
      type: workTypeLabels[item.workType] || item.workType,
      count: item._count.workType,
    }));

    // Get upcoming permits (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingPermitsRaw = await prisma.permitRequest.findMany({
      where: {
        ...permitWhere,
        status: 'APPROVED',
        startDate: {
          gte: new Date(),
          lte: nextWeek,
        },
      },
      take: 5,
      orderBy: { startDate: 'asc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const upcomingPermits = upcomingPermitsRaw.map(transformPermitResponse);

    res.json({
      stats: {
        totalPermits,
        pendingPermits,
        approvedPermits,
        rejectedPermits,
        pendingApprovals: isSafetyOfficer || isAdmin ? pendingApprovals : null,
        totalUsers: isAdmin ? totalUsers : null,
        approvalRate: totalPermits > 0 
          ? ((approvedPermits / (approvedPermits + rejectedPermits || 1)) * 100).toFixed(1)
          : 0,
      },
      workTypeData,
      recentPermits,
      upcomingPermits,
      monthlyTrends,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};

// Get activity feed
const getActivityFeed = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const user = req.user;

    const where = user.role === 'REQUESTOR' 
      ? { userId: user.id }
      : {};

    const activities = await prisma.auditLog.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    });

    res.json({ activities });
  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({ message: 'Error fetching activity feed' });
  }
};

module.exports = {
  getDashboardStats,
  getActivityFeed,
};
