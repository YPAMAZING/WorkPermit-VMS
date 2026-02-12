#!/usr/bin/env node
/**
 * Complete Setup Script for WorkPermit-VMS
 * 
 * SINGLE DATABASE APPROACH
 * Both Work Permit and VMS use the same database (workpermit_db)
 * VMS access is controlled by hasVMSAccess flag on users
 * 
 * This script:
 * 1. Creates all permissions (including vms.admin)
 * 2. Creates default roles (ADMIN, FIREMAN, REQUESTOR)
 * 3. Creates admin user with VMS access
 * 4. Updates users without roles to REQUESTOR
 * 
 * Usage:
 *   node scripts/complete-setup.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// All permissions (Work Permit + VMS)
const PERMISSIONS = [
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
  
  // VMS Access - Single permission to access VMS
  // When this permission is in a role, all users with that role get hasVMSAccess = true
  { key: 'vms.admin', name: 'VMS Administrator Access', module: 'vms', action: 'admin' },
];

// Default roles
// NOTE: ADMIN role includes vms.admin by default (can access VMS)
// Other roles need vms.admin added manually if they need VMS access
const ROLES = [
  {
    name: 'ADMIN',
    displayName: 'Administrator',
    description: 'Full system access including VMS',
    isSystem: true,
    permissions: PERMISSIONS.map(p => p.key), // ALL permissions including vms.admin
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

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      WORKPERMIT-VMS SETUP (SINGLE DATABASE)                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Create permissions
    console.log('📋 Creating permissions...');
    for (const perm of PERMISSIONS) {
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

    // Create roles
    console.log('\n🎭 Creating roles...');
    for (const role of ROLES) {
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

    // Create admin user with VMS access
    console.log('\n👤 Creating admin user...');
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    
    if (adminRole) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      try {
        const admin = await prisma.user.upsert({
          where: { email: 'admin@permitmanager.com' },
          update: {
            roleId: adminRole.id,
            isActive: true,
            isApproved: true,
            hasVMSAccess: true, // Admin has VMS access
          },
          create: {
            email: 'admin@permitmanager.com',
            password: hashedPassword,
            firstName: 'System',
            lastName: 'Admin',
            roleId: adminRole.id,
            isActive: true,
            isApproved: true,
            hasVMSAccess: true, // Admin has VMS access
          },
        });
        console.log(`  ✅ Admin user: ${admin.email}`);
        console.log(`  🔑 Password: admin123`);
        console.log(`  📌 Has VMS Access: YES`);
      } catch (error) {
        console.log(`  ⚠️ Admin user: ${error.message}`);
      }
    }

    // Update users with ADMIN role to have VMS access
    console.log('\n🔄 Syncing VMS access for users with vms.admin permission...');
    const rolesWithVMS = await prisma.role.findMany({
      where: {
        permissions: { contains: 'vms.admin' }
      }
    });
    
    for (const role of rolesWithVMS) {
      const updated = await prisma.user.updateMany({
        where: { roleId: role.id },
        data: { hasVMSAccess: true },
      });
      console.log(`  ✅ ${role.name}: ${updated.count} users granted VMS access`);
    }

    // Update users without roleId
    console.log('\n🔄 Updating users without roles...');
    const requestorRole = await prisma.role.findUnique({ where: { name: 'REQUESTOR' } });
    if (requestorRole) {
      const updated = await prisma.user.updateMany({
        where: { roleId: null },
        data: { roleId: requestorRole.id },
      });
      console.log(`  ✅ Assigned REQUESTOR role to ${updated.count} users`);
    }

    // Approve all pending users
    console.log('\n✅ Approving pending users...');
    const approved = await prisma.user.updateMany({
      where: { isApproved: false },
      data: { isApproved: true },
    });
    console.log(`  ✅ Approved ${approved.count} users`);

    // Summary
    const totalUsers = await prisma.user.count();
    const vmsUsers = await prisma.user.count({ where: { hasVMSAccess: true } });
    const totalRoles = await prisma.role.count();
    const totalPermissions = await prisma.permission.count();

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SETUP COMPLETE!                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  📊 Statistics:                                             ║`);
    console.log(`║     Total Users: ${String(totalUsers).padEnd(40)}║`);
    console.log(`║     Users with VMS Access: ${String(vmsUsers).padEnd(30)}║`);
    console.log(`║     Total Roles: ${String(totalRoles).padEnd(40)}║`);
    console.log(`║     Total Permissions: ${String(totalPermissions).padEnd(35)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  🔑 Login Credentials:                                      ║');
    console.log('║     Email:    admin@permitmanager.com                       ║');
    console.log('║     Password: admin123                                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  📌 VMS Access:                                             ║');
    console.log('║     - Admin can login to VMS using same credentials        ║');
    console.log('║     - To grant VMS access to other users:                  ║');
    console.log('║       1. Go to Settings → Roles                            ║');
    console.log('║       2. Add "vms.admin" permission to the role            ║');
    console.log('║       3. All users with that role get VMS access           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
