#!/usr/bin/env node
/**
 * Fix VMS Admin Password Script
 * This ensures the VMS admin user has the correct password hash
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixPassword() {
  console.log('\n🔧 Fixing VMS Admin Password...\n');

  try {
    // Get VMS admin user
    const vmsAdmin = await prisma.vMSUser.findUnique({
      where: { email: 'admin@permitmanager.com' },
      include: { vmsRole: true },
    });

    if (!vmsAdmin) {
      console.log('❌ VMS admin user not found!');
      console.log('💡 Run: node scripts/complete-setup.js');
      return;
    }

    console.log('Found VMS Admin:');
    console.log('  Email:', vmsAdmin.email);
    console.log('  Name:', vmsAdmin.firstName, vmsAdmin.lastName);
    console.log('  Role:', vmsAdmin.vmsRole?.name || 'No role');
    console.log('  Active:', vmsAdmin.isActive);
    console.log('  Approved:', vmsAdmin.isApproved);
    console.log('  Current password hash:', vmsAdmin.password);

    // Test current password
    const currentValid = await bcrypt.compare('admin123', vmsAdmin.password);
    console.log('\n  Password "admin123" valid:', currentValid ? '✅ YES' : '❌ NO');

    if (!currentValid) {
      console.log('\n🔄 Updating password to admin123...');
      
      const newHash = await bcrypt.hash('admin123', 10);
      console.log('  New hash:', newHash);

      await prisma.vMSUser.update({
        where: { id: vmsAdmin.id },
        data: { 
          password: newHash,
          isActive: true,
          isApproved: true,
        },
      });

      console.log('  ✅ Password updated!');

      // Verify
      const updated = await prisma.vMSUser.findUnique({
        where: { email: 'admin@permitmanager.com' },
      });
      const verifyValid = await bcrypt.compare('admin123', updated.password);
      console.log('  Verification:', verifyValid ? '✅ Password works!' : '❌ Still not working');
    }

    // Also ensure VMS_ADMIN role exists and has permissions
    const vmsAdminRole = await prisma.vMSRole.findUnique({
      where: { name: 'VMS_ADMIN' },
    });

    if (!vmsAdminRole) {
      console.log('\n⚠️ VMS_ADMIN role not found! Creating...');
      await prisma.vMSRole.create({
        data: {
          name: 'VMS_ADMIN',
          displayName: 'VMS Administrator',
          description: 'Full VMS system access',
          permissions: JSON.stringify([
            'vms.dashboard.view', 'vms.dashboard.stats',
            'vms.visitors.view', 'vms.visitors.create', 'vms.visitors.edit', 'vms.visitors.delete',
            'vms.gatepasses.view', 'vms.gatepasses.create', 'vms.gatepasses.approve',
            'vms.companies.view', 'vms.companies.create', 'vms.companies.edit',
            'vms.users.view', 'vms.users.create', 'vms.users.edit',
            'vms.roles.view', 'vms.roles.edit',
            'vms.settings.view', 'vms.settings.edit',
            'vms.reports.view',
          ]),
          isSystem: true,
        },
      });
      console.log('  ✅ VMS_ADMIN role created');
    } else {
      console.log('\n✅ VMS_ADMIN role exists:', vmsAdminRole.displayName);
    }

    // Update admin user to have VMS_ADMIN role
    if (!vmsAdmin.vmsRoleId || vmsAdmin.vmsRoleId !== vmsAdminRole?.id) {
      const roleToAssign = vmsAdminRole || await prisma.vMSRole.findUnique({ where: { name: 'VMS_ADMIN' } });
      if (roleToAssign) {
        await prisma.vMSUser.update({
          where: { id: vmsAdmin.id },
          data: { vmsRoleId: roleToAssign.id },
        });
        console.log('  ✅ Assigned VMS_ADMIN role to admin user');
      }
    }

    console.log('\n✅ Done! Try logging in with:');
    console.log('   Email: admin@permitmanager.com');
    console.log('   Password: admin123');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPassword();
