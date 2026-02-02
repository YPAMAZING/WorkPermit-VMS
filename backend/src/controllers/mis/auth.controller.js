// MIS Authentication Controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { misPrisma } = require('../../config/mis-prisma');

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user in MIS database
    const user = await misPrisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Check if account is approved
    if (!user.isApproved) {
      return res.status(403).json({ message: 'Account is pending approval' });
    }

    // Parse permissions
    let permissions = [];
    if (user.role && user.role.permissions) {
      try {
        permissions = JSON.parse(user.role.permissions);
      } catch (e) {
        permissions = [];
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        system: 'mis'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Update last login
    await misPrisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log the login
    try {
      await misPrisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          module: 'auth',
          details: JSON.stringify({ ip: req.ip }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (logError) {
      console.error('Audit log error:', logError);
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'USER',
        roleName: user.role?.displayName || 'User',
        permissions,
        isAdmin: user.role?.name === 'ADMIN' || user.role?.name === 'MIS_ADMIN',
      },
    });
  } catch (error) {
    console.error('MIS Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Get current user
const me = async (req, res) => {
  try {
    const user = await misPrisma.user.findUnique({
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
      phone: user.phone,
      department: user.department,
      role: user.role?.name || 'USER',
      roleName: user.role?.displayName || 'User',
      permissions,
      isAdmin: user.role?.name === 'ADMIN' || user.role?.name === 'MIS_ADMIN',
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await misPrisma.user.findUnique({
      where: { id: req.user.userId },
    });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await misPrisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log password change
    try {
      await misPrisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'password_change',
          module: 'auth',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (logError) {
      console.error('Audit log error:', logError);
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // Log the logout
    try {
      await misPrisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'logout',
          module: 'auth',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (logError) {
      console.error('Audit log error:', logError);
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed', error: error.message });
  }
};

module.exports = {
  login,
  me,
  changePassword,
  logout,
};
