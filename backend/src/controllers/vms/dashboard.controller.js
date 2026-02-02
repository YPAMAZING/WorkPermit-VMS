// VMS Dashboard Controller
const vmsPrisma = require('../../config/vms-prisma');

// Get dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all stats in parallel
    const [
      // Today's gatepasses
      todayGatepasses,
      todayScheduled,
      todayActive,
      todayCompleted,
      todayCancelled,

      // Visitor stats
      totalVisitors,
      newVisitorsToday,

      // Blacklist
      activeBlacklist,

      // Pre-approved
      activePreApprovals,
      preApprovalsToday,

      // Purpose breakdown for today
      purposeBreakdown,

      // Recent gatepasses
      recentGatepasses,

      // Recent visitors
      recentVisitors,
    ] = await Promise.all([
      // Today's gatepasses count
      vmsPrisma.gatepass.count({
        where: { expectedDate: { gte: today, lt: tomorrow } },
      }),
      vmsPrisma.gatepass.count({
        where: { expectedDate: { gte: today, lt: tomorrow }, status: 'SCHEDULED' },
      }),
      vmsPrisma.gatepass.count({
        where: { expectedDate: { gte: today, lt: tomorrow }, status: 'ACTIVE' },
      }),
      vmsPrisma.gatepass.count({
        where: { expectedDate: { gte: today, lt: tomorrow }, status: 'COMPLETED' },
      }),
      vmsPrisma.gatepass.count({
        where: { expectedDate: { gte: today, lt: tomorrow }, status: 'CANCELLED' },
      }),

      // Total visitors
      vmsPrisma.visitor.count(),

      // New visitors today
      vmsPrisma.visitor.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),

      // Active blacklist entries
      vmsPrisma.blacklistEntry.count({
        where: { isActive: true },
      }),

      // Active pre-approvals
      vmsPrisma.preApprovedVisitor.count({
        where: { status: 'ACTIVE', validUntil: { gte: today } },
      }),

      // Pre-approvals valid today
      vmsPrisma.preApprovedVisitor.count({
        where: {
          status: 'ACTIVE',
          validFrom: { lte: tomorrow },
          validUntil: { gte: today },
        },
      }),

      // Purpose breakdown for today
      vmsPrisma.gatepass.groupBy({
        by: ['purpose'],
        where: { expectedDate: { gte: today, lt: tomorrow } },
        _count: { purpose: true },
      }),

      // Recent gatepasses (last 5)
      vmsPrisma.gatepass.findMany({
        orderBy: { issuedAt: 'desc' },
        take: 5,
        include: {
          visitor: {
            select: { firstName: true, lastName: true, photo: true, company: true },
          },
        },
      }),

      // Recent visitors (last 5)
      vmsPrisma.visitor.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          company: true,
          photo: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      today: {
        date: today.toISOString().slice(0, 10),
        gatepasses: {
          total: todayGatepasses,
          scheduled: todayScheduled,
          active: todayActive,
          completed: todayCompleted,
          cancelled: todayCancelled,
        },
        newVisitors: newVisitorsToday,
        preApprovalsValid: preApprovalsToday,
      },
      summary: {
        totalVisitors,
        activeBlacklist,
        activePreApprovals,
      },
      purposeBreakdown: purposeBreakdown.map(p => ({
        purpose: p.purpose,
        count: p._count.purpose,
      })),
      recentGatepasses: recentGatepasses.map(g => ({
        id: g.id,
        gatepassNumber: g.gatepassNumber,
        visitorName: `${g.visitor.firstName} ${g.visitor.lastName}`,
        visitorPhoto: g.visitor.photo,
        visitorCompany: g.visitor.company,
        purpose: g.purpose,
        hostName: g.hostName,
        status: g.status,
        expectedDate: g.expectedDate,
        issuedAt: g.issuedAt,
      })),
      recentVisitors,
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Failed to get dashboard overview', error: error.message });
  }
};

// Get weekly statistics
exports.getWeeklyStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get daily counts for the last 7 days
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [gatepasses, visitors] = await Promise.all([
        vmsPrisma.gatepass.count({
          where: {
            expectedDate: { gte: date, lt: nextDate },
          },
        }),
        vmsPrisma.visitor.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
      ]);

      dailyStats.push({
        date: date.toISOString().slice(0, 10),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        gatepasses,
        visitors,
      });
    }

    // Get weekly totals
    const [totalGatepasses, totalVisitors, completedGatepasses] = await Promise.all([
      vmsPrisma.gatepass.count({
        where: { issuedAt: { gte: weekAgo } },
      }),
      vmsPrisma.visitor.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      vmsPrisma.gatepass.count({
        where: { issuedAt: { gte: weekAgo }, status: 'COMPLETED' },
      }),
    ]);

    res.json({
      period: '7 days',
      startDate: weekAgo.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10),
      dailyStats,
      totals: {
        gatepasses: totalGatepasses,
        visitors: totalVisitors,
        completedGatepasses,
        completionRate: totalGatepasses > 0 
          ? Math.round((completedGatepasses / totalGatepasses) * 100) 
          : 0,
      },
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ message: 'Failed to get weekly stats', error: error.message });
  }
};

// Get today's expected visitors
exports.getTodayExpectedVisitors = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const gatepasses = await vmsPrisma.gatepass.findMany({
      where: {
        expectedDate: { gte: today, lt: tomorrow },
        status: { in: ['SCHEDULED', 'ACTIVE'] },
      },
      orderBy: [
        { expectedTimeIn: 'asc' },
        { issuedAt: 'asc' },
      ],
      include: {
        visitor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            company: true,
            photo: true,
            isBlacklisted: true,
          },
        },
      },
    });

    res.json({
      date: today.toISOString().slice(0, 10),
      count: gatepasses.length,
      visitors: gatepasses.map(g => ({
        gatepassId: g.id,
        gatepassNumber: g.gatepassNumber,
        visitorId: g.visitor.id,
        visitorName: `${g.visitor.firstName} ${g.visitor.lastName}`,
        visitorPhone: g.visitor.phone,
        visitorCompany: g.visitor.company,
        visitorPhoto: g.visitor.photo,
        isBlacklisted: g.visitor.isBlacklisted,
        purpose: g.purpose,
        hostName: g.hostName,
        hostDepartment: g.hostDepartment,
        visitingArea: g.visitingArea,
        expectedTimeIn: g.expectedTimeIn,
        expectedTimeOut: g.expectedTimeOut,
        status: g.status,
      })),
    });
  } catch (error) {
    console.error('Today expected visitors error:', error);
    res.status(500).json({ message: 'Failed to get expected visitors', error: error.message });
  }
};

// Get alerts (blacklisted attempts, expired gatepasses, etc.)
exports.getAlerts = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get various alerts
    const [
      expiredActiveGatepasses,
      blacklistAdditionsToday,
      noShowsToday,
    ] = await Promise.all([
      // Gatepasses that are still active but have expired
      vmsPrisma.gatepass.findMany({
        where: {
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          validUntil: { lt: new Date() },
        },
        include: {
          visitor: {
            select: { firstName: true, lastName: true },
          },
        },
        take: 10,
      }),

      // Blacklist additions today
      vmsPrisma.blacklistEntry.findMany({
        where: {
          createdAt: { gte: today },
          isActive: true,
        },
        take: 5,
      }),

      // No-shows today
      vmsPrisma.gatepass.count({
        where: {
          expectedDate: { gte: today },
          status: 'NO_SHOW',
        },
      }),
    ]);

    const alerts = [];

    // Add expired gatepass alerts
    expiredActiveGatepasses.forEach(g => {
      alerts.push({
        type: 'EXPIRED_GATEPASS',
        severity: 'warning',
        message: `Gatepass ${g.gatepassNumber} for ${g.visitor.firstName} ${g.visitor.lastName} has expired but is still marked as active`,
        entityId: g.id,
        entityType: 'gatepass',
        createdAt: g.validUntil,
      });
    });

    // Add blacklist alerts
    blacklistAdditionsToday.forEach(b => {
      alerts.push({
        type: 'NEW_BLACKLIST',
        severity: 'danger',
        message: `${b.firstName} ${b.lastName} added to blacklist: ${b.reason}`,
        entityId: b.id,
        entityType: 'blacklist',
        createdAt: b.createdAt,
      });
    });

    // Add no-show count alert
    if (noShowsToday > 0) {
      alerts.push({
        type: 'NO_SHOWS',
        severity: 'info',
        message: `${noShowsToday} visitor(s) marked as no-show today`,
        count: noShowsToday,
        entityType: 'gatepass',
        createdAt: new Date(),
      });
    }

    // Sort by createdAt desc
    alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ message: 'Failed to get alerts', error: error.message });
  }
};
