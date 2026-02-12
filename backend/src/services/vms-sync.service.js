/**
 * VMS Sync Service
 * 
 * SIMPLIFIED VERSION - Uses SINGLE database
 * 
 * When vms.admin permission is granted/removed:
 * - Updates hasVMSAccess flag on User model
 * - No separate database sync needed
 * 
 * This ensures:
 * - Single source of truth
 * - No sync failures
 * - Instant VMS access changes
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Check if user has vms.admin permission
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
 * Grant VMS access to a user (set hasVMSAccess = true)
 */
const grantVMSAccess = async (userId) => {
  try {
    console.log(`🔓 Granting VMS access to user: ${userId}`);
    
    await prisma.user.update({
      where: { id: userId },
      data: { hasVMSAccess: true },
    });
    
    console.log(`✅ VMS access granted to user: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error granting VMS access: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Revoke VMS access from a user (set hasVMSAccess = false)
 */
const revokeVMSAccess = async (userId) => {
  try {
    console.log(`🔒 Revoking VMS access from user: ${userId}`);
    
    await prisma.user.update({
      where: { id: userId },
      data: { hasVMSAccess: false },
    });
    
    console.log(`✅ VMS access revoked from user: ${userId}`);
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

    console.log(`🔄 Syncing VMS access for ${user.email}: hasVMSAdmin=${hasVMSAdmin}`);

    if (hasVMSAdmin && !user.hasVMSAccess) {
      return await grantVMSAccess(userId);
    } else if (!hasVMSAdmin && user.hasVMSAccess) {
      return await revokeVMSAccess(userId);
    }

    return { success: true, unchanged: true };
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
    console.log(`\n🔄 Syncing VMS access for all users with role: ${roleId}`);

    const hasVMSAdmin = userHasVMSAdmin(newPermissions);
    console.log(`📋 Role has vms.admin: ${hasVMSAdmin}`);

    // Get all users with this role
    const users = await prisma.user.findMany({
      where: { roleId },
      select: { id: true, email: true, hasVMSAccess: true },
    });

    console.log(`📋 Found ${users.length} users with this role`);

    let updated = 0;
    for (const user of users) {
      // Only update if needed
      if (hasVMSAdmin && !user.hasVMSAccess) {
        await prisma.user.update({
          where: { id: user.id },
          data: { hasVMSAccess: true },
        });
        console.log(`  ✅ Granted VMS access to: ${user.email}`);
        updated++;
      } else if (!hasVMSAdmin && user.hasVMSAccess) {
        await prisma.user.update({
          where: { id: user.id },
          data: { hasVMSAccess: false },
        });
        console.log(`  🔒 Revoked VMS access from: ${user.email}`);
        updated++;
      }
    }

    console.log(`✅ Updated ${updated}/${users.length} users`);
    return { success: true, synced: updated, total: users.length };
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
    // Get the new role's permissions
    const newRole = newRoleId ? await prisma.role.findUnique({
      where: { id: newRoleId },
    }) : null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const hasVMSAdmin = newRole ? userHasVMSAdmin(newRole.permissions) : false;
    console.log(`🔄 User ${user.email} role changed, hasVMSAdmin: ${hasVMSAdmin}`);

    if (hasVMSAdmin && !user.hasVMSAccess) {
      return await grantVMSAccess(userId);
    } else if (!hasVMSAdmin && user.hasVMSAccess) {
      return await revokeVMSAccess(userId);
    }

    return { success: true, unchanged: true };
  } catch (error) {
    console.error(`❌ Error syncing user role change: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Legacy exports for backward compatibility
const addUserToVMS = async (user) => {
  return await grantVMSAccess(user.id);
};

const removeUserFromVMS = async (user) => {
  return await revokeVMSAccess(user.id);
};

module.exports = {
  // New simplified functions
  grantVMSAccess,
  revokeVMSAccess,
  syncUserVMSAccess,
  syncRoleUsersVMSAccess,
  syncUserRoleChange,
  userHasVMSAdmin,
  
  // Legacy exports (for backward compatibility)
  addUserToVMS,
  removeUserFromVMS,
};
