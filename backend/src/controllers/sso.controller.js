const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const config = require('../config');

const prisma = new PrismaClient();

/**
 * SSO Controller - Handles Single Sign-On integration with external MIS system
 */

// Generate SSO token for external system to authenticate
const generateSSOToken = async (req, res) => {
  try {
    const { externalUserId, email, firstName, lastName, role, externalSystem = 'MIS' } = req.body;

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
      supportedSystems: ['MIS', 'EXTERNAL'],
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
};
