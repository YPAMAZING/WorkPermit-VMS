#!/usr/bin/env node
/**
 * Debug VMS Login Script
 * Run this on VPS to diagnose login issues:
 *   node scripts/debug-vms-login.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function debug() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            VMS LOGIN DEBUG                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Check database connection
    console.log('1️⃣  Testing database connection...');
    await prisma.$connect();
    console.log('   ✅ Database connected\n');

    // Check if vms_users table exists
    console.log('2️⃣  Checking VMS tables...');
    try {
      const vmsUsersCount = await prisma.vMSUser.count();
      console.log(`   ✅ vms_users table exists: ${vmsUsersCount} users`);
    } catch (e) {
      console.log('   ❌ vms_users table error:', e.message);
      console.log('   💡 Run: mysql -u root -p workpermit_db < scripts/create-vms-tables.sql');
      return;
    }

    try {
      const vmsRolesCount = await prisma.vMSRole.count();
      console.log(`   ✅ vms_roles table exists: ${vmsRolesCount} roles`);
    } catch (e) {
      console.log('   ❌ vms_roles table error:', e.message);
      return;
    }

    // List all VMS users
    console.log('\n3️⃣  VMS Users:');
    const vmsUsers = await prisma.vMSUser.findMany({
      include: { vmsRole: true },
    });
    
    if (vmsUsers.length === 0) {
      console.log('   ❌ No VMS users found!');
      console.log('   💡 Run: node scripts/complete-setup.js');
      return;
    }

    for (const user of vmsUsers) {
      console.log(`   📧 ${user.email}`);
      console.log(`      Name: ${user.firstName} ${user.lastName}`);
      console.log(`      Role: ${user.vmsRole?.name || 'No role'}`);
      console.log(`      Active: ${user.isActive}`);
      console.log(`      Approved: ${user.isApproved}`);
      console.log(`      From Work Permit: ${user.isFromWorkPermit}`);
      console.log(`      Password hash: ${user.password.substring(0, 20)}...`);
      console.log('');
    }

    // Test password for admin
    console.log('4️⃣  Testing password verification...');
    const adminUser = await prisma.vMSUser.findUnique({
      where: { email: 'admin@permitmanager.com' },
    });

    if (!adminUser) {
      console.log('   ❌ Admin user not found in VMS!');
      console.log('   💡 Run: node scripts/complete-setup.js');
      return;
    }

    console.log(`   Found admin: ${adminUser.email}`);
    console.log(`   Password hash: ${adminUser.password}`);

    // Test password
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, adminUser.password);
    console.log(`   Password test (admin123): ${isValid ? '✅ VALID' : '❌ INVALID'}`);

    if (!isValid) {
      console.log('\n   💡 Password mismatch! Updating password...');
      const newHash = await bcrypt.hash('admin123', 10);
      await prisma.vMSUser.update({
        where: { id: adminUser.id },
        data: { password: newHash },
      });
      console.log('   ✅ Password updated to admin123');
    }

    // List VMS roles
    console.log('\n5️⃣  VMS Roles:');
    const vmsRoles = await prisma.vMSRole.findMany();
    for (const role of vmsRoles) {
      console.log(`   🎭 ${role.name} (${role.displayName})`);
    }

    // Check Work Permit admin
    console.log('\n6️⃣  Work Permit Admin (for comparison):');
    const wpAdmin = await prisma.user.findUnique({
      where: { email: 'admin@permitmanager.com' },
      include: { role: true },
    });

    if (wpAdmin) {
      console.log(`   📧 ${wpAdmin.email}`);
      console.log(`   Password hash: ${wpAdmin.password}`);
      
      const wpValid = await bcrypt.compare('admin123', wpAdmin.password);
      console.log(`   Password test (admin123): ${wpValid ? '✅ VALID' : '❌ INVALID'}`);
    } else {
      console.log('   ❌ Work Permit admin not found');
    }

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    DEBUG COMPLETE                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
