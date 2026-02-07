const { PrismaClient } = require('.prisma/vms-client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

// Generate company QR code data URL
const generateCompanyQR = async (companyCode, baseUrl) => {
  const checkInUrl = `${baseUrl}/vms/checkin/${companyCode}`;
  return await QRCode.toDataURL(checkInUrl);
};

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
    
    // Check-in Management
    { key: 'vms.checkin.view', name: 'View Check-in Requests', module: 'checkin', action: 'view' },
    { key: 'vms.checkin.approve', name: 'Approve Check-in Requests', module: 'checkin', action: 'approve' },
    { key: 'vms.checkin.reject', name: 'Reject Check-in Requests', module: 'checkin', action: 'reject' },
    { key: 'vms.checkin.manage', name: 'Manage Check-in/Check-out', module: 'checkin', action: 'manage' },
    
    // Company Management
    { key: 'vms.company.view', name: 'View Company Settings', module: 'company', action: 'view' },
    { key: 'vms.company.edit', name: 'Edit Company Settings', module: 'company', action: 'edit' },
    { key: 'vms.company.qr', name: 'Generate Company QR Code', module: 'company', action: 'qr' },
    
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
        'vms.checkin.view', 'vms.checkin.approve', 'vms.checkin.reject', 'vms.checkin.manage',
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
        'vms.checkin.view', 'vms.checkin.approve', 'vms.checkin.reject', 'vms.checkin.manage',
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
        'vms.checkin.view', 'vms.checkin.approve', 'vms.checkin.manage',
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

  // ================================
  // CREATE SAMPLE COMPANIES (Multi-tenant)
  // ================================
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const companies = [
    {
      code: 'RELIABLE',
      name: 'reliable-group',
      displayName: 'Reliable Group MEP',
      description: 'Reliable Group - MEP Services & Security',
      portalId: 'P-RELIABLE1',  // Unique portal ID for company clients
      subscriptionActive: true,  // Subscription is ON
      subscriptionPlan: 'PRO',
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      welcomeMessage: 'Welcome to Reliable Group! Please fill in your details to proceed with the check-in.',
      termsAndConditions: 'By proceeding, you agree to follow all security protocols and building regulations. Your visit will be logged for security purposes. Please surrender any prohibited items at the security desk.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: false,
      isActive: true,
    },
    {
      code: 'TECHPARK',
      name: 'techpark-tower',
      displayName: 'TechPark Tower',
      description: 'TechPark Tower - IT & Business Center',
      portalId: 'P-TECHPARK1',  // Unique portal ID for company clients
      subscriptionActive: true,  // Subscription is ON
      subscriptionPlan: 'BASIC',
      primaryColor: '#059669',
      secondaryColor: '#047857',
      welcomeMessage: 'Welcome to TechPark Tower! Please register your visit below.',
      termsAndConditions: 'All visitors must wear visitor badges at all times. Photography is restricted in certain areas. Please follow COVID-19 safety guidelines.',
      requireIdProof: true,
      requirePhoto: false,
      autoApprove: false,
      isActive: true,
    },
    {
      code: 'BIZCENTRE',
      name: 'business-centre',
      displayName: 'Business Centre Plaza',
      description: 'Business Centre Plaza - Corporate Offices',
      portalId: 'P-BIZCENTRE1',  // Unique portal ID for company clients  
      subscriptionActive: false,  // Subscription is OFF - will show "Contact Admin" message
      subscriptionPlan: 'FREE',
      primaryColor: '#7c3aed',
      secondaryColor: '#6d28d9',
      welcomeMessage: 'Welcome to Business Centre Plaza. Please complete your registration to proceed.',
      termsAndConditions: 'Visitors must be accompanied by their host at all times. All items are subject to security inspection.',
      requireIdProof: false,
      requirePhoto: false,
      autoApprove: true,
      isActive: true,
    },
  ];

  const createdCompanies = {};
  for (const company of companies) {
    // Generate QR code for the company
    const qrCode = await generateCompanyQR(company.code, baseUrl);
    const qrCodeData = JSON.stringify({ code: company.code, url: `${baseUrl}/vms/checkin/${company.code}` });
    
    const created = await prisma.company.upsert({
      where: { code: company.code },
      update: { ...company, qrCode, qrCodeData },
      create: { 
        id: uuidv4(), 
        ...company,
        qrCode,
        qrCodeData,
      },
    });
    createdCompanies[company.code] = created;
    
    // Create default departments for each company
    const departments = [
      { name: 'Reception', floor: 'Ground', building: 'Main' },
      { name: 'Admin', floor: '1st', building: 'Main' },
      { name: 'HR', floor: '2nd', building: 'Main' },
      { name: 'IT', floor: '3rd', building: 'Main' },
      { name: 'Finance', floor: '4th', building: 'Main' },
    ];
    
    for (const dept of departments) {
      await prisma.department.upsert({
        where: {
          companyId_name: { companyId: created.id, name: dept.name }
        },
        update: dept,
        create: {
          id: uuidv4(),
          companyId: created.id,
          ...dept,
        },
      });
    }
  }
  console.log('✅ Created sample companies with QR codes');
  console.log(`   - RELIABLE: ${baseUrl}/vms/checkin/RELIABLE`);
  console.log(`   - TECHPARK: ${baseUrl}/vms/checkin/TECHPARK`);
  console.log(`   - BIZCENTRE: ${baseUrl}/vms/checkin/BIZCENTRE (Auto-approve enabled)`);
  console.log('');
  console.log('📱 Company Portal URLs (for clients to view their visitors):');
  console.log(`   - RELIABLE Portal: ${baseUrl}/vms/portal/P-RELIABLE1 (Subscription: ON)`);
  console.log(`   - TECHPARK Portal: ${baseUrl}/vms/portal/P-TECHPARK1 (Subscription: ON)`);
  console.log(`   - BIZCENTRE Portal: ${baseUrl}/vms/portal/P-BIZCENTRE1 (Subscription: OFF - shows "Contact Admin")`);

  // ================================
  // CREATE USERS WITH COMPANY ASSIGNMENT
  // ================================
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  // Create platform admin (no company - manages all)
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
  console.log('✅ Created platform admin (vmsadmin@reliablegroup.com / Admin@123)');

  // Create company-specific users for Reliable Group
  await prisma.user.upsert({
    where: { email: 'guard@reliablegroup.com' },
    update: {
      password: hashedPassword,
      firstName: 'Security',
      lastName: 'Guard',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['RELIABLE'].id,
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
      companyId: createdCompanies['RELIABLE'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created Reliable Group guard (guard@reliablegroup.com / Admin@123)');

  await prisma.user.upsert({
    where: { email: 'reception@reliablegroup.com' },
    update: {
      password: hashedPassword,
      firstName: 'Reception',
      lastName: 'Desk',
      roleId: createdRoles['RECEPTIONIST'].id,
      companyId: createdCompanies['RELIABLE'].id,
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
      companyId: createdCompanies['RELIABLE'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created Reliable Group receptionist (reception@reliablegroup.com / Admin@123)');

  // Create users for TechPark
  await prisma.user.upsert({
    where: { email: 'guard@techpark.com' },
    update: {
      password: hashedPassword,
      firstName: 'TechPark',
      lastName: 'Security',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['TECHPARK'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'guard@techpark.com',
      password: hashedPassword,
      firstName: 'TechPark',
      lastName: 'Security',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['TECHPARK'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created TechPark guard (guard@techpark.com / Admin@123)');

  // Create users for Business Centre
  await prisma.user.upsert({
    where: { email: 'guard@bizcentre.com' },
    update: {
      password: hashedPassword,
      firstName: 'BizCentre',
      lastName: 'Security',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['BIZCENTRE'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'guard@bizcentre.com',
      password: hashedPassword,
      firstName: 'BizCentre',
      lastName: 'Security',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['BIZCENTRE'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created BizCentre guard (guard@bizcentre.com / Admin@123)');

  // Create default system settings
  const settings = [
    { key: 'platform_name', value: 'VMS Multi-Tenant Platform', description: 'Platform name' },
    { key: 'gatepass_prefix', value: 'GP', description: 'Gatepass number prefix' },
    { key: 'default_validity_hours', value: '8', description: 'Default gatepass validity in hours' },
    { key: 'auto_expire_gatepasses', value: 'true', description: 'Auto-expire gatepasses after validity' },
    { key: 'blacklist_check_enabled', value: 'true', description: 'Enable blacklist checking' },
    { key: 'checkin_request_expiry_hours', value: '4', description: 'Hours before check-in request expires' },
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
  console.log('\n📝 Multi-Tenant VMS Users:');
  console.log('');
  console.log('   🔐 Platform Admin (All Companies):');
  console.log('      vmsadmin@reliablegroup.com / Admin@123');
  console.log('');
  console.log('   🏢 Reliable Group:');
  console.log('      guard@reliablegroup.com / Admin@123 (Security Guard)');
  console.log('      reception@reliablegroup.com / Admin@123 (Receptionist)');
  console.log('');
  console.log('   🏢 TechPark Tower:');
  console.log('      guard@techpark.com / Admin@123 (Security Guard)');
  console.log('');
  console.log('   🏢 Business Centre (Auto-approve enabled):');
  console.log('      guard@bizcentre.com / Admin@123 (Security Guard)');
  console.log('');
  console.log('📱 QR Check-in URLs:');
  console.log(`   ${baseUrl}/vms/checkin/RELIABLE`);
  console.log(`   ${baseUrl}/vms/checkin/TECHPARK`);
  console.log(`   ${baseUrl}/vms/checkin/BIZCENTRE`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
