// VMS Dashboard Controller
// Uses correct Prisma model names for VMS tables and returns data in expected frontend format

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
      console.log(`Auto-expired ${result.count} pre-approval(s)`);
    }
  } catch (error) {
    console.error('Auto-expire pre-approvals error:', error);
  }
};

// Helper: Check if user is admin (can see all companies)
const isUserAdmin = (userRole) => {
  const adminRoles = ['ADMIN', 'VMS_ADMIN', 'SECURITY_SUPERVISOR'];
  return adminRoles.includes(userRole);
};

// Helper: Build company filter based on user
const getCompanyFilter = (req) => {
  if (req.user && !isUserAdmin(req.user.role) && req.user.companyId) {
    return { companyId: req.user.companyId };
  }
  return {};
};

// Get dashboard overview - Returns data in format expected by frontend VMSDashboard component
exports.getDashboardOverview = async (req, res) => {
  try {
    // Auto-expire pre-approvals before fetching stats
    await autoExpirePreApprovals();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get company filter for non-admin users
    const companyFilter = getCompanyFilter(req);

    // Get all stats in parallel using correct model names
    const [
      // Today's gatepasses by status
      todayGatepassesTotal,
      scheduledGatepasses,
      activeGatepasses,
      completedGatepasses,
      cancelledGatepasses,
      
      // Visitor stats  
      totalVisitors,
      newVisitorsToday,
      
      // Blacklist count
      activeBlacklist,
      
      // Pre-approved
      activePreApprovals,
      preApprovalsValidToday,
      
      // Purpose breakdown for today
      purposeBreakdown,
      
      // Recent gatepasses (last 10)
      recentGatepasses,
      
      // Recent visitors
      recentVisitors,
    ] = await Promise.all([
      // Today's total gatepasses
      prisma.vMSGatepass.count({
        where: { 
          createdAt: { gte: today, lt: tomorrow },
          ...companyFilter 
        },
      }).catch(() => 0),
      
      // Scheduled = Pre-approved visitors valid for today (not yet arrived)
      prisma.vMSPreApproval.count({
        where: { 
          status: 'ACTIVE',
          validFrom: { lte: tomorrow },
          validUntil: { gte: today },
          ...companyFilter 
        },
      }).catch(() => 0),
      
      // Active gatepasses (currently valid)
      prisma.vMSGatepass.count({
        where: { 
          status: 'ACTIVE',
          validFrom: { lte: new Date() },
          validUntil: { gte: new Date() },
          ...companyFilter 
        },
      }).catch(() => 0),

      // Completed (used) gatepasses today
      prisma.vMSGatepass.count({
        where: { 
          status: 'USED',
          usedAt: { gte: today, lt: tomorrow },
          ...companyFilter 
        },
      }).catch(() => 0),

      // Cancelled gatepasses today
      prisma.vMSGatepass.count({
        where: { 
          status: 'CANCELLED',
          cancelledAt: { gte: today, lt: tomorrow },
          ...companyFilter 
        },
      }).catch(() => 0),

      // Total visitors
      prisma.vMSVisitor.count({
        where: companyFilter,
      }).catch(() => 0),

      // New visitors today
      prisma.vMSVisitor.count({
        where: { 
          createdAt: { gte: today, lt: tomorrow },
          ...companyFilter 
        },
      }).catch(() => 0),
      
      // Active blacklist entries (from VMSBlacklist table)
      prisma.vMSBlacklist.count({
        where: { 
          isActive: true,
        },
      }).catch(() => 0),

      // Active pre-approvals
      prisma.vMSPreApproval.count({
        where: { 
          status: 'ACTIVE',
          validUntil: { gte: today },
          ...companyFilter 
        },
      }).catch(() => 0),

      // Pre-approvals valid today
      prisma.vMSPreApproval.count({
        where: { 
          status: 'ACTIVE',
          validFrom: { lte: tomorrow },
          validUntil: { gte: today },
          ...companyFilter 
        },
      }).catch(() => 0),

      // Purpose breakdown - group gatepasses by visitor purpose
      prisma.vMSVisitor.groupBy({
        by: ['purpose'],
        where: {
          createdAt: { gte: today, lt: tomorrow },
          ...companyFilter,
        },
        _count: { purpose: true },
      }).catch(() => []),

      // Recent gatepasses (last 10)
      prisma.vMSGatepass.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: companyFilter,
        include: {
          visitor: {
            select: {
              visitorName: true,
              phone: true,
              companyFrom: true,
              companyToVisit: true,
              personToMeet: true,
              photo: true,
            }
          }
        },
      }).catch(() => []),

      // Recent visitors
      prisma.vMSVisitor.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: companyFilter,
      }).catch(() => []),
    ]);

    // Format response to match frontend expectations
    res.json({
      // Today's gatepass stats (frontend expects overview.today.gatepasses)
      today: {
        gatepasses: {
          total: todayGatepassesTotal,
          scheduled: scheduledGatepasses,
          active: activeGatepasses,
          completed: completedGatepasses,
          cancelled: cancelledGatepasses,
        },
        newVisitors: newVisitorsToday,
        preApprovalsValid: preApprovalsValidToday,
      },
      
      // Summary stats (frontend expects overview.summary)
      summary: {
        totalVisitors: totalVisitors,
        activePreApprovals: activePreApprovals,
        activeBlacklist: activeBlacklist,
      },
      
      // Purpose breakdown (frontend expects overview.purposeBreakdown)
      purposeBreakdown: purposeBreakdown.map(item => ({
        purpose: item.purpose || 'OTHER',
        count: item._count.purpose,
      })),
      
      // Recent gatepasses (frontend expects overview.recentGatepasses)
      recentGatepasses: recentGatepasses.map(gp => ({
        id: gp.id,
        gatepassNumber: gp.gatepassNumber,
        visitorName: gp.visitor?.visitorName || 'Unknown',
        visitorPhoto: gp.visitor?.photo || null,
        visitorCompany: gp.visitor?.companyFrom || '',
        hostName: gp.visitor?.personToMeet || '',
        companyToVisit: gp.visitor?.companyToVisit || '',
        status: gp.status,
        validFrom: gp.validFrom,
        validUntil: gp.validUntil,
        createdAt: gp.createdAt,
      })),
      
      // Recent visitors
      recentVisitors: recentVisitors.map(v => ({
        id: v.id,
        visitorName: v.visitorName,
        phone: v.phone,
        companyFrom: v.companyFrom,
        companyToVisit: v.companyToVisit,
        purpose: v.purpose,
        status: v.status,
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard data',
      error: error.message 
    });
  }
};

// Get weekly statistics
exports.getWeeklyStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const companyFilter = getCompanyFilter(req);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get daily stats for the week
    const dailyStats = [];
    let totalGatepasses = 0;
    let totalVisitors = 0;
    let completedGatepasses = 0;

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // Count gatepasses and visitors for this day
      const [gatepassCount, visitorCount, completedCount] = await Promise.all([
        prisma.vMSGatepass.count({
          where: {
            createdAt: { gte: dayStart, lt: dayEnd },
            ...companyFilter,
          },
        }).catch(() => 0),
        prisma.vMSVisitor.count({
          where: {
            createdAt: { gte: dayStart, lt: dayEnd },
            ...companyFilter,
          },
        }).catch(() => 0),
        prisma.vMSGatepass.count({
          where: {
            status: 'USED',
            usedAt: { gte: dayStart, lt: dayEnd },
            ...companyFilter,
          },
        }).catch(() => 0),
      ]);

      totalGatepasses += gatepassCount;
      totalVisitors += visitorCount;
      completedGatepasses += completedCount;

      dailyStats.push({
        date: dayStart.toISOString().split('T')[0],
        dayName: dayNames[dayStart.getDay()],
        gatepasses: gatepassCount,
        visitors: visitorCount,
      });
    }

    // Calculate completion rate
    const completionRate = totalGatepasses > 0 
      ? Math.round((completedGatepasses / totalGatepasses) * 100) 
      : 0;

    res.json({
      dailyStats,
      totals: {
        gatepasses: totalGatepasses,
        visitors: totalVisitors,
        completionRate,
      },
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch weekly stats',
      error: error.message 
    });
  }
};

// Get today's expected visitors
exports.getTodayExpectedVisitors = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const companyFilter = getCompanyFilter(req);

    // Get pre-approved visitors expected today
    const expectedVisitors = await prisma.vMSPreApproval.findMany({
      where: {
        status: 'ACTIVE',
        validFrom: { lte: tomorrow },
        validUntil: { gte: today },
        ...companyFilter,
      },
      take: 20,
      orderBy: { validFrom: 'asc' },
    }).catch(() => []);

    res.json({
      expected: expectedVisitors.map(v => ({
        id: v.id,
        visitorName: v.visitorName,
        phone: v.phone,
        companyFrom: v.companyFrom,
        purpose: v.purpose,
        validFrom: v.validFrom,
        validUntil: v.validUntil,
      })),
      count: expectedVisitors.length,
    });
  } catch (error) {
    console.error('Today expected error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch expected visitors',
      error: error.message 
    });
  }
};

// Get alerts
exports.getAlerts = async (req, res) => {
  try {
    const alerts = [];
    const today = new Date();
    
    // Check for expired pre-approvals
    const expiredCount = await prisma.vMSPreApproval.count({
      where: {
        status: 'ACTIVE',
        validUntil: { lt: today },
      },
    }).catch(() => 0);

    if (expiredCount > 0) {
      alerts.push({
        type: 'warning',
        severity: 'warning',
        message: `${expiredCount} pre-approval(s) have expired`,
        action: 'Review pre-approvals',
        createdAt: new Date(),
      });
    }

    // Check for visitors checked in too long (over 8 hours)
    const eightHoursAgo = new Date();
    eightHoursAgo.setHours(eightHoursAgo.getHours() - 8);
    
    const longVisitors = await prisma.vMSVisitor.count({
      where: {
        status: 'CHECKED_IN',
        checkInTime: { lt: eightHoursAgo },
      },
    }).catch(() => 0);

    if (longVisitors > 0) {
      alerts.push({
        type: 'info',
        severity: 'warning',
        message: `${longVisitors} visitor(s) checked in over 8 hours ago`,
        action: 'Review visitor status',
        createdAt: new Date(),
      });
    }

    // Check for expiring gatepasses (within next hour)
    const oneHourLater = new Date();
    oneHourLater.setHours(oneHourLater.getHours() + 1);
    
    const expiringGatepasses = await prisma.vMSGatepass.count({
      where: {
        status: 'ACTIVE',
        validUntil: { gte: today, lte: oneHourLater },
      },
    }).catch(() => 0);

    if (expiringGatepasses > 0) {
      alerts.push({
        type: 'info',
        severity: 'info',
        message: `${expiringGatepasses} gatepass(es) expiring within the next hour`,
        action: 'Review active gatepasses',
        createdAt: new Date(),
      });
    }

    res.json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch alerts',
      error: error.message 
    });
  }
};
