#!/usr/bin/env node
/**
 * Complete Setup Script for WorkPermit-VMS
 * 
 * This script handles:
 * 1. Main database (workpermit_db) setup
 * 2. VMS database (workpermit_vms_db) setup (optional)
 * 3. Creating admin user
 * 4. Setting up roles and permissions
 * 
 * Usage:
 *   node scripts/complete-setup.js
 *   node scripts/complete-setup.js --vms  (also setup VMS database)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Check for VMS setup flag
const setupVMS = process.argv.includes('--vms');

// Default permissions
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
  
  // VMS Access - Single permission to access VMS as Admin
  { key: 'vms.admin', name: 'VMS Administrator Access', module: 'vms', action: 'admin' },
];

// Default roles (vms.admin NOT included by default)
const ROLES = [
  {
    name: 'ADMIN',
    displayName: 'Administrator',
    description: 'Full Work Permit system access (VMS access must be granted separately)',
    isSystem: true,
    permissions: PERMISSIONS.filter(p => p.key !== 'vms.admin').map(p => p.key),
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

async function setupMainDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('📦 SETTING UP MAIN DATABASE (workpermit_db)');
  console.log('='.repeat(60));

  // Create permissions
  console.log('\n📋 Creating permissions...');
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
    } catch (error) {
      console.log(`  ⚠️ ${role.name}: ${error.message}`);
    }
  }

  // Create admin user
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
        },
        create: {
          email: 'admin@permitmanager.com',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Admin',
          roleId: adminRole.id,
          isActive: true,
          isApproved: true,
        },
      });
      console.log(`  ✅ Admin user: ${admin.email}`);
      console.log(`  🔑 Password: admin123`);
    } catch (error) {
      console.log(`  ⚠️ Admin user: ${error.message}`);
    }
  }

  // Update users without roleId
  console.log('\n🔄 Updating users without roles...');
  const requestorRole = await prisma.role.findUnique({ where: { name: 'REQUESTOR' } });
  if (requestorRole) {
    const updated = await prisma.user.updateMany({
      where: { roleId: null },
      data: { roleId: requestorRole.id },
    });
    console.log(`  ✅ Updated ${updated.count} users to REQUESTOR role`);
  }

  // Mark all users as approved
  console.log('\n✅ Marking all users as approved...');
  const approved = await prisma.user.updateMany({
    where: { isApproved: false },
    data: { isApproved: true },
  });
  console.log(`  ✅ Approved ${approved.count} users`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ MAIN DATABASE SETUP COMPLETE');
  console.log('='.repeat(60));
}

async function setupVMSDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('📦 SETTING UP VMS DATABASE (workpermit_vms_db)');
  console.log('='.repeat(60));

  // Check if VMS database is configured
  if (!process.env.VMS_DATABASE_URL) {
    console.log('\n⚠️ VMS_DATABASE_URL not configured in .env');
    console.log('   Skipping VMS database setup');
    console.log('   To enable VMS, add this to your .env file:');
    console.log('   VMS_DATABASE_URL=mysql://username:password@localhost:3306/workpermit_vms_db');
    return;
  }

  try {
    const { PrismaClient: VMSPrismaClient } = require('.prisma/vms-client');
    const vmsPrisma = new VMSPrismaClient();

    // VMS Permissions (simple version)
    const VMS_PERMISSIONS = ['vms.*']; // Wildcard for all VMS permissions

    // Create VMS_ADMIN role
    console.log('\n🎭 Creating VMS_ADMIN role...');
    try {
      await vmsPrisma.role.upsert({
        where: { name: 'VMS_ADMIN' },
        update: {
          displayName: 'VMS Administrator',
          permissions: JSON.stringify(VMS_PERMISSIONS),
          uiConfig: JSON.stringify({ theme: 'admin', primaryColor: '#3b82f6' }),
        },
        create: {
          id: uuidv4(),
          name: 'VMS_ADMIN',
          displayName: 'VMS Administrator',
          description: 'Full VMS system access',
          permissions: JSON.stringify(VMS_PERMISSIONS),
          uiConfig: JSON.stringify({ theme: 'admin', primaryColor: '#3b82f6' }),
          isSystem: true,
          isActive: true,
        },
      });
      console.log('  ✅ VMS_ADMIN role created');
    } catch (error) {
      console.log(`  ⚠️ VMS_ADMIN role: ${error.message}`);
    }

    // Create VMS admin user
    console.log('\n👤 Creating VMS admin user...');
    const vmsAdminRole = await vmsPrisma.role.findUnique({ where: { name: 'VMS_ADMIN' } });
    
    if (vmsAdminRole) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      try {
        const vmsAdmin = await vmsPrisma.user.upsert({
          where: { email: 'admin@permitmanager.com' },
          update: {
            roleId: vmsAdminRole.id,
            isActive: true,
            isApproved: true,
          },
          create: {
            id: uuidv4(),
            email: 'admin@permitmanager.com',
            password: hashedPassword,
            firstName: 'VMS',
            lastName: 'Admin',
            roleId: vmsAdminRole.id,
            isActive: true,
            isApproved: true,
          },
        });
        console.log(`  ✅ VMS Admin user: ${vmsAdmin.email}`);
        console.log(`  🔑 Password: admin123`);
      } catch (error) {
        console.log(`  ⚠️ VMS Admin user: ${error.message}`);
      }
    }

    await vmsPrisma.$disconnect();

    console.log('\n' + '='.repeat(60));
    console.log('✅ VMS DATABASE SETUP COMPLETE');
    console.log('='.repeat(60));
  } catch (error) {
    console.log('\n❌ VMS database setup failed:', error.message);
    console.log('   Make sure to run:');
    console.log('   1. npx prisma generate --schema=./prisma-vms/schema.prisma');
    console.log('   2. npx prisma db push --schema=./prisma-vms/schema.prisma');
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         WORKPERMIT-VMS COMPLETE SETUP SCRIPT               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Always setup main database
    await setupMainDatabase();

    // Setup VMS database if flag is provided
    if (setupVMS) {
      await setupVMSDatabase();
    } else {
      console.log('\n💡 TIP: Run with --vms flag to also setup VMS database:');
      console.log('   node scripts/complete-setup.js --vms');
    }

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SETUP COMPLETE!                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Login Credentials:                                         ║');
    console.log('║  📧 Email:    admin@permitmanager.com                       ║');
    console.log('║  🔑 Password: admin123                                      ║');
    console.log('║                                                             ║');
    console.log('║  To grant VMS access to a user:                            ║');
    console.log('║  1. Go to Settings → Roles                                 ║');
    console.log('║  2. Edit a role and add "vms.admin" permission             ║');
    console.log('║  3. Users with that role can access VMS                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
