const { PrismaClient } = require('.prisma/vms-client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding VMS database...');

  // Create VMS Permissions
  const vmsPermissions = [
    // Dashboard
    { key: 'vms.dashboard.view', name: 'View VMS Dashboard', module: 'dashboard', action: 'view' },
    
    // Visitors
    { key: 'vms.visitors.view', name: 'View Visitors', module: 'visitors', action: 'view' },
    { key: 'vms.visitors.create', name: 'Create Visitors', module: 'visitors', action: 'create' },
    { key: 'vms.visitors.edit', name: 'Edit Visitors', module: 'visitors', action: 'edit' },
    { key: 'vms.visitors.delete', name: 'Delete Visitors', module: 'visitors', action: 'delete' },
    
    // Gatepasses
    { key: 'vms.gatepasses.view', name: 'View Gatepasses', module: 'gatepasses', action: 'view' },
    { key: 'vms.gatepasses.create', name: 'Create Gatepasses', module: 'gatepasses', action: 'create' },
    { key: 'vms.gatepasses.edit', name: 'Edit Gatepasses', module: 'gatepasses', action: 'edit' },
    { key: 'vms.gatepasses.delete', name: 'Delete Gatepasses', module: 'gatepasses', action: 'delete' },
    { key: 'vms.gatepasses.cancel', name: 'Cancel Gatepasses', module: 'gatepasses', action: 'cancel' },
    
    // Pre-approved Visitors
    { key: 'vms.preapproved.view', name: 'View Pre-approved Visitors', module: 'preapproved', action: 'view' },
    { key: 'vms.preapproved.create', name: 'Create Pre-approved Visitors', module: 'preapproved', action: 'create' },
    { key: 'vms.preapproved.edit', name: 'Edit Pre-approved Visitors', module: 'preapproved', action: 'edit' },
    { key: 'vms.preapproved.delete', name: 'Delete Pre-approved Visitors', module: 'preapproved', action: 'delete' },
    
    // Blacklist
    { key: 'vms.blacklist.view', name: 'View Blacklist', module: 'blacklist', action: 'view' },
    { key: 'vms.blacklist.create', name: 'Add to Blacklist', module: 'blacklist', action: 'create' },
    { key: 'vms.blacklist.edit', name: 'Edit Blacklist', module: 'blacklist', action: 'edit' },
    { key: 'vms.blacklist.delete', name: 'Remove from Blacklist', module: 'blacklist', action: 'delete' },
    
    // Reports
    { key: 'vms.reports.view', name: 'View VMS Reports', module: 'reports', action: 'view' },
    { key: 'vms.reports.export', name: 'Export VMS Reports', module: 'reports', action: 'export' },
    
    // Settings
    { key: 'vms.settings.view', name: 'View VMS Settings', module: 'settings', action: 'view' },
    { key: 'vms.settings.edit', name: 'Edit VMS Settings', module: 'settings', action: 'edit' },
    
    // Users & Roles
    { key: 'vms.users.view', name: 'View VMS Users', module: 'users', action: 'view' },
    { key: 'vms.users.create', name: 'Create VMS Users', module: 'users', action: 'create' },
    { key: 'vms.users.edit', name: 'Edit VMS Users', module: 'users', action: 'edit' },
    { key: 'vms.users.delete', name: 'Delete VMS Users', module: 'users', action: 'delete' },
    { key: 'vms.roles.view', name: 'View VMS Roles', module: 'roles', action: 'view' },
    { key: 'vms.roles.create', name: 'Create VMS Roles', module: 'roles', action: 'create' },
    { key: 'vms.roles.edit', name: 'Edit VMS Roles', module: 'roles', action: 'edit' },
    { key: 'vms.roles.delete', name: 'Delete VMS Roles', module: 'roles', action: 'delete' },
  ];

  // Create permissions
  for (const perm of vmsPermissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: perm,
      create: { id: uuidv4(), ...perm },
    });
  }
  console.log('✅ Created VMS permissions');

  // Create VMS Roles
  const roles = [
    {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Full access to VMS system',
      permissions: JSON.stringify(vmsPermissions.map(p => p.key)),
      isSystem: true,
    },
    {
      name: 'VMS_ADMIN',
      displayName: 'VMS Administrator',
      description: 'VMS system administrator with full VMS access',
      permissions: JSON.stringify(vmsPermissions.map(p => p.key)),
      isSystem: true,
    },
    {
      name: 'SECURITY_SUPERVISOR',
      displayName: 'Security Supervisor',
      description: 'Supervise security operations and manage gatepasses',
      permissions: JSON.stringify([
        'vms.dashboard.view',
        'vms.visitors.view', 'vms.visitors.create', 'vms.visitors.edit',
        'vms.gatepasses.view', 'vms.gatepasses.create', 'vms.gatepasses.edit', 'vms.gatepasses.cancel',
        'vms.preapproved.view', 'vms.preapproved.create', 'vms.preapproved.edit',
        'vms.blacklist.view', 'vms.blacklist.create', 'vms.blacklist.edit',
        'vms.reports.view', 'vms.reports.export',
      ]),
      isSystem: true,
    },
    {
      name: 'SECURITY_GUARD',
      displayName: 'Security Guard',
      description: 'Manage visitor entry/exit and gatepasses',
      permissions: JSON.stringify([
        'vms.dashboard.view',
        'vms.visitors.view', 'vms.visitors.create',
        'vms.gatepasses.view', 'vms.gatepasses.create',
        'vms.preapproved.view',
        'vms.blacklist.view',
      ]),
      isSystem: true,
    },
    {
      name: 'RECEPTIONIST',
      displayName: 'Receptionist',
      description: 'Register visitors and create gatepasses',
      permissions: JSON.stringify([
        'vms.dashboard.view',
        'vms.visitors.view', 'vms.visitors.create', 'vms.visitors.edit',
        'vms.gatepasses.view', 'vms.gatepasses.create', 'vms.gatepasses.edit',
        'vms.preapproved.view', 'vms.preapproved.create',
        'vms.blacklist.view',
      ]),
      isSystem: true,
    },
    {
      name: 'HOST',
      displayName: 'Host/Employee',
      description: 'Pre-approve visitors and view visitor status',
      permissions: JSON.stringify([
        'vms.dashboard.view',
        'vms.visitors.view',
        'vms.gatepasses.view',
        'vms.preapproved.view', 'vms.preapproved.create', 'vms.preapproved.edit',
      ]),
      isSystem: true,
    },
    {
      name: 'VMS_VIEWER',
      displayName: 'VMS Viewer',
      description: 'View-only access to VMS system',
      permissions: JSON.stringify([
        'vms.dashboard.view',
        'vms.visitors.view',
        'vms.gatepasses.view',
        'vms.preapproved.view',
        'vms.blacklist.view',
        'vms.reports.view',
      ]),
      isSystem: true,
    },
  ];

  const createdRoles = {};
  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: { id: uuidv4(), ...role },
    });
    createdRoles[role.name] = created;
  }
  console.log('✅ Created VMS roles');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  await prisma.user.upsert({
    where: { email: 'vmsadmin@reliablegroup.com' },
    update: {
      password: hashedPassword,
      firstName: 'VMS',
      lastName: 'Admin',
      roleId: createdRoles['ADMIN'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'vmsadmin@reliablegroup.com',
      password: hashedPassword,
      firstName: 'VMS',
      lastName: 'Admin',
      roleId: createdRoles['ADMIN'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created VMS admin user (vmsadmin@reliablegroup.com / Admin@123)');

  // Create sample security guard
  await prisma.user.upsert({
    where: { email: 'guard@reliablegroup.com' },
    update: {
      password: hashedPassword,
      firstName: 'Security',
      lastName: 'Guard',
      roleId: createdRoles['SECURITY_GUARD'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'guard@reliablegroup.com',
      password: hashedPassword,
      firstName: 'Security',
      lastName: 'Guard',
      roleId: createdRoles['SECURITY_GUARD'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created sample security guard (guard@reliablegroup.com / Admin@123)');

  // Create sample receptionist
  await prisma.user.upsert({
    where: { email: 'reception@reliablegroup.com' },
    update: {
      password: hashedPassword,
      firstName: 'Reception',
      lastName: 'Desk',
      roleId: createdRoles['RECEPTIONIST'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'reception@reliablegroup.com',
      password: hashedPassword,
      firstName: 'Reception',
      lastName: 'Desk',
      roleId: createdRoles['RECEPTIONIST'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created sample receptionist (reception@reliablegroup.com / Admin@123)');

  // Create default system settings
  const settings = [
    { key: 'company_name', value: 'Reliable Group', description: 'Company name' },
    { key: 'company_logo', value: '', description: 'Company logo URL' },
    { key: 'gatepass_prefix', value: 'GP', description: 'Gatepass number prefix' },
    { key: 'default_validity_hours', value: '8', description: 'Default gatepass validity in hours' },
    { key: 'require_photo', value: 'true', description: 'Require visitor photo' },
    { key: 'require_id_proof', value: 'true', description: 'Require ID proof' },
    { key: 'auto_expire_gatepasses', value: 'true', description: 'Auto-expire gatepasses after validity' },
    { key: 'blacklist_check_enabled', value: 'true', description: 'Enable blacklist checking' },
  ];

  for (const setting of settings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: setting,
      create: { id: uuidv4(), ...setting },
    });
  }
  console.log('✅ Created VMS system settings');

  console.log('\n🎉 VMS database seeding completed!');
  console.log('\n📝 Default VMS Users:');
  console.log('   Admin: vmsadmin@reliablegroup.com / Admin@123');
  console.log('   Security Guard: guard@reliablegroup.com / Admin@123');
  console.log('   Receptionist: reception@reliablegroup.com / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
