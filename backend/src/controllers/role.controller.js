const { PrismaClient } = require('@prisma/client');
const { createAuditLog } = require('../services/audit.service');

const prisma = new PrismaClient();

// SIMPLIFIED permissions - Work Permit only (VMS uses role-based access)
const defaultPermissions = [
  // Dashboard
  { key: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
  { key: 'dashboard.stats', name: 'View Statistics', module: 'dashboard', action: 'stats' },
  
  // Permits
  { key: 'permits.view', name: 'View All Permits', module: 'permits', action: 'view' },
  { key: 'permits.view_own', name: 'View Own Permits', module: 'permits', action: 'view' },
  { key: 'permits.create', name: 'Create Permits', module: 'permits', action: 'create' },
  { key: 'permits.edit', name: 'Edit Permits', module: 'permits', action: 'edit' },
  { key: 'permits.delete', name: 'Delete Permits', module: 'permits', action: 'delete' },
  { key: 'permits.export', name: 'Export Permits', module: 'permits', action: 'export' },
  { key: 'permits.approve', name: 'Approve Permits', module: 'permits', action: 'approve' },
  
  // Workers
  { key: 'workers.view', name: 'View Workers', module: 'workers', action: 'view' },
  { key: 'workers.create', name: 'Create Workers', module: 'workers', action: 'create' },
  { key: 'workers.edit', name: 'Edit Workers', module: 'workers', action: 'edit' },
  { key: 'workers.delete', name: 'Delete Workers', module: 'workers', action: 'delete' },
  
  // Users
  { key: 'users.view', name: 'View Users', module: 'users', action: 'view' },
  { key: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
  { key: 'users.edit', name: 'Edit Users', module: 'users', action: 'edit' },
  { key: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
  
  // Roles
  { key: 'roles.view', name: 'View Roles', module: 'roles', action: 'view' },
  { key: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create' },
  { key: 'roles.edit', name: 'Edit Roles', module: 'roles', action: 'edit' },
  { key: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
  
  // Settings
  { key: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
  { key: 'settings.edit', name: 'Edit Settings', module: 'settings', action: 'edit' },
  
  // Audit
  { key: 'audit.view', name: 'View Audit Logs', module: 'audit', action: 'view' },
];

// Default roles - SIMPLIFIED (3 main roles only)
const defaultRoles = [
  {
    name: 'ADMIN',
    displayName: 'Administrator',
    description: 'Full system access',
    isSystem: true,
    permissions: defaultPermissions.map(p => p.key), // All permissions
    uiConfig: {
      theme: 'admin',
      primaryColor: '#3b82f6',
      showAllMenus: true,
    },
  },
  {
    name: 'FIREMAN',
    displayName: 'Fire Safety Officer',
    description: 'Approve and manage permits',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.stats',
      'permits.view', 'permits.export', 'permits.approve',
      'workers.view',
      'settings.view',
    ],
    uiConfig: {
      theme: 'fireman',
      primaryColor: '#ef4444',
    },
  },
  {
    name: 'REQUESTOR',
    displayName: 'Permit Requestor',
    description: 'Create and manage own permits',
    isSystem: true,
    permissions: [
      'dashboard.view',
      'permits.view_own', 'permits.create',
      'workers.view',
      'settings.view',
    ],
    uiConfig: {
      theme: 'requestor',
      primaryColor: '#10b981',
    },
  },
];

// Initialize roles and permissions (called on server startup)
const initializeRolesAndPermissions = async () => {
  try {
    console.log('🔄 Initializing roles and permissions...');
    
    // Create permissions if they don't exist
    for (const perm of defaultPermissions) {
      const existing = await prisma.permission.findUnique({
        where: { key: perm.key },
      });
      
      if (!existing) {
        await prisma.permission.create({
          data: {
            key: perm.key,
            name: perm.name,
            module: perm.module,
            action: perm.action,
          },
        });
      }
    }

    // Create default roles if they don't exist
    for (const role of defaultRoles) {
      const existing = await prisma.role.findUnique({
        where: { name: role.name },
      });

      if (!existing) {
        await prisma.role.create({
          data: {
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            isSystem: role.isSystem,
            permissions: JSON.stringify(role.permissions),
            uiConfig: JSON.stringify(role.uiConfig),
          },
        });
        console.log(`✅ Created role: ${role.name}`);
      }
    }

    // Migrate users without roleId
    const usersWithoutRole = await prisma.user.findMany({
      where: { roleId: null },
      select: { id: true, email: true },
    });

    if (usersWithoutRole.length > 0) {
      const requestorRole = await prisma.role.findUnique({
        where: { name: 'REQUESTOR' },
      });

      if (requestorRole) {
        for (const user of usersWithoutRole) {
          await prisma.user.update({
            where: { id: user.id },
            data: { roleId: requestorRole.id },
          });
          console.log(`✅ Assigned REQUESTOR role to: ${user.email}`);
        }
      }
    }

    console.log('✅ Roles and permissions initialized');
  } catch (error) {
    console.error('Error initializing roles:', error.message);
  }
};

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Parse JSON fields
    const parsedRoles = roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]'),
      uiConfig: JSON.parse(role.uiConfig || '{}'),
      userCount: role._count.users,
    }));

    res.json({ roles: parsedRoles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Error fetching roles' });
  }
};

// Get role by ID
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({
      role: {
        ...role,
        permissions: JSON.parse(role.permissions || '[]'),
        uiConfig: JSON.parse(role.uiConfig || '{}'),
      },
    });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ message: 'Error fetching role' });
  }
};

// Create role
const createRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions, uiConfig } = req.body;

    // Check if role exists
    const existing = await prisma.role.findUnique({
      where: { name: name.toUpperCase() },
    });

    if (existing) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        displayName,
        description,
        permissions: JSON.stringify(permissions || []),
        uiConfig: JSON.stringify(uiConfig || {}),
      },
    });

    // Audit log
    try {
      await createAuditLog({
        userId: req.user.id,
        action: 'ROLE_CREATED',
        entity: 'Role',
        entityId: role.id,
        newValue: { name: role.name, displayName },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError.message);
    }

    res.status(201).json({
      message: 'Role created successfully',
      role: {
        ...role,
        permissions: JSON.parse(role.permissions || '[]'),
        uiConfig: JSON.parse(role.uiConfig || '{}'),
      },
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ message: 'Error creating role' });
  }
};

// Update role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, description, permissions, uiConfig } = req.body;

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        displayName,
        description,
        permissions: JSON.stringify(permissions || []),
        uiConfig: JSON.stringify(uiConfig || {}),
      },
    });

    // Audit log
    try {
      await createAuditLog({
        userId: req.user.id,
        action: 'ROLE_UPDATED',
        entity: 'Role',
        entityId: role.id,
        newValue: { displayName, permissions },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError.message);
    }

    res.json({
      message: 'Role updated successfully',
      role: {
        ...role,
        permissions: JSON.parse(role.permissions || '[]'),
        uiConfig: JSON.parse(role.uiConfig || '{}'),
      },
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Error updating role' });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ message: 'Cannot delete system roles' });
    }

    if (role._count.users > 0) {
      return res.status(400).json({ message: 'Cannot delete role with assigned users' });
    }

    await prisma.role.delete({ where: { id } });

    // Audit log
    try {
      await createAuditLog({
        userId: req.user.id,
        action: 'ROLE_DELETED',
        entity: 'Role',
        entityId: id,
        oldValue: { name: role.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError.message);
    }

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ message: 'Error deleting role' });
  }
};

// Get all permissions (for role editing UI)
const getAllPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Group by module
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {});

    res.json({ permissions, grouped });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Error fetching permissions' });
  }
};

// Assign role to user
const assignRoleToUser = async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { role: true },
    });

    // Audit log
    try {
      await createAuditLog({
        userId: req.user.id,
        action: 'ROLE_ASSIGNED',
        entity: 'User',
        entityId: userId,
        newValue: { roleId, roleName: role.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError.message);
    }

    res.json({
      message: 'Role assigned successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name,
      },
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ message: 'Error assigning role' });
  }
};

module.exports = {
  initializeRolesAndPermissions,
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  assignRoleToUser,
  defaultPermissions,
};
