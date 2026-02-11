/**
 * Cleanup MIS Roles Script
 * 
 * This script removes MIS-related roles from the database:
 * - MIS_ADMIN
 * - MIS_VERIFIER
 * - MIS_VIEWER
 * - SITE_ENGINEER
 * 
 * Also cleans up MIS-related permissions
 * 
 * Run with: node scripts/cleanup-mis-roles.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MIS_ROLES = ['MIS_ADMIN', 'MIS_VERIFIER', 'MIS_VIEWER', 'SITE_ENGINEER'];

const MIS_PERMISSIONS = [
  'mis.access',
  'mis.dashboard',
  'meters.view',
  'meters.view_all',
  'meters.view_own',
  'meters.create',
  'meters.edit',
  'meters.edit_own',
  'meters.delete',
  'meters.delete_own',
  'meters.verify',
  'meters.export',
  'meters.import',
  'meters.ocr',
  'meters.analytics',
  'transmitters.view',
  'transmitters.view_all',
  'transmitters.create',
  'transmitters.edit',
  'transmitters.delete',
  'reports.view',
  'reports.create',
  'reports.export',
  'reports.schedule',
  'mis_users.view',
  'mis_users.create',
  'mis_users.edit',
  'mis_users.delete',
  'mis_roles.view',
  'mis_roles.edit',
];

async function cleanupMISRoles() {
  console.log('🧹 Starting MIS cleanup...\n');

  try {
    // 1. Find users with MIS roles and reassign to REQUESTOR
    console.log('📋 Checking for users with MIS roles...');
    
    const requestorRole = await prisma.role.findUnique({
      where: { name: 'REQUESTOR' }
    });

    if (!requestorRole) {
      console.error('❌ REQUESTOR role not found. Cannot reassign users.');
      return;
    }

    for (const roleName of MIS_ROLES) {
      const role = await prisma.role.findUnique({
        where: { name: roleName },
        include: { users: true }
      });

      if (role) {
        if (role.users.length > 0) {
          console.log(`   Moving ${role.users.length} users from ${roleName} to REQUESTOR...`);
          
          await prisma.user.updateMany({
            where: { roleId: role.id },
            data: { roleId: requestorRole.id }
          });
          
          console.log(`   ✅ Users reassigned from ${roleName}`);
        }

        // Delete the role
        await prisma.role.delete({
          where: { id: role.id }
        });
        console.log(`   🗑️  Deleted role: ${roleName}`);
      } else {
        console.log(`   ⏭️  Role ${roleName} not found (already deleted)`);
      }
    }

    // 2. Delete MIS permissions
    console.log('\n📋 Removing MIS permissions...');
    
    const deleteResult = await prisma.permission.deleteMany({
      where: {
        key: { in: MIS_PERMISSIONS }
      }
    });
    
    console.log(`   🗑️  Deleted ${deleteResult.count} MIS permissions`);

    // 3. Clean up permissions from remaining roles
    console.log('\n📋 Cleaning MIS permissions from remaining roles...');
    
    const allRoles = await prisma.role.findMany();
    
    for (const role of allRoles) {
      try {
        const permissions = JSON.parse(role.permissions || '[]');
        const cleanedPermissions = permissions.filter(p => !MIS_PERMISSIONS.includes(p));
        
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

    // 4. Summary
    console.log('\n✅ MIS Cleanup Complete!');
    console.log('\n📊 Remaining roles:');
    
    const remainingRoles = await prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' }
    });
    
    for (const role of remainingRoles) {
      console.log(`   - ${role.name} (${role.displayName}): ${role._count.users} users`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupMISRoles();
