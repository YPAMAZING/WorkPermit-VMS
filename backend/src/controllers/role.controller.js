const { PrismaClient } = require('@prisma/client');
const { createAuditLog } = require('../services/audit.service');

const prisma = new PrismaClient();

// Default permissions list
const defaultPermissions = [
  // Dashboard
  { key: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view' },
  { key: 'dashboard.stats', name: 'View Statistics', module: 'dashboard', action: 'view' },
  
  // Permits
  { key: 'permits.view', name: 'View Permits', module: 'permits', action: 'view' },
  { key: 'permits.view_all', name: 'View All Permits', module: 'permits', action: 'view' },
  { key: 'permits.view_own', name: 'View Own Permits', module: 'permits', action: 'view' },
  { key: 'permits.create', name: 'Create Permits', module: 'permits', action: 'create' },
  { key: 'permits.edit', name: 'Edit Permits', module: 'permits', action: 'edit' },
  { key: 'permits.edit_own', name: 'Edit Own Permits', module: 'permits', action: 'edit' },
  { key: 'permits.delete', name: 'Delete Permits', module: 'permits', action: 'delete' },
  { key: 'permits.export', name: 'Export Permits PDF', module: 'permits', action: 'export' },
  { key: 'permits.extend', name: 'Extend Permits', module: 'permits', action: 'edit' },
  { key: 'permits.revoke', name: 'Revoke Permits', module: 'permits', action: 'edit' },
  { key: 'permits.close', name: 'Close Permits', module: 'permits', action: 'edit' },
  { key: 'permits.reapprove', name: 'Re-Approve Revoked Permits', module: 'permits', action: 'edit' },
  { key: 'permits.transfer', name: 'Transfer Permits', module: 'permits', action: 'edit' },
  
  // Approvals
  { key: 'approvals.view', name: 'View Approvals', module: 'approvals', action: 'view' },
  { key: 'approvals.approve', name: 'Approve/Reject Permits', module: 'approvals', action: 'approve' },
  { key: 'approvals.sign', name: 'Sign Approvals', module: 'approvals', action: 'approve' },
  { key: 'approvals.reapprove', name: 'Re-Approve Revoked Permits', module: 'approvals', action: 'approve' },
  
  // Workers
  { key: 'workers.view', name: 'View Workers', module: 'workers', action: 'view' },
  { key: 'workers.create', name: 'Create Workers', module: 'workers', action: 'create' },
  { key: 'workers.edit', name: 'Edit Workers', module: 'workers', action: 'edit' },
  { key: 'workers.delete', name: 'Delete Workers', module: 'workers', action: 'delete' },
  { key: 'workers.qr', name: 'Generate Worker QR', module: 'workers', action: 'view' },
  
  // Users
  { key: 'users.view', name: 'View Users', module: 'users', action: 'view' },
  { key: 'users.create', name: 'Create Users', module: 'users', action: 'create' },
  { key: 'users.edit', name: 'Edit Users', module: 'users', action: 'edit' },
  { key: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete' },
  { key: 'users.assign_role', name: 'Assign Roles to Users', module: 'users', action: 'edit' },
  
  // Roles
  { key: 'roles.view', name: 'View Roles', module: 'roles', action: 'view' },
  { key: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create' },
  { key: 'roles.edit', name: 'Edit Roles', module: 'roles', action: 'edit' },
  { key: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete' },
  
  // ============ MIS SYSTEM PERMISSIONS ============
  // MIS Access Control
  { key: 'mis.access', name: 'Access MIS System', module: 'mis', action: 'view' },
  { key: 'mis.dashboard', name: 'View MIS Dashboard', module: 'mis', action: 'view' },
  { key: 'mis.settings', name: 'Manage MIS Settings', module: 'mis', action: 'edit' },
  
  // Meter Readings (Site Engineer)
  { key: 'meters.view', name: 'View Meter Readings', module: 'meters', action: 'view' },
  { key: 'meters.view_all', name: 'View All Meter Readings', module: 'meters', action: 'view' },
  { key: 'meters.view_own', name: 'View Own Meter Readings', module: 'meters', action: 'view' },
  { key: 'meters.create', name: 'Create Meter Readings', module: 'meters', action: 'create' },
  { key: 'meters.edit', name: 'Edit Meter Readings', module: 'meters', action: 'edit' },
  { key: 'meters.edit_own', name: 'Edit Own Meter Readings', module: 'meters', action: 'edit' },
  { key: 'meters.delete', name: 'Delete Meter Readings', module: 'meters', action: 'delete' },
  { key: 'meters.delete_own', name: 'Delete Own Meter Readings', module: 'meters', action: 'delete' },
  { key: 'meters.verify', name: 'Verify Meter Readings', module: 'meters', action: 'approve' },
  { key: 'meters.export', name: 'Export Meter Data', module: 'meters', action: 'export' },
  { key: 'meters.import', name: 'Bulk Import Readings', module: 'meters', action: 'create' },
  { key: 'meters.analytics', name: 'View Meter Analytics', module: 'meters', action: 'view' },
  { key: 'meters.ocr', name: 'Use OCR Image Upload', module: 'meters', action: 'create' },
  
  // Transmitter Data
  { key: 'transmitters.view', name: 'View Transmitter Data', module: 'transmitters', action: 'view' },
  { key: 'transmitters.view_all', name: 'View All Transmitter Data', module: 'transmitters', action: 'view' },
  { key: 'transmitters.create', name: 'Create Transmitter Readings', module: 'transmitters', action: 'create' },
  { key: 'transmitters.edit', name: 'Edit Transmitter Data', module: 'transmitters', action: 'edit' },
  { key: 'transmitters.delete', name: 'Delete Transmitter Data', module: 'transmitters', action: 'delete' },
  
  // MIS Reports & Analytics
  { key: 'reports.view', name: 'View Reports', module: 'reports', action: 'view' },
  { key: 'reports.create', name: 'Generate Reports', module: 'reports', action: 'create' },
  { key: 'reports.export', name: 'Export Reports', module: 'reports', action: 'export' },
  { key: 'reports.schedule', name: 'Schedule Reports', module: 'reports', action: 'edit' },
  
  // MIS User Management (separate from Work Permit)
  { key: 'mis_users.view', name: 'View MIS Users', module: 'mis_users', action: 'view' },
  { key: 'mis_users.create', name: 'Create MIS Users', module: 'mis_users', action: 'create' },
  { key: 'mis_users.edit', name: 'Edit MIS Users', module: 'mis_users', action: 'edit' },
  { key: 'mis_users.delete', name: 'Delete MIS Users', module: 'mis_users', action: 'delete' },
  { key: 'mis_users.assign_role', name: 'Assign MIS Roles', module: 'mis_users', action: 'edit' },
  
  // MIS Role Management
  { key: 'mis_roles.view', name: 'View MIS Roles', module: 'mis_roles', action: 'view' },
  { key: 'mis_roles.create', name: 'Create MIS Roles', module: 'mis_roles', action: 'create' },
  { key: 'mis_roles.edit', name: 'Edit MIS Roles', module: 'mis_roles', action: 'edit' },
  { key: 'mis_roles.delete', name: 'Delete MIS Roles', module: 'mis_roles', action: 'delete' },
  
  // Settings
  { key: 'settings.view', name: 'View Settings', module: 'settings', action: 'view' },
  { key: 'settings.edit', name: 'Edit Settings', module: 'settings', action: 'edit' },
  { key: 'settings.system', name: 'System Settings', module: 'settings', action: 'edit' },
  
  // Audit
  { key: 'audit.view', name: 'View Audit Logs', module: 'audit', action: 'view' },
];

// Default roles
const defaultRoles = [
  {
    name: 'ADMIN',
    displayName: 'Administrator',
    description: 'Full system access with all permissions',
    isSystem: true,
    permissions: defaultPermissions.map(p => p.key),
    uiConfig: {
      theme: 'default',
      sidebarColor: 'slate',
      accentColor: 'emerald',
      showAllMenus: true,
      dashboardWidgets: ['stats', 'charts', 'activity', 'pending'],
    },
  },
  {
    name: 'FIREMAN',
    displayName: 'Fireman',
    description: 'Can approve/reject permits, re-approve revoked permits, and manage workers. Can also verify MIS readings.',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.stats',
      'permits.view', 'permits.view_all', 'permits.export', 'permits.extend', 'permits.revoke', 'permits.close', 'permits.reapprove',
      'approvals.view', 'approvals.approve', 'approvals.sign', 'approvals.reapprove',
      'workers.view', 'workers.create', 'workers.edit', 'workers.qr',
      // MIS permissions for Fireman
      'mis.access', 'mis.dashboard',
      'meters.view', 'meters.view_all', 'meters.verify', 'meters.export', 'meters.analytics',
      'transmitters.view', 'transmitters.view_all',
      'reports.view', 'reports.export',
      'settings.view',
    ],
    uiConfig: {
      theme: 'default',
      sidebarColor: 'slate',
      accentColor: 'blue',
      showAllMenus: false,
      dashboardWidgets: ['stats', 'pending', 'activity'],
    },
  },
  {
    name: 'REQUESTOR',
    displayName: 'Requestor',
    description: 'Can create and view own permits',
    isSystem: true,
    permissions: [
      'dashboard.view',
      'permits.view', 'permits.view_own', 'permits.create', 'permits.edit_own', 'permits.export',
      'workers.view', 'workers.qr',
      'settings.view',
    ],
    uiConfig: {
      theme: 'default',
      sidebarColor: 'slate',
      accentColor: 'primary',
      showAllMenus: false,
      dashboardWidgets: ['stats', 'activity'],
    },
  },
  {
    name: 'SITE_ENGINEER',
    displayName: 'Site Engineer',
    description: 'Can upload meter readings, use OCR, and view analytics dashboard',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.stats',
      'mis.access', 'mis.dashboard',
      'meters.view', 'meters.view_own', 'meters.create', 'meters.edit_own', 'meters.delete_own', 'meters.export', 'meters.ocr', 'meters.analytics',
      'transmitters.view', 'transmitters.create', 'transmitters.edit',
      'reports.view', 'reports.export',
      'settings.view',
    ],
    uiConfig: {
      theme: 'default',
      sidebarColor: 'slate',
      accentColor: 'orange',
      showAllMenus: false,
      dashboardWidgets: ['stats', 'charts', 'meters'],
      showMeterModule: true,
      showMIS: true,
    },
  },
  {
    name: 'MIS_ADMIN',
    displayName: 'MIS Administrator',
    description: 'Full access to MIS system including user and role management',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.stats',
      'mis.access', 'mis.dashboard', 'mis.settings',
      'meters.view', 'meters.view_all', 'meters.create', 'meters.edit', 'meters.delete', 'meters.verify', 'meters.export', 'meters.import', 'meters.ocr', 'meters.analytics',
      'transmitters.view', 'transmitters.view_all', 'transmitters.create', 'transmitters.edit', 'transmitters.delete',
      'reports.view', 'reports.create', 'reports.export', 'reports.schedule',
      'mis_users.view', 'mis_users.create', 'mis_users.edit', 'mis_users.delete', 'mis_users.assign_role',
      'mis_roles.view', 'mis_roles.create', 'mis_roles.edit', 'mis_roles.delete',
      'settings.view', 'settings.edit',
      'audit.view',
    ],
    uiConfig: {
      theme: 'default',
      sidebarColor: 'purple',
      accentColor: 'purple',
      showAllMenus: true,
      dashboardWidgets: ['stats', 'charts', 'meters', 'activity'],
      showMIS: true,
      showMISAdmin: true,
    },
  },
  {
    name: 'MIS_VERIFIER',
    displayName: 'MIS Verifier',
    description: 'Can view and verify meter readings submitted by Site Engineers',
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.stats',
      'mis.access', 'mis.dashboard',
      'meters.view', 'meters.view_all', 'meters.verify', 'meters.export', 'meters.analytics',
      'transmitters.view', 'transmitters.view_all',
      'reports.view', 'reports.export',
      'settings.view',
    ],
    uiConfig: {
      theme: 'default',
      sidebarColor: 'slate',
      accentColor: 'green',
      showAllMenus: false,
      dashboardWidgets: ['stats', 'charts', 'pending'],
      showMIS: true,
    },
  },
  {
    name: 'MIS_VIEWER',
    displayName: 'MIS Viewer',
    description: 'Read-only access to MIS data and reports',
    isSystem: true,
    permissions: [
      'dashboard.view',
      'mis.access', 'mis.dashboard',
      'meters.view', 'meters.view_all', 'meters.analytics',
      'transmitters.view', 'transmitters.view_all',
      'reports.view',
      'settings.view',
    ],
    uiConfig: {
      theme: 'default',
      sidebarColor: 'slate',
      accentColor: 'blue',
      showAllMenus: false,
      dashboardWidgets: ['stats', 'charts'],
      showMIS: true,
    },
  },
];

// Initialize permissions and roles
const initializeRolesAndPermissions = async () => {
  try {
    // Create permissions if they don't exist
    for (const perm of defaultPermissions) {
      await prisma.permission.upsert({
        where: { key: perm.key },
        update: {},
        create: perm,
      });
    }

    // Create default roles if they don't exist
    for (const role of defaultRoles) {
      const existingRole = await prisma.role.findUnique({
        where: { name: role.name },
      });

      if (!existingRole) {
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
      }
    }

    // Migrate existing users to new role system
    const usersWithoutRole = await prisma.user.findMany({
      where: { roleId: null },
    });

    for (const user of usersWithoutRole) {
      // Map old role field to new roleId
      const roleName = user.role || 'REQUESTOR';
      const role = await prisma.role.findUnique({
        where: { name: roleName },
      });

      if (role) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: role.id },
        });
      }
    }

    console.log('✅ Roles and permissions initialized');
  } catch (error) {
    console.error('Error initializing roles:', error);
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

    const rolesWithParsed = roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]'),
      uiConfig: JSON.parse(role.uiConfig || '{}'),
      userCount: role._count.users,
    }));

    res.json({ roles: rolesWithParsed });
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
    const user = req.user;

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.toUpperCase() },
    });

    if (existingRole) {
      return res.status(400).json({ message: 'Role name already exists' });
    }

    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        displayName,
        description,
        permissions: JSON.stringify(permissions || []),
        uiConfig: JSON.stringify(uiConfig || {}),
        isSystem: false,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'ROLE_CREATED',
      entity: 'Role',
      entityId: role.id,
      newValue: { name: role.name, permissions },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      message: 'Role created successfully',
      role: {
        ...role,
        permissions: JSON.parse(role.permissions),
        uiConfig: JSON.parse(role.uiConfig),
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
    const user = req.user;

    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        displayName,
        description,
        permissions: permissions ? JSON.stringify(permissions) : undefined,
        uiConfig: uiConfig ? JSON.stringify(uiConfig) : undefined,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'ROLE_UPDATED',
      entity: 'Role',
      entityId: role.id,
      oldValue: { permissions: JSON.parse(existingRole.permissions) },
      newValue: { permissions },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      message: 'Role updated successfully',
      role: {
        ...role,
        permissions: JSON.parse(role.permissions),
        uiConfig: JSON.parse(role.uiConfig),
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
    const user = req.user;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ message: 'Cannot delete system roles' });
    }

    if (role._count.users > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete role with assigned users. Reassign users first.' 
      });
    }

    await prisma.role.delete({
      where: { id },
    });

    await createAuditLog({
      userId: user.id,
      action: 'ROLE_DELETED',
      entity: 'Role',
      entityId: id,
      oldValue: { name: role.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ message: 'Error deleting role' });
  }
};

// Get all permissions
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
    const currentUser = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { roleId },
    });

    await createAuditLog({
      userId: currentUser.id,
      action: 'ROLE_ASSIGNED',
      entity: 'User',
      entityId: userId,
      newValue: { roleId, roleName: role.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Role assigned successfully' });
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
