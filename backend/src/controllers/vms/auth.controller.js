// VMS Authentication Controller
// Uses SEPARATE VMS database for VMS-specific data
// Supports SSO from Work Permit system for VMS Admin access
// 
// NOTE: If VMS database is not configured, VMS features will be disabled
// and appropriate error messages will be returned

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Try to load VMS Prisma client
let vmsPrisma = null;
try {
  vmsPrisma = require('../../config/vms-prisma');
} catch (error) {
  console.log('⚠️ VMS Prisma client not available for auth controller');
}

// VMS Full Permissions (for VMS_ADMIN role)
const VMS_ADMIN_PERMISSIONS = [
  'vms.dashboard.view',
  'vms.dashboard.stats',
  'vms.visitors.view',
  'vms.visitors.view_all',
  'vms.visitors.create',
  'vms.visitors.edit',
  'vms.visitors.delete',
  'vms.gatepasses.view',
  'vms.gatepasses.create',
  'vms.gatepasses.edit',
  'vms.gatepasses.approve',
  'vms.gatepasses.cancel',
  'vms.checkin.view',
  'vms.checkin.approve',
  'vms.checkin.reject',
  'vms.checkin.manage',
  'vms.preapproved.view',
  'vms.preapproved.create',
  'vms.preapproved.edit',
  'vms.preapproved.delete',
  'vms.blacklist.view',
  'vms.blacklist.manage',
  'vms.companies.view',
  'vms.companies.create',
  'vms.companies.edit',
  'vms.companies.delete',
  'vms.users.view',
  'vms.users.create',
  'vms.users.edit',
  'vms.users.delete',
  'vms.roles.view',
  'vms.roles.create',
  'vms.roles.edit',
  'vms.roles.delete',
  'vms.settings.view',
  'vms.settings.edit',
  'vms.reports.view',
  'vms.reports.export',
  'vms.audit.view',
];

/**
 * Check if VMS database is available
 */
const isVMSAvailable = () => {
  return vmsPrisma !== null;
};

/**
 * Middleware to check VMS availability
 */
const checkVMSAvailable = (req, res, next) => {
  if (!isVMSAvailable()) {
    return res.status(503).json({
      message: 'VMS service is not configured',
      error: 'VMS_NOT_CONFIGURED',
      help: 'Please configure VMS_DATABASE_URL in the backend .env file and run Prisma migrations',
    });
  }
  next();
};

// SSO Login from Work Permit System
// Called when user clicks "Access VMS" in Work Permit with vms.admin permission
exports.ssoLogin = async (req, res) => {
  if (!isVMSAvailable()) {
    return res.status(503).json({
      message: 'VMS service is not configured',
      error: 'VMS_NOT_CONFIGURED',
    });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'SSO token is required' });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔐 VMS SSO LOGIN ATTEMPT');
    console.log('='.repeat(60));

    // Verify SSO token with Work Permit backend
    const workPermitApiUrl = process.env.WORK_PERMIT_API_URL || process.env.API_URL || 'http://localhost:5000';
    
    // Call Work Permit SSO verify endpoint
    const verifyResponse = await fetch(`${workPermitApiUrl}/api/sso/vms/verify?token=${token}`);
    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.verified) {
      console.log('❌ SSO Token verification failed:', verifyData.message);
      return res.status(401).json({ message: verifyData.message || 'Invalid SSO token' });
    }

    const workPermitUser = verifyData.workPermitUser;
    console.log('✅ SSO Token verified for:', workPermitUser.email);

    // Find or create user in VMS database
    let vmsUser = await vmsPrisma.user.findUnique({
      where: { email: workPermitUser.email },
      include: { role: true },
    });

    // Get or create VMS_ADMIN role
    let vmsAdminRole = await vmsPrisma.role.findUnique({
      where: { name: 'VMS_ADMIN' },
    });

    if (!vmsAdminRole) {
      console.log('📋 Creating VMS_ADMIN role...');
      vmsAdminRole = await vmsPrisma.role.create({
        data: {
          id: uuidv4(),
          name: 'VMS_ADMIN',
          displayName: 'VMS Administrator',
          description: 'Full VMS system access (from Work Permit SSO)',
          permissions: JSON.stringify(VMS_ADMIN_PERMISSIONS),
          uiConfig: JSON.stringify({
            theme: 'admin',
            primaryColor: '#3b82f6',
            showAllMenus: true,
          }),
          isSystem: true,
          isActive: true,
        },
      });
      console.log('✅ VMS_ADMIN role created');
    }

    if (!vmsUser) {
      // Create new VMS user from Work Permit user
      console.log('📋 Creating new VMS user...');
      vmsUser = await vmsPrisma.user.create({
        data: {
          id: uuidv4(),
          email: workPermitUser.email,
          password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), // Random password
          firstName: workPermitUser.firstName,
          lastName: workPermitUser.lastName,
          roleId: vmsAdminRole.id,
          isActive: true,
          isApproved: true,
        },
        include: { role: true },
      });
      console.log('✅ VMS user created:', vmsUser.email);
    } else {
      // Update existing user to VMS_ADMIN role
      vmsUser = await vmsPrisma.user.update({
        where: { id: vmsUser.id },
        data: {
          roleId: vmsAdminRole.id,
          isActive: true,
          isApproved: true,
        },
        include: { role: true },
      });
      console.log('✅ VMS user updated to admin:', vmsUser.email);
    }

    // Generate VMS JWT token
    const vmsToken = jwt.sign(
      {
        userId: vmsUser.id,
        email: vmsUser.email,
        role: 'VMS_ADMIN',
        system: 'vms',
        ssoSource: 'work_permit',
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log SSO login
    try {
      await vmsPrisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId: vmsUser.id,
          action: 'SSO_LOGIN',
          entity: 'user',
          entityId: vmsUser.id,
          newValue: JSON.stringify({ source: 'work_permit', workPermitUserId: workPermitUser.id }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
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
      },
    });
  } catch (error) {
    console.error('❌ VMS SSO Login error:', error);
    res.status(500).json({ message: 'SSO Login failed', error: error.message });
  }
};

// Regular VMS Login (for VMS-only users)
exports.login = async (req, res) => {
  if (!isVMSAvailable()) {
    return res.status(503).json({
      message: 'VMS service is not configured',
      error: 'VMS_NOT_CONFIGURED',
      help: 'Please configure VMS_DATABASE_URL in the backend .env file',
    });
  }

  try {
    const { email, password } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🔐 VMS LOGIN ATTEMPT');
    console.log('='.repeat(60));
    console.log('📧 Email:', email);

    // Find user in VMS database
    const user = await vmsPrisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      console.log('❌ User not found in VMS database');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ User found:', user.firstName, user.lastName);
    console.log('🏷️  Role:', user.role?.name || 'No role');

    if (!user.isActive) {
      console.log('❌ Account deactivated');
      return res.status(403).json({ message: 'Account is deactivated' });
    }

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
    if (user.role && user.role.permissions) {
      try {
        permissions = JSON.parse(user.role.permissions);
      } catch (e) {
        permissions = [];
      }
    }

    // Generate VMS JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role?.name || 'VMS_USER',
        system: 'vms',
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log login
    try {
      await vmsPrisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          action: 'LOGIN',
          entity: 'user',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
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
        role: user.role?.name || 'VMS_USER',
        roleName: user.role?.displayName || 'User',
        permissions,
        department: user.department,
        phone: user.phone,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('❌ VMS Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Register new VMS user
exports.register = async (req, res) => {
  if (!isVMSAvailable()) {
    return res.status(503).json({
      message: 'VMS service is not configured',
      error: 'VMS_NOT_CONFIGURED',
    });
  }

  try {
    const { email, password, firstName, lastName, phone, department, requestedRole } = req.body;

    // Check if email exists
    const existingUser = await vmsPrisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default role (VMS_USER)
    let roleId = null;
    const roleName = requestedRole || 'VMS_USER';
    const role = await vmsPrisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      roleId = role.id;
    }

    // Create user - requires approval
    const user = await vmsPrisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        department,
        roleId,
        isApproved: false, // Require admin approval
      },
      include: { role: true },
    });

    // Log registration
    try {
      await vmsPrisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          action: 'REGISTER',
          entity: 'user',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });
    } catch (auditError) {
      console.log('⚠️ Audit log error (non-critical):', auditError.message);
    }

    res.status(201).json({
      message: 'Registration successful. Awaiting admin approval.',
      requiresApproval: true,
    });
  } catch (error) {
    console.error('VMS Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// Get current user
exports.me = async (req, res) => {
  if (!isVMSAvailable()) {
    return res.status(503).json({
      message: 'VMS service is not configured',
      error: 'VMS_NOT_CONFIGURED',
    });
  }

  try {
    const user = await vmsPrisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let permissions = [];
    if (user.role && user.role.permissions) {
      try {
        permissions = JSON.parse(user.role.permissions);
      } catch (e) {
        permissions = [];
      }
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name || 'VMS_USER',
      roleName: user.role?.displayName || 'User',
      permissions,
      department: user.department,
      phone: user.phone,
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error('VMS Get user error:', error);
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  if (!isVMSAvailable()) {
    return res.status(503).json({
      message: 'VMS service is not configured',
      error: 'VMS_NOT_CONFIGURED',
    });
  }

  try {
    const { firstName, lastName, phone, department, profilePicture } = req.body;

    const user = await vmsPrisma.user.update({
      where: { id: req.user.userId },
      data: {
        firstName,
        lastName,
        phone,
        department,
        profilePicture,
      },
      include: { role: true },
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'VMS_USER',
        roleName: user.role?.displayName || 'User',
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

// Change password
exports.changePassword = async (req, res) => {
  if (!isVMSAvailable()) {
    return res.status(503).json({
      message: 'VMS service is not configured',
      error: 'VMS_NOT_CONFIGURED',
    });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    const user = await vmsPrisma.user.findUnique({
      where: { id: req.user.userId },
    });

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await vmsPrisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('VMS Change password error:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

// Export helper
exports.isVMSAvailable = isVMSAvailable;
exports.checkVMSAvailable = checkVMSAvailable;
exports.VMS_ADMIN_PERMISSIONS = VMS_ADMIN_PERMISSIONS;
