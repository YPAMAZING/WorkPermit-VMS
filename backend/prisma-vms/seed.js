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
  // All companies start with requireGatepassApproval = false (direct entry by default)
  // When a company gets VMS access in Work Permit, approval is auto-enabled
  // ================================
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // All companies from the frontend list - DEFAULT: Direct entry (no approval required)
  const companies = [
    {
      code: 'RELIABLE',
      name: 'Reliable Group',
      displayName: 'Reliable Group (Campus Owner)',
      description: 'Reliable Group - Campus Owner & MEP Services',
      portalId: 'P-RELIABLE1',
      subscriptionActive: true,
      subscriptionPlan: 'PRO',
      primaryColor: '#2563eb',
      requireGatepassApproval: false, // Direct entry by default
      isActive: true,
    },
    { code: 'ADANI', name: 'Adani Enterprises', displayName: 'Adani Enterprises', requireGatepassApproval: false, isActive: true },
    { code: 'AQUITY', name: 'Aquity Solutions', displayName: 'Aquity Solutions', requireGatepassApproval: false, isActive: true },
    { code: 'AWFIS', name: 'AWFIS Solutions Spaces', displayName: 'AWFIS Solutions Spaces', requireGatepassApproval: false, isActive: true },
    { code: 'AZELIS', name: 'Azelis', displayName: 'Azelis', requireGatepassApproval: false, isActive: true },
    { code: 'BAKER', name: 'Baker Huges Oilfield Services', displayName: 'Baker Huges Oilfield Services', requireGatepassApproval: false, isActive: true },
    { code: 'BHARAT', name: 'Bharat Serum & Vaccines', displayName: 'Bharat Serum & Vaccines', requireGatepassApproval: false, isActive: true },
    { code: 'BIRLA', name: 'Birla Management Centre', displayName: 'Birla Management Centre', requireGatepassApproval: false, isActive: true },
    { code: 'BRUECKNER', name: 'Brueckner Group India', displayName: 'Brueckner Group India', requireGatepassApproval: false, isActive: true },
    { code: 'CLARIANT', name: 'Clariant Chemicals', displayName: 'Clariant Chemicals', requireGatepassApproval: false, isActive: true },
    { code: 'CLOVER', name: 'Clover Infotech', displayName: 'Clover Infotech', requireGatepassApproval: false, isActive: true },
    { code: 'COVESTRO', name: 'Covestro', displayName: 'Covestro', requireGatepassApproval: false, isActive: true },
    { code: 'CREATIVE', name: 'Creative IT', displayName: 'Creative IT', requireGatepassApproval: false, isActive: true },
    { code: 'DSP', name: 'DSP Integrated Services', displayName: 'DSP Integrated Services', requireGatepassApproval: false, isActive: true },
    { code: 'ECI', name: 'ECI Telecom', displayName: 'ECI Telecom', requireGatepassApproval: false, isActive: true },
    { code: 'EFC', name: 'EFC', displayName: 'EFC', requireGatepassApproval: false, isActive: true },
    { code: 'EFCINFRA', name: 'EFC Office Infra', displayName: 'EFC Office Infra', requireGatepassApproval: false, isActive: true },
    { code: 'EFCSPACE', name: 'EFC Office Spaces', displayName: 'EFC Office Spaces', requireGatepassApproval: false, isActive: true },
    { code: 'EFCTECH', name: 'EFC Tech Spaces', displayName: 'EFC Tech Spaces', requireGatepassApproval: false, isActive: true },
    { code: 'ESDS', name: 'ESDS', displayName: 'ESDS', requireGatepassApproval: false, isActive: true },
    { code: 'GARMERCY', name: 'Garmercy Tech Park', displayName: 'Garmercy Tech Park', requireGatepassApproval: false, isActive: true },
    { code: 'GODREJ', name: 'Godrej', displayName: 'Godrej', requireGatepassApproval: false, isActive: true },
    { code: 'HANSA', name: 'Hansa Direct', displayName: 'Hansa Direct', requireGatepassApproval: false, isActive: true },
    { code: 'HCL', name: 'HCL Technologies', displayName: 'HCL Technologies', requireGatepassApproval: false, isActive: true },
    { code: 'HINDUSTAN', name: 'Hindustan Fields Services', displayName: 'Hindustan Fields Services', requireGatepassApproval: false, isActive: true },
    { code: 'HOLCIM', name: 'Holcim Services', displayName: 'Holcim Services', requireGatepassApproval: false, isActive: true },
    { code: 'HOMECREDIT', name: 'Home Credit', displayName: 'Home Credit', requireGatepassApproval: false, isActive: true },
    { code: 'ICRA', name: 'Icra', displayName: 'Icra', requireGatepassApproval: false, isActive: true },
    { code: 'INCHCAP', name: 'Inchcap Shipping Services', displayName: 'Inchcap Shipping Services', requireGatepassApproval: false, isActive: true },
    { code: 'ICEX', name: 'Indian Commodity Exchange', displayName: 'Indian Commodity Exchange', requireGatepassApproval: false, isActive: true },
    { code: 'INVENIO', name: 'Invenio Business Solution', displayName: 'Invenio Business Solution', requireGatepassApproval: false, isActive: true },
    { code: 'ISSGF', name: 'ISSGF', displayName: 'ISSGF', requireGatepassApproval: false, isActive: true },
    { code: 'JACOBS', name: 'Jacobs Solutions', displayName: 'Jacobs Solutions', requireGatepassApproval: false, isActive: true },
    { code: 'KYNDRYL', name: 'Kyndryl Solutions', displayName: 'Kyndryl Solutions', requireGatepassApproval: false, isActive: true },
    { code: 'LUPIN', name: 'Lupin', displayName: 'Lupin', requireGatepassApproval: false, isActive: true },
    { code: 'MAERSK', name: 'Maersk Global Service Centre', displayName: 'Maersk Global Service Centre', requireGatepassApproval: false, isActive: true },
    { code: 'MAGICBUS', name: 'Magic Bus', displayName: 'Magic Bus', requireGatepassApproval: false, isActive: true },
    { code: 'NMDC', name: 'NMDC Data Centre', displayName: 'NMDC Data Centre', requireGatepassApproval: false, isActive: true },
    { code: 'NOURYON', name: 'Nouryon Chemicals', displayName: 'Nouryon Chemicals', requireGatepassApproval: false, isActive: true },
    { code: 'QUESS', name: 'Quess Corp', displayName: 'Quess Corp', requireGatepassApproval: false, isActive: true },
    { code: 'RBL', name: 'RBL Bank', displayName: 'RBL Bank', requireGatepassApproval: false, isActive: true },
    { code: 'RELIANCE', name: 'Reliance General Insurance', displayName: 'Reliance General Insurance', requireGatepassApproval: false, isActive: true },
    { code: 'RUBICON', name: 'Rubicon Maritime India', displayName: 'Rubicon Maritime India', requireGatepassApproval: false, isActive: true },
    { code: 'SIFY', name: 'Sify Infinity Spaces', displayName: 'Sify Infinity Spaces', requireGatepassApproval: false, isActive: true },
    { code: 'SPOCTO', name: 'Spocto Business Solutions', displayName: 'Spocto Business Solutions', requireGatepassApproval: false, isActive: true },
    { code: 'SUKI', name: 'Suki Solution', displayName: 'Suki Solution', requireGatepassApproval: false, isActive: true },
    { code: 'SULZER', name: 'Sulzer Tech', displayName: 'Sulzer Tech', requireGatepassApproval: false, isActive: true },
    { code: 'SUTHERLAND', name: 'Sutherland Global Services', displayName: 'Sutherland Global Services', requireGatepassApproval: false, isActive: true },
    { code: 'TALDAR', name: 'Taldar Hotels & Resorts', displayName: 'Taldar Hotels & Resorts', requireGatepassApproval: false, isActive: true },
    { code: 'TCE', name: 'Tata Consulting Engineering', displayName: 'Tata Consulting Engineering', requireGatepassApproval: false, isActive: true },
    { code: 'TECHNICS', name: 'Technics Reunidas', displayName: 'Technics Reunidas', requireGatepassApproval: false, isActive: true },
    { code: 'UNIVERSAL', name: 'Universal Sompo', displayName: 'Universal Sompo', requireGatepassApproval: false, isActive: true },
    { code: 'VODAFONE', name: 'Vodafone Idea', displayName: 'Vodafone Idea', requireGatepassApproval: false, isActive: true },
    { code: 'YESBANK', name: 'Yes Bank', displayName: 'Yes Bank', requireGatepassApproval: false, isActive: true },
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
  console.log('📋 Default Approval Setting: OFF (Direct Entry)');
  console.log('   All companies start with requireGatepassApproval = false');
  console.log('   When VMS access is granted to a company (REQUESTOR), approval auto-enables');
  console.log('');
  console.log('📱 QR Check-in URLs:');
  console.log(`   ${baseUrl}/vms/checkin/RELIABLE - Reliable Group (Campus Owner)`);
  console.log(`   ... and ${companies.length - 1} more tenant companies`);
  console.log('');

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
