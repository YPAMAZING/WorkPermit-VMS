#!/bin/bash
# VMS Database Complete Setup Script
# Run this on VPS: cd /var/www/WorkPermit-VMS/backend && bash scripts/setup-vms-database.sh

echo "========================================"
echo "🚀 VMS Database Setup"
echo "========================================"

# Check if VMS_DATABASE_URL exists in .env
if grep -q "VMS_DATABASE_URL" .env; then
    echo "✅ VMS_DATABASE_URL found in .env"
else
    echo "❌ VMS_DATABASE_URL not found in .env"
    echo ""
    echo "Adding VMS_DATABASE_URL to .env..."
    echo "" >> .env
    echo "# VMS Database" >> .env
    echo "VMS_DATABASE_URL=mysql://workpermit_user:WorkPermitGVMS2024!@localhost:3306/workpermit_vms_db" >> .env
    echo "✅ Added VMS_DATABASE_URL to .env"
fi

echo ""
echo "📋 Step 1: Generate VMS Prisma Client..."
npx prisma generate --schema=./prisma-vms/schema.prisma

echo ""
echo "📋 Step 2: Push VMS schema to database..."
npx prisma db push --schema=./prisma-vms/schema.prisma --accept-data-loss

echo ""
echo "📋 Step 3: Creating VMS Admin role and user..."
node -e "
const vmsPrisma = require('./src/config/vms-prisma');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const VMS_ADMIN_PERMISSIONS = [
  'vms.dashboard.view','vms.dashboard.stats','vms.visitors.view','vms.visitors.view_all',
  'vms.visitors.create','vms.visitors.edit','vms.visitors.delete','vms.gatepasses.view',
  'vms.gatepasses.create','vms.gatepasses.edit','vms.gatepasses.approve','vms.gatepasses.cancel',
  'vms.checkin.view','vms.checkin.approve','vms.checkin.reject','vms.checkin.manage',
  'vms.preapproved.view','vms.preapproved.create','vms.preapproved.edit','vms.preapproved.delete',
  'vms.blacklist.view','vms.blacklist.manage','vms.companies.view','vms.companies.create',
  'vms.companies.edit','vms.companies.delete','vms.users.view','vms.users.create',
  'vms.users.edit','vms.users.delete','vms.roles.view','vms.roles.create',
  'vms.roles.edit','vms.roles.delete','vms.settings.view','vms.settings.edit',
  'vms.reports.view','vms.reports.export','vms.audit.view'
];

async function setup() {
  try {
    // Create VMS_ADMIN role
    let role = await vmsPrisma.role.findUnique({ where: { name: 'VMS_ADMIN' } });
    if (!role) {
      role = await vmsPrisma.role.create({
        data: {
          id: uuidv4(),
          name: 'VMS_ADMIN',
          displayName: 'VMS Administrator',
          description: 'Full VMS system access',
          permissions: JSON.stringify(VMS_ADMIN_PERMISSIONS),
          uiConfig: JSON.stringify({ theme: 'admin', primaryColor: '#3b82f6' }),
          isSystem: true,
          isActive: true,
        },
      });
      console.log('✅ Created VMS_ADMIN role');
    } else {
      console.log('✅ VMS_ADMIN role exists');
    }

    // Create admin user
    let user = await vmsPrisma.user.findUnique({ where: { email: 'admin@permitmanager.com' } });
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
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
      console.log('✅ Created admin user in VMS database');
    } else {
      await vmsPrisma.user.update({
        where: { id: user.id },
        data: { roleId: role.id, isActive: true, isApproved: true, password: hashedPassword },
      });
      console.log('✅ Updated admin user in VMS database');
    }

    console.log('');
    console.log('🔐 VMS Admin Login:');
    console.log('   Email: admin@permitmanager.com');
    console.log('   Password: admin123');
    
    await vmsPrisma.\$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setup();
"

echo ""
echo "========================================"
echo "✅ VMS Database Setup Complete!"
echo "========================================"
echo ""
echo "Now restart PM2:"
echo "  pm2 restart all"
echo ""
echo "Then try VMS login:"
echo "  Email: admin@permitmanager.com"
echo "  Password: admin123"
