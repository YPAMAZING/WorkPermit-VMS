const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');

const prisma = new PrismaClient();

// ============ LOGGING UTILITY ============
const LOG_ENABLED = true; // Set to false to disable logging

const log = {
  auth: (message, data = {}) => {
    if (LOG_ENABLED) {
      console.log(`\n🔐 [AUTH] ${message}`);
      if (Object.keys(data).length > 0) {
        console.log('   📋 Data:', JSON.stringify(data, null, 2));
      }
    }
  },
  permission: (message, data = {}) => {
    if (LOG_ENABLED) {
      console.log(`\n🛡️  [PERMISSION] ${message}`);
      if (Object.keys(data).length > 0) {
        console.log('   📋 Data:', JSON.stringify(data, null, 2));
      }
    }
  },
  access: (allowed, message, data = {}) => {
    if (LOG_ENABLED) {
      const icon = allowed ? '✅' : '❌';
      console.log(`\n${icon} [ACCESS] ${message}`);
      if (Object.keys(data).length > 0) {
        console.log('   📋 Data:', JSON.stringify(data, null, 2));
      }
    }
  },
  error: (message, error = null) => {
    console.error(`\n🚨 [ERROR] ${message}`);
    if (error) {
      console.error('   Details:', error.message || error);
    }
  }
};

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log.auth('No token provided', { path: req.path });
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          role: true,
        },
      });

      if (!user) {
        log.auth('User not found', { userId: decoded.userId });
        return res.status(401).json({ message: 'User not found' });
      }

      if (!user.isActive) {
        log.auth('Account deactivated', { email: user.email });
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      // Parse role permissions and UI config
      const permissions = user.role ? JSON.parse(user.role.permissions || '[]') : [];
      const uiConfig = user.role ? JSON.parse(user.role.uiConfig || '{}') : {};

      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'REQUESTOR',
        roleId: user.roleId,
        roleName: user.role?.displayName || 'Requestor',
        department: user.department,
        isActive: user.isActive,
        permissions,
        uiConfig,
      };
      
      // Log authenticated user details
      log.auth('User authenticated', {
        email: req.user.email,
        role: req.user.role,
        roleName: req.user.roleName,
        permissions: req.user.permissions,
        path: req.path,
        method: req.method
      });
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        log.auth('Token expired');
        return res.status(401).json({ message: 'Token expired' });
      }
      log.error('Invalid token', error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    log.error('Auth middleware error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check if user has specific permission
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      log.permission('Check failed - no user', { required: requiredPermission });
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admin has all permissions
    if (req.user.role === 'ADMIN') {
      log.access(true, 'Admin bypass', { 
        user: req.user.email, 
        required: requiredPermission 
      });
      return next();
    }

    // Check if user has the required permission
    if (req.user.permissions && req.user.permissions.includes(requiredPermission)) {
      log.access(true, 'Permission granted', { 
        user: req.user.email, 
        role: req.user.role,
        required: requiredPermission,
        userPermissions: req.user.permissions
      });
      return next();
    }

    log.access(false, 'Permission denied', { 
      user: req.user.email, 
      role: req.user.role,
      required: requiredPermission,
      userPermissions: req.user.permissions
    });
    return res.status(403).json({ 
      message: 'Access denied. Insufficient permissions.',
      required: requiredPermission,
    });
  };
};

// Check if user has any of the specified permissions
const checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admin has all permissions
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Check if user has any of the required permissions
    const hasPermission = permissions.some(perm => 
      req.user.permissions && req.user.permissions.includes(perm)
    );

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied. Insufficient permissions.',
      required: permissions,
    });
  };
};

// Role-based authorization (legacy support)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Flatten roles array (handles both authorize('ADMIN') and authorize(['ADMIN', 'SAFETY']))
    const flatRoles = roles.flat();

    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: flatRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

// Check if user is Admin (now also supports custom roles with admin-level permissions)
const isAdmin = (req, res, next) => {
  log.permission('Checking isAdmin', { 
    path: req.path,
    user: req.user?.email,
    role: req.user?.role,
    permissions: req.user?.permissions
  });

  if (!req.user) {
    log.access(false, 'isAdmin - No user');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admin role has all permissions
  if (req.user.role === 'ADMIN') {
    log.access(true, 'isAdmin - ADMIN role', { user: req.user.email });
    return next();
  }

  // Check if custom role has user management permissions
  if (req.user.permissions && (
    req.user.permissions.includes('users.manage') ||
    req.user.permissions.includes('users.edit') ||
    req.user.permissions.includes('users.assign_role')
  )) {
    log.access(true, 'isAdmin - Has user management permission', { 
      user: req.user.email,
      role: req.user.role,
      matchedPermissions: req.user.permissions.filter(p => 
        ['users.manage', 'users.edit', 'users.assign_role'].includes(p)
      )
    });
    return next();
  }

  log.access(false, 'isAdmin - Access denied', { 
    user: req.user.email,
    role: req.user.role,
    permissions: req.user.permissions
  });
  return res.status(403).json({ 
    message: 'Access denied. Admin privileges required.',
    current: req.user.role,
  });
};

// Check if user is Fireman (now also supports custom roles with approval permission)
const isFireman = (req, res, next) => {
  log.permission('Checking isFireman', { 
    path: req.path,
    user: req.user?.email,
    role: req.user?.role,
    permissions: req.user?.permissions
  });

  if (!req.user) {
    log.access(false, 'isFireman - No user');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admin has all permissions
  if (req.user.role === 'ADMIN') {
    log.access(true, 'isFireman - ADMIN role', { user: req.user.email });
    return next();
  }

  // Fireman has approval access (support both old SAFETY_OFFICER and new FIREMAN names)
  if (req.user.role === 'FIREMAN' || req.user.role === 'SAFETY_OFFICER') {
    log.access(true, 'isFireman - FIREMAN role', { user: req.user.email });
    return next();
  }

  // Check if custom role has approval permission
  if (req.user.permissions && (
    req.user.permissions.includes('approvals.view') ||
    req.user.permissions.includes('approvals.approve')
  )) {
    log.access(true, 'isFireman - Has approval permission', { 
      user: req.user.email,
      role: req.user.role,
      matchedPermissions: req.user.permissions.filter(p => 
        ['approvals.view', 'approvals.approve'].includes(p)
      )
    });
    return next();
  }

  log.access(false, 'isFireman - Access denied', { 
    user: req.user.email,
    role: req.user.role,
    permissions: req.user.permissions
  });
  return res.status(403).json({ 
    message: 'Access denied. Insufficient permissions.',
    required: ['FIREMAN', 'ADMIN', 'or approvals.view permission'],
    current: req.user.role,
  });
};

// Alias for backward compatibility
const isSafetyOfficer = isFireman;

// Check if user can approve permits
const canApprove = (req, res, next) => {
  log.permission('Checking canApprove', { 
    path: req.path,
    user: req.user?.email,
    role: req.user?.role,
    permissions: req.user?.permissions
  });

  if (!req.user) {
    log.access(false, 'canApprove - No user');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admin and Fireman can approve (support both old SAFETY_OFFICER and new FIREMAN names)
  if (req.user.role === 'ADMIN' || req.user.role === 'FIREMAN' || req.user.role === 'SAFETY_OFFICER') {
    log.access(true, 'canApprove - System role', { 
      user: req.user.email, 
      role: req.user.role 
    });
    return next();
  }

  // Check if custom role has approve permission
  if (req.user.permissions && req.user.permissions.includes('approvals.approve')) {
    log.access(true, 'canApprove - Has approvals.approve permission', { 
      user: req.user.email,
      role: req.user.role
    });
    return next();
  }

  log.access(false, 'canApprove - Access denied', { 
    user: req.user.email,
    role: req.user.role,
    permissions: req.user.permissions
  });
  return res.status(403).json({ 
    message: 'Access denied. You do not have permission to approve permits.',
    required: 'approvals.approve',
  });
};

// Check if user can re-approve permits
const canReapprove = (req, res, next) => {
  log.permission('Checking canReapprove', { 
    path: req.path,
    user: req.user?.email,
    role: req.user?.role,
    permissions: req.user?.permissions
  });

  if (!req.user) {
    log.access(false, 'canReapprove - No user');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admin and Fireman can re-approve
  if (req.user.role === 'ADMIN' || req.user.role === 'FIREMAN' || req.user.role === 'SAFETY_OFFICER') {
    log.access(true, 'canReapprove - System role', { 
      user: req.user.email, 
      role: req.user.role 
    });
    return next();
  }

  // Check if custom role has re-approve permission
  if (req.user.permissions && (
    req.user.permissions.includes('approvals.reapprove') ||
    req.user.permissions.includes('permits.reapprove')
  )) {
    log.access(true, 'canReapprove - Has re-approve permission', { 
      user: req.user.email,
      role: req.user.role
    });
    return next();
  }

  log.access(false, 'canReapprove - Access denied', { 
    user: req.user.email,
    role: req.user.role,
    permissions: req.user.permissions
  });
  return res.status(403).json({ 
    message: 'Access denied. You do not have permission to re-approve permits.',
    required: 'approvals.reapprove',
  });
};

// Check if user is Requestor (also includes Fireman and Admin)
const isRequestor = authorize('REQUESTOR', 'FIREMAN', 'SAFETY_OFFICER', 'ADMIN');

module.exports = {
  authenticate,
  authorize,
  checkPermission,
  checkAnyPermission,
  isAdmin,
  isFireman,
  isSafetyOfficer, // Alias for backward compatibility
  canApprove,
  canReapprove,
  isRequestor,
};
