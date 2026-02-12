#!/usr/bin/env node
/**
 * Complete Setup Script for WorkPermit-VMS
 * 
 * SEPARATE USER TABLES:
 * - Work Permit users: 'users' table
 * - VMS users: 'vms_users' table (completely separate)
 * 
 * This script:
 * 1. Creates Work Permit permissions and roles
 * 2. Creates Work Permit admin user with vms.admin permission
 * 3. Creates VMS roles (VMS_ADMIN, VMS_USER)
 * 4. Creates linked VMS admin user (same credentials as Work Permit admin)
 * 
 * Usage:
 *   node scripts/complete-setup.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ==========================================
// WORK PERMIT PERMISSIONS
// ==========================================
const WORK_PERMIT_PERMISSIONS = [
  // Dashboard
  { key: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
  { key: 'dashboard.stats', name: 'View Statistics', module: 'dashboard', action: 'stats' },
  
  // Permits
  { key: 'permits.view', name: 'View All Permits', module: 'permits', action: 'view' },
  { key: 'permits.view_own', name: 'View Own Permits', module: 'permits', action: 'view_own' },
  { key: 'permits.create', name: 'Create Permits', module: 'permits', action: 'create' },
  { key: 'permits.edit', name: 'Edit Permits', module: 'permits', action: 'edit' },
  { key: 'permits.delete', name: 'Delete Permits', module: 'permits', action: 'delete' },
  { key: 'permits.export', name: 'Export Permits', module: 'permits', action: 'export' },
  { key: 'permits.approve', name: 'Approve Permits', module: 'permits', action: 'approve' },
  
  // Workers
  { key: 'workers.view', name: 'View Workers', module: 'workers', action: 'view' },
  { key: 'workers.create', name: 'Create Workers', module: 'workers', action: 'create' },
  { key: 'workers.edit', name: 'Edit Workers', module: 'workers', action: 'edit' },
  { key: 'workers.delete', name: 'Delete Workers', module: 'workers', action: 'delete' },
  
  // Users
  { key: 'users.view', name: 'View Users', module: 'users', action: 'view' },
  { key: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
  { key: 'users.edit', name: 'Edit Users', module: 'users', action: 'edit' },
  { key: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
  
  // Roles
  { key: 'roles.view', name: 'View Roles', module: 'roles', action: 'view' },
  { key: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create' },
  { key: 'roles.edit', name: 'Edit Roles', module: 'roles', action: 'edit' },
  { key: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
  
  // Settings
  { key: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
  { key: 'settings.edit', name: 'Edit Settings', module: 'settings', action: 'edit' },
  
  // Audit
  { key: 'audit.view', name: 'View Audit Logs', module: 'audit', action: 'view' },
  
  // VMS Access - Grants access to VMS system
  { key: 'vms.admin', name: 'VMS Administrator Access', module: 'vms', action: 'admin' },
];

// ==========================================
// WORK PERMIT ROLES
// ==========================================
const WORK_PERMIT_ROLES = [
  {
    name: 'ADMIN',
    displayName: 'Administrator',
    description: 'Full system access including VMS',
    isSystem: true,
    permissions: WORK_PERMIT_PERMISSIONS.map(p => p.key), // ALL permissions
    uiConfig: { theme: 'admin', primaryColor: '#3b82f6', showAllMenus: true },
  },
  {
    name: 'FIREMAN',
    displayName: 'Fire Safety Officer',
    description: 'Approve and manage permits',
    isSystem: true,
    permissions: ['dashboard.view', 'dashboard.stats', 'permits.view', 'permits.export', 'permits.approve', 'workers.view', 'settings.view'],
    uiConfig: { theme: 'fireman', primaryColor: '#ef4444' },
  },
  {
    name: 'REQUESTOR',
    displayName: 'Permit Requestor',
    description: 'Create and manage own permits',
    isSystem: true,
    permissions: ['dashboard.view', 'permits.view_own', 'permits.create', 'workers.view', 'settings.view'],
    uiConfig: { theme: 'requestor', primaryColor: '#10b981' },
  },
];

// ==========================================
// VMS PERMISSIONS (for VMS roles)
// ==========================================
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

const VMS_USER_PERMISSIONS = [
  'vms.dashboard.view',
  'vms.visitors.view',
  'vms.visitors.create',
  'vms.gatepasses.view',
];

// ==========================================
// VMS ROLES
// ==========================================
const VMS_ROLES = [
  {
    name: 'VMS_ADMIN',
    displayName: 'VMS Administrator',
    description: 'Full VMS system access',
    isSystem: true,
    permissions: VMS_ADMIN_PERMISSIONS,
  },
  {
    name: 'VMS_USER',
    displayName: 'VMS User',
    description: 'Basic VMS access',
    isSystem: true,
    permissions: VMS_USER_PERMISSIONS,
  },
  {
    name: 'VMS_SECURITY',
    displayName: 'Security Guard',
    description: 'Check-in/check-out visitors',
    isSystem: true,
    permissions: ['vms.dashboard.view', 'vms.visitors.view', 'vms.visitors.create', 'vms.gatepasses.view', 'vms.gatepasses.create'],
  },
];

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      WORKPERMIT-VMS COMPLETE SETUP                         ║');
  console.log('║      (Separate User Tables)                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // ==========================================
    // STEP 1: Work Permit Permissions
    // ==========================================
    console.log('📋 Creating Work Permit permissions...');
    for (const perm of WORK_PERMIT_PERMISSIONS) {
      try {
        await prisma.permission.upsert({
          where: { key: perm.key },
          update: { name: perm.name, module: perm.module, action: perm.action },
          create: { key: perm.key, name: perm.name, module: perm.module, action: perm.action },
        });
        console.log(`  ✅ ${perm.key}`);
      } catch (error) {
        console.log(`  ⚠️ ${perm.key}: ${error.message}`);
      }
    }

    // ==========================================
    // STEP 2: Work Permit Roles
    // ==========================================
    console.log('\n🎭 Creating Work Permit roles...');
    for (const role of WORK_PERMIT_ROLES) {
      try {
        await prisma.role.upsert({
          where: { name: role.name },
          update: {
            displayName: role.displayName,
            description: role.description,
            permissions: JSON.stringify(role.permissions),
            uiConfig: JSON.stringify(role.uiConfig),
          },
          create: {
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            isSystem: role.isSystem,
            permissions: JSON.stringify(role.permissions),
            uiConfig: JSON.stringify(role.uiConfig),
          },
        });
        console.log(`  ✅ ${role.name} (${role.displayName})`);
        if (role.permissions.includes('vms.admin')) {
          console.log(`     📌 Has VMS Access`);
        }
      } catch (error) {
        console.log(`  ⚠️ ${role.name}: ${error.message}`);
      }
    }

    // ==========================================
    // STEP 3: Work Permit Admin User
    // ==========================================
    console.log('\n👤 Creating Work Permit admin user...');
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    let workPermitAdmin;
    if (adminRole) {
      try {
        workPermitAdmin = await prisma.user.upsert({
          where: { email: 'admin@permitmanager.com' },
          update: {
            password: hashedPassword,
            roleId: adminRole.id,
            isActive: true,
            isApproved: true,
            hasVMSAccess: true,
          },
          create: {
            email: 'admin@permitmanager.com',
            password: hashedPassword,
            firstName: 'System',
            lastName: 'Admin',
            roleId: adminRole.id,
            isActive: true,
            isApproved: true,
            hasVMSAccess: true,
          },
        });
        console.log(`  ✅ Work Permit Admin: ${workPermitAdmin.email}`);
        console.log(`  🔑 Password: admin123`);
      } catch (error) {
        console.log(`  ⚠️ Admin user: ${error.message}`);
      }
    }

    // ==========================================
    // STEP 4: VMS Roles
    // ==========================================
    console.log('\n🎭 Creating VMS roles...');
    let vmsAdminRole;
    for (const role of VMS_ROLES) {
      try {
        const createdRole = await prisma.vMSRole.upsert({
          where: { name: role.name },
          update: {
            displayName: role.displayName,
            description: role.description,
            permissions: JSON.stringify(role.permissions),
          },
          create: {
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            isSystem: role.isSystem,
            permissions: JSON.stringify(role.permissions),
          },
        });
        console.log(`  ✅ ${role.name} (${role.displayName})`);
        if (role.name === 'VMS_ADMIN') {
          vmsAdminRole = createdRole;
        }
      } catch (error) {
        console.log(`  ⚠️ ${role.name}: ${error.message}`);
      }
    }

    // ==========================================
    // STEP 5: VMS Admin User (linked to Work Permit Admin)
    // ==========================================
    console.log('\n👤 Creating VMS admin user (linked to Work Permit admin)...');
    if (workPermitAdmin && vmsAdminRole) {
      try {
        const vmsAdmin = await prisma.vMSUser.upsert({
          where: { email: 'admin@permitmanager.com' },
          update: {
            password: hashedPassword,
            firstName: workPermitAdmin.firstName,
            lastName: workPermitAdmin.lastName,
            vmsRoleId: vmsAdminRole.id,
            workPermitUserId: workPermitAdmin.id,
            isFromWorkPermit: true,
            isActive: true,
            isApproved: true,
          },
          create: {
            email: 'admin@permitmanager.com',
            password: hashedPassword,
            firstName: workPermitAdmin.firstName,
            lastName: workPermitAdmin.lastName,
            vmsRoleId: vmsAdminRole.id,
            workPermitUserId: workPermitAdmin.id,
            isFromWorkPermit: true,
            isActive: true,
            isApproved: true,
          },
        });
        console.log(`  ✅ VMS Admin: ${vmsAdmin.email}`);
        console.log(`  🔑 Password: admin123 (same as Work Permit)`);
        console.log(`  🔗 Linked to Work Permit Admin: YES`);
      } catch (error) {
        console.log(`  ⚠️ VMS Admin user: ${error.message}`);
      }
    }

    // ==========================================
    // STEP 6: Update existing users
    // ==========================================
    console.log('\n🔄 Updating existing users...');
    
    // Assign REQUESTOR role to users without role
    const requestorRole = await prisma.role.findUnique({ where: { name: 'REQUESTOR' } });
    if (requestorRole) {
      const updated = await prisma.user.updateMany({
        where: { roleId: null },
        data: { roleId: requestorRole.id },
      });
      console.log(`  ✅ Assigned REQUESTOR role to ${updated.count} users`);
    }

    // Approve all pending users
    const approved = await prisma.user.updateMany({
      where: { isApproved: false },
      data: { isApproved: true },
    });
    console.log(`  ✅ Approved ${approved.count} pending users`);

    // Sync VMS access for users with vms.admin permission
    const rolesWithVMS = await prisma.role.findMany({
      where: { permissions: { contains: 'vms.admin' } },
    });
    
    for (const role of rolesWithVMS) {
      const updated = await prisma.user.updateMany({
        where: { roleId: role.id },
        data: { hasVMSAccess: true },
      });
      if (updated.count > 0) {
        console.log(`  ✅ ${role.name}: ${updated.count} users marked with VMS access`);
      }
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    const totalWPUsers = await prisma.user.count();
    const vmsAccessUsers = await prisma.user.count({ where: { hasVMSAccess: true } });
    const totalVMSUsers = await prisma.vMSUser.count();
    const totalWPRoles = await prisma.role.count();
    const totalVMSRoles = await prisma.vMSRole.count();
    const totalPermissions = await prisma.permission.count();

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SETUP COMPLETE!                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  📊 Statistics:                                             ║');
    console.log(`║     Work Permit Users: ${String(totalWPUsers).padEnd(35)}║`);
    console.log(`║     WP Users with VMS Access: ${String(vmsAccessUsers).padEnd(28)}║`);
    console.log(`║     VMS Users: ${String(totalVMSUsers).padEnd(43)}║`);
    console.log(`║     Work Permit Roles: ${String(totalWPRoles).padEnd(35)}║`);
    console.log(`║     VMS Roles: ${String(totalVMSRoles).padEnd(43)}║`);
    console.log(`║     Permissions: ${String(totalPermissions).padEnd(41)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  🔑 Login Credentials:                                      ║');
    console.log('║                                                             ║');
    console.log('║  Work Permit Login:                                         ║');
    console.log('║     Email:    admin@permitmanager.com                       ║');
    console.log('║     Password: admin123                                      ║');
    console.log('║                                                             ║');
    console.log('║  VMS Login (same credentials):                              ║');
    console.log('║     Email:    admin@permitmanager.com                       ║');
    console.log('║     Password: admin123                                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  📌 How it works:                                           ║');
    console.log('║     - Work Permit and VMS have SEPARATE user tables        ║');
    console.log('║     - Admin is linked between both systems                 ║');
    console.log('║     - VMS users are independent (security, reception)      ║');
    console.log('║     - vms.admin permission grants Work Permit user VMS     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
