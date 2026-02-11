/**
 * Complete Database Cleanup & Fix Script
 * 
 * This script:
 * 1. Removes ALL MIS-related roles from database
 * 2. Removes ALL MIS-related permissions from database
 * 3. Adds VMS permissions to database
 * 4. Updates ADMIN role to include VMS permissions
 * 5. Ensures all users have valid roles
 * 6. Ensures admin user exists
 * 
 * Run with: node scripts/cleanup-mis-roles.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// MIS roles to delete
const MIS_ROLES = ['MIS_ADMIN', 'MIS_VERIFIER', 'MIS_VIEWER', 'SITE_ENGINEER'];

// MIS permissions to delete
const MIS_PERMISSION_PREFIXES = ['mis.', 'mis_', 'meters.', 'transmitters.'];

// Work Permit permissions
const WORK_PERMIT_PERMISSIONS = [
  { key: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
  { key: 'dashboard.stats', name: 'View Statistics', module: 'dashboard', action: 'view' },
  { key: 'permits.view', name: 'View Permits', module: 'permits', action: 'view' },
  { key: 'permits.view_all', name: 'View All Permits', module: 'permits', action: 'view' },
  { key: 'permits.view_own', name: 'View Own Permits', module: 'permits', action: 'view' },
  { key: 'permits.create', name: 'Create Permits', module: 'permits', action: 'create' },
  { key: 'permits.edit', name: 'Edit Permits', module: 'permits', action: 'edit' },
  { key: 'permits.edit_own', name: 'Edit Own Permits', module: 'permits', action: 'edit' },
  { key: 'permits.delete', name: 'Delete Permits', module: 'permits', action: 'delete' },
  { key: 'permits.export', name: 'Export Permits PDF', module: 'permits', action: 'export' },
  { key: 'permits.extend', name: 'Extend Permits', module: 'permits', action: 'edit' },
  { key: 'permits.revoke', name: 'Revoke Permits', module: 'permits', action: 'edit' },
  { key: 'permits.close', name: 'Close Permits', module: 'permits', action: 'edit' },
  { key: 'permits.reapprove', name: 'Re-Approve Revoked Permits', module: 'permits', action: 'edit' },
  { key: 'permits.transfer', name: 'Transfer Permits', module: 'permits', action: 'edit' },
  { key: 'approvals.view', name: 'View Approvals', module: 'approvals', action: 'view' },
  { key: 'approvals.approve', name: 'Approve/Reject Permits', module: 'approvals', action: 'approve' },
  { key: 'approvals.sign', name: 'Sign Approvals', module: 'approvals', action: 'approve' },
  { key: 'approvals.reapprove', name: 'Re-Approve Revoked Permits', module: 'approvals', action: 'approve' },
  { key: 'workers.view', name: 'View Workers', module: 'workers', action: 'view' },
  { key: 'workers.create', name: 'Create Workers', module: 'workers', action: 'create' },
  { key: 'workers.edit', name: 'Edit Workers', module: 'workers', action: 'edit' },
  { key: 'workers.delete', name: 'Delete Workers', module: 'workers', action: 'delete' },
  { key: 'workers.qr', name: 'Generate Worker QR', module: 'workers', action: 'view' },
  { key: 'users.view', name: 'View Users', module: 'users', action: 'view' },
  { key: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
  { key: 'users.edit', name: 'Edit Users', module: 'users', action: 'edit' },
  { key: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
  { key: 'users.assign_role', name: 'Assign Roles to Users', module: 'users', action: 'edit' },
  { key: 'roles.view', name: 'View Roles', module: 'roles', action: 'view' },
  { key: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create' },
  { key: 'roles.edit', name: 'Edit Roles', module: 'roles', action: 'edit' },
  { key: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
  { key: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
  { key: 'settings.edit', name: 'Edit Settings', module: 'settings', action: 'edit' },
  { key: 'settings.system', name: 'System Settings', module: 'settings', action: 'edit' },
  { key: 'audit.view', name: 'View Audit Logs', module: 'audit', action: 'view' },
];

// VMS permissions
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

const ALL_PERMISSIONS = [...WORK_PERMIT_PERMISSIONS, ...VMS_PERMISSIONS];

async function runCleanup() {
  console.log('🧹 Starting Complete Database Cleanup & Fix...\n');

  try {
    // ============================================
    // STEP 1: Delete MIS roles
    // ============================================
    console.log('📋 STEP 1: Removing MIS roles...');
    
    let requestorRole = await prisma.role.findUnique({
      where: { name: 'REQUESTOR' }
    });

    for (const roleName of MIS_ROLES) {
      const role = await prisma.role.findUnique({
        where: { name: roleName },
        include: { users: true }
      });

      if (role) {
        if (role.users.length > 0 && requestorRole) {
          console.log(`   Moving ${role.users.length} users from ${roleName} to REQUESTOR...`);
          await prisma.user.updateMany({
            where: { roleId: role.id },
            data: { roleId: requestorRole.id }
          });
        }
        await prisma.role.delete({ where: { id: role.id } });
        console.log(`   ✅ Deleted role: ${roleName}`);
      }
    }

    // ============================================
    // STEP 2: Delete ALL permissions and recreate
    // ============================================
    console.log('\n📋 STEP 2: Cleaning and recreating permissions...');
    
    await prisma.permission.deleteMany({});
    console.log('   🗑️  Deleted all existing permissions');

    for (const perm of ALL_PERMISSIONS) {
      await prisma.permission.create({ data: perm });
    }
    console.log(`   ✅ Created ${ALL_PERMISSIONS.length} clean permissions`);

    // ============================================
    // STEP 3: Update roles with clean permissions
    // ============================================
    console.log('\n📋 STEP 3: Updating roles with clean permissions...');
    
    const allRoles = await prisma.role.findMany();
    const allPermKeys = ALL_PERMISSIONS.map(p => p.key);
    
    for (const role of allRoles) {
      try {
        const oldPerms = JSON.parse(role.permissions || '[]');
        const cleanedPerms = oldPerms.filter(p => allPermKeys.includes(p));
        
        if (role.name === 'ADMIN') {
          await prisma.role.update({
            where: { id: role.id },
            data: { permissions: JSON.stringify(allPermKeys) }
          });
          console.log(`   ✅ ADMIN role updated with ${allPermKeys.length} permissions`);
        } else if (cleanedPerms.length !== oldPerms.length) {
          await prisma.role.update({
            where: { id: role.id },
            data: { permissions: JSON.stringify(cleanedPerms) }
          });
          console.log(`   ✅ Cleaned ${role.name}: ${oldPerms.length} → ${cleanedPerms.length} permissions`);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not update ${role.name}:`, e.message);
      }
    }

    // ============================================
    // STEP 4: Ensure ADMIN role exists
    // ============================================
    console.log('\n📋 STEP 4: Ensuring ADMIN role exists...');
    
    let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          displayName: 'Administrator',
          description: 'Full system access with all permissions',
          isSystem: true,
          permissions: JSON.stringify(allPermKeys),
          uiConfig: JSON.stringify({
            theme: 'default',
            sidebarColor: 'slate',
            accentColor: 'emerald',
            showAllMenus: true,
          }),
        }
      });
      console.log('   ✅ Created ADMIN role');
    } else {
      console.log('   ✅ ADMIN role exists');
    }

    // ============================================
    // STEP 5: Ensure admin user exists (basic fields only)
    // ============================================
    console.log('\n📋 STEP 5: Ensuring admin user exists...');
    
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@permitmanager.com' }
    });

    const adminPassword = await bcrypt.hash('admin123', 10);

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@permitmanager.com',
          password: adminPassword,
          firstName: 'System',
          lastName: 'Administrator',
          roleId: adminRole.id,
          department: 'IT',
          isApproved: true,
          isActive: true,
          approvedAt: new Date(),
        }
      });
      console.log('   ✅ Created admin user: admin@permitmanager.com / admin123');
    } else {
      // Update only basic fields
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          roleId: adminRole.id,
          isApproved: true,
          isActive: true,
          password: adminPassword,
        }
      });
      console.log('   ✅ Updated admin user: admin@permitmanager.com / admin123');
    }

    // ============================================
    // STEP 6: Fix users without roles
    // ============================================
    console.log('\n📋 STEP 6: Fixing users without valid roles...');
    
    requestorRole = await prisma.role.findUnique({ where: { name: 'REQUESTOR' } });

    if (!requestorRole) {
      requestorRole = await prisma.role.create({
        data: {
          name: 'REQUESTOR',
          displayName: 'Requestor',
          description: 'Can create and view own permits',
          isSystem: true,
          permissions: JSON.stringify([
            'dashboard.view',
            'permits.view', 'permits.view_own', 'permits.create', 'permits.edit_own', 'permits.export',
            'workers.view', 'workers.qr',
            'settings.view',
          ]),
          uiConfig: JSON.stringify({ theme: 'default', sidebarColor: 'slate', accentColor: 'primary' }),
        }
      });
      console.log('   ✅ Created REQUESTOR role');
    }

    const usersWithoutRole = await prisma.user.findMany({ where: { roleId: null } });
    if (usersWithoutRole.length > 0) {
      await prisma.user.updateMany({
        where: { roleId: null },
        data: { roleId: requestorRole.id }
      });
      console.log(`   ✅ Assigned REQUESTOR role to ${usersWithoutRole.length} users`);
    } else {
      console.log('   ✅ All users have valid roles');
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(60));
    
    const remainingRoles = await prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📊 Current Roles:');
    for (const role of remainingRoles) {
      const perms = JSON.parse(role.permissions || '[]');
      console.log(`   - ${role.name}: ${role._count.users} users, ${perms.length} permissions`);
    }

    const totalPerms = await prisma.permission.count();
    console.log(`\n📊 Total Permissions: ${totalPerms}`);

    const totalUsers = await prisma.user.count({ where: { isApproved: true, isActive: true } });
    console.log(`📊 Active Users: ${totalUsers}`);

    console.log('\n🔑 Admin Credentials:');
    console.log('   Email: admin@permitmanager.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runCleanup();
