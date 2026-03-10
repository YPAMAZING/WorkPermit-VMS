/**
 * Auto-Delete Service
 * Automatically deletes visitor/permit data older than 90 days (3 months)
 * 
 * ✅ DELETED (after 90 days):
 * - Work Permit System: PermitRequest, PermitApproval, PermitActionHistory
 * - VMS (Main DB): VMSVisitor, VMSGatepass, VMSPreApproval, VMSBlacklist (non-permanent), VMSEmployeePass
 * - VMS (Second DB): Visitor, Gatepass, CheckInRequest, PreApprovedVisitor, BlacklistEntry (non-permanent)
 * 
 * ❌ NOT DELETED (preserved forever):
 * - Users, Roles, Permissions (system accounts)
 * - Companies, Departments (master data)
 * - SystemSettings, AuditLogs (system config & logs)
 * - Workers (kept for reference)
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaClient: VMSPrismaClient } = require('../../node_modules/.prisma/vms-client');

// Main database (Work Permit + VMS models)
const prisma = new PrismaClient();

// Second VMS database (multi-tenant VMS)
const vmsPrisma = new VMSPrismaClient();

// 90 days retention period
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
 * Delete old Work Permit data (Main DB)
 * Only permits and related approval data - NOT users, roles, workers
 */
const deleteOldWorkPermitData = async () => {
  const cutoffDate = getCutoffDate();
  const results = {
    permits: 0,
    approvals: 0,
    actionHistory: 0
  };

  try {
    console.log(`[AutoDelete] Starting Work Permit cleanup for data older than ${cutoffDate.toISOString()}`);

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

    console.log('[AutoDelete] Work Permit cleanup completed:', results);
    return results;
  } catch (error) {
    console.error('[AutoDelete] Error deleting Work Permit data:', error);
    throw error;
  }
};

/**
 * Delete old VMS data from Main DB
 * Only visitor/gatepass data - NOT users, roles, companies
 */
const deleteOldVMSMainData = async () => {
  const cutoffDate = getCutoffDate();
  const results = {
    gatepasses: 0,
    visitors: 0,
    preApprovals: 0,
    blacklist: 0,
    employeePasses: 0
  };

  try {
    console.log(`[AutoDelete] Starting VMS (Main DB) cleanup for data older than ${cutoffDate.toISOString()}`);

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

    console.log('[AutoDelete] VMS (Main DB) cleanup completed:', results);
    return results;
  } catch (error) {
    console.error('[AutoDelete] Error deleting VMS (Main DB) data:', error);
    throw error;
  }
};

/**
 * Delete old VMS data from Second DB (Multi-tenant VMS)
 * Only visitor/gatepass data - NOT users, roles, companies, departments
 */
const deleteOldVMSSecondData = async () => {
  const cutoffDate = getCutoffDate();
  const results = {
    gatepasses: 0,
    visitors: 0,
    checkInRequests: 0,
    preApprovedVisitors: 0,
    blacklistEntries: 0
  };

  try {
    console.log(`[AutoDelete] Starting VMS (Second DB) cleanup for data older than ${cutoffDate.toISOString()}`);

    // 1. Delete old gatepasses (must delete before visitors due to FK constraint)
    const gatepassesResult = await vmsPrisma.gatepass.deleteMany({
      where: {
        updatedAt: { lt: cutoffDate }
      }
    });
    results.gatepasses = gatepassesResult.count;

    // 2. Delete old visitors (after gatepasses are deleted)
    const visitorsResult = await vmsPrisma.visitor.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.visitors = visitorsResult.count;

    // 3. Delete old check-in requests
    const checkInRequestsResult = await vmsPrisma.checkInRequest.deleteMany({
      where: {
        submittedAt: { lt: cutoffDate }
      }
    });
    results.checkInRequests = checkInRequestsResult.count;

    // 4. Delete old pre-approved visitors
    const preApprovedResult = await vmsPrisma.preApprovedVisitor.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    results.preApprovedVisitors = preApprovedResult.count;

    // 5. Delete old blacklist entries (only non-active/expired ones to be safe)
    const blacklistResult = await vmsPrisma.blacklistEntry.deleteMany({
      where: {
        AND: [
          { createdAt: { lt: cutoffDate } },
          { isActive: false }
        ]
      }
    });
    results.blacklistEntries = blacklistResult.count;

    console.log('[AutoDelete] VMS (Second DB) cleanup completed:', results);
    return results;
  } catch (error) {
    console.error('[AutoDelete] Error deleting VMS (Second DB) data:', error);
    // Don't throw - second DB might not be configured
    return results;
  }
};

/**
 * Run full auto-delete cleanup for all systems
 */
const runAutoDelete = async () => {
  console.log(`[AutoDelete] ========================================`);
  console.log(`[AutoDelete] Starting auto-delete process at ${new Date().toISOString()}`);
  console.log(`[AutoDelete] Retention period: ${RETENTION_DAYS} days`);
  console.log(`[AutoDelete] Cutoff date: ${getCutoffDate().toISOString()}`);
  console.log(`[AutoDelete] ========================================`);

  try {
    // Delete from Main DB
    const workPermitResults = await deleteOldWorkPermitData();
    const vmsMainResults = await deleteOldVMSMainData();
    
    // Delete from Second VMS DB
    const vmsSecondResults = await deleteOldVMSSecondData();

    const summary = {
      timestamp: new Date().toISOString(),
      retentionDays: RETENTION_DAYS,
      cutoffDate: getCutoffDate().toISOString(),
      workPermit: workPermitResults,
      vmsMain: vmsMainResults,
      vmsSecond: vmsSecondResults,
      totalDeleted: 
        workPermitResults.permits + 
        workPermitResults.approvals + 
        workPermitResults.actionHistory + 
        vmsMainResults.gatepasses + 
        vmsMainResults.visitors + 
        vmsMainResults.preApprovals + 
        vmsMainResults.blacklist + 
        vmsMainResults.employeePasses +
        vmsSecondResults.gatepasses +
        vmsSecondResults.visitors +
        vmsSecondResults.checkInRequests +
        vmsSecondResults.preApprovedVisitors +
        vmsSecondResults.blacklistEntries
    };

    console.log(`[AutoDelete] ========================================`);
    console.log(`[AutoDelete] Auto-delete completed successfully`);
    console.log(`[AutoDelete] Total records deleted: ${summary.totalDeleted}`);
    console.log(`[AutoDelete] - Work Permits: ${workPermitResults.permits}`);
    console.log(`[AutoDelete] - VMS Main Visitors: ${vmsMainResults.visitors}`);
    console.log(`[AutoDelete] - VMS Second Visitors: ${vmsSecondResults.visitors}`);
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
    // Main DB counts
    const [
      permitsCount,
      approvalsCount,
      actionHistoryCount,
      vmsGatepassesCount,
      vmsVisitorsCount,
      vmsPreApprovalsCount,
      vmsBlacklistCount,
      vmsEmployeePassesCount
    ] = await Promise.all([
      prisma.permitRequest.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.permitApproval.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.permitActionHistory.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.vMSGatepass.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.vMSVisitor.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.vMSPreApproval.count({ where: { createdAt: { lt: cutoffDate } } }),
      prisma.vMSBlacklist.count({ where: { AND: [{ createdAt: { lt: cutoffDate } }, { isPermanent: false }] } }),
      prisma.vMSEmployeePass.count({ where: { createdAt: { lt: cutoffDate } } })
    ]);

    // Second VMS DB counts (with error handling)
    let vms2Counts = { gatepasses: 0, visitors: 0, checkInRequests: 0, preApproved: 0, blacklist: 0 };
    try {
      const [gp, v, cir, pav, bl] = await Promise.all([
        vmsPrisma.gatepass.count({ where: { updatedAt: { lt: cutoffDate } } }),
        vmsPrisma.visitor.count({ where: { createdAt: { lt: cutoffDate } } }),
        vmsPrisma.checkInRequest.count({ where: { submittedAt: { lt: cutoffDate } } }),
        vmsPrisma.preApprovedVisitor.count({ where: { createdAt: { lt: cutoffDate } } }),
        vmsPrisma.blacklistEntry.count({ where: { AND: [{ createdAt: { lt: cutoffDate } }, { isActive: false }] } })
      ]);
      vms2Counts = { gatepasses: gp, visitors: v, checkInRequests: cir, preApproved: pav, blacklist: bl };
    } catch (e) {
      console.log('[AutoDelete] Second VMS DB not available for stats');
    }

    return {
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: RETENTION_DAYS,
      recordsToDelete: {
        workPermit: {
          permits: permitsCount,
          approvals: approvalsCount,
          actionHistory: actionHistoryCount
        },
        vmsMain: {
          gatepasses: vmsGatepassesCount,
          visitors: vmsVisitorsCount,
          preApprovals: vmsPreApprovalsCount,
          blacklist: vmsBlacklistCount,
          employeePasses: vmsEmployeePassesCount
        },
        vmsSecond: vms2Counts
      },
      totalToDelete: 
        permitsCount + approvalsCount + actionHistoryCount + 
        vmsGatepassesCount + vmsVisitorsCount + vmsPreApprovalsCount + 
        vmsBlacklistCount + vmsEmployeePassesCount +
        vms2Counts.gatepasses + vms2Counts.visitors + vms2Counts.checkInRequests +
        vms2Counts.preApproved + vms2Counts.blacklist
    };
  } catch (error) {
    console.error('[AutoDelete] Error getting stats:', error);
    throw error;
  }
};

module.exports = {
  runAutoDelete,
  deleteOldWorkPermitData,
  deleteOldVMSMainData,
  deleteOldVMSSecondData,
  getAutoDeleteStats,
  RETENTION_DAYS,
  getCutoffDate
};
