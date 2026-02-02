// MIS Users Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { misPrisma } = require('../../config/mis-prisma');
const { misAuthMiddleware, misPermissionMiddleware } = require('../../middleware/mis-auth');

// All routes require authentication
router.use(misAuthMiddleware);

// Get all users
router.get('/', misPermissionMiddleware('mis.users.view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive, roleId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (roleId) where.roleId = roleId;

    const [users, total] = await Promise.all([
      misPrisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { role: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          department: true,
          role: true,
          isActive: true,
          isApproved: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      misPrisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users', error: error.message });
  }
});

// Get all roles
router.get('/roles', misPermissionMiddleware('mis.roles.view'), async (req, res) => {
  try {
    const roles = await misPrisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(roles.map(r => ({
      ...r,
      permissions: JSON.parse(r.permissions || '[]'),
    })));
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Failed to get roles', error: error.message });
  }
});

// Create user
router.post('/', misPermissionMiddleware('mis.users.create'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, department, roleId, isActive, isApproved } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await misPrisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        department,
        roleId,
        isActive: isActive ?? true,
        isApproved: isApproved ?? false,
        approvedBy: isApproved ? req.user.userId : null,
        approvedAt: isApproved ? new Date() : null,
      },
      include: { role: true },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

// Update user
router.put('/:id', misPermissionMiddleware('mis.users.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow direct password update here
    delete updates.password;

    const user = await misPrisma.user.update({
      where: { id },
      data: updates,
      include: { role: true },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

// Approve user
router.post('/:id/approve', misPermissionMiddleware('mis.users.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await misPrisma.user.update({
      where: { id },
      data: {
        isApproved: true,
        approvedBy: req.user.userId,
        approvedAt: new Date(),
      },
      include: { role: true },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: 'Failed to approve user', error: error.message });
  }
});

// Reset user password
router.post('/:id/reset-password', misPermissionMiddleware('mis.users.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await misPrisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

// Delete user
router.delete('/:id', misPermissionMiddleware('mis.users.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await misPrisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

module.exports = router;
