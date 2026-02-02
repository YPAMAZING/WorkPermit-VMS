// VMS Authentication Middleware
const jwt = require('jsonwebtoken');
const vmsPrisma = require('../config/vms-prisma');

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
      
      // Optionally verify this is a VMS token
      // if (decoded.system !== 'vms') {
      //   return res.status(401).json({ message: 'Invalid token for VMS system' });
      // }

      // Get user from VMS database
      const user = await vmsPrisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true },
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

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

      // Attach user info to request
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role?.name || 'USER',
        roleName: user.role?.displayName || 'User',
        permissions,
        isAdmin: user.role?.name === 'ADMIN' || user.role?.name === 'VMS_ADMIN',
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
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
const vmsRoleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (req.user.isAdmin) {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied', 
      required: allowedRoles,
      current: req.user.role,
    });
  };
};

module.exports = {
  vmsAuthMiddleware,
  vmsPermissionMiddleware,
  vmsRoleMiddleware,
};
