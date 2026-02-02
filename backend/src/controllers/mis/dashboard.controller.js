// MIS Dashboard Controller
const { misPrisma } = require('../../config/mis-prisma');

// Get dashboard statistics
const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Get meter reading counts
    const [
      totalReadings,
      todayReadings,
      weekReadings,
      monthReadings,
      pendingVerification,
      meterConfigs,
      unresolvedAlerts,
    ] = await Promise.all([
      misPrisma.meterReading.count(),
      misPrisma.meterReading.count({
        where: { readingDate: { gte: today } },
      }),
      misPrisma.meterReading.count({
        where: { readingDate: { gte: startOfWeek } },
      }),
      misPrisma.meterReading.count({
        where: { readingDate: { gte: startOfMonth } },
      }),
      misPrisma.meterReading.count({
        where: { isVerified: false, status: 'pending' },
      }),
      misPrisma.meterConfig.count({ where: { isActive: true } }),
      misPrisma.alert.count({ where: { isResolved: false } }),
    ]);

    // Get readings by meter type
    const readingsByType = await misPrisma.meterReading.groupBy({
      by: ['meterType'],
      _count: { id: true },
      where: { readingDate: { gte: startOfMonth } },
    });

    // Get recent readings
    const recentReadings = await misPrisma.meterReading.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Get recent alerts
    const recentAlerts = await misPrisma.alert.findMany({
      take: 5,
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      stats: {
        totalReadings,
        todayReadings,
        weekReadings,
        monthReadings,
        pendingVerification,
        meterConfigs,
        unresolvedAlerts,
      },
      readingsByType: readingsByType.map(r => ({
        type: r.meterType,
        count: r._count.id,
      })),
      recentReadings: recentReadings.map(r => ({
        id: r.id,
        meterType: r.meterType,
        meterName: r.meterName,
        currentReading: r.currentReading,
        consumption: r.consumption,
        unit: r.unit,
        isVerified: r.isVerified,
        createdAt: r.createdAt,
        createdBy: r.createdBy 
          ? `${r.createdBy.firstName} ${r.createdBy.lastName}`
          : 'System',
      })),
      recentAlerts: recentAlerts.map(a => ({
        id: a.id,
        type: a.alertType,
        severity: a.severity,
        title: a.title,
        message: a.message,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get MIS dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to get dashboard stats', error: error.message });
  }
};

// Get consumption analytics
const getAnalytics = async (req, res) => {
  try {
    const { period = '7d', meterType } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const where = {
      readingDate: { gte: startDate },
    };
    
    if (meterType) {
      where.meterType = meterType;
    }

    const readings = await misPrisma.meterReading.findMany({
      where,
      orderBy: { readingDate: 'asc' },
      select: {
        id: true,
        meterType: true,
        meterName: true,
        readingDate: true,
        currentReading: true,
        consumption: true,
        unit: true,
      },
    });

    // Group by date for trend analysis
    const dailyConsumption = {};
    readings.forEach(r => {
      const dateKey = r.readingDate.toISOString().split('T')[0];
      if (!dailyConsumption[dateKey]) {
        dailyConsumption[dateKey] = {
          date: dateKey,
          electricity: 0,
          water: 0,
          diesel: 0,
          gas: 0,
          total: 0,
        };
      }
      const type = r.meterType || 'other';
      if (dailyConsumption[dateKey][type] !== undefined) {
        dailyConsumption[dateKey][type] += r.consumption || 0;
      }
      dailyConsumption[dateKey].total += r.consumption || 0;
    });

    const trends = Object.values(dailyConsumption).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json({
      period,
      meterType: meterType || 'all',
      totalReadings: readings.length,
      trends,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Failed to get analytics', error: error.message });
  }
};

module.exports = {
  getStats,
  getAnalytics,
};
