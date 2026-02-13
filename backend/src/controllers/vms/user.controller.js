// VMS User Management Controller
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Get all VMS users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.vMSUser.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        vmsRole: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    // Remove passwords from response
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      department: user.department,
      isActive: user.isActive,
      isApproved: user.isApproved,
      isFromWorkPermit: user.isFromWorkPermit,
      companyId: user.companyId,
      company: user.company,
      vmsRoleId: user.vmsRoleId,
      vmsRole: user.vmsRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json({
      success: true,
      users: sanitizedUsers,
    });
  } catch (error) {
    console.error('Error fetching VMS users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.vMSUser.findUnique({
      where: { id },
      include: {
        company: true,
        vmsRole: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove password from response
    const { password, ...sanitizedUser } = user;

    res.json({
      success: true,
      user: sanitizedUser,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};

// Create new VMS user
exports.createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      department,
      companyId,
      vmsRoleId,
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        message: 'Email, password, first name, and last name are required' 
      });
    }

    // Check if email already exists
    const existingUser = await prisma.vMSUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.vMSUser.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        department,
        companyId: companyId || null,
        vmsRoleId: vmsRoleId || null,
        isActive: true,
        isApproved: true,
        isFromWorkPermit: false,
      },
      include: {
        company: true,
        vmsRole: true,
      },
    });

    // Remove password from response
    const { password: _, ...sanitizedUser } = user;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: sanitizedUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Don't allow updating certain fields
    delete updateData.id;
    delete updateData.email; // Email cannot be changed
    delete updateData.createdAt;
    delete updateData.isFromWorkPermit;

    // If password is being updated, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const user = await prisma.vMSUser.update({
      where: { id },
      data: updateData,
      include: {
        company: true,
        vmsRole: true,
      },
    });

    // Remove password from response
    const { password, ...sanitizedUser } = user;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: sanitizedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

// Toggle user active status
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.vMSUser.update({
      where: { id },
      data: { isActive },
    });

    res.json({
      success: true,
      message: isActive ? 'User activated' : 'User deactivated',
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.vMSUser.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deleting Work Permit SSO users
    if (user.isFromWorkPermit) {
      return res.status(400).json({ 
        message: 'Cannot delete Work Permit admin users. Remove VMS access from Work Permit settings instead.' 
      });
    }

    await prisma.vMSUser.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

// Get users by company
exports.getUsersByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const users = await prisma.vMSUser.findMany({
      where: { companyId },
      include: {
        company: true,
        vmsRole: true,
      },
    });

    const sanitizedUsers = users.map(user => {
      const { password, ...rest } = user;
      return rest;
    });

    res.json({
      success: true,
      users: sanitizedUsers,
    });
  } catch (error) {
    console.error('Error fetching users by company:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};
