/**
 * VMS Sync Service
 * 
 * SEPARATE USER TABLES APPROACH
 * 
 * Work Permit users (users table) and VMS users (vms_users table) are SEPARATE.
 * 
 * This service handles:
 * 1. When vms.admin permission is GRANTED to a Work Permit user:
 *    - Creates/activates a linked VMSUser with isFromWorkPermit=true
 *    - User can login to VMS with same credentials
 * 
 * 2. When vms.admin permission is REMOVED from a Work Permit user:
 *    - Deactivates the linked VMSUser (keeps data for history)
 *    - User can no longer login to VMS via SSO
 * 
 * NOTE: Regular VMS users (security guards, receptionists) are completely
 * independent and managed only within VMS.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// VMS Admin permissions
const VMS_ADMIN_PERMISSIONS = [
  'vms.dashboard.view',
  'vms.dashboard.stats',
  'vms.visitors.view',
  'vms.visitors.create',
  'vms.visitors.edit',
  'vms.visitors.delete',
  'vms.visitors.approve',
  'vms.gatepasses.view',
  'vms.gatepasses.create',
  'vms.gatepasses.approve',
  'vms.companies.view',
  'vms.companies.create',
  'vms.companies.edit',
  'vms.users.view',
  'vms.users.create',
  'vms.users.edit',
  'vms.roles.view',
  'vms.roles.edit',
  'vms.settings.view',
  'vms.settings.edit',
  'vms.reports.view',
];

/**
 * Check if permissions array includes vms.admin
 */
const userHasVMSAdmin = (permissions) => {
  if (!permissions) return false;
  
  let permArray;
  if (Array.isArray(permissions)) {
    permArray = permissions;
  } else {
    try {
      permArray = JSON.parse(permissions || '[]');
    } catch (e) {
      return false;
    }
  }
  
  return permArray.includes('vms.admin');
};

/**
 * Get or create VMS_ADMIN role
 */
const getOrCreateVMSAdminRole = async () => {
  let vmsAdminRole = await prisma.vMSRole.findUnique({
    where: { name: 'VMS_ADMIN' },
  });

  if (!vmsAdminRole) {
    console.log('📋 Creating VMS_ADMIN role...');
    vmsAdminRole = await prisma.vMSRole.create({
      data: {
        name: 'VMS_ADMIN',
        displayName: 'VMS Administrator',
        description: 'Full VMS system access (from Work Permit)',
        permissions: JSON.stringify(VMS_ADMIN_PERMISSIONS),
        isSystem: true,
      },
    });
    console.log('✅ VMS_ADMIN role created');
  }

  return vmsAdminRole;
};

/**
 * Create or activate VMS user for Work Permit admin
 * Called when vms.admin permission is granted
 */
const grantVMSAccess = async (workPermitUser) => {
  try {
    console.log(`\n🔓 Granting VMS access to: ${workPermitUser.email}`);

    // Get VMS_ADMIN role
    const vmsAdminRole = await getOrCreateVMSAdminRole();

    // Check if linked VMS user exists
    let vmsUser = await prisma.vMSUser.findUnique({
      where: { workPermitUserId: workPermitUser.id },
    });

    // Also check by email
    if (!vmsUser) {
      vmsUser = await prisma.vMSUser.findUnique({
        where: { email: workPermitUser.email },
      });
    }

    if (vmsUser) {
      // Activate existing VMS user
      vmsUser = await prisma.vMSUser.update({
        where: { id: vmsUser.id },
        data: {
          firstName: workPermitUser.firstName,
          lastName: workPermitUser.lastName,
          phone: workPermitUser.phone,
          password: workPermitUser.password, // Keep password synced
          vmsRoleId: vmsAdminRole.id,
          workPermitUserId: workPermitUser.id,
          isFromWorkPermit: true,
          isActive: true,
          isApproved: true,
        },
      });
      console.log(`✅ VMS user activated: ${vmsUser.email}`);
    } else {
      // Create new linked VMS user
      vmsUser = await prisma.vMSUser.create({
        data: {
          email: workPermitUser.email,
          password: workPermitUser.password,
          firstName: workPermitUser.firstName,
          lastName: workPermitUser.lastName,
          phone: workPermitUser.phone,
          vmsRoleId: vmsAdminRole.id,
          workPermitUserId: workPermitUser.id,
          isFromWorkPermit: true,
          isActive: true,
          isApproved: true,
        },
      });
      console.log(`✅ VMS user created: ${vmsUser.email}`);
    }

    // Also update hasVMSAccess flag on Work Permit user
    await prisma.user.update({
      where: { id: workPermitUser.id },
      data: { hasVMSAccess: true },
    });

    return { success: true, vmsUser };
  } catch (error) {
    console.error(`❌ Error granting VMS access: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Deactivate VMS user for Work Permit admin
 * Called when vms.admin permission is removed
 */
const revokeVMSAccess = async (workPermitUser) => {
  try {
    console.log(`\n🔒 Revoking VMS access from: ${workPermitUser.email}`);

    // Find linked VMS user
    let vmsUser = await prisma.vMSUser.findUnique({
      where: { workPermitUserId: workPermitUser.id },
    });

    if (!vmsUser) {
      vmsUser = await prisma.vMSUser.findUnique({
        where: { email: workPermitUser.email },
      });
    }

    if (vmsUser && vmsUser.isFromWorkPermit) {
      // Deactivate VMS user (don't delete - keep history)
      await prisma.vMSUser.update({
        where: { id: vmsUser.id },
        data: {
          isActive: false,
          isApproved: false,
        },
      });
      console.log(`✅ VMS user deactivated: ${workPermitUser.email}`);
    } else {
      console.log(`ℹ️ No linked VMS user found for: ${workPermitUser.email}`);
    }

    // Update hasVMSAccess flag on Work Permit user
    await prisma.user.update({
      where: { id: workPermitUser.id },
      data: { hasVMSAccess: false },
    });

    return { success: true };
  } catch (error) {
    console.error(`❌ Error revoking VMS access: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Sync a single user's VMS access based on their role permissions
 */
const syncUserVMSAccess = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const permissions = user.role?.permissions || '[]';
    const hasVMSAdmin = userHasVMSAdmin(permissions);

    if (hasVMSAdmin) {
      return await grantVMSAccess(user);
    } else {
      return await revokeVMSAccess(user);
    }
  } catch (error) {
    console.error(`❌ Error syncing user VMS access: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Sync all users of a role when role permissions change
 */
const syncRoleUsersVMSAccess = async (roleId, newPermissions) => {
  try {
    console.log(`\n🔄 Syncing VMS access for role: ${roleId}`);

    const hasVMSAdmin = userHasVMSAdmin(newPermissions);
    console.log(`📋 Role ${hasVMSAdmin ? 'HAS' : 'does NOT have'} vms.admin permission`);

    // Get all Work Permit users with this role
    const users = await prisma.user.findMany({
      where: { roleId },
    });

    console.log(`📋 Found ${users.length} users with this role`);

    let synced = 0;
    for (const user of users) {
      const result = hasVMSAdmin 
        ? await grantVMSAccess(user)
        : await revokeVMSAccess(user);
      
      if (result.success) synced++;
    }

    console.log(`✅ Synced ${synced}/${users.length} users`);
    return { success: true, synced, total: users.length };
  } catch (error) {
    console.error(`❌ Error syncing role users: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Sync user when their role changes
 */
const syncUserRoleChange = async (userId, newRoleId) => {
  try {
    const newRole = newRoleId 
      ? await prisma.role.findUnique({ where: { id: newRoleId } })
      : null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const hasVMSAdmin = newRole ? userHasVMSAdmin(newRole.permissions) : false;

    if (hasVMSAdmin) {
      return await grantVMSAccess(user);
    } else {
      return await revokeVMSAccess(user);
    }
  } catch (error) {
    console.error(`❌ Error syncing user role change: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Legacy exports for backward compatibility
const addUserToVMS = grantVMSAccess;
const removeUserFromVMS = revokeVMSAccess;

module.exports = {
  grantVMSAccess,
  revokeVMSAccess,
  syncUserVMSAccess,
  syncRoleUsersVMSAccess,
  syncUserRoleChange,
  userHasVMSAdmin,
  getOrCreateVMSAdminRole,
  VMS_ADMIN_PERMISSIONS,
  
  // Legacy
  addUserToVMS,
  removeUserFromVMS,
};
