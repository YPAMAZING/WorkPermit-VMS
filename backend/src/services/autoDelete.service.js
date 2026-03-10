/**
 * Auto-Delete Service
 * Automatically deletes data older than 90 days (3 months)
 * 
 * Affected tables:
 * - Work Permit System: PermitRequest, PermitApproval, PermitActionHistory, AuditLog, Worker
 * - VMS: VMSVisitor, VMSGatepass, VMSPreApproval, VMSBlacklist, CheckInRequest
 * 
 * Note: User accounts and roles are NOT deleted
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 90 days in milliseconds
const RETENTION_DAYS = 90;

/**
 * Get date 90 days ago
 */
const getCutoffDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - RETENTION_DAYS);
  return date;
};

/**
 * Delete old Work Permit data
 */
const deleteOldWorkPermitData = async () => {
  const cutoffDate = getCutoffDate();
  const results = {
    permits: 0,
    approvals: 0,
    actionHistory: 0,
    auditLogs: 0,
    workers: 0,
    ssoTokens: 0,
    analyticsCache: 0
  };

  try {
    console.log(`[AutoDelete] Starting Work Permit data cleanup for data older than ${cutoffDate.toISOString()}`);

    // 1. Delete old permit action history (must delete before permits due to FK constraint)
    const actionHistoryResult = await prisma.permitActionHistory.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.actionHistory = actionHistoryResult.count;

    // 2. Delete old permit approvals (must delete before permits due to FK constraint)
    const approvalsResult = await prisma.permitApproval.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.approvals = approvalsResult.count;

    // 3. Delete old permit requests
    const permitsResult = await prisma.permitRequest.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.permits = permitsResult.count;

    // 4. Delete old audit logs
    const auditLogsResult = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.auditLogs = auditLogsResult.count;

    // 5. Delete old workers
    const workersResult = await prisma.worker.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.workers = workersResult.count;

    // 6. Delete old SSO tokens
    const ssoTokensResult = await prisma.sSOToken.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.ssoTokens = ssoTokensResult.count;

    // 7. Delete expired analytics cache
    const analyticsCacheResult = await prisma.analyticsCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    results.analyticsCache = analyticsCacheResult.count;

    console.log('[AutoDelete] Work Permit cleanup completed:', results);
    return results;
  } catch (error) {
    console.error('[AutoDelete] Error deleting Work Permit data:', error);
    throw error;
  }
};

/**
 * Delete old VMS data
 */
const deleteOldVMSData = async () => {
  const cutoffDate = getCutoffDate();
  const results = {
    gatepasses: 0,
    visitors: 0,
    preApprovals: 0,
    blacklist: 0,
    employeePasses: 0
  };

  try {
    console.log(`[AutoDelete] Starting VMS data cleanup for data older than ${cutoffDate.toISOString()}`);

    // 1. Delete old gatepasses (must delete before visitors due to FK constraint)
    const gatepassesResult = await prisma.vMSGatepass.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.gatepasses = gatepassesResult.count;

    // 2. Delete old visitors (after gatepasses are deleted)
    const visitorsResult = await prisma.vMSVisitor.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.visitors = visitorsResult.count;

    // 3. Delete old pre-approvals
    const preApprovalsResult = await prisma.vMSPreApproval.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.preApprovals = preApprovalsResult.count;

    // 4. Delete old blacklist entries (only non-permanent ones)
    const blacklistResult = await prisma.vMSBlacklist.deleteMany({
      where: {
        AND: [
          { createdAt: { lt: cutoffDate } },
          { isPermanent: false }
        ]
      }
    });
    results.blacklist = blacklistResult.count;

    // 5. Delete old employee passes
    const employeePassesResult = await prisma.vMSEmployeePass.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.employeePasses = employeePassesResult.count;

    console.log('[AutoDelete] VMS cleanup completed:', results);
    return results;
  } catch (error) {
    console.error('[AutoDelete] Error deleting VMS data:', error);
    throw error;
  }
};

/**
 * Run full auto-delete cleanup for all systems
 */
const runAutoDelete = async () => {
  console.log(`[AutoDelete] ========================================`);
  console.log(`[AutoDelete] Starting auto-delete process at ${new Date().toISOString()}`);
  console.log(`[AutoDelete] Retention period: ${RETENTION_DAYS} days`);
  console.log(`[AutoDelete] ========================================`);

  try {
    const workPermitResults = await deleteOldWorkPermitData();
    const vmsResults = await deleteOldVMSData();

    const summary = {
      timestamp: new Date().toISOString(),
      retentionDays: RETENTION_DAYS,
      cutoffDate: getCutoffDate().toISOString(),
      workPermit: workPermitResults,
      vms: vmsResults,
      totalDeleted: 
        workPermitResults.permits + 
        workPermitResults.approvals + 
        workPermitResults.actionHistory + 
        workPermitResults.auditLogs + 
        workPermitResults.workers + 
        workPermitResults.ssoTokens + 
        workPermitResults.analyticsCache +
        vmsResults.gatepasses + 
        vmsResults.visitors + 
        vmsResults.preApprovals + 
        vmsResults.blacklist + 
        vmsResults.employeePasses
    };

    console.log(`[AutoDelete] ========================================`);
    console.log(`[AutoDelete] Auto-delete completed successfully`);
    console.log(`[AutoDelete] Total records deleted: ${summary.totalDeleted}`);
    console.log(`[AutoDelete] ========================================`);

    return summary;
  } catch (error) {
    console.error('[AutoDelete] Auto-delete process failed:', error);
    throw error;
  }
};

/**
 * Get auto-delete statistics (preview without deleting)
 */
const getAutoDeleteStats = async () => {
  const cutoffDate = getCutoffDate();

  try {
    const [
      permitsCount,
      approvalsCount,
      actionHistoryCount,
      auditLogsCount,
      workersCount,
      ssoTokensCount,
      gatepassesCount,
      visitorsCount,
      preApprovalsCount,
      blacklistCount,
      employeePassesCount
    ] = await Promise.all([
      prisma.permitRequest.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.permitApproval.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.permitActionHistory.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.auditLog.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.worker.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.sSOToken.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.vMSGatepass.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.vMSVisitor.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.vMSPreApproval.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.vMSBlacklist.count({ where: { AND: [{ createdAt: { lt: cutoffDate } }, { isPermanent: false }] } }),
      prisma.vMSEmployeePass.count({ where: { createdAt: { lt: cutoffDate } } })
    ]);

    return {
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: RETENTION_DAYS,
      recordsToDelete: {
        workPermit: {
          permits: permitsCount,
          approvals: approvalsCount,
          actionHistory: actionHistoryCount,
          auditLogs: auditLogsCount,
          workers: workersCount,
          ssoTokens: ssoTokensCount
        },
        vms: {
          gatepasses: gatepassesCount,
          visitors: visitorsCount,
          preApprovals: preApprovalsCount,
          blacklist: blacklistCount,
          employeePasses: employeePassesCount
        }
      },
      totalToDelete: 
        permitsCount + approvalsCount + actionHistoryCount + auditLogsCount + 
        workersCount + ssoTokensCount + gatepassesCount + visitorsCount + 
        preApprovalsCount + blacklistCount + employeePassesCount
    };
  } catch (error) {
    console.error('[AutoDelete] Error getting stats:', error);
    throw error;
  }
};

module.exports = {
  runAutoDelete,
  deleteOldWorkPermitData,
  deleteOldVMSData,
  getAutoDeleteStats,
  RETENTION_DAYS,
  getCutoffDate
};
