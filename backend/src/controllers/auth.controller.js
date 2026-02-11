const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { createAuditLog } = require('../services/audit.service');
const { sendOTP, verifyRegistrationOTP, sendPasswordChangeOTP, verifyPasswordChangeOTP, sendWelcomeEmail, notifyAdminsNewRegistration } = require('../services/otp.service');

const prisma = new PrismaClient();

// Roles that require admin approval (all roles now require approval)
const ROLES_REQUIRING_APPROVAL = ['REQUESTOR', 'FIREMAN', 'SAFETY_OFFICER', 'ADMIN'];

// Temporary store for pending registrations (use Redis in production)
const pendingRegistrations = new Map();

// Send OTP for registration
const sendRegistrationOTP = async (req, res) => {
  try {
    const { email, phone, firstName, lastName, password, department, requestedRole } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ message: 'Email and phone number are required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Store registration data temporarily
    const registrationKey = `${email}_${phone}`;
    pendingRegistrations.set(registrationKey, {
      email,
      phone,
      firstName,
      lastName,
      password,
      department,
      requestedRole: requestedRole || 'REQUESTOR',
      createdAt: Date.now(),
    });

    // Clean up after 10 minutes
    setTimeout(() => {
      pendingRegistrations.delete(registrationKey);
    }, 10 * 60 * 1000);

    // Send OTP
    const result = await sendOTP(email, phone);

    res.json({
      message: 'OTP sent successfully',
      email: result.email,
      phone: result.phone,
      // Include OTP in response for development - REMOVE IN PRODUCTION
      otp: process.env.NODE_ENV === 'development' ? result.otp : undefined,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

// Verify OTP and complete registration
const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    if (!email || !phone || !otp) {
      return res.status(400).json({ message: 'Email, phone, and OTP are required' });
    }

    // Verify OTP
    const otpResult = verifyRegistrationOTP(email, phone, otp);
    
    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.message || 'Invalid OTP' });
    }

    // Get stored registration data
    const registrationKey = `${email}_${phone}`;
    const registrationData = pendingRegistrations.get(registrationKey);

    if (!registrationData) {
      return res.status(400).json({ message: 'Registration session expired. Please start again.' });
    }

    // Clean up
    pendingRegistrations.delete(registrationKey);

    // Check if user exists (double check)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);

    // Determine if approval is needed
    const role = registrationData.requestedRole || 'REQUESTOR';
    const needsApproval = ROLES_REQUIRING_APPROVAL.includes(role);

    // Find the role ID
    let roleRecord = await prisma.role.findUnique({
      where: { name: needsApproval ? 'REQUESTOR' : role },
    });

    if (!roleRecord) {
      roleRecord = await prisma.role.findUnique({
        where: { name: 'REQUESTOR' },
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: registrationData.email,
        password: hashedPassword,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        department: registrationData.department,
        phone: registrationData.phone,
        roleId: roleRecord?.id,
        isApproved: !needsApproval,
        requestedRole: needsApproval ? role : null,
      },
      include: {
        role: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: needsApproval ? 'USER_REGISTRATION_PENDING' : 'USER_REGISTERED',
      entity: 'User',
      entityId: user.id,
      newValue: { email: user.email, requestedRole: role, needsApproval, otpVerified: true },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // If needs approval, don't generate token
    if (needsApproval) {
      return res.status(201).json({
        message: 'Registration submitted for approval',
        requiresApproval: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          requestedRole: role,
        },
      });
    }

    // Generate token for auto-approved users
    const token = jwt.sign(
      { userId: user.id, role: user.role?.name || 'REQUESTOR' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'REQUESTOR',
        department: user.department,
      },
      token,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Error completing registration' });
  }
};

// Legacy register (kept for backward compatibility)
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, department, phone, requestedRole } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine if approval is needed
    const role = requestedRole || 'REQUESTOR';
    const needsApproval = ROLES_REQUIRING_APPROVAL.includes(role);

    // Find the role ID
    let roleRecord = await prisma.role.findUnique({
      where: { name: needsApproval ? 'REQUESTOR' : role },
    });

    if (!roleRecord) {
      roleRecord = await prisma.role.findUnique({
        where: { name: 'REQUESTOR' },
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        department,
        phone,
        roleId: roleRecord?.id,
        isApproved: !needsApproval,
        requestedRole: needsApproval ? role : null,
      },
      include: {
        role: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: needsApproval ? 'USER_REGISTRATION_PENDING' : 'USER_REGISTERED',
      entity: 'User',
      entityId: user.id,
      newValue: { email: user.email, requestedRole: role, needsApproval },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Send welcome email with login credentials (using plain password before hashing)
    try {
      await sendWelcomeEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: role,
        requiresApproval: needsApproval,
        password: password, // Pass the plain text password for email
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Don't fail registration if email fails
    }

    // If needs approval, notify admins and don't generate token
    if (needsApproval) {
      // Notify all admins about the new registration request
      try {
        const admins = await prisma.user.findMany({
          where: {
            role: { name: 'ADMIN' },
            isActive: true,
            isApproved: true,
          },
          select: { email: true },
        });
        const adminEmails = admins.map(a => a.email);
        if (adminEmails.length > 0) {
          await notifyAdminsNewRegistration({
            firstName,
            lastName,
            email,
            phone,
            requestedRole: role,
            department,
          }, adminEmails);
        }
      } catch (notifyError) {
        console.error('Failed to notify admins:', notifyError);
      }

      return res.status(201).json({
        message: 'Registration submitted for approval. A confirmation email has been sent.',
        requiresApproval: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          requestedRole: role,
        },
      });
    }

    // Generate token for auto-approved users
    const token = jwt.sign(
      { userId: user.id, role: user.role?.name || 'REQUESTOR' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      message: 'Registration successful. A confirmation email has been sent.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'REQUESTOR',
        department: user.department,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with role
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Check if user is approved
    if (!user.isApproved) {
      return res.status(403).json({ 
        message: 'Your account is pending approval. Please wait for admin approval.',
        pendingApproval: true,
        requestedRole: user.requestedRole,
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userRole = user.role?.name || 'REQUESTOR';

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: userRole },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Parse permissions from role
    const permissions = user.role ? JSON.parse(user.role.permissions || '[]') : [];
    const uiConfig = user.role ? JSON.parse(user.role.uiConfig || '{}') : {};

    // ============ LOGIN LOG ============
    console.log('\n' + '='.repeat(60));
    console.log('🔑 USER LOGIN SUCCESS');
    console.log('='.repeat(60));
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.firstName, user.lastName);
    console.log('🏷️  Role Name:', userRole);
    console.log('🏷️  Role Display:', user.role?.displayName || 'User');
    console.log('🆔 Role ID:', user.roleId);
    console.log('🔐 Permissions:', JSON.stringify(permissions, null, 2));
    console.log('🎨 UI Config:', JSON.stringify(uiConfig, null, 2));
    console.log('='.repeat(60) + '\n');

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole,
        roleId: user.roleId,
        roleName: user.role?.displayName || 'User',
        department: user.department,
        phone: user.phone,
        profilePicture: user.profilePicture,
        permissions,
        uiConfig,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
};

// Get current user
const me = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Error getting user info' });
  }
};

// Send OTP for password change
const sendPasswordOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send OTP to email and phone
    const result = await sendPasswordChangeOTP(user.email, user.phone);

    res.json({
      message: 'OTP sent successfully',
      email: user.email ? `${user.email.substring(0, 3)}***${user.email.substring(user.email.indexOf('@'))}` : null,
      phone: user.phone ? `***${user.phone.slice(-4)}` : null,
      // Include OTP in response for development - REMOVE IN PRODUCTION
      otp: process.env.NODE_ENV === 'development' ? result.otp : undefined,
    });
  } catch (error) {
    console.error('Send password OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

// Change password with OTP verification
const changePassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const userId = req.user.id;

    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'OTP and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    const otpResult = verifyPasswordChangeOTP(user.email, user.phone, otp);
    
    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.message || 'Invalid OTP' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await createAuditLog({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      newValue: { method: 'OTP_VERIFIED' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, department, profilePicture } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: true,
      },
    });

    await createAuditLog({
      userId,
      action: 'PROFILE_UPDATED',
      entity: 'User',
      entityId: userId,
      newValue: updateData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role?.name || 'REQUESTOR',
        department: updatedUser.department,
        phone: updatedUser.phone,
        profilePicture: updatedUser.profilePicture,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

module.exports = {
  register,
  sendRegistrationOTP,
  verifyOTPAndRegister,
  login,
  me,
  sendPasswordOTP,
  changePassword,
  updateProfile,
};
