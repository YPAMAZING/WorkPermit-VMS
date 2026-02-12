// VMS Authentication Controller
// 
// SEPARATE USER TABLES:
// - Work Permit users are in 'users' table
// - VMS users are in 'vms_users' table (completely separate)
// 
// LOGIN FLOW:
// 1. Regular VMS users login with their VMS credentials (vms_users table)
// 2. Work Permit admins with vms.admin permission can SSO into VMS
//    - SSO creates/updates a linked VMSUser with isFromWorkPermit=true
// 
// This ensures:
// - VMS users are completely independent
// - Only admins are shared via SSO
// - Changes in Work Permit don't affect VMS users

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const prisma = new PrismaClient();

// VMS Permissions for admin users
const VMS_ADMIN_PERMISSIONS = [
  'vms.dashboard.view',
  'vms.dashboard.stats',
  'vms.visitors.view',
  'vms.visitors.create',
  'vms.visitors.edit',
  'vms.visitors.delete',
  'vms.visitors.approve',
  'vms.gatepasses.view',
  'vms.gatepasses.create',
  'vms.gatepasses.approve',
  'vms.companies.view',
  'vms.companies.create',
  'vms.companies.edit',
  'vms.users.view',
  'vms.users.create',
  'vms.users.edit',
  'vms.roles.view',
  'vms.roles.edit',
  'vms.settings.view',
  'vms.settings.edit',
  'vms.reports.view',
];

/**
 * VMS Login - Uses VMSUser table (separate from Work Permit)
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🔐 VMS LOGIN ATTEMPT');
    console.log('='.repeat(60));
    console.log('📧 Email:', email);
    console.log('🔑 Password provided:', password ? 'YES' : 'NO');
    console.log('📝 Request body:', JSON.stringify(req.body));

    // Find user in VMS users table
    const user = await prisma.vMSUser.findUnique({
      where: { email },
      include: { 
        vmsRole: true,
        company: true,
      },
    });

    if (!user) {
      console.log('❌ User not found in VMS database');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ VMS User found:', user.firstName, user.lastName);
    console.log('🏷️  Role:', user.vmsRole?.name || 'No role');
    console.log('🏢 Company:', user.company?.name || 'No company');
    console.log('🔗 From Work Permit:', user.isFromWorkPermit ? 'Yes' : 'No');

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ Account deactivated');
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Check if user is approved
    if (!user.isApproved) {
      console.log('❌ Account pending approval');
      return res.status(403).json({ message: 'Account is pending approval' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Password verified');

    // Parse role permissions
    let permissions = [];
    if (user.vmsRole && user.vmsRole.permissions) {
      try {
        permissions = JSON.parse(user.vmsRole.permissions);
      } catch (e) {
        permissions = [];
      }
    }

    // Generate VMS JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.vmsRole?.name || 'VMS_USER',
        companyId: user.companyId,
        system: 'vms',
        isFromWorkPermit: user.isFromWorkPermit,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Log successful login
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'VMS_LOGIN',
          entity: 'VMSUser',
          entityId: user.id,
          newValue: JSON.stringify({ system: 'vms', ip: req.ip }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (auditError) {
      console.log('⚠️ Audit log error (non-critical):', auditError.message);
    }

    console.log('✅ VMS LOGIN SUCCESS');
    console.log('='.repeat(60) + '\n');

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.vmsRole?.name || 'VMS_USER',
        roleName: user.vmsRole?.displayName || 'User',
        permissions,
        department: user.department,
        phone: user.phone,
        profilePicture: user.profilePicture,
        companyId: user.companyId,
        companyName: user.company?.displayName || user.company?.name,
        isFromWorkPermit: user.isFromWorkPermit,
      },
    });
  } catch (error) {
    console.error('❌ VMS Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

/**
 * SSO Login from Work Permit System
 * Creates/updates a linked VMSUser when Work Permit admin accesses VMS
 */
exports.ssoLogin = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'SSO token is required' });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔐 VMS SSO LOGIN (from Work Permit)');
    console.log('='.repeat(60));

    // Verify SSO token from Work Permit
    const ssoToken = await prisma.sSOToken.findUnique({
      where: { token },
    });

    if (!ssoToken) {
      console.log('❌ SSO Token not found');
      return res.status(401).json({ message: 'Invalid SSO token' });
    }

    if (ssoToken.isUsed) {
      console.log('❌ SSO Token already used');
      return res.status(401).json({ message: 'SSO token already used' });
    }

    if (new Date() > ssoToken.expiresAt) {
      console.log('❌ SSO Token expired');
      return res.status(401).json({ message: 'SSO token expired' });
    }

    // Mark token as used
    await prisma.sSOToken.update({
      where: { id: ssoToken.id },
      data: { isUsed: true },
    });

    // Get Work Permit user
    const workPermitUser = await prisma.user.findUnique({
      where: { id: ssoToken.userId },
      include: { role: true },
    });

    if (!workPermitUser) {
      console.log('❌ Work Permit user not found');
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('✅ Work Permit user verified:', workPermitUser.email);

    // Check if user has vms.admin permission
    let hasVMSAdmin = false;
    if (workPermitUser.role && workPermitUser.role.permissions) {
      try {
        const permissions = JSON.parse(workPermitUser.role.permissions);
        hasVMSAdmin = permissions.includes('vms.admin');
      } catch (e) {
        hasVMSAdmin = false;
      }
    }

    if (!hasVMSAdmin) {
      console.log('❌ User does not have vms.admin permission');
      return res.status(403).json({ 
        message: 'You do not have VMS admin access',
        error: 'NO_VMS_PERMISSION',
      });
    }

    console.log('✅ User has vms.admin permission');

    // Get or create VMS_ADMIN role
    let vmsAdminRole = await prisma.vMSRole.findUnique({
      where: { name: 'VMS_ADMIN' },
    });

    if (!vmsAdminRole) {
      console.log('📋 Creating VMS_ADMIN role...');
      vmsAdminRole = await prisma.vMSRole.create({
        data: {
          name: 'VMS_ADMIN',
          displayName: 'VMS Administrator',
          description: 'Full VMS system access',
          permissions: JSON.stringify(VMS_ADMIN_PERMISSIONS),
          isSystem: true,
        },
      });
      console.log('✅ VMS_ADMIN role created');
    }

    // Find or create linked VMS user
    let vmsUser = await prisma.vMSUser.findUnique({
      where: { workPermitUserId: workPermitUser.id },
    });

    if (!vmsUser) {
      // Also check by email (in case user was created manually)
      vmsUser = await prisma.vMSUser.findUnique({
        where: { email: workPermitUser.email },
      });
    }

    if (vmsUser) {
      // Update existing VMS user
      console.log('📋 Updating existing VMS user...');
      vmsUser = await prisma.vMSUser.update({
        where: { id: vmsUser.id },
        data: {
          firstName: workPermitUser.firstName,
          lastName: workPermitUser.lastName,
          phone: workPermitUser.phone,
          vmsRoleId: vmsAdminRole.id,
          workPermitUserId: workPermitUser.id,
          isFromWorkPermit: true,
          isActive: true,
          isApproved: true,
        },
        include: { vmsRole: true },
      });
      console.log('✅ VMS user updated');
    } else {
      // Create new VMS user linked to Work Permit user
      console.log('📋 Creating new VMS user...');
      vmsUser = await prisma.vMSUser.create({
        data: {
          email: workPermitUser.email,
          password: workPermitUser.password, // Same password as Work Permit
          firstName: workPermitUser.firstName,
          lastName: workPermitUser.lastName,
          phone: workPermitUser.phone,
          vmsRoleId: vmsAdminRole.id,
          workPermitUserId: workPermitUser.id,
          isFromWorkPermit: true,
          isActive: true,
          isApproved: true,
        },
        include: { vmsRole: true },
      });
      console.log('✅ VMS user created:', vmsUser.email);
    }

    // Generate VMS JWT
    const vmsToken = jwt.sign(
      {
        userId: vmsUser.id,
        email: vmsUser.email,
        role: 'VMS_ADMIN',
        system: 'vms',
        ssoSource: 'work_permit',
        workPermitUserId: workPermitUser.id,
        isFromWorkPermit: true,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Log SSO login
    try {
      await prisma.auditLog.create({
        data: {
          userId: vmsUser.id,
          action: 'VMS_SSO_LOGIN',
          entity: 'VMSUser',
          entityId: vmsUser.id,
          newValue: JSON.stringify({ source: 'work_permit', workPermitUserId: workPermitUser.id }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (auditError) {
      console.log('⚠️ Audit log error (non-critical):', auditError.message);
    }

    console.log('✅ VMS SSO LOGIN SUCCESS');
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      token: vmsToken,
      user: {
        id: vmsUser.id,
        email: vmsUser.email,
        firstName: vmsUser.firstName,
        lastName: vmsUser.lastName,
        role: 'VMS_ADMIN',
        roleName: 'VMS Administrator',
        permissions: VMS_ADMIN_PERMISSIONS,
        ssoSource: 'work_permit',
        isFromWorkPermit: true,
      },
    });
  } catch (error) {
    console.error('❌ VMS SSO Login error:', error);
    res.status(500).json({ message: 'SSO Login failed', error: error.message });
  }
};

/**
 * Register new VMS user (VMS-specific, not linked to Work Permit)
 */
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, department, companyId } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('📝 VMS USER REGISTRATION');
    console.log('='.repeat(60));
    console.log('📧 Email:', email);

    // Check if email exists in VMS users
    const existingUser = await prisma.vMSUser.findUnique({ where: { email } });
    if (existingUser) {
      console.log('❌ Email already registered in VMS');
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default VMS role (VMS_USER)
    let defaultRole = await prisma.vMSRole.findUnique({ where: { name: 'VMS_USER' } });
    
    if (!defaultRole) {
      // Create default VMS_USER role
      defaultRole = await prisma.vMSRole.create({
        data: {
          name: 'VMS_USER',
          displayName: 'VMS User',
          description: 'Basic VMS access',
          permissions: JSON.stringify(['vms.dashboard.view', 'vms.visitors.view']),
          isSystem: true,
        },
      });
    }

    // Create VMS user
    const user = await prisma.vMSUser.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        department,
        companyId,
        vmsRoleId: defaultRole.id,
        isFromWorkPermit: false, // This is a native VMS user
        isApproved: false, // Requires admin approval
      },
      include: { vmsRole: true },
    });

    console.log('✅ VMS user created:', user.email);
    console.log('='.repeat(60) + '\n');

    // Log registration
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'VMS_REGISTER',
          entity: 'VMSUser',
          entityId: user.id,
          newValue: JSON.stringify({ email, firstName, lastName }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (auditError) {
      console.log('⚠️ Audit log error (non-critical):', auditError.message);
    }

    res.status(201).json({
      message: 'Registration successful. Awaiting admin approval.',
      requiresApproval: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error('❌ VMS Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

/**
 * Get current VMS user
 */
exports.me = async (req, res) => {
  try {
    const user = await prisma.vMSUser.findUnique({
      where: { id: req.user.userId },
      include: { 
        vmsRole: true,
        company: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Parse permissions
    let permissions = [];
    if (user.vmsRole && user.vmsRole.permissions) {
      try {
        permissions = JSON.parse(user.vmsRole.permissions);
      } catch (e) {
        permissions = [];
      }
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.vmsRole?.name || 'VMS_USER',
      roleName: user.vmsRole?.displayName || 'User',
      permissions,
      department: user.department,
      phone: user.phone,
      profilePicture: user.profilePicture,
      companyId: user.companyId,
      companyName: user.company?.displayName || user.company?.name,
      isFromWorkPermit: user.isFromWorkPermit,
    });
  } catch (error) {
    console.error('VMS Get user error:', error);
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
};

/**
 * Update VMS profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, department, profilePicture } = req.body;

    const user = await prisma.vMSUser.update({
      where: { id: req.user.userId },
      data: {
        firstName,
        lastName,
        phone,
        department,
        profilePicture,
      },
      include: { vmsRole: true },
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.vmsRole?.name || 'VMS_USER',
        roleName: user.vmsRole?.displayName || 'User',
        department: user.department,
        phone: user.phone,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('VMS Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

/**
 * Change VMS password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.vMSUser.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.vMSUser.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('VMS Change password error:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

// Export constants
exports.VMS_ADMIN_PERMISSIONS = VMS_ADMIN_PERMISSIONS;
