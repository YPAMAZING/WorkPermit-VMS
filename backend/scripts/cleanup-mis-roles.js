/**
 * SIMPLE Database Reset Script
 * Cleans up and creates only 3 roles: ADMIN, FIREMAN, REQUESTOR
 * 
 * Run: cd backend && node scripts/cleanup-mis-roles.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Simple permissions - Work Permit + VMS Admin Access
const PERMISSIONS = [
  { key: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
  { key: 'dashboard.stats', name: 'View Statistics', module: 'dashboard', action: 'stats' },
  { key: 'permits.view', name: 'View All Permits', module: 'permits', action: 'view' },
  { key: 'permits.view_own', name: 'View Own Permits', module: 'permits', action: 'view' },
  { key: 'permits.create', name: 'Create Permits', module: 'permits', action: 'create' },
  { key: 'permits.edit', name: 'Edit Permits', module: 'permits', action: 'edit' },
  { key: 'permits.delete', name: 'Delete Permits', module: 'permits', action: 'delete' },
  { key: 'permits.export', name: 'Export Permits', module: 'permits', action: 'export' },
  { key: 'permits.approve', name: 'Approve Permits', module: 'permits', action: 'approve' },
  { key: 'workers.view', name: 'View Workers', module: 'workers', action: 'view' },
  { key: 'workers.create', name: 'Create Workers', module: 'workers', action: 'create' },
  { key: 'workers.edit', name: 'Edit Workers', module: 'workers', action: 'edit' },
  { key: 'workers.delete', name: 'Delete Workers', module: 'workers', action: 'delete' },
  { key: 'users.view', name: 'View Users', module: 'users', action: 'view' },
  { key: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
  { key: 'users.edit', name: 'Edit Users', module: 'users', action: 'edit' },
  { key: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
  { key: 'roles.view', name: 'View Roles', module: 'roles', action: 'view' },
  { key: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create' },
  { key: 'roles.edit', name: 'Edit Roles', module: 'roles', action: 'edit' },
  { key: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
  { key: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
  { key: 'settings.edit', name: 'Edit Settings', module: 'settings', action: 'edit' },
  { key: 'audit.view', name: 'View Audit Logs', module: 'audit', action: 'view' },
  // VMS Admin Access - Single permission to access VMS as Admin
  { key: 'vms.admin', name: 'VMS Administrator Access', module: 'vms', action: 'admin' },
];

// 3 Simple roles
const ROLES = {
  ADMIN: {
    displayName: 'Administrator',
    description: 'Full system access',
    permissions: PERMISSIONS.map(p => p.key),
    isSystem: true,
  },
  FIREMAN: {
    displayName: 'Fire Safety Officer', 
    description: 'Approve and manage permits',
    permissions: ['dashboard.view', 'dashboard.stats', 'permits.view', 'permits.export', 'permits.approve', 'workers.view', 'settings.view'],
    isSystem: true,
  },
  REQUESTOR: {
    displayName: 'Permit Requestor',
    description: 'Create and manage own permits',
    permissions: ['dashboard.view', 'permits.view_own', 'permits.create', 'workers.view', 'settings.view'],
    isSystem: true,
  },
};

async function cleanup() {
  console.log('\n🧹 Starting Simple Cleanup...\n');
  
  try {
    // Step 1: Delete ALL old permissions
    console.log('📋 Step 1: Clearing old permissions...');
    await prisma.permission.deleteMany({});
    console.log('   ✅ Deleted all old permissions');
    
    // Step 2: Create new simple permissions
    console.log('\n📋 Step 2: Creating simple permissions...');
    for (const perm of PERMISSIONS) {
      await prisma.permission.create({
        data: {
          id: uuidv4(),
          key: perm.key,
          name: perm.name,
          module: perm.module,
          action: perm.action,
          isActive: true,
        },
      });
    }
    console.log(`   ✅ Created ${PERMISSIONS.length} permissions`);
    
    // Step 3: Get or create REQUESTOR role first (for user reassignment)
    console.log('\n📋 Step 3: Creating/updating roles...');
    
    const roleIds = {};
    
    for (const [name, data] of Object.entries(ROLES)) {
      let role = await prisma.role.findUnique({ where: { name } });
      
      if (role) {
        // Update existing role
        role = await prisma.role.update({
          where: { name },
          data: {
            displayName: data.displayName,
            description: data.description,
            permissions: JSON.stringify(data.permissions),
            uiConfig: JSON.stringify({}),
            isSystem: data.isSystem,
            isActive: true,
          },
        });
      } else {
        // Create new role
        role = await prisma.role.create({
          data: {
            id: uuidv4(),
            name,
            displayName: data.displayName,
            description: data.description,
            permissions: JSON.stringify(data.permissions),
            uiConfig: JSON.stringify({}),
            isSystem: data.isSystem,
            isActive: true,
          },
        });
      }
      
      roleIds[name] = role.id;
      console.log(`   ✅ ${name} role ready`);
    }
    
    // Step 4: Delete non-system roles (MIS, VMS specific roles)
    console.log('\n📋 Step 4: Cleaning up old roles...');
    const rolesToDelete = ['MIS_ADMIN', 'MIS_VERIFIER', 'MIS_VIEWER', 'SITE_ENGINEER', 'VMS_RECEPTION', 'VMS_GUARD', 'VMS_COMPANY_USER', 'SAFETY_OFFICER'];
    
    for (const roleName of rolesToDelete) {
      // First reassign users
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role) {
        await prisma.user.updateMany({
          where: { roleId: role.id },
          data: { roleId: roleIds.REQUESTOR },
        });
        await prisma.role.delete({ where: { name: roleName } });
        console.log(`   ✅ Deleted ${roleName}`);
      }
    }
    
    // Step 5: Fix admin user
    console.log('\n📋 Step 5: Ensuring admin user...');
    let adminUser = await prisma.user.findUnique({ where: { email: 'admin@permitmanager.com' } });
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'admin@permitmanager.com',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          roleId: roleIds.ADMIN,
          isActive: true,
          isApproved: true,
        },
      });
      console.log('   ✅ Created admin user');
    } else {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          roleId: roleIds.ADMIN,
          isActive: true,
          isApproved: true,
        },
      });
      console.log('   ✅ Updated admin user');
    }
    
    // Step 6: Fix users without roles
    console.log('\n📋 Step 6: Fixing users without roles...');
    const fixed = await prisma.user.updateMany({
      where: { roleId: null },
      data: { roleId: roleIds.REQUESTOR },
    });
    console.log(`   ✅ Fixed ${fixed.count} users`);
    
    // Step 7: Ensure all users approved
    console.log('\n📋 Step 7: Approving all users...');
    const approved = await prisma.user.updateMany({
      where: { isApproved: false },
      data: { isApproved: true },
    });
    console.log(`   ✅ Approved ${approved.count} users`);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ CLEANUP COMPLETED');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   - Permissions: ${PERMISSIONS.length}`);
    console.log('   - Roles: ADMIN, FIREMAN, REQUESTOR');
    console.log('\n🔐 Admin Login:');
    console.log('   Email: admin@permitmanager.com');
    console.log('   Password: admin123');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
