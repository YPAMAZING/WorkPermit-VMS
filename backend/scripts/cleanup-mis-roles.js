/**
 * Complete Database Cleanup & Fix Script
 * 
 * This script:
 * 1. Removes ALL MIS-related roles from database
 * 2. Removes ALL MIS-related permissions from database
 * 3. Adds VMS permissions to database
 * 4. Updates ADMIN role to include VMS permissions
 * 5. Ensures all users have valid roles
 * 
 * Run with: node scripts/cleanup-mis-roles.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// MIS roles to delete
const MIS_ROLES = ['MIS_ADMIN', 'MIS_VERIFIER', 'MIS_VIEWER', 'SITE_ENGINEER'];

// MIS permissions to delete (anything with mis, meters, transmitters, reports prefix that's MIS-related)
const MIS_PERMISSION_PREFIXES = ['mis.', 'mis_', 'meters.', 'transmitters.', 'reports.'];

// VMS permissions to add
const VMS_PERMISSIONS = [
  { key: 'vms.dashboard.view', name: 'View VMS Dashboard', module: 'vms', action: 'view' },
  { key: 'vms.visitors.view', name: 'View Visitors', module: 'vms', action: 'view' },
  { key: 'vms.visitors.view_all', name: 'View All Visitors', module: 'vms', action: 'view' },
  { key: 'vms.visitors.view_own_company', name: 'View Own Company Visitors', module: 'vms', action: 'view' },
  { key: 'vms.visitors.create', name: 'Create Visitors', module: 'vms', action: 'create' },
  { key: 'vms.visitors.edit', name: 'Edit Visitors', module: 'vms', action: 'edit' },
  { key: 'vms.visitors.delete', name: 'Delete Visitors', module: 'vms', action: 'delete' },
  { key: 'vms.gatepasses.view', name: 'View Gatepasses', module: 'vms', action: 'view' },
  { key: 'vms.gatepasses.view_all', name: 'View All Gatepasses', module: 'vms', action: 'view' },
  { key: 'vms.gatepasses.view_own_company', name: 'View Own Company Gatepasses', module: 'vms', action: 'view' },
  { key: 'vms.gatepasses.create', name: 'Create Gatepasses', module: 'vms', action: 'create' },
  { key: 'vms.gatepasses.approve', name: 'Approve Gatepasses', module: 'vms', action: 'approve' },
  { key: 'vms.gatepasses.approve_own_company', name: 'Approve Own Company Gatepasses', module: 'vms', action: 'approve' },
  { key: 'vms.gatepasses.reject', name: 'Reject Gatepasses', module: 'vms', action: 'approve' },
  { key: 'vms.gatepasses.verify', name: 'Verify Gatepasses', module: 'vms', action: 'view' },
  { key: 'vms.checkin.view', name: 'View Check-ins', module: 'vms', action: 'view' },
  { key: 'vms.checkin.manage', name: 'Manage Check-ins', module: 'vms', action: 'edit' },
  { key: 'vms.preapproved.view', name: 'View Pre-approved Visitors', module: 'vms', action: 'view' },
  { key: 'vms.preapproved.create', name: 'Create Pre-approvals', module: 'vms', action: 'create' },
  { key: 'vms.blacklist.view', name: 'View Blacklist', module: 'vms', action: 'view' },
  { key: 'vms.blacklist.create', name: 'Add to Blacklist', module: 'vms', action: 'create' },
  { key: 'vms.blacklist.delete', name: 'Remove from Blacklist', module: 'vms', action: 'delete' },
  { key: 'vms.reports.view', name: 'View VMS Reports', module: 'vms', action: 'view' },
  { key: 'vms.reports.export', name: 'Export VMS Reports', module: 'vms', action: 'export' },
  { key: 'vms.settings.view', name: 'View VMS Settings', module: 'vms', action: 'view' },
  { key: 'vms.settings.edit', name: 'Edit VMS Settings', module: 'vms', action: 'edit' },
];

async function runCleanup() {
  console.log('🧹 Starting Complete Database Cleanup & Fix...\n');

  try {
    // ============================================
    // STEP 1: Delete MIS roles
    // ============================================
    console.log('📋 STEP 1: Removing MIS roles...');
    
    const requestorRole = await prisma.role.findUnique({
      where: { name: 'REQUESTOR' }
    });

    for (const roleName of MIS_ROLES) {
      const role = await prisma.role.findUnique({
        where: { name: roleName },
        include: { users: true }
      });

      if (role) {
        // Reassign users to REQUESTOR
        if (role.users.length > 0 && requestorRole) {
          console.log(`   Moving ${role.users.length} users from ${roleName} to REQUESTOR...`);
          await prisma.user.updateMany({
            where: { roleId: role.id },
            data: { roleId: requestorRole.id }
          });
        }

        // Delete the role
        await prisma.role.delete({ where: { id: role.id } });
        console.log(`   ✅ Deleted role: ${roleName}`);
      }
    }

    // ============================================
    // STEP 2: Delete MIS permissions from database
    // ============================================
    console.log('\n📋 STEP 2: Removing MIS permissions from database...');
    
    // Get all permissions
    const allPermissions = await prisma.permission.findMany();
    let deletedCount = 0;
    
    for (const perm of allPermissions) {
      const isMIS = MIS_PERMISSION_PREFIXES.some(prefix => perm.key.startsWith(prefix));
      if (isMIS) {
        await prisma.permission.delete({ where: { id: perm.id } });
        deletedCount++;
        console.log(`   🗑️  Deleted: ${perm.key}`);
      }
    }
    console.log(`   ✅ Deleted ${deletedCount} MIS permissions`);

    // ============================================
    // STEP 3: Clean MIS permissions from all roles
    // ============================================
    console.log('\n📋 STEP 3: Cleaning MIS permissions from existing roles...');
    
    const allRoles = await prisma.role.findMany();
    
    for (const role of allRoles) {
      try {
        const permissions = JSON.parse(role.permissions || '[]');
        const cleanedPermissions = permissions.filter(p => {
          return !MIS_PERMISSION_PREFIXES.some(prefix => p.startsWith(prefix));
        });
        
        if (permissions.length !== cleanedPermissions.length) {
          await prisma.role.update({
            where: { id: role.id },
            data: { permissions: JSON.stringify(cleanedPermissions) }
          });
          console.log(`   ✅ Cleaned ${permissions.length - cleanedPermissions.length} MIS permissions from ${role.name}`);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not parse permissions for ${role.name}`);
      }
    }

    // ============================================
    // STEP 4: Add VMS permissions to database
    // ============================================
    console.log('\n📋 STEP 4: Adding VMS permissions to database...');
    
    for (const perm of VMS_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: perm.key },
        update: perm,
        create: perm,
      });
    }
    console.log(`   ✅ Added/updated ${VMS_PERMISSIONS.length} VMS permissions`);

    // ============================================
    // STEP 5: Update ADMIN role with VMS permissions
    // ============================================
    console.log('\n📋 STEP 5: Updating ADMIN role with VMS permissions...');
    
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });

    if (adminRole) {
      const currentPerms = JSON.parse(adminRole.permissions || '[]');
      const vmsPermKeys = VMS_PERMISSIONS.map(p => p.key);
      const allPerms = [...new Set([...currentPerms, ...vmsPermKeys])];
      
      await prisma.role.update({
        where: { id: adminRole.id },
        data: { permissions: JSON.stringify(allPerms) }
      });
      console.log(`   ✅ ADMIN role now has ${allPerms.length} permissions (including VMS)`);
    }

    // ============================================
    // STEP 6: Ensure users without roles get REQUESTOR
    // ============================================
    console.log('\n📋 STEP 6: Fixing users without valid roles...');
    
    const usersWithoutRole = await prisma.user.findMany({
      where: { roleId: null }
    });

    if (usersWithoutRole.length > 0 && requestorRole) {
      await prisma.user.updateMany({
        where: { roleId: null },
        data: { roleId: requestorRole.id }
      });
      console.log(`   ✅ Assigned REQUESTOR role to ${usersWithoutRole.length} users`);
    } else {
      console.log(`   ✅ All users have valid roles`);
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(50));
    
    const remainingRoles = await prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📊 Current Roles:');
    for (const role of remainingRoles) {
      const perms = JSON.parse(role.permissions || '[]');
      console.log(`   - ${role.name} (${role.displayName}): ${role._count.users} users, ${perms.length} permissions`);
    }

    const remainingPermissions = await prisma.permission.findMany();
    console.log(`\n📊 Total Permissions in Database: ${remainingPermissions.length}`);
    
    const vmsPermsCount = remainingPermissions.filter(p => p.key.startsWith('vms.')).length;
    console.log(`   - VMS Permissions: ${vmsPermsCount}`);
    
    const misPermsCount = remainingPermissions.filter(p => 
      MIS_PERMISSION_PREFIXES.some(prefix => p.key.startsWith(prefix))
    ).length;
    console.log(`   - MIS Permissions: ${misPermsCount} (should be 0)`);

    const totalUsers = await prisma.user.count();
    const approvedUsers = await prisma.user.count({ where: { isApproved: true, isActive: true } });
    console.log(`\n📊 Users: ${approvedUsers} active / ${totalUsers} total`);

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runCleanup();
