const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const config = require('../config');

const prisma = new PrismaClient();

/**
 * SSO Controller - Handles Single Sign-On integration
 * Includes VMS Admin SSO for Work Permit → VMS redirection
 */

// Generate VMS SSO Token (for Work Permit users with vms.admin permission)
const generateVMSSSOToken = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user with role and permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has vms.admin permission
    const permissions = user.role ? JSON.parse(user.role.permissions || '[]') : [];
    const hasVMSAdmin = permissions.includes('vms.admin') || user.role?.name === 'ADMIN';

    if (!hasVMSAdmin) {
      return res.status(403).json({ message: 'You do not have VMS Admin access' });
    }

    // Generate secure SSO token for VMS
    const ssoToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Store SSO token in database
    await prisma.sSOToken.create({
      data: {
        token: ssoToken,
        userId: user.id,
        externalSystem: 'VMS',
        expiresAt,
        isUsed: false,
      },
    });

    console.log(`\n🔐 VMS SSO Token Generated for ${user.email}`);

    // Return token and redirect URL
    const vmsUrl = process.env.VMS_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    
    res.json({
      success: true,
      ssoToken,
      expiresAt,
      redirectUrl: `${vmsUrl}/vms/sso?token=${ssoToken}`,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error('Generate VMS SSO token error:', error);
    res.status(500).json({ message: 'Error generating VMS SSO token' });
  }
};

// Verify VMS SSO Token (called by VMS to validate and login user)
const verifyVMSSSOToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'SSO token is required' });
    }

    // Find and validate SSO token
    const ssoToken = await prisma.sSOToken.findUnique({
      where: { token },
    });

    if (!ssoToken) {
      return res.status(401).json({ message: 'Invalid SSO token' });
    }

    if (ssoToken.isUsed) {
      return res.status(401).json({ message: 'SSO token already used' });
    }

    if (new Date() > ssoToken.expiresAt) {
      return res.status(401).json({ message: 'SSO token expired' });
    }

    if (ssoToken.externalSystem !== 'VMS') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Mark token as used
    await prisma.sSOToken.update({
      where: { id: ssoToken.id },
      data: { isUsed: true },
    });

    // Get user from Work Permit database
    const user = await prisma.user.findUnique({
      where: { id: ssoToken.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Verify user has VMS admin permission
    const permissions = user.role ? JSON.parse(user.role.permissions || '[]') : [];
    const hasVMSAdmin = permissions.includes('vms.admin') || user.role?.name === 'ADMIN';

    if (!hasVMSAdmin) {
      return res.status(403).json({ message: 'User does not have VMS Admin access' });
    }

    console.log(`\n✅ VMS SSO Token Verified for ${user.email}`);

    // Return user info for VMS to create/login user in VMS database
    res.json({
      success: true,
      verified: true,
      workPermitUser: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'VMS_ADMIN', // VMS should create/login this user as VMS_ADMIN
        permissions: ['vms.*'], // Full VMS access
      },
    });
  } catch (error) {
    console.error('Verify VMS SSO token error:', error);
    res.status(500).json({ message: 'Error verifying VMS SSO token' });
  }
};

// Generate SSO token for external system to authenticate
const generateSSOToken = async (req, res) => {
  try {
    const { externalUserId, email, firstName, lastName, role, externalSystem = 'EXTERNAL' } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find or create user based on email
    let user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      // Create new user from external system
      // Find the appropriate role
      let userRole = await prisma.role.findUnique({
        where: { name: role || 'REQUESTOR' },
      });

      if (!userRole) {
        userRole = await prisma.role.findUnique({
          where: { name: 'REQUESTOR' },
        });
      }

      user = await prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
          firstName: firstName || 'External',
          lastName: lastName || 'User',
          roleId: userRole?.id,
          department: 'External',
          isActive: true,
        },
        include: { role: true },
      });
    }

    // Generate unique SSO token
    const ssoToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Store SSO token
    await prisma.sSOToken.create({
      data: {
        token: ssoToken,
        userId: user.id,
        externalUserId: externalUserId || null,
        externalSystem,
        expiresAt,
      },
    });

    res.json({
      ssoToken,
      expiresAt,
      redirectUrl: `/auth/sso/verify?token=${ssoToken}`,
    });
  } catch (error) {
    console.error('Generate SSO token error:', error);
    res.status(500).json({ message: 'Error generating SSO token' });
  }
};

// Verify SSO token and issue JWT
const verifySSOToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'SSO token is required' });
    }

    // Find and validate SSO token
    const ssoToken = await prisma.sSOToken.findUnique({
      where: { token },
    });

    if (!ssoToken) {
      return res.status(401).json({ message: 'Invalid SSO token' });
    }

    if (ssoToken.isUsed) {
      return res.status(401).json({ message: 'SSO token already used' });
    }

    if (new Date() > ssoToken.expiresAt) {
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

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn || '24h' }
    );

    // Parse permissions
    const permissions = user.role ? JSON.parse(user.role.permissions || '[]') : [];
    const uiConfig = user.role ? JSON.parse(user.role.uiConfig || '{}') : {};

    res.json({
      message: 'SSO authentication successful',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'REQUESTOR',
        roleName: user.role?.displayName || 'Requestor',
        department: user.department,
        permissions,
        uiConfig,
      },
    });
  } catch (error) {
    console.error('Verify SSO token error:', error);
    res.status(500).json({ message: 'Error verifying SSO token' });
  }
};

// Validate external JWT token (for embedded iframe/module usage)
const validateExternalToken = async (req, res) => {
  try {
    const { externalToken, secret, algorithm = 'HS256' } = req.body;

    if (!externalToken) {
      return res.status(400).json({ message: 'External token is required' });
    }

    // Use provided secret or fallback to configured external secret
    const tokenSecret = secret || config.externalJwtSecret || config.jwtSecret;

    try {
      const decoded = jwt.verify(externalToken, tokenSecret, { algorithms: [algorithm] });

      // Extract user info from external token
      const { email, sub, userId, user_id, name, given_name, family_name, role } = decoded;
      const userEmail = email || sub;

      if (!userEmail) {
        return res.status(400).json({ message: 'Email not found in token' });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { role: true },
      });

      if (!user) {
        // Parse name
        let firstName = given_name || 'External';
        let lastName = family_name || 'User';
        if (name && !given_name) {
          const nameParts = name.split(' ');
          firstName = nameParts[0] || 'External';
          lastName = nameParts.slice(1).join(' ') || 'User';
        }

        // Find role
        let userRole = await prisma.role.findUnique({
          where: { name: role || 'REQUESTOR' },
        });
        if (!userRole) {
          userRole = await prisma.role.findUnique({
            where: { name: 'REQUESTOR' },
          });
        }

        user = await prisma.user.create({
          data: {
            email: userEmail,
            password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
            firstName,
            lastName,
            roleId: userRole?.id,
            department: 'External',
            isActive: true,
          },
          include: { role: true },
        });
      }

      // Generate internal JWT
      const internalToken = jwt.sign(
        { userId: user.id },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn || '24h' }
      );

      const permissions = user.role ? JSON.parse(user.role.permissions || '[]') : [];
      const uiConfig = user.role ? JSON.parse(user.role.uiConfig || '{}') : {};

      res.json({
        message: 'External token validated',
        token: internalToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role?.name || 'REQUESTOR',
          roleName: user.role?.displayName || 'Requestor',
          department: user.department,
          permissions,
          uiConfig,
        },
      });
    } catch (tokenError) {
      return res.status(401).json({ message: 'Invalid external token', error: tokenError.message });
    }
  } catch (error) {
    console.error('Validate external token error:', error);
    res.status(500).json({ message: 'Error validating external token' });
  }
};

// Get SSO configuration for frontend
const getSSOConfig = async (req, res) => {
  try {
    res.json({
      ssoEnabled: true,
      supportedSystems: ['EXTERNAL'],
      tokenEndpoint: '/api/sso/generate',
      verifyEndpoint: '/api/sso/verify',
      validateEndpoint: '/api/sso/validate-external',
      embedMode: true,
      iframeAllowed: true,
    });
  } catch (error) {
    console.error('Get SSO config error:', error);
    res.status(500).json({ message: 'Error getting SSO config' });
  }
};

module.exports = {
  generateSSOToken,
  verifySSOToken,
  validateExternalToken,
  getSSOConfig,
  generateVMSSSOToken,
  verifyVMSSSOToken,
};
