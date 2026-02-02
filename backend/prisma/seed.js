const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // First, create roles
  console.log('Creating roles...');
  
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Full system access with all permissions',
      isSystem: true,
      permissions: JSON.stringify([
        'dashboard.view', 'dashboard.stats',
        'permits.view', 'permits.view_all', 'permits.view_own', 'permits.create', 'permits.edit', 'permits.edit_own', 'permits.delete', 'permits.export', 'permits.extend', 'permits.revoke', 'permits.close', 'permits.transfer',
        'approvals.view', 'approvals.approve', 'approvals.sign',
        'workers.view', 'workers.create', 'workers.edit', 'workers.delete', 'workers.qr',
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.assign_role',
        'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
        'meters.view', 'meters.view_all', 'meters.view_own', 'meters.create', 'meters.edit', 'meters.delete', 'meters.verify', 'meters.export', 'meters.import', 'meters.analytics', 'meters.ocr',
        'settings.view', 'settings.edit', 'settings.system',
        'audit.view',
      ]),
      uiConfig: JSON.stringify({
        theme: 'default',
        sidebarColor: 'slate',
        accentColor: 'emerald',
        showAllMenus: true,
      }),
    },
  });
  console.log('✅ Admin role created');

  const firemanRole = await prisma.role.upsert({
    where: { name: 'FIREMAN' },
    update: {},
    create: {
      name: 'FIREMAN',
      displayName: 'Fireman',
      description: 'Can approve/reject permits, re-approve revoked permits, and manage workers',
      isSystem: true,
      permissions: JSON.stringify([
        'dashboard.view', 'dashboard.stats',
        'permits.view', 'permits.view_all', 'permits.export', 'permits.extend', 'permits.revoke', 'permits.close', 'permits.reapprove',
        'approvals.view', 'approvals.approve', 'approvals.sign', 'approvals.reapprove',
        'workers.view', 'workers.create', 'workers.edit', 'workers.qr',
        'meters.view', 'meters.view_all', 'meters.verify', 'meters.analytics',
        'settings.view',
      ]),
      uiConfig: JSON.stringify({
        theme: 'default',
        sidebarColor: 'slate',
        accentColor: 'blue',
      }),
    },
  });
  console.log('✅ Fireman role created');

  const requestorRole = await prisma.role.upsert({
    where: { name: 'REQUESTOR' },
    update: {},
    create: {
      name: 'REQUESTOR',
      displayName: 'Requestor',
      description: 'Can create and view own permits',
      isSystem: true,
      permissions: JSON.stringify([
        'dashboard.view',
        'permits.view', 'permits.view_own', 'permits.create', 'permits.edit_own', 'permits.export',
        'workers.view', 'workers.qr',
        'settings.view',
      ]),
      uiConfig: JSON.stringify({
        theme: 'default',
        sidebarColor: 'slate',
        accentColor: 'primary',
      }),
    },
  });
  console.log('✅ Requestor role created');

  const siteEngineerRole = await prisma.role.upsert({
    where: { name: 'SITE_ENGINEER' },
    update: {},
    create: {
      name: 'SITE_ENGINEER',
      displayName: 'Site Engineer',
      description: 'Can upload meter readings, use OCR, and view analytics dashboard',
      isSystem: true,
      permissions: JSON.stringify([
        'dashboard.view', 'dashboard.stats',
        'meters.view', 'meters.view_own', 'meters.create', 'meters.edit', 'meters.export', 'meters.ocr', 'meters.analytics',
        'settings.view',
      ]),
      uiConfig: JSON.stringify({
        theme: 'default',
        sidebarColor: 'slate',
        accentColor: 'orange',
        showMeterModule: true,
      }),
    },
  });
  console.log('✅ Site Engineer role created');

  // Create users with roles
  console.log('Creating users...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@permitmanager.com' },
    update: { roleId: adminRole.id, isApproved: true, approvedAt: new Date() },
    create: {
      email: 'admin@permitmanager.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      roleId: adminRole.id,
      department: 'IT',
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Fireman
  const firemanPassword = await bcrypt.hash('fireman123', 10);
  const fireman = await prisma.user.upsert({
    where: { email: 'fireman@permitmanager.com' },
    update: { roleId: firemanRole.id, isApproved: true, approvedAt: new Date() },
    create: {
      email: 'fireman@permitmanager.com',
      password: firemanPassword,
      firstName: 'John',
      lastName: 'Fireman',
      roleId: firemanRole.id,
      department: 'HSE',
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log('✅ Fireman created:', fireman.email);

  // Requestor users
  const requestorPassword = await bcrypt.hash('user123', 10);
  const requestor1 = await prisma.user.upsert({
    where: { email: 'requestor@permitmanager.com' },
    update: { roleId: requestorRole.id, isApproved: true, approvedAt: new Date() },
    create: {
      email: 'requestor@permitmanager.com',
      password: requestorPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      roleId: requestorRole.id,
      department: 'Operations',
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log('✅ Requestor created:', requestor1.email);

  const requestor2 = await prisma.user.upsert({
    where: { email: 'worker@permitmanager.com' },
    update: { roleId: requestorRole.id, isApproved: true, approvedAt: new Date() },
    create: {
      email: 'worker@permitmanager.com',
      password: requestorPassword,
      firstName: 'Bob',
      lastName: 'Worker',
      roleId: requestorRole.id,
      department: 'Maintenance',
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log('✅ Requestor created:', requestor2.email);

  // Site Engineer user
  const engineerPassword = await bcrypt.hash('engineer123', 10);
  const siteEngineer = await prisma.user.upsert({
    where: { email: 'engineer@permitmanager.com' },
    update: { roleId: siteEngineerRole.id, isApproved: true, approvedAt: new Date() },
    create: {
      email: 'engineer@permitmanager.com',
      password: engineerPassword,
      firstName: 'Mike',
      lastName: 'Engineer',
      roleId: siteEngineerRole.id,
      department: 'Field Operations',
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log('✅ Site Engineer created:', siteEngineer.email);

  // Create sample permit requests
  console.log('Creating sample permits...');

  const permit1 = await prisma.permitRequest.create({
    data: {
      title: 'Hot Work Permit - Welding Operation',
      description: 'Welding work required for pipe repair in boiler room. Need to use arc welding equipment for approximately 4 hours.',
      location: 'Boiler Room B2',
      workType: 'HOT_WORK',
      startDate: new Date('2025-01-15T08:00:00Z'),
      endDate: new Date('2025-01-15T17:00:00Z'),
      status: 'PENDING',
      priority: 'HIGH',
      hazards: JSON.stringify(['Fire', 'Burns', 'Toxic fumes', 'Electric shock']),
      precautions: JSON.stringify(['Fire extinguisher nearby', 'Fire watch posted', 'Ventilation system active', 'PPE required']),
      equipment: JSON.stringify(['Arc welding machine', 'Welding helmet', 'Fire blanket', 'Gloves']),
      createdBy: requestor1.id,
    },
  });

  await prisma.permitApproval.create({
    data: {
      permitId: permit1.id,
      approverRole: 'FIREMAN',
      decision: 'PENDING',
    },
  });
  console.log('✅ Permit request created:', permit1.title);

  const permit2 = await prisma.permitRequest.create({
    data: {
      title: 'Confined Space Entry - Tank Inspection',
      description: 'Entry into storage tank T-101 for annual inspection and cleaning. Gas testing required before entry.',
      location: 'Storage Area - Tank T-101',
      workType: 'CONFINED_SPACE',
      startDate: new Date('2025-01-16T09:00:00Z'),
      endDate: new Date('2025-01-16T15:00:00Z'),
      status: 'PENDING',
      priority: 'HIGH',
      hazards: JSON.stringify(['Oxygen deficiency', 'Toxic gases', 'Engulfment', 'Falls']),
      precautions: JSON.stringify(['Gas testing required', 'Rescue team standby', 'Communication system', 'Entry permit signed']),
      equipment: JSON.stringify(['Gas detector', 'Harness', 'Rescue tripod', 'Communication radio']),
      createdBy: requestor2.id,
    },
  });

  await prisma.permitApproval.create({
    data: {
      permitId: permit2.id,
      approverRole: 'FIREMAN',
      decision: 'PENDING',
    },
  });
  console.log('✅ Permit request created:', permit2.title);

  const permit3 = await prisma.permitRequest.create({
    data: {
      title: 'Electrical Work Permit - Panel Upgrade',
      description: 'Upgrading main electrical panel in building A. Requires power isolation and lockout/tagout procedures.',
      location: 'Building A - Electrical Room',
      workType: 'ELECTRICAL',
      startDate: new Date('2025-01-17T07:00:00Z'),
      endDate: new Date('2025-01-17T18:00:00Z'),
      status: 'APPROVED',
      priority: 'MEDIUM',
      hazards: JSON.stringify(['Electric shock', 'Arc flash', 'Burns']),
      precautions: JSON.stringify(['LOTO procedures', 'Voltage testing', 'Insulated tools', 'PPE required']),
      equipment: JSON.stringify(['Voltage tester', 'Insulated gloves', 'Face shield', 'LOTO locks']),
      createdBy: requestor1.id,
    },
  });

  await prisma.permitApproval.create({
    data: {
      permitId: permit3.id,
      approverName: 'John Safety',
      approverRole: 'FIREMAN',
      decision: 'APPROVED',
      comment: 'All safety requirements verified. Proceed with caution.',
      approvedAt: new Date('2025-01-14T10:30:00Z'),
    },
  });
  console.log('✅ Permit request created:', permit3.title);

  // Create sample meter readings for Site Engineer
  console.log('Creating sample meter readings...');

  const meterReadings = [
    {
      siteEngineerId: siteEngineer.id,
      meterType: 'electricity',
      meterName: 'Main Building Meter',
      meterSerial: 'EM-001',
      location: 'Building A - Ground Floor',
      readingValue: 45678.50,
      unit: 'kWh',
      previousReading: 45234.00,
      consumption: 444.50,
      readingDate: new Date('2025-01-10T09:00:00Z'),
      isVerified: true,
      verifiedBy: safetyOfficer.id,
      verifiedAt: new Date('2025-01-10T14:00:00Z'),
    },
    {
      siteEngineerId: siteEngineer.id,
      meterType: 'water',
      meterName: 'Water Supply Meter',
      meterSerial: 'WM-001',
      location: 'Utility Room',
      readingValue: 12345.20,
      unit: 'm³',
      previousReading: 12100.00,
      consumption: 245.20,
      readingDate: new Date('2025-01-10T09:30:00Z'),
      isVerified: true,
      verifiedBy: safetyOfficer.id,
      verifiedAt: new Date('2025-01-10T14:30:00Z'),
    },
    {
      siteEngineerId: siteEngineer.id,
      meterType: 'gas',
      meterName: 'Natural Gas Meter',
      meterSerial: 'GM-001',
      location: 'Boiler Room',
      readingValue: 8765.30,
      unit: 'm³',
      previousReading: 8500.00,
      consumption: 265.30,
      readingDate: new Date('2025-01-11T08:00:00Z'),
      isVerified: false,
    },
    {
      siteEngineerId: siteEngineer.id,
      meterType: 'transmitter',
      meterName: 'Signal Transmitter T1',
      meterSerial: 'TX-001',
      location: 'Tower A',
      readingValue: -45.5,
      unit: 'dBm',
      readingDate: new Date('2025-01-12T10:00:00Z'),
      notes: 'Signal strength within normal range',
      isVerified: false,
    },
    {
      siteEngineerId: siteEngineer.id,
      meterType: 'temperature',
      meterName: 'Cold Room Sensor',
      meterSerial: 'TS-001',
      location: 'Cold Storage',
      readingValue: -18.5,
      unit: '°C',
      readingDate: new Date('2025-01-12T11:00:00Z'),
      notes: 'Temperature within optimal range',
      isVerified: false,
    },
  ];

  for (const reading of meterReadings) {
    await prisma.meterReading.create({ data: reading });
  }
  console.log('✅ Sample meter readings created');

  console.log('');
  console.log('🎉 Database seeding completed!');
  console.log('');
  console.log('📋 Demo Credentials:');
  console.log('   Admin:          admin@permitmanager.com / admin123');
  console.log('   Fireman:        fireman@permitmanager.com / fireman123');
  console.log('   Requestor:      requestor@permitmanager.com / user123');
  console.log('   Site Engineer:  engineer@permitmanager.com / engineer123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
