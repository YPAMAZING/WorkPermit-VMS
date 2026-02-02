const { PrismaClient } = require('.prisma/mis-client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MIS database...');

  // Create MIS Permissions
  const misPermissions = [
    // Dashboard
    { key: 'mis.dashboard.view', name: 'View MIS Dashboard', module: 'dashboard', action: 'view' },
    
    // Meter Readings
    { key: 'mis.meters.view', name: 'View Meter Readings', module: 'meters', action: 'view' },
    { key: 'mis.meters.create', name: 'Create Meter Readings', module: 'meters', action: 'create' },
    { key: 'mis.meters.edit', name: 'Edit Meter Readings', module: 'meters', action: 'edit' },
    { key: 'mis.meters.delete', name: 'Delete Meter Readings', module: 'meters', action: 'delete' },
    { key: 'mis.meters.verify', name: 'Verify Meter Readings', module: 'meters', action: 'verify' },
    { key: 'mis.meters.export', name: 'Export Meter Readings', module: 'meters', action: 'export' },
    { key: 'mis.meters.import', name: 'Import Meter Readings', module: 'meters', action: 'import' },
    { key: 'mis.meters.ocr', name: 'Use OCR for Readings', module: 'meters', action: 'ocr' },
    
    // Meter Configuration
    { key: 'mis.config.view', name: 'View Meter Config', module: 'config', action: 'view' },
    { key: 'mis.config.create', name: 'Create Meter Config', module: 'config', action: 'create' },
    { key: 'mis.config.edit', name: 'Edit Meter Config', module: 'config', action: 'edit' },
    { key: 'mis.config.delete', name: 'Delete Meter Config', module: 'config', action: 'delete' },
    
    // Transmitter Data
    { key: 'mis.transmitter.view', name: 'View Transmitter Data', module: 'transmitter', action: 'view' },
    { key: 'mis.transmitter.create', name: 'Create Transmitter Data', module: 'transmitter', action: 'create' },
    { key: 'mis.transmitter.edit', name: 'Edit Transmitter Data', module: 'transmitter', action: 'edit' },
    { key: 'mis.transmitter.delete', name: 'Delete Transmitter Data', module: 'transmitter', action: 'delete' },
    
    // Analytics
    { key: 'mis.analytics.view', name: 'View Analytics', module: 'analytics', action: 'view' },
    { key: 'mis.analytics.export', name: 'Export Analytics', module: 'analytics', action: 'export' },
    
    // Reports
    { key: 'mis.reports.view', name: 'View Reports', module: 'reports', action: 'view' },
    { key: 'mis.reports.create', name: 'Create Reports', module: 'reports', action: 'create' },
    { key: 'mis.reports.export', name: 'Export Reports', module: 'reports', action: 'export' },
    { key: 'mis.reports.schedule', name: 'Schedule Reports', module: 'reports', action: 'schedule' },
    
    // Alerts
    { key: 'mis.alerts.view', name: 'View Alerts', module: 'alerts', action: 'view' },
    { key: 'mis.alerts.resolve', name: 'Resolve Alerts', module: 'alerts', action: 'resolve' },
    
    // Settings
    { key: 'mis.settings.view', name: 'View MIS Settings', module: 'settings', action: 'view' },
    { key: 'mis.settings.edit', name: 'Edit MIS Settings', module: 'settings', action: 'edit' },
    
    // Users & Roles
    { key: 'mis.users.view', name: 'View MIS Users', module: 'users', action: 'view' },
    { key: 'mis.users.create', name: 'Create MIS Users', module: 'users', action: 'create' },
    { key: 'mis.users.edit', name: 'Edit MIS Users', module: 'users', action: 'edit' },
    { key: 'mis.users.delete', name: 'Delete MIS Users', module: 'users', action: 'delete' },
    { key: 'mis.roles.view', name: 'View MIS Roles', module: 'roles', action: 'view' },
    { key: 'mis.roles.create', name: 'Create MIS Roles', module: 'roles', action: 'create' },
    { key: 'mis.roles.edit', name: 'Edit MIS Roles', module: 'roles', action: 'edit' },
    { key: 'mis.roles.delete', name: 'Delete MIS Roles', module: 'roles', action: 'delete' },
  ];

  // Create permissions
  for (const perm of misPermissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: perm,
      create: { id: uuidv4(), ...perm },
    });
  }
  console.log('✅ Created MIS permissions');

  // Create MIS Roles
  const roles = [
    {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Full access to MIS system',
      permissions: JSON.stringify(misPermissions.map(p => p.key)),
      isSystem: true,
    },
    {
      name: 'MIS_ADMIN',
      displayName: 'MIS Administrator',
      description: 'MIS system administrator with full MIS access',
      permissions: JSON.stringify(misPermissions.map(p => p.key)),
      isSystem: true,
    },
    {
      name: 'MIS_VERIFIER',
      displayName: 'MIS Verifier',
      description: 'Verify meter readings and manage data quality',
      permissions: JSON.stringify([
        'mis.dashboard.view',
        'mis.meters.view', 'mis.meters.edit', 'mis.meters.verify', 'mis.meters.export',
        'mis.transmitter.view', 'mis.transmitter.edit',
        'mis.analytics.view', 'mis.analytics.export',
        'mis.reports.view', 'mis.reports.export',
        'mis.alerts.view', 'mis.alerts.resolve',
        'mis.config.view',
      ]),
      isSystem: true,
    },
    {
      name: 'SITE_ENGINEER',
      displayName: 'Site Engineer',
      description: 'Record meter readings and transmitter data',
      permissions: JSON.stringify([
        'mis.dashboard.view',
        'mis.meters.view', 'mis.meters.create', 'mis.meters.edit', 'mis.meters.ocr',
        'mis.transmitter.view', 'mis.transmitter.create', 'mis.transmitter.edit',
        'mis.config.view',
        'mis.alerts.view',
      ]),
      isSystem: true,
    },
    {
      name: 'MIS_VIEWER',
      displayName: 'MIS Viewer',
      description: 'View-only access to MIS system',
      permissions: JSON.stringify([
        'mis.dashboard.view',
        'mis.meters.view',
        'mis.transmitter.view',
        'mis.analytics.view',
        'mis.reports.view',
        'mis.alerts.view',
        'mis.config.view',
      ]),
      isSystem: true,
    },
    {
      name: 'FIREMAN',
      displayName: 'Fireman',
      description: 'Fire safety equipment meter readings',
      permissions: JSON.stringify([
        'mis.dashboard.view',
        'mis.meters.view', 'mis.meters.create', 'mis.meters.edit',
        'mis.alerts.view',
      ]),
      isSystem: true,
    },
    {
      name: 'SAFETY_OFFICER',
      displayName: 'Safety Officer',
      description: 'Safety and compliance monitoring',
      permissions: JSON.stringify([
        'mis.dashboard.view',
        'mis.meters.view', 'mis.meters.verify',
        'mis.analytics.view', 'mis.analytics.export',
        'mis.reports.view', 'mis.reports.export',
        'mis.alerts.view', 'mis.alerts.resolve',
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
  console.log('✅ Created MIS roles');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  await prisma.user.upsert({
    where: { email: 'misadmin@reliablegroup.com' },
    update: {
      password: hashedPassword,
      firstName: 'MIS',
      lastName: 'Admin',
      roleId: createdRoles['ADMIN'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'misadmin@reliablegroup.com',
      password: hashedPassword,
      firstName: 'MIS',
      lastName: 'Admin',
      roleId: createdRoles['ADMIN'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created MIS admin user (misadmin@reliablegroup.com / Admin@123)');

  // Create sample site engineer
  await prisma.user.upsert({
    where: { email: 'engineer@reliablegroup.com' },
    update: {
      password: hashedPassword,
      firstName: 'Site',
      lastName: 'Engineer',
      roleId: createdRoles['SITE_ENGINEER'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'engineer@reliablegroup.com',
      password: hashedPassword,
      firstName: 'Site',
      lastName: 'Engineer',
      roleId: createdRoles['SITE_ENGINEER'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created sample site engineer (engineer@reliablegroup.com / Admin@123)');

  // Create sample verifier
  await prisma.user.upsert({
    where: { email: 'verifier@reliablegroup.com' },
    update: {
      password: hashedPassword,
      firstName: 'Data',
      lastName: 'Verifier',
      roleId: createdRoles['MIS_VERIFIER'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'verifier@reliablegroup.com',
      password: hashedPassword,
      firstName: 'Data',
      lastName: 'Verifier',
      roleId: createdRoles['MIS_VERIFIER'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created sample verifier (verifier@reliablegroup.com / Admin@123)');

  // Create default system settings
  const settings = [
    { key: 'company_name', value: 'Reliable Group', description: 'Company name' },
    { key: 'company_logo', value: '', description: 'Company logo URL' },
    { key: 'default_meter_unit', value: 'kWh', description: 'Default unit for electricity meters' },
    { key: 'reading_reminder_hour', value: '9', description: 'Hour to send reading reminders' },
    { key: 'auto_verify_threshold', value: '10', description: 'Auto-verify if consumption change is within this %' },
    { key: 'alert_high_consumption', value: 'true', description: 'Alert on high consumption' },
    { key: 'alert_missing_readings', value: 'true', description: 'Alert on missing readings' },
    { key: 'retention_days', value: '365', description: 'Days to retain analytics cache' },
    { key: 'timezone', value: 'Asia/Kolkata', description: 'Default timezone' },
  ];

  for (const setting of settings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: setting,
      create: { id: uuidv4(), ...setting },
    });
  }
  console.log('✅ Created MIS system settings');

  // Create sample meter configurations
  const meterConfigs = [
    {
      meterType: 'electricity',
      meterName: 'Main Building - EB Meter',
      meterSerial: 'EB-MAIN-001',
      location: 'Main Building',
      buildingName: 'Main Building',
      floorNumber: 'Ground',
      unit: 'kWh',
      multiplier: 1,
    },
    {
      meterType: 'electricity',
      meterName: 'DG Set 1 - Hour Meter',
      meterSerial: 'DG-001-HM',
      location: 'Generator Room',
      buildingName: 'Main Building',
      floorNumber: 'Basement',
      unit: 'Hours',
      multiplier: 1,
    },
    {
      meterType: 'water',
      meterName: 'Main Water Meter',
      meterSerial: 'WM-MAIN-001',
      location: 'Pump House',
      buildingName: 'Pump House',
      unit: 'm³',
      multiplier: 1,
    },
    {
      meterType: 'diesel',
      meterName: 'DG Fuel Tank Level',
      meterSerial: 'DG-FUEL-001',
      location: 'Generator Room',
      buildingName: 'Main Building',
      floorNumber: 'Basement',
      unit: 'Liters',
      multiplier: 1,
    },
  ];

  for (const config of meterConfigs) {
    await prisma.meterConfig.upsert({
      where: { meterSerial: config.meterSerial },
      update: config,
      create: { id: uuidv4(), ...config },
    });
  }
  console.log('✅ Created sample meter configurations');

  console.log('\n🎉 MIS database seeding completed!');
  console.log('\n📝 Default MIS Users:');
  console.log('   Admin: misadmin@reliablegroup.com / Admin@123');
  console.log('   Site Engineer: engineer@reliablegroup.com / Admin@123');
  console.log('   Verifier: verifier@reliablegroup.com / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
