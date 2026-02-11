/**
 * Comprehensive Database Cleanup & Setup Script
 * 
 * This script:
 * 1. Removes MIS roles and permissions
 * 2. Creates correct Work Permit and VMS permissions
 * 3. Ensures ADMIN role has all permissions
 * 4. Creates default admin user if not exists
 * 5. Handles schema differences gracefully
 * 
 * Run: cd backend && node scripts/cleanup-mis-roles.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// MIS-related role names to delete
const MIS_ROLES_TO_DELETE = [
  'MIS_ADMIN',
  'MIS_VERIFIER',
  'MIS_VIEWER',
  'SITE_ENGINEER',
  'VMS_RECEPTION',  // Cleanup old VMS roles - will be recreated properly
  'VMS_GUARD',
  'VMS_COMPANY_USER'
];

// Define all Work Permit permissions
const WORK_PERMIT_PERMISSIONS = [
  // Dashboard
  { key: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
  { key: 'dashboard.stats', name: 'View Statistics', module: 'dashboard', action: 'stats' },
  
  // Permits
  { key: 'permits.view', name: 'View All Permits', module: 'permits', action: 'view' },
  { key: 'permits.view_own', name: 'View Own Permits', module: 'permits', action: 'view_own' },
  { key: 'permits.create', name: 'Create Permits', module: 'permits', action: 'create' },
  { key: 'permits.edit', name: 'Edit All Permits', module: 'permits', action: 'edit' },
  { key: 'permits.edit_own', name: 'Edit Own Permits', module: 'permits', action: 'edit_own' },
  { key: 'permits.delete', name: 'Delete Permits', module: 'permits', action: 'delete' },
  { key: 'permits.export', name: 'Export Permits', module: 'permits', action: 'export' },
  { key: 'permits.extend', name: 'Extend Permits', module: 'permits', action: 'extend' },
  { key: 'permits.revoke', name: 'Revoke Permits', module: 'permits', action: 'revoke' },
  { key: 'permits.close', name: 'Close Permits', module: 'permits', action: 'close' },
  { key: 'permits.reapprove', name: 'Re-approve Permits', module: 'permits', action: 'reapprove' },
  { key: 'permits.transfer', name: 'Transfer Permits', module: 'permits', action: 'transfer' },
  
  // Approvals
  { key: 'approvals.view', name: 'View Approvals', module: 'approvals', action: 'view' },
  { key: 'approvals.approve', name: 'Approve Permits', module: 'approvals', action: 'approve' },
  { key: 'approvals.reject', name: 'Reject Permits', module: 'approvals', action: 'reject' },
  { key: 'approvals.sign', name: 'Sign Permits', module: 'approvals', action: 'sign' },
  { key: 'approvals.reapprove', name: 'Re-approve Permits', module: 'approvals', action: 'reapprove' },
  
  // Workers
  { key: 'workers.view', name: 'View Workers', module: 'workers', action: 'view' },
  { key: 'workers.create', name: 'Create Workers', module: 'workers', action: 'create' },
  { key: 'workers.edit', name: 'Edit Workers', module: 'workers', action: 'edit' },
  { key: 'workers.delete', name: 'Delete Workers', module: 'workers', action: 'delete' },
  { key: 'workers.qr', name: 'Generate Worker QR', module: 'workers', action: 'qr' },
  
  // Users
  { key: 'users.view', name: 'View Users', module: 'users', action: 'view' },
  { key: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
  { key: 'users.edit', name: 'Edit Users', module: 'users', action: 'edit' },
  { key: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
  { key: 'users.approve', name: 'Approve Users', module: 'users', action: 'approve' },
  
  // Roles
  { key: 'roles.view', name: 'View Roles', module: 'roles', action: 'view' },
  { key: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create' },
  { key: 'roles.edit', name: 'Edit Roles', module: 'roles', action: 'edit' },
  { key: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
  { key: 'roles.assign', name: 'Assign Roles', module: 'roles', action: 'assign' },
  
  // Settings
  { key: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
  { key: 'settings.edit', name: 'Edit Settings', module: 'settings', action: 'edit' },
  
  // Audit
  { key: 'audit.view', name: 'View Audit Logs', module: 'audit', action: 'view' }
];

// Define all VMS permissions
const VMS_PERMISSIONS = [
  // VMS Dashboard
  { key: 'vms.dashboard.view', name: 'VMS: View Dashboard', module: 'vms.dashboard', action: 'view' },
  { key: 'vms.dashboard.stats', name: 'VMS: View Statistics', module: 'vms.dashboard', action: 'stats' },
  
  // VMS Visitors
  { key: 'vms.visitors.view', name: 'VMS: View Visitors', module: 'vms.visitors', action: 'view' },
  { key: 'vms.visitors.create', name: 'VMS: Register Visitors', module: 'vms.visitors', action: 'create' },
  { key: 'vms.visitors.edit', name: 'VMS: Edit Visitors', module: 'vms.visitors', action: 'edit' },
  { key: 'vms.visitors.delete', name: 'VMS: Delete Visitors', module: 'vms.visitors', action: 'delete' },
  { key: 'vms.visitors.approve', name: 'VMS: Approve Visitors', module: 'vms.visitors', action: 'approve' },
  { key: 'vms.visitors.checkin', name: 'VMS: Check-in Visitors', module: 'vms.visitors', action: 'checkin' },
  { key: 'vms.visitors.checkout', name: 'VMS: Check-out Visitors', module: 'vms.visitors', action: 'checkout' },
  
  // VMS Gatepasses
  { key: 'vms.gatepasses.view', name: 'VMS: View Gatepasses', module: 'vms.gatepasses', action: 'view' },
  { key: 'vms.gatepasses.create', name: 'VMS: Create Gatepasses', module: 'vms.gatepasses', action: 'create' },
  { key: 'vms.gatepasses.cancel', name: 'VMS: Cancel Gatepasses', module: 'vms.gatepasses', action: 'cancel' },
  { key: 'vms.gatepasses.print', name: 'VMS: Print Gatepasses', module: 'vms.gatepasses', action: 'print' },
  
  // VMS Pre-approved
  { key: 'vms.preapproved.view', name: 'VMS: View Pre-approved', module: 'vms.preapproved', action: 'view' },
  { key: 'vms.preapproved.create', name: 'VMS: Create Pre-approved', module: 'vms.preapproved', action: 'create' },
  { key: 'vms.preapproved.edit', name: 'VMS: Edit Pre-approved', module: 'vms.preapproved', action: 'edit' },
  { key: 'vms.preapproved.delete', name: 'VMS: Delete Pre-approved', module: 'vms.preapproved', action: 'delete' },
  
  // VMS Blacklist
  { key: 'vms.blacklist.view', name: 'VMS: View Blacklist', module: 'vms.blacklist', action: 'view' },
  { key: 'vms.blacklist.create', name: 'VMS: Add to Blacklist', module: 'vms.blacklist', action: 'create' },
  { key: 'vms.blacklist.delete', name: 'VMS: Remove from Blacklist', module: 'vms.blacklist', action: 'delete' },
  
  // VMS Reports
  { key: 'vms.reports.view', name: 'VMS: View Reports', module: 'vms.reports', action: 'view' },
  { key: 'vms.reports.export', name: 'VMS: Export Reports', module: 'vms.reports', action: 'export' },
  
  // VMS Settings
  { key: 'vms.settings.view', name: 'VMS: View Settings', module: 'vms.settings', action: 'view' },
  { key: 'vms.settings.edit', name: 'VMS: Edit Settings', module: 'vms.settings', action: 'edit' },
  
  // VMS Companies
  { key: 'vms.companies.view', name: 'VMS: View Companies', module: 'vms.companies', action: 'view' },
  { key: 'vms.companies.create', name: 'VMS: Create Companies', module: 'vms.companies', action: 'create' },
  { key: 'vms.companies.edit', name: 'VMS: Edit Companies', module: 'vms.companies', action: 'edit' },
  { key: 'vms.companies.delete', name: 'VMS: Delete Companies', module: 'vms.companies', action: 'delete' }
];

// All permissions combined
const ALL_PERMISSIONS = [...WORK_PERMIT_PERMISSIONS, ...VMS_PERMISSIONS];

// Default roles with their permissions
const DEFAULT_ROLES = {
  ADMIN: {
    displayName: 'Administrator',
    description: 'Full system access to Work Permit and VMS',
    permissions: ALL_PERMISSIONS.map(p => p.key),
    uiConfig: { theme: 'admin', showAllMenus: true },
    isSystem: true
  },
  FIREMAN: {
    displayName: 'Fire Safety Officer',
    description: 'Fire safety approvals and permit management',
    permissions: [
      'dashboard.view', 'dashboard.stats',
      'permits.view', 'permits.export', 'permits.extend', 'permits.revoke', 'permits.close', 'permits.reapprove',
      'approvals.view', 'approvals.approve', 'approvals.reject', 'approvals.sign', 'approvals.reapprove',
      'workers.view', 'workers.create', 'workers.edit', 'workers.qr',
      'settings.view'
    ],
    uiConfig: { theme: 'fireman' },
    isSystem: true
  },
  REQUESTOR: {
    displayName: 'Permit Requestor',
    description: 'Create and manage own permit requests',
    permissions: [
      'dashboard.view',
      'permits.view_own', 'permits.create', 'permits.edit_own', 'permits.export',
      'workers.view', 'workers.qr',
      'settings.view'
    ],
    uiConfig: { theme: 'requestor' },
    isSystem: true
  },
  SAFETY_OFFICER: {
    displayName: 'Safety Officer',
    description: 'Safety approvals and compliance',
    permissions: [
      'dashboard.view', 'dashboard.stats',
      'permits.view', 'permits.export',
      'approvals.view', 'approvals.approve', 'approvals.reject', 'approvals.sign',
      'workers.view',
      'settings.view'
    ],
    uiConfig: { theme: 'safety' },
    isSystem: true
  }
};

async function cleanupMISRoles() {
  console.log('\n🧹 Starting MIS Roles & Permissions Cleanup...\n');
  
  try {
    // Step 1: Delete MIS permissions
    console.log('📋 Step 1: Removing MIS permissions...');
    const deletedPermissions = await prisma.permission.deleteMany({
      where: {
        OR: [
          { module: { startsWith: 'mis' } },
          { module: { startsWith: 'meterReading' } },
          { module: { startsWith: 'meter' } },
          { key: { startsWith: 'mis.' } },
          { key: { startsWith: 'meterReading.' } },
          { key: { startsWith: 'meter.' } }
        ]
      }
    });
    console.log(`   ✅ Deleted ${deletedPermissions.count} MIS permissions`);
    
    // Step 2: Get or create REQUESTOR role for user reassignment
    console.log('\n📋 Step 2: Preparing REQUESTOR role for user reassignment...');
    let requestorRole = await prisma.role.findUnique({ where: { name: 'REQUESTOR' } });
    if (!requestorRole) {
      requestorRole = await prisma.role.create({
        data: {
          id: uuidv4(),
          name: 'REQUESTOR',
          displayName: 'Permit Requestor',
          description: 'Create and manage own permit requests',
          permissions: JSON.stringify(DEFAULT_ROLES.REQUESTOR.permissions),
          uiConfig: JSON.stringify(DEFAULT_ROLES.REQUESTOR.uiConfig),
          isSystem: true,
          isActive: true
        }
      });
      console.log('   ✅ Created REQUESTOR role');
    } else {
      console.log('   ✅ REQUESTOR role exists');
    }
    
    // Step 3: Reassign users from MIS roles
    console.log('\n📋 Step 3: Reassigning users from MIS roles...');
    const misRoles = await prisma.role.findMany({
      where: { name: { in: MIS_ROLES_TO_DELETE } }
    });
    
    for (const role of misRoles) {
      const updated = await prisma.user.updateMany({
        where: { roleId: role.id },
        data: { roleId: requestorRole.id }
      });
      if (updated.count > 0) {
        console.log(`   ✅ Reassigned ${updated.count} users from ${role.name} to REQUESTOR`);
      }
    }
    
    // Step 4: Delete MIS roles
    console.log('\n📋 Step 4: Deleting MIS roles...');
    const deletedRoles = await prisma.role.deleteMany({
      where: { name: { in: MIS_ROLES_TO_DELETE } }
    });
    console.log(`   ✅ Deleted ${deletedRoles.count} MIS/VMS roles`);
    
    // Step 5: Create/Update all permissions
    console.log('\n📋 Step 5: Creating/Updating all permissions...');
    for (const perm of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: perm.key },
        update: {
          name: perm.name,
          module: perm.module,
          action: perm.action,
          isActive: true
        },
        create: {
          id: uuidv4(),
          key: perm.key,
          name: perm.name,
          module: perm.module,
          action: perm.action,
          isActive: true
        }
      });
    }
    console.log(`   ✅ Created/Updated ${ALL_PERMISSIONS.length} permissions`);
    
    // Step 6: Create/Update default roles
    console.log('\n📋 Step 6: Creating/Updating default roles...');
    for (const [roleName, roleData] of Object.entries(DEFAULT_ROLES)) {
      await prisma.role.upsert({
        where: { name: roleName },
        update: {
          displayName: roleData.displayName,
          description: roleData.description,
          permissions: JSON.stringify(roleData.permissions),
          uiConfig: JSON.stringify(roleData.uiConfig),
          isSystem: roleData.isSystem,
          isActive: true
        },
        create: {
          id: uuidv4(),
          name: roleName,
          displayName: roleData.displayName,
          description: roleData.description,
          permissions: JSON.stringify(roleData.permissions),
          uiConfig: JSON.stringify(roleData.uiConfig),
          isSystem: roleData.isSystem,
          isActive: true
        }
      });
      console.log(`   ✅ ${roleName} role ready`);
    }
    
    // Step 7: Ensure admin user exists and has correct role
    console.log('\n📋 Step 7: Ensuring admin user exists...');
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    
    // Try to find admin user
    let adminUser = await prisma.user.findUnique({ where: { email: 'admin@permitmanager.com' } });
    
    if (!adminUser) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'admin@permitmanager.com',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          roleId: adminRole.id,
          isActive: true,
          isApproved: true,
          approvedAt: new Date()
        }
      });
      console.log('   ✅ Created admin user');
    } else {
      // Update admin user to have correct role and be approved
      await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          roleId: adminRole.id,
          isActive: true,
          isApproved: true
        }
      });
      console.log('   ✅ Updated admin user with correct role');
    }
    
    // Step 8: Fix all users without roles
    console.log('\n📋 Step 8: Fixing users without roles...');
    const usersWithoutRoles = await prisma.user.findMany({
      where: { roleId: null }
    });
    
    for (const user of usersWithoutRoles) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: requestorRole.id }
      });
    }
    if (usersWithoutRoles.length > 0) {
      console.log(`   ✅ Assigned REQUESTOR role to ${usersWithoutRoles.length} users`);
    } else {
      console.log('   ✅ All users have roles assigned');
    }
    
    // Step 9: Ensure all users are approved
    console.log('\n📋 Step 9: Ensuring all users are approved...');
    const approveResult = await prisma.user.updateMany({
      where: {
        OR: [
          { isApproved: false },
          { isApproved: null }
        ]
      },
      data: { isApproved: true }
    });
    console.log(`   ✅ Approved ${approveResult.count} users`);
    
    // Final Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ CLEANUP COMPLETED SUCCESSFULLY');
    console.log('='.repeat(50));
    
    const roleCount = await prisma.role.count({ where: { isActive: true } });
    const permCount = await prisma.permission.count({ where: { isActive: true } });
    const userCount = await prisma.user.count({ where: { isActive: true, isApproved: true } });
    
    console.log(`\n📊 Summary:`);
    console.log(`   - Active Roles: ${roleCount}`);
    console.log(`   - Active Permissions: ${permCount}`);
    console.log(`   - Active Users: ${userCount}`);
    
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      select: { name: true, displayName: true, _count: { select: { users: true } } }
    });
    
    console.log('\n📋 Available Roles:');
    roles.forEach(r => {
      console.log(`   - ${r.displayName} (${r.name}): ${r._count.users} users`);
    });
    
    console.log('\n🔐 Admin Login:');
    console.log('   Email: admin@permitmanager.com');
    console.log('   Password: admin123');
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupMISRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
