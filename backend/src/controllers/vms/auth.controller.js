// VMS Authentication Controller
// Uses MAIN database (same as Work Permit system)
// This allows admins to access both Work Permit AND VMS with same credentials

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const prisma = new PrismaClient();

// Login - uses main database
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🔐 VMS LOGIN ATTEMPT');
    console.log('='.repeat(60));
    console.log('📧 Email:', email);

    // Find user with role from MAIN database
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
    console.log('✅ isActive:', user.isActive);
    console.log('✅ isApproved:', user.isApproved);

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

    // Generate JWT - mark as VMS system token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role?.name || 'REQUESTOR',
        system: 'vms', // Mark as VMS token
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn || '24h' }
    );

    // Log login action - handle audit log creation errors gracefully
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'VMS_LOGIN',
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
        role: user.role?.name || 'REQUESTOR',
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

// Register - uses main database
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, department, requestedRole } = req.body;

    // Check if email exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default role (REQUESTOR)
    let roleId = null;
    const roleName = requestedRole || 'REQUESTOR';
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      roleId = role.id;
    }

    // Create user - requires approval
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        department,
        roleId,
        requestedRole: roleName,
        isApproved: false, // Require admin approval
      },
      include: { role: true },
    });

    // Log registration
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'VMS_REGISTER',
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

// Get current user - uses main database
exports.me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
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
      role: user.role?.name || 'REQUESTOR',
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

// Update profile - uses main database
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
        role: user.role?.name || 'REQUESTOR',
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

// Change password - uses main database
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
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
