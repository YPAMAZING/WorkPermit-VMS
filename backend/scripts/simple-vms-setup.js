/**
 * Simple VMS Admin Setup
 * Creates VMS_ADMIN role with minimal permissions string
 */

const vmsPrisma = require('./src/config/vms-prisma');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Shorter permission - just use wildcard
const PERMISSIONS = '["vms.*"]';
const UI_CONFIG = '{}';

async function setup() {
  try {
    console.log('🔄 Connecting to VMS database...');
    
    // Create VMS_ADMIN role with short permissions
    let role = await vmsPrisma.role.findUnique({ where: { name: 'VMS_ADMIN' } });
    
    if (!role) {
      role = await vmsPrisma.role.create({
        data: {
          id: uuidv4(),
          name: 'VMS_ADMIN',
          displayName: 'VMS Administrator',
          description: 'Full VMS access',
          permissions: PERMISSIONS,
          uiConfig: UI_CONFIG,
          isSystem: true,
          isActive: true,
        },
      });
      console.log('✅ Created VMS_ADMIN role');
    } else {
      // Update existing role
      role = await vmsPrisma.role.update({
        where: { name: 'VMS_ADMIN' },
        data: {
          permissions: PERMISSIONS,
          uiConfig: UI_CONFIG,
        },
      });
      console.log('✅ Updated VMS_ADMIN role');
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    let user = await vmsPrisma.user.findUnique({ where: { email: 'admin@permitmanager.com' } });
    
    if (!user) {
      user = await vmsPrisma.user.create({
        data: {
          id: uuidv4(),
          email: 'admin@permitmanager.com',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          roleId: role.id,
          isActive: true,
          isApproved: true,
        },
      });
      console.log('✅ Created admin user');
    } else {
      user = await vmsPrisma.user.update({
        where: { id: user.id },
        data: {
          roleId: role.id,
          isActive: true,
          isApproved: true,
          password: hashedPassword,
        },
      });
      console.log('✅ Updated admin user');
    }

    console.log('\n========================================');
    console.log('✅ VMS Setup Complete!');
    console.log('========================================');
    console.log('\n🔐 VMS Login:');
    console.log('   Email: admin@permitmanager.com');
    console.log('   Password: admin123\n');
    
    await vmsPrisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await vmsPrisma.$disconnect();
    process.exit(1);
  }
}

setup();
