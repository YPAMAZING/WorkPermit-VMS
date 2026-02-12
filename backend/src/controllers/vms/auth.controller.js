// VMS Authentication Controller
// Uses the MAIN database (same as Work Permit)
// VMS access is controlled by:
// 1. hasVMSAccess flag on User model
// 2. vms.admin permission in user's role
//
// This ensures single database, no sync issues, simple login

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const prisma = new PrismaClient();

// VMS Permissions (for users with VMS access)
const VMS_PERMISSIONS = [
  'vms.dashboard.view',
  'vms.dashboard.stats',
  'vms.visitors.view',
  'vms.visitors.create',
  'vms.visitors.edit',
  'vms.visitors.delete',
  'vms.gatepasses.view',
  'vms.gatepasses.create',
  'vms.gatepasses.approve',
  'vms.companies.view',
  'vms.companies.edit',
  'vms.settings.view',
  'vms.settings.edit',
  'vms.reports.view',
];

/**
 * Check if user has VMS access
 * Returns true if:
 * - User has hasVMSAccess = true, OR
 * - User's role has vms.admin permission
 */
const checkVMSAccess = (user) => {
  // Check hasVMSAccess flag
  if (user.hasVMSAccess) {
    return true;
  }

  // Check vms.admin permission in role
  if (user.role && user.role.permissions) {
    try {
      const permissions = JSON.parse(user.role.permissions);
      if (permissions.includes('vms.admin')) {
        return true;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  return false;
};

/**
 * VMS Login
 * Uses the SAME database as Work Permit
 * User must have VMS access (hasVMSAccess flag or vms.admin permission)
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🔐 VMS LOGIN ATTEMPT');
    console.log('='.repeat(60));
    console.log('📧 Email:', email);

    // Find user in MAIN database (same as Work Permit)
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ User found:', user.firstName, user.lastName);
    console.log('🏷️  Role:', user.role?.name || 'No role');
    console.log('🔑 hasVMSAccess:', user.hasVMSAccess);

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

    // Check VMS access
    const hasAccess = checkVMSAccess(user);
    console.log('🎫 VMS Access Check:', hasAccess ? '✅ GRANTED' : '❌ DENIED');

    if (!hasAccess) {
      console.log('❌ No VMS access');
      return res.status(403).json({ 
        message: 'You do not have VMS access. Please contact your administrator.',
        error: 'NO_VMS_ACCESS',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Password verified');

    // Parse role permissions
    let rolePermissions = [];
    if (user.role && user.role.permissions) {
      try {
        rolePermissions = JSON.parse(user.role.permissions);
      } catch (e) {
        rolePermissions = [];
      }
    }

    // Combine VMS permissions with role permissions
    const permissions = [...new Set([...VMS_PERMISSIONS, ...rolePermissions])];

    // Generate VMS JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role?.name || 'VMS_USER',
        system: 'vms',
        hasVMSAccess: true,
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
          entity: 'User',
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
        role: user.role?.name || 'VMS_USER',
        roleName: user.role?.displayName || 'User',
        permissions,
        department: user.department,
        phone: user.phone,
        profilePicture: user.profilePicture,
        companyName: user.companyName,
        hasVMSAccess: true,
      },
    });
  } catch (error) {
    console.error('❌ VMS Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

/**
 * SSO Login from Work Permit System
 * Called when user clicks "Access VMS" button in Work Permit
 */
exports.ssoLogin = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'SSO token is required' });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔐 VMS SSO LOGIN ATTEMPT');
    console.log('='.repeat(60));

    // Verify SSO token
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: ssoToken.userId },
      include: { role: true },
    });

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('✅ SSO Token verified for:', user.email);

    // Check VMS access
    const hasAccess = checkVMSAccess(user);
    if (!hasAccess) {
      console.log('❌ No VMS access');
      return res.status(403).json({ 
        message: 'You do not have VMS access',
        error: 'NO_VMS_ACCESS',
      });
    }

    // Update user's hasVMSAccess flag if not set
    if (!user.hasVMSAccess) {
      await prisma.user.update({
        where: { id: user.id },
        data: { hasVMSAccess: true },
      });
    }

    // Parse permissions
    let rolePermissions = [];
    if (user.role && user.role.permissions) {
      try {
        rolePermissions = JSON.parse(user.role.permissions);
      } catch (e) {
        rolePermissions = [];
      }
    }

    const permissions = [...new Set([...VMS_PERMISSIONS, ...rolePermissions])];

    // Generate VMS JWT
    const vmsToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role?.name || 'VMS_ADMIN',
        system: 'vms',
        ssoSource: 'work_permit',
        hasVMSAccess: true,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Log SSO login
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'VMS_SSO_LOGIN',
          entity: 'User',
          entityId: user.id,
          newValue: JSON.stringify({ source: 'work_permit_sso' }),
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
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'VMS_ADMIN',
        roleName: user.role?.displayName || 'VMS Administrator',
        permissions,
        ssoSource: 'work_permit',
        hasVMSAccess: true,
      },
    });
  } catch (error) {
    console.error('❌ VMS SSO Login error:', error);
    res.status(500).json({ message: 'SSO Login failed', error: error.message });
  }
};

/**
 * Get current VMS user
 */
exports.me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check VMS access
    const hasAccess = checkVMSAccess(user);
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'You do not have VMS access',
        error: 'NO_VMS_ACCESS',
      });
    }

    // Parse permissions
    let rolePermissions = [];
    if (user.role && user.role.permissions) {
      try {
        rolePermissions = JSON.parse(user.role.permissions);
      } catch (e) {
        rolePermissions = [];
      }
    }

    const permissions = [...new Set([...VMS_PERMISSIONS, ...rolePermissions])];

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
      companyName: user.companyName,
      hasVMSAccess: true,
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

    const user = await prisma.user.update({
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

/**
 * Change VMS password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
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

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('VMS Change password error:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

/**
 * VMS Register is NOT allowed
 * Users must be created in Work Permit and granted VMS access
 */
exports.register = async (req, res) => {
  return res.status(403).json({
    message: 'VMS registration is not allowed. Please contact your administrator to get VMS access.',
    error: 'REGISTRATION_NOT_ALLOWED',
  });
};

// Export helper
exports.checkVMSAccess = checkVMSAccess;
exports.VMS_PERMISSIONS = VMS_PERMISSIONS;
