const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createAuditLog } = require('../services/audit.service');
const { sendWelcomeEmail } = require('../services/otp.service');

const prisma = new PrismaClient();

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isApproved: true, // Only show approved users by default
      isActive: true,   // Only show active users (not deleted)
    };
    
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    
    // Filter by role name
    if (role) {
      where.role = {
        name: role,
      };
    }
    
    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'all') {
      delete where.isApproved;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          department: true,
          phone: true,
          isActive: true,
          isApproved: true,
          requestedRole: true,
          approvedAt: true,
          createdAt: true,
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
          _count: {
            select: { permitRequests: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get pending approval users
const getPendingUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isApproved: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        phone: true,
        requestedRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users, count: users.length });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ message: 'Error fetching pending users' });
  }
};

// Approve user registration
const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isApproved) {
      return res.status(400).json({ message: 'User is already approved' });
    }

    // Find the requested role
    let roleRecord = null;
    if (user.requestedRole) {
      roleRecord = await prisma.role.findUnique({
        where: { name: user.requestedRole },
      });
    }

    // Update user - approve and assign requested role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isApproved: true,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        roleId: roleRecord?.id || user.roleId,
        requestedRole: null, // Clear requested role after approval
      },
      include: {
        role: true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'USER_APPROVED',
      entity: 'User',
      entityId: id,
      newValue: { 
        email: user.email, 
        approvedRole: roleRecord?.name || 'REQUESTOR',
        approvedBy: req.user.email,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ 
      message: 'User approved successfully', 
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role?.name,
      },
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: 'Error approving user' });
  }
};

// Reject user registration
const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isApproved) {
      return res.status(400).json({ message: 'Cannot reject an already approved user' });
    }

    // Update user - mark as rejected (deactivate)
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        rejectionReason: reason || 'Registration rejected by admin',
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'USER_REJECTED',
      entity: 'User',
      entityId: id,
      newValue: { 
        email: user.email, 
        reason: reason || 'No reason provided',
        rejectedBy: req.user.email,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'User registration rejected' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ message: 'Error rejecting user' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        phone: true,
        isActive: true,
        isApproved: true,
        requestedRole: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        _count: {
          select: { permitRequests: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

// Create user (Admin only)
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department, phone } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Find role
    const roleRecord = await prisma.role.findUnique({
      where: { name: role || 'REQUESTOR' },
    });

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleId: roleRecord?.id,
        department,
        phone,
        isApproved: true, // Admin-created users are auto-approved
        approvedBy: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        role: true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      newValue: { email: user.email, role: user.role?.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Send welcome email with login credentials to the new user
    try {
      await sendWelcomeEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || role || 'REQUESTOR',
        requiresApproval: false, // Admin-created users are auto-approved
        password: password, // Send plain password in welcome email
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Don't fail user creation if email fails
    }

    res.status(201).json({ 
      message: 'User created successfully. Welcome email sent.', 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, department, phone, isActive } = req.body;

    const oldUser = await prisma.user.findUnique({ 
      where: { id },
      include: { role: true },
    });
    
    if (!oldUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only admin can change roles
    if (role && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can change roles' });
    }

    // Find new role if provided
    let roleId = oldUser.roleId;
    if (role && req.user.role === 'ADMIN') {
      const roleRecord = await prisma.role.findUnique({
        where: { name: role },
      });
      if (roleRecord) {
        roleId = roleRecord.id;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        department,
        phone,
        ...(req.user.role === 'ADMIN' && { roleId, isActive }),
      },
      include: {
        role: true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      oldValue: { firstName: oldUser.firstName, lastName: oldUser.lastName, role: oldUser.role?.name },
      newValue: { firstName: user.firstName, lastName: user.lastName, role: user.role?.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ 
      message: 'User updated successfully', 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name,
        department: user.department,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// Delete user (Admin only) - HARD DELETE
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ 
      where: { id },
      include: {
        _count: {
          select: { permitRequests: true }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Store user info for audit log before deletion
    const deletedUserInfo = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.roleId,
      permitCount: user._count.permitRequests,
    };

    // Use transaction to delete user and their related records
    await prisma.$transaction(async (tx) => {
      // First, delete all permit approvals for user's permits
      const userPermits = await tx.permitRequest.findMany({
        where: { createdBy: id },
        select: { id: true }
      });
      
      const permitIds = userPermits.map(p => p.id);
      
      if (permitIds.length > 0) {
        // Delete approvals for user's permits
        await tx.permitApproval.deleteMany({
          where: { permitId: { in: permitIds } }
        });
        
        // Delete user's permits
        await tx.permitRequest.deleteMany({
          where: { createdBy: id }
        });
      }
      
      // Finally delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'USER_DELETED_PERMANENT',
      entity: 'User',
      entityId: id,
      oldValue: deletedUserInfo,
      newValue: null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ 
      message: 'User deleted permanently', 
      deleted: true,
      permitsDeleted: deletedUserInfo.permitCount 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// Get dashboard stats for admin
const getUserStats = async (req, res) => {
  try {
    const [totalUsers, pendingApprovals, activeUsers, usersByRole] = await Promise.all([
      prisma.user.count({ where: { isApproved: true } }),
      prisma.user.count({ where: { isApproved: false, isActive: true } }),
      prisma.user.count({ where: { isActive: true, isApproved: true } }),
      prisma.user.groupBy({
        by: ['roleId'],
        where: { isApproved: true, isActive: true },
        _count: true,
      }),
    ]);

    // Get role names for the grouped data
    const roles = await prisma.role.findMany();
    const roleMap = roles.reduce((acc, role) => {
      acc[role.id] = role.name;
      return acc;
    }, {});

    const usersByRoleFormatted = usersByRole.map(item => ({
      role: roleMap[item.roleId] || 'Unknown',
      count: item._count,
    }));

    res.json({
      totalUsers,
      pendingApprovals,
      activeUsers,
      usersByRole: usersByRoleFormatted,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Error fetching user stats' });
  }
};

module.exports = {
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
};
