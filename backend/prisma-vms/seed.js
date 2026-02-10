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
  // Including companies from frontend with approval settings
  // ================================
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const companies = [
    {
      code: 'RELIABLE',
      name: 'reliable-group',
      displayName: 'Reliable Group MEP',
      description: 'Reliable Group - MEP Services & Security',
      portalId: 'P-RELIABLE1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      welcomeMessage: 'Welcome to Reliable Group! Please fill in your details to proceed with the check-in.',
      termsAndConditions: 'By proceeding, you agree to follow all security protocols and building regulations. Your visit will be logged for security purposes.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: false,
      requireGatepassApproval: true, // Visitors need approval before getting gatepass
      isActive: true,
    },
    // VODAFONE IDEA - Special case: NO approval required (direct gatepass)
    {
      code: 'VODAFONE',
      name: 'Vodafone Idea',
      displayName: 'Vodafone Idea',
      description: 'Vodafone Idea - Telecom Company',
      portalId: 'P-VODAFONE1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#e60000',
      secondaryColor: '#b30000',
      welcomeMessage: 'Welcome to Vodafone Idea! Please register for direct entry.',
      termsAndConditions: 'All visitors must follow Vodafone security protocols.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: true,
      requireGatepassApproval: false, // NO APPROVAL REQUIRED - Direct gatepass
      notifyHost: true,
      isActive: true,
    },
    // HCL Technologies - Approval required
    {
      code: 'HCL',
      name: 'HCL Technologies',
      displayName: 'HCL Technologies',
      description: 'HCL Technologies - IT Services',
      portalId: 'P-HCL1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#0053a3',
      secondaryColor: '#003d7a',
      welcomeMessage: 'Welcome to HCL Technologies! Please complete registration.',
      termsAndConditions: 'All visitors must sign NDA and follow HCL security protocols.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: false,
      requireGatepassApproval: true, // Approval required
      notifyHost: true,
      isActive: true,
    },
    // Godrej - Approval required
    {
      code: 'GODREJ',
      name: 'Godrej',
      displayName: 'Godrej Industries',
      description: 'Godrej Industries - Diversified Conglomerate',
      portalId: 'P-GODREJ1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#1a472a',
      secondaryColor: '#0d2615',
      welcomeMessage: 'Welcome to Godrej! Please register your visit.',
      termsAndConditions: 'All visitors must follow Godrej campus security guidelines.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: false,
      requireGatepassApproval: true, // Approval required
      notifyHost: true,
      isActive: true,
    },
    // Yes Bank - NO approval required (direct entry)
    {
      code: 'YESBANK',
      name: 'Yes Bank',
      displayName: 'Yes Bank',
      description: 'Yes Bank - Banking & Financial Services',
      portalId: 'P-YESBANK1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#003087',
      secondaryColor: '#002060',
      welcomeMessage: 'Welcome to Yes Bank! Register for direct entry.',
      termsAndConditions: 'All visitors must follow bank security protocols.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: true,
      requireGatepassApproval: false, // NO APPROVAL REQUIRED - Direct gatepass
      notifyHost: true,
      isActive: true,
    },
    // Tata Consulting Engineering - Approval required
    {
      code: 'TCE',
      name: 'Tata Consulting Engineering',
      displayName: 'Tata Consulting Engineering',
      description: 'Tata Consulting Engineering - Engineering Services',
      portalId: 'P-TCE1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#2c3e50',
      secondaryColor: '#1a252f',
      welcomeMessage: 'Welcome to Tata Consulting Engineering! Please register your visit.',
      termsAndConditions: 'All visitors must follow TCE security protocols.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: false,
      requireGatepassApproval: true, // Approval required
      notifyHost: true,
      isActive: true,
    },
    // Adani Enterprises - Approval required
    {
      code: 'ADANI',
      name: 'Adani Enterprises',
      displayName: 'Adani Enterprises',
      description: 'Adani Enterprises - Infrastructure & Energy',
      portalId: 'P-ADANI1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#003366',
      secondaryColor: '#00264d',
      welcomeMessage: 'Welcome to Adani Enterprises! Please register your visit.',
      termsAndConditions: 'All visitors must follow Adani security guidelines.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: false,
      requireGatepassApproval: true, // Approval required
      notifyHost: true,
      isActive: true,
    },
    // Lupin - Approval required
    {
      code: 'LUPIN',
      name: 'Lupin',
      displayName: 'Lupin Pharmaceuticals',
      description: 'Lupin - Pharmaceutical Company',
      portalId: 'P-LUPIN1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#e31e24',
      secondaryColor: '#b81820',
      welcomeMessage: 'Welcome to Lupin! Please register for your visit.',
      termsAndConditions: 'All visitors must follow GMP and pharma safety protocols.',
      requireIdProof: true,
      requirePhoto: true,
      autoApprove: false,
      requireGatepassApproval: true, // Approval required
      notifyHost: true,
      isActive: true,
    },
    // AWFIS - NO approval required (co-working space - direct entry)
    {
      code: 'AWFIS',
      name: 'AWFIS Solutions Spaces',
      displayName: 'AWFIS Co-working',
      description: 'AWFIS Solutions Spaces - Co-working & Managed Offices',
      portalId: 'P-AWFIS1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#f7931e',
      secondaryColor: '#c77418',
      welcomeMessage: 'Welcome to AWFIS! Register for quick entry.',
      termsAndConditions: 'All visitors must follow AWFIS community guidelines.',
      requireIdProof: true,
      requirePhoto: false,
      autoApprove: true,
      requireGatepassApproval: false, // NO APPROVAL REQUIRED - Direct gatepass (co-working)
      notifyHost: true,
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
  console.log('');
  console.log('📋 Company Approval Settings:');
  console.log('   🔒 APPROVAL REQUIRED (visitors must wait for approval):');
  console.log(`      - RELIABLE: Reliable Group`);
  console.log(`      - HCL: HCL Technologies`);
  console.log(`      - GODREJ: Godrej Industries`);
  console.log(`      - TCE: Tata Consulting Engineering`);
  console.log(`      - ADANI: Adani Enterprises`);
  console.log(`      - LUPIN: Lupin Pharmaceuticals`);
  console.log('');
  console.log('   🟢 DIRECT ENTRY (visitors get gatepass immediately):');
  console.log(`      - VODAFONE: Vodafone Idea (NO approval required)`);
  console.log(`      - YESBANK: Yes Bank (NO approval required)`);
  console.log(`      - AWFIS: AWFIS Co-working (NO approval required)`);
  console.log('');
  console.log('📱 QR Check-in URLs:');
  for (const company of companies) {
    console.log(`   ${baseUrl}/vms/checkin/${company.code} - ${company.displayName}`);
  };

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

  // Create users for Vodafone Idea (No approval required company)
  await prisma.user.upsert({
    where: { email: 'guard@vodafone.com' },
    update: {
      password: hashedPassword,
      firstName: 'Vodafone',
      lastName: 'Security',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['VODAFONE'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'guard@vodafone.com',
      password: hashedPassword,
      firstName: 'Vodafone',
      lastName: 'Security',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['VODAFONE'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created Vodafone guard (guard@vodafone.com / Admin@123) - NO APPROVAL REQUIRED');

  // Create users for HCL Technologies (Approval required company)
  await prisma.user.upsert({
    where: { email: 'guard@hcl.com' },
    update: {
      password: hashedPassword,
      firstName: 'HCL',
      lastName: 'Security',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['HCL'].id,
      isActive: true,
      isApproved: true,
    },
    create: {
      id: uuidv4(),
      email: 'guard@hcl.com',
      password: hashedPassword,
      firstName: 'HCL',
      lastName: 'Security',
      roleId: createdRoles['SECURITY_GUARD'].id,
      companyId: createdCompanies['HCL'].id,
      isActive: true,
      isApproved: true,
    },
  });
  console.log('✅ Created HCL guard (guard@hcl.com / Admin@123) - APPROVAL REQUIRED');

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
  console.log('📋 Approval-Based Gatepass Feature:');
  console.log('   Companies can be configured to require approval or allow direct entry.');
  console.log('   - Approval Required: Visitors submit request → Company approves → Gatepass generated');
  console.log('   - Direct Entry: Visitors submit request → Gatepass generated immediately');
  console.log('');
  console.log('   Example: Vodafone Idea has approval DISABLED - visitors get direct gatepass');
  console.log('   Example: HCL Technologies has approval ENABLED - visitors must wait for approval');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
