// VMS Authentication Middleware
// Uses VMSUser table (separate from Work Permit users)

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Verify JWT token for VMS
const vmsAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from VMS users table (NOT the main users table)
      const user = await prisma.vMSUser.findUnique({
        where: { id: decoded.userId },
        include: { vmsRole: true },
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found in VMS' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      if (!user.isApproved) {
        return res.status(403).json({ message: 'Account is pending approval' });
      }

      // Parse permissions from VMS role
      let permissions = [];
      if (user.vmsRole && user.vmsRole.permissions) {
        try {
          permissions = JSON.parse(user.vmsRole.permissions);
        } catch (e) {
          permissions = [];
        }
      }

      // Check if user is admin (multiple ways to be admin)
      const roleName = user.vmsRole?.name || 'VMS_USER';
      const isAdminRole = ['VMS_ADMIN', 'ADMIN', 'admin', 'FIREMAN', 'SUPER_ADMIN'].includes(roleName);
      
      // Attach user info to request
      req.user = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: roleName,
        roleName: user.vmsRole?.displayName || 'User',
        permissions,
        companyId: user.companyId,
        isAdmin: isAdminRole || user.isFromWorkPermit, // Work permit users are admins in VMS
        isFromWorkPermit: user.isFromWorkPermit,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      console.error('JWT Error:', jwtError.message);
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('VMS Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};

// Permission check middleware
const vmsPermissionMiddleware = (requiredPermission) => {
  return (req, res, next) => {
    // Admin has all permissions
    if (req.user.isAdmin) {
      return next();
    }

    // Check if user has required permission
    if (req.user.permissions && req.user.permissions.includes(requiredPermission)) {
      return next();
    }

    // Check for wildcard permissions (e.g., 'vms.visitors.*')
    const permissionParts = requiredPermission.split('.');
    for (let i = permissionParts.length - 1; i > 0; i--) {
      const wildcardPerm = permissionParts.slice(0, i).join('.') + '.*';
      if (req.user.permissions && req.user.permissions.includes(wildcardPerm)) {
        return next();
      }
    }

    return res.status(403).json({ 
      message: 'Permission denied', 
      required: requiredPermission,
    });
  };
};

// Role check middleware
const vmsRoleMiddleware = (allowedRoles) => {
  // Handle both array and spread arguments
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (req.user.isAdmin) {
      return next();
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied', 
      required: roles,
      current: req.user.role,
    });
  };
};

module.exports = {
  vmsAuth: vmsAuthMiddleware,
  vmsAuthMiddleware,
  vmsRequirePermission: vmsPermissionMiddleware,
  vmsPermissionMiddleware,
  vmsRequireRole: vmsRoleMiddleware,
  vmsRoleMiddleware,
};
