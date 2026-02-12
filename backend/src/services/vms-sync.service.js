/**
 * VMS Sync Service
 * Automatically syncs users between Work Permit and VMS databases
 * based on vms.admin permission
 * 
 * NOTE: This service attempts to sync to VMS database if configured.
 * If VMS database is not available, it logs a warning and continues.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Try to load VMS Prisma client - but don't fail if it's not available
let vmsPrisma = null;
try {
  vmsPrisma = require('../config/vms-prisma');
  console.log('✅ VMS Prisma client loaded');
} catch (error) {
  console.log('⚠️ VMS database not configured - VMS sync will be skipped');
  console.log('   To enable VMS sync, configure VMS_DATABASE_URL in .env');
}

// VMS Full Permissions (for VMS_ADMIN role)
const VMS_ADMIN_PERMISSIONS = [
  'vms.dashboard.view',
  'vms.dashboard.stats',
  'vms.visitors.view',
  'vms.visitors.view_all',
  'vms.visitors.create',
  'vms.visitors.edit',
  'vms.visitors.delete',
  'vms.gatepasses.view',
  'vms.gatepasses.create',
  'vms.gatepasses.edit',
  'vms.gatepasses.approve',
  'vms.gatepasses.cancel',
  'vms.checkin.view',
  'vms.checkin.approve',
  'vms.checkin.reject',
  'vms.checkin.manage',
  'vms.preapproved.view',
  'vms.preapproved.create',
  'vms.preapproved.edit',
  'vms.preapproved.delete',
  'vms.blacklist.view',
  'vms.blacklist.manage',
  'vms.companies.view',
  'vms.companies.create',
  'vms.companies.edit',
  'vms.companies.delete',
  'vms.users.view',
  'vms.users.create',
  'vms.users.edit',
  'vms.users.delete',
  'vms.roles.view',
  'vms.roles.create',
  'vms.roles.edit',
  'vms.roles.delete',
  'vms.settings.view',
  'vms.settings.edit',
  'vms.reports.view',
  'vms.reports.export',
  'vms.audit.view',
];

/**
 * Check if VMS database is available
 */
const isVMSAvailable = () => {
  return vmsPrisma !== null;
};

/**
 * Get or create VMS_ADMIN role in VMS database
 */
const getOrCreateVMSAdminRole = async () => {
  if (!isVMSAvailable()) {
    console.log('⚠️ VMS database not available - skipping role creation');
    return null;
  }

  try {
    let vmsAdminRole = await vmsPrisma.role.findUnique({
      where: { name: 'VMS_ADMIN' },
    });

    if (!vmsAdminRole) {
      console.log('📋 Creating VMS_ADMIN role in VMS database...');
      vmsAdminRole = await vmsPrisma.role.create({
        data: {
          id: uuidv4(),
          name: 'VMS_ADMIN',
          displayName: 'VMS Administrator',
          description: 'Full VMS system access (synced from Work Permit)',
          permissions: JSON.stringify(VMS_ADMIN_PERMISSIONS),
          uiConfig: JSON.stringify({
            theme: 'admin',
            primaryColor: '#3b82f6',
            showAllMenus: true,
          }),
          isSystem: true,
          isActive: true,
        },
      });
      console.log('✅ VMS_ADMIN role created');
    }

    return vmsAdminRole;
  } catch (error) {
    console.error('⚠️ Error creating VMS_ADMIN role:', error.message);
    return null;
  }
};

/**
 * Add user to VMS database (when vms.admin permission is granted)
 */
const addUserToVMS = async (workPermitUser) => {
  if (!isVMSAvailable()) {
    console.log(`⚠️ VMS database not available - skipping sync for: ${workPermitUser.email}`);
    return { success: true, skipped: true, message: 'VMS database not configured' };
  }

  try {
    console.log(`\n🔄 Syncing user to VMS: ${workPermitUser.email}`);

    // Get VMS_ADMIN role
    const vmsAdminRole = await getOrCreateVMSAdminRole();
    if (!vmsAdminRole) {
      return { success: false, error: 'Failed to get/create VMS_ADMIN role' };
    }

    // Check if user already exists in VMS
    let vmsUser = await vmsPrisma.user.findUnique({
      where: { email: workPermitUser.email },
    });

    if (vmsUser) {
      // User exists - activate and update role
      vmsUser = await vmsPrisma.user.update({
        where: { id: vmsUser.id },
        data: {
          firstName: workPermitUser.firstName,
          lastName: workPermitUser.lastName,
          roleId: vmsAdminRole.id,
          isActive: true,
          isApproved: true,
        },
      });
      console.log(`✅ VMS user activated: ${vmsUser.email}`);
    } else {
      // Create new VMS user
      vmsUser = await vmsPrisma.user.create({
        data: {
          id: uuidv4(),
          email: workPermitUser.email,
          password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
          firstName: workPermitUser.firstName,
          lastName: workPermitUser.lastName,
          phone: workPermitUser.phone || null,
          roleId: vmsAdminRole.id,
          isActive: true,
          isApproved: true,
        },
      });
      console.log(`✅ VMS user created: ${vmsUser.email}`);
    }

    // Log audit
    try {
      await vmsPrisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId: vmsUser.id,
          action: 'VMS_ACCESS_GRANTED',
          entity: 'user',
          entityId: vmsUser.id,
          newValue: JSON.stringify({ source: 'work_permit_sync', workPermitUserId: workPermitUser.id }),
        },
      });
    } catch (e) {
      // Ignore audit log errors
    }

    return { success: true, vmsUser };
  } catch (error) {
    console.error(`❌ Error syncing user to VMS: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Remove/deactivate user from VMS database (when vms.admin permission is removed)
 */
const removeUserFromVMS = async (workPermitUser) => {
  if (!isVMSAvailable()) {
    console.log(`⚠️ VMS database not available - skipping removal for: ${workPermitUser.email}`);
    return { success: true, skipped: true, message: 'VMS database not configured' };
  }

  try {
    console.log(`\n🔄 Removing VMS access for: ${workPermitUser.email}`);

    // Find user in VMS
    const vmsUser = await vmsPrisma.user.findUnique({
      where: { email: workPermitUser.email },
    });

    if (!vmsUser) {
      console.log(`ℹ️ User not found in VMS database: ${workPermitUser.email}`);
      return { success: true, message: 'User not in VMS' };
    }

    // Deactivate user (don't delete - keep history)
    await vmsPrisma.user.update({
      where: { id: vmsUser.id },
      data: {
        isActive: false,
        isApproved: false,
      },
    });

    console.log(`✅ VMS user deactivated: ${workPermitUser.email}`);

    // Log audit
    try {
      await vmsPrisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId: vmsUser.id,
          action: 'VMS_ACCESS_REVOKED',
          entity: 'user',
          entityId: vmsUser.id,
          newValue: JSON.stringify({ source: 'work_permit_sync', workPermitUserId: workPermitUser.id }),
        },
      });
    } catch (e) {
      // Ignore audit log errors
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Error removing user from VMS: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user has vms.admin permission
 */
const userHasVMSAdmin = (permissions) => {
  if (!permissions) return false;
  const permArray = Array.isArray(permissions) ? permissions : JSON.parse(permissions || '[]');
  return permArray.includes('vms.admin');
};

/**
 * Sync a single user based on their current permissions
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
      return await addUserToVMS(user);
    } else {
      return await removeUserFromVMS(user);
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
    console.log(`\n🔄 Syncing VMS access for all users with role: ${roleId}`);

    const hasVMSAdmin = userHasVMSAdmin(newPermissions);

    // Get all users with this role
    const users = await prisma.user.findMany({
      where: { roleId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });

    console.log(`📋 Found ${users.length} users with this role`);

    const results = [];
    for (const user of users) {
      if (hasVMSAdmin) {
        results.push(await addUserToVMS(user));
      } else {
        results.push(await removeUserFromVMS(user));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Synced ${successCount}/${users.length} users`);

    return { success: true, synced: successCount, total: users.length };
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

    if (hasVMSAdmin) {
      return await addUserToVMS(user);
    } else {
      return await removeUserFromVMS(user);
    }
  } catch (error) {
    console.error(`❌ Error syncing user role change: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  addUserToVMS,
  removeUserFromVMS,
  syncUserVMSAccess,
  syncRoleUsersVMSAccess,
  syncUserRoleChange,
  userHasVMSAdmin,
  getOrCreateVMSAdminRole,
  isVMSAvailable,
  VMS_ADMIN_PERMISSIONS,
};
