// VMS Authentication Controller
const vmsPrisma = require('../../config/vms-prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with role
    const user = await vmsPrisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Account is pending approval' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Parse role permissions
    let permissions = [];
    if (user.role && user.role.permissions) {
      try {
        permissions = JSON.parse(user.role.permissions);
      } catch (e) {
        permissions = [];
      }
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role?.name || 'USER',
        system: 'vms', // Mark as VMS token
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log login action
    await vmsPrisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'user',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'USER',
        roleName: user.role?.displayName || 'User',
        permissions,
        department: user.department,
        phone: user.phone,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('VMS Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Register
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, department, requestedRole } = req.body;

    // Check if email exists
    const existingUser = await vmsPrisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default role (VMS_VIEWER) or requested role
    let roleId = null;
    const roleName = requestedRole || 'VMS_VIEWER';
    const role = await vmsPrisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      roleId = role.id;
    }

    // Determine if auto-approve (for viewer role)
    const autoApprove = roleName === 'VMS_VIEWER';

    // Create user
    const user = await vmsPrisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        department,
        roleId,
        requestedRole: roleName,
        isApproved: autoApprove,
      },
      include: { role: true },
    });

    // Log registration
    await vmsPrisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        entity: 'user',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    if (autoApprove) {
      // Generate JWT for auto-approved users
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role?.name || 'VMS_VIEWER',
          system: 'vms',
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role?.name || 'VMS_VIEWER',
          roleName: user.role?.displayName || 'VMS Viewer',
        },
      });
    } else {
      res.status(201).json({
        message: 'Registration successful. Awaiting admin approval.',
        requiresApproval: true,
      });
    }
  } catch (error) {
    console.error('VMS Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// Get current user
exports.me = async (req, res) => {
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
      role: user.role?.name || 'USER',
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
        role: user.role?.name || 'USER',
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
