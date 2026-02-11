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

  // SITE_ENGINEER role removed (MIS functionality removed)

  // VMS Roles
  const vmsReceptionRole = await prisma.role.upsert({
    where: { name: 'VMS_RECEPTION' },
    update: {},
    create: {
      name: 'VMS_RECEPTION',
      displayName: 'VMS Reception',
      description: 'Reception staff - can view all visitors, approve/reject gatepasses, manage check-ins',
      isSystem: true,
      permissions: JSON.stringify([
        'dashboard.view',
        'vms.dashboard.view',
        'vms.visitors.view', 'vms.visitors.view_all', 'vms.visitors.create', 'vms.visitors.edit',
        'vms.gatepasses.view', 'vms.gatepasses.view_all', 'vms.gatepasses.create', 'vms.gatepasses.approve', 'vms.gatepasses.reject',
        'vms.checkin.view', 'vms.checkin.manage',
        'vms.preapproved.view',
        'vms.reports.view',
      ]),
      uiConfig: JSON.stringify({
        theme: 'default',
        sidebarColor: 'teal',
        accentColor: 'teal',
        showVMSModule: true,
      }),
    },
  });
  console.log('✅ VMS Reception role created');

  const vmsGuardRole = await prisma.role.upsert({
    where: { name: 'VMS_GUARD' },
    update: {},
    create: {
      name: 'VMS_GUARD',
      displayName: 'VMS Guard',
      description: 'Security guard - can view visitors, verify gatepasses, manage check-ins/outs',
      isSystem: true,
      permissions: JSON.stringify([
        'dashboard.view',
        'vms.dashboard.view',
        'vms.visitors.view', 'vms.visitors.view_all',
        'vms.gatepasses.view', 'vms.gatepasses.view_all', 'vms.gatepasses.verify',
        'vms.checkin.view', 'vms.checkin.manage',
        'vms.preapproved.view',
      ]),
      uiConfig: JSON.stringify({
        theme: 'default',
        sidebarColor: 'slate',
        accentColor: 'blue',
        showVMSModule: true,
      }),
    },
  });
  console.log('✅ VMS Guard role created');

  const vmsCompanyUserRole = await prisma.role.upsert({
    where: { name: 'VMS_COMPANY_USER' },
    update: {},
    create: {
      name: 'VMS_COMPANY_USER',
      displayName: 'VMS Company User',
      description: 'Company staff - can view only their company visitors, create pre-approvals',
      isSystem: true,
      permissions: JSON.stringify([
        'dashboard.view',
        'vms.dashboard.view',
        'vms.visitors.view', 'vms.visitors.view_own_company',
        'vms.gatepasses.view', 'vms.gatepasses.view_own_company', 'vms.gatepasses.approve_own_company',
        'vms.preapproved.view', 'vms.preapproved.create',
      ]),
      uiConfig: JSON.stringify({
        theme: 'default',
        sidebarColor: 'purple',
        accentColor: 'purple',
        showVMSModule: true,
      }),
    },
  });
  console.log('✅ VMS Company User role created');

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

  // ==========================================
  // VMS Companies and Users
  // ==========================================
  console.log('Creating VMS companies...');

  // Create VMS Companies with different approval settings
  const vmsCompanies = [
    {
      name: 'Vodafone Idea',
      displayName: 'Vodafone Idea',
      description: 'Telecom company - Direct entry without approval',
      requireApproval: false,  // Direct entry - no approval needed
      autoApproveVisitors: true,
      notifyOnVisitor: true,
      isActive: true,
    },
    {
      name: 'HCL Technologies',
      displayName: 'HCL Technologies',
      description: 'IT Services - Approval required for visitors',
      requireApproval: true,  // Approval required
      autoApproveVisitors: false,
      notifyOnVisitor: true,
      isActive: true,
    },
    {
      name: 'Godrej',
      displayName: 'Godrej',
      description: 'Conglomerate - Approval required',
      requireApproval: true,
      autoApproveVisitors: false,
      notifyOnVisitor: true,
      isActive: true,
    },
    {
      name: 'Yes Bank',
      displayName: 'Yes Bank',
      description: 'Banking - Strict approval process',
      requireApproval: true,
      autoApproveVisitors: false,
      notifyOnVisitor: true,
      isActive: true,
    },
    {
      name: 'Reliance General Insurance',
      displayName: 'Reliance General Insurance',
      description: 'Insurance - Direct entry allowed',
      requireApproval: false,
      autoApproveVisitors: true,
      notifyOnVisitor: false,
      isActive: true,
    },
  ];

  for (const company of vmsCompanies) {
    await prisma.vMSCompany.upsert({
      where: { name: company.name },
      update: company,
      create: company,
    });
  }
  console.log('✅ VMS companies created');

  // Create VMS Reception user
  const receptionPassword = await bcrypt.hash('reception123', 10);
  const receptionUser = await prisma.user.upsert({
    where: { email: 'reception@reliablegroup.com' },
    update: { roleId: vmsReceptionRole.id, isApproved: true, approvedAt: new Date() },
    create: {
      email: 'reception@reliablegroup.com',
      password: receptionPassword,
      firstName: 'Reception',
      lastName: 'Desk',
      roleId: vmsReceptionRole.id,
      department: 'Front Desk',
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log('✅ VMS Reception user created:', receptionUser.email);

  // Create VMS Guard user
  const guardPassword = await bcrypt.hash('guard123', 10);
  const guardUser = await prisma.user.upsert({
    where: { email: 'guard@reliablegroup.com' },
    update: { roleId: vmsGuardRole.id, isApproved: true, approvedAt: new Date() },
    create: {
      email: 'guard@reliablegroup.com',
      password: guardPassword,
      firstName: 'Security',
      lastName: 'Guard',
      roleId: vmsGuardRole.id,
      department: 'Security',
      isApproved: true,
      approvedAt: new Date(),
    },
  });
  console.log('✅ VMS Guard user created:', guardUser.email);

  console.log('');
  console.log('🎉 Database seeding completed!');
  console.log('');
  console.log('📋 Work Permit Demo Credentials:');
  console.log('   Admin:          admin@permitmanager.com / admin123');
  console.log('   Fireman:        fireman@permitmanager.com / fireman123');
  console.log('   Requestor:      requestor@permitmanager.com / user123');
  console.log('');
  console.log('📋 VMS Credentials:');
  console.log('   Reception:      reception@reliablegroup.com / reception123');
  console.log('   Guard:          guard@reliablegroup.com / guard123');
  console.log('');
  console.log('🏢 VMS Companies (Approval Settings):');
  console.log('   Vodafone Idea - Direct entry (no approval needed)');
  console.log('   HCL Technologies - Approval required');
  console.log('   Godrej - Approval required');
  console.log('   Yes Bank - Approval required');
  console.log('   Reliance General Insurance - Direct entry (no approval needed)');
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
