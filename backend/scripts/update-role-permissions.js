/**
 * Migration script to update existing roles with new permissions
 * Run this script after deploying the updated role.controller.js
 * 
 * Usage: node backend/scripts/update-role-permissions.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// New permissions to add to FIREMAN role
const firemanNewPermissions = [
  'permits.view_all',
  'permits.extend',
  'permits.revoke',
  'permits.reapprove',
  'permits.close',
  'approvals.view',
  'approvals.approve',
  'approvals.reapprove',
];

// New permissions to add to ADMIN role (all new permissions)
const adminNewPermissions = [
  'permits.view_all',
  'permits.extend',
  'permits.revoke',
  'permits.reapprove',
  'permits.close',
  'approvals.view',
  'approvals.approve',
  'approvals.reapprove',
];

async function updateRolePermissions() {
  try {
    console.log('🔄 Starting role permissions update...\n');

    // Update FIREMAN role
    const firemanRole = await prisma.role.findFirst({
      where: { name: 'FIREMAN' }
    });

    if (firemanRole) {
      const currentPermissions = JSON.parse(firemanRole.permissions || '[]');
      const newPermissions = [...new Set([...currentPermissions, ...firemanNewPermissions])];
      
      await prisma.role.update({
        where: { id: firemanRole.id },
        data: { permissions: JSON.stringify(newPermissions) }
      });
      
      console.log('✅ FIREMAN role updated');
      console.log('   Added permissions:', firemanNewPermissions.filter(p => !currentPermissions.includes(p)));
      console.log('   Total permissions:', newPermissions.length);
    } else {
      console.log('⚠️ FIREMAN role not found');
    }

    // Update ADMIN role
    const adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN' }
    });

    if (adminRole) {
      const currentPermissions = JSON.parse(adminRole.permissions || '[]');
      const newPermissions = [...new Set([...currentPermissions, ...adminNewPermissions])];
      
      await prisma.role.update({
        where: { id: adminRole.id },
        data: { permissions: JSON.stringify(newPermissions) }
      });
      
      console.log('✅ ADMIN role updated');
      console.log('   Added permissions:', adminNewPermissions.filter(p => !currentPermissions.includes(p)));
      console.log('   Total permissions:', newPermissions.length);
    } else {
      console.log('⚠️ ADMIN role not found');
    }

    // Update any custom roles that have permits.approve to also have new permit management permissions
    const customRolesWithApprove = await prisma.role.findMany({
      where: {
        name: { notIn: ['ADMIN', 'FIREMAN', 'REQUESTOR'] },
        permissions: { contains: 'permits.approve' }
      }
    });

    for (const role of customRolesWithApprove) {
      const currentPermissions = JSON.parse(role.permissions || '[]');
      const newPermissions = [...new Set([...currentPermissions, ...firemanNewPermissions])];
      
      await prisma.role.update({
        where: { id: role.id },
        data: { permissions: JSON.stringify(newPermissions) }
      });
      
      console.log(`✅ Custom role "${role.displayName}" updated`);
    }

    console.log('\n🎉 Role permissions update completed!');
    console.log('\nNew permissions added:');
    console.log('  - permits.view_all: View All Permits (Admin view)');
    console.log('  - permits.extend: Extend Permits');
    console.log('  - permits.revoke: Revoke Permits');
    console.log('  - permits.reapprove: Re-approve Permits');
    console.log('  - permits.close: Close Permits');
    console.log('  - approvals.view: View Approvals');
    console.log('  - approvals.approve: Approve/Reject');
    console.log('  - approvals.reapprove: Re-approve Permits');

  } catch (error) {
    console.error('❌ Error updating role permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateRolePermissions();
