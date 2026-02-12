// VMS Dashboard Controller
// Uses correct Prisma model names for VMS tables

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// Get dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get company filter for non-admin users
    const companyFilter = getCompanyFilter(req);

    // Get all stats in parallel using correct model names
    const [
      // Today's gatepasses
      todayGatepasses,
      activeGatepasses,
      
      // Visitor stats  
      totalVisitors,
      newVisitorsToday,
      checkedInToday,
      
      // Pre-approved
      activePreApprovals,
      
      // Recent gatepasses
      recentGatepasses,
    ] = await Promise.all([
      // Today's gatepasses count
      prisma.vMSGatepass.count({
        where: { 
          createdAt: { gte: today, lt: tomorrow },
          ...companyFilter 
        },
      }).catch(() => 0),
      
      // Active gatepasses
      prisma.vMSGatepass.count({
        where: { 
          status: 'ACTIVE',
          ...companyFilter 
        },
      }).catch(() => 0),

      // Total visitors
      prisma.vMSVisitor.count().catch(() => 0),

      // New visitors today
      prisma.vMSVisitor.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }).catch(() => 0),
      
      // Checked in today
      prisma.vMSVisitor.count({
        where: { 
          status: 'CHECKED_IN',
          checkInTime: { gte: today, lt: tomorrow }
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

      // Recent gatepasses (last 10)
      prisma.vMSGatepass.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          visitor: {
            select: {
              visitorName: true,
              phone: true,
              companyToVisit: true,
            }
          }
        },
        ...companyFilter,
      }).catch(() => []),
    ]);

    res.json({
      todayGatepasses: {
        total: todayGatepasses,
        scheduled: 0,
        active: activeGatepasses,
        completed: 0,
      },
      visitors: {
        total: totalVisitors,
        newToday: newVisitorsToday,
        checkedIn: checkedInToday,
      },
      preApproved: {
        active: activePreApprovals,
        validToday: activePreApprovals,
      },
      blacklisted: 0,
      recentGatepasses: recentGatepasses.map(gp => ({
        id: gp.id,
        gatepassNumber: gp.gatepassNumber,
        visitorName: gp.visitor?.visitorName || 'Unknown',
        phone: gp.visitor?.phone || '',
        company: gp.visitor?.companyToVisit || '',
        status: gp.status,
        createdAt: gp.createdAt,
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
    
    // Get last 7 days
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const companyFilter = getCompanyFilter(req);

    // Get daily visitor counts for the week
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await prisma.vMSVisitor.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }).catch(() => 0);

      dailyStats.push({
        date: dayStart.toISOString().split('T')[0],
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        visitors: count,
      });
    }

    res.json({
      weeklyStats: dailyStats,
      totalThisWeek: dailyStats.reduce((sum, d) => sum + d.visitors, 0),
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
        company: v.companyToVisit,
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
    
    // Check for expired pre-approvals
    const today = new Date();
    const expiredCount = await prisma.vMSPreApproval.count({
      where: {
        status: 'ACTIVE',
        validUntil: { lt: today },
      },
    }).catch(() => 0);

    if (expiredCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${expiredCount} pre-approval(s) have expired`,
        action: 'Review pre-approvals',
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
        message: `${longVisitors} visitor(s) checked in over 8 hours ago`,
        action: 'Review visitor status',
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
