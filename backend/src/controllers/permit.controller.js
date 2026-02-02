const { PrismaClient } = require('@prisma/client');
const { createAuditLog } = require('../services/audit.service');
const { transformPermitResponse, transformPermitForStorage } = require('../utils/arrayHelpers');
const { notifyFiremenNewPermit } = require('../services/otp.service');

const prisma = new PrismaClient();

// Helper to transform multiple permits
const transformPermits = (permits) => permits.map(transformPermitResponse);

// Month abbreviations for permit number
const monthAbbreviations = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Generate permit number in format: RGDGTLWP JAN - 0001
const generatePermitNumber = async (tx) => {
  const now = new Date();
  const month = monthAbbreviations[now.getMonth()];
  const year = now.getFullYear();
  
  // Find ALL permits for this month (both old format and new format)
  // Old format: RGDGTLWP JAN - 0001
  // New format: RGDGTLWP JAN 2026 - 0001
  const allPermitsThisMonth = await tx.permitRequest.findMany({
    where: {
      permitNumber: {
        contains: `RGDGTLWP ${month}`,
      },
    },
    select: {
      permitNumber: true,
    },
  });
  
  let maxNumber = 0;
  
  // Find the highest number from all permits this month
  for (const permit of allPermitsThisMonth) {
    const match = permit.permitNumber.match(/- (\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  const nextNumber = maxNumber + 1;
  
  // Generate sequential number (padded to 4 digits)
  const sequentialNumber = String(nextNumber).padStart(4, '0');
  
  // Format: RGDGTLWP JAN 2026 - 0001
  return `RGDGTLWP ${month} ${year} - ${sequentialNumber}`;
};

// Get all permits
const getAllPermits = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      workType, 
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const user = req.user;

    // Build where clause based on role
    const where = {};
    
    // Requestors can only see their own permits
    if (user.role === 'REQUESTOR') {
      where.createdBy = user.id;
    }

    if (status) {
      where.status = status;
    }

    if (workType) {
      where.workType = workType;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    const [permits, total] = await Promise.all([
      prisma.permitRequest.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
            },
          },
          approvals: {
            select: {
              id: true,
              decision: true,
              approverName: true,
              comment: true,
              approvedAt: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.permitRequest.count({ where }),
    ]);

    res.json({
      permits: transformPermits(permits),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get permits error:', error);
    res.status(500).json({ message: 'Error fetching permits' });
  }
};

// Get permit by ID
const getPermitById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const permit = await prisma.permitRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        approvals: {
          include: {
            permit: false,
          },
        },
      },
    });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    // Requestors can only view their own permits
    if (user.role === 'REQUESTOR' && permit.createdBy !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ permit: transformPermitResponse(permit) });
  } catch (error) {
    console.error('Get permit error:', error);
    res.status(500).json({ message: 'Error fetching permit' });
  }
};

// Create permit
const createPermit = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      workType,
      startDate,
      endDate,
      priority,
      hazards,
      precautions,
      equipment,
      workers,
      vendorDetails,
      contractorName,
      contractorPhone,
      companyName,
      timezone,
    } = req.body;

    const user = req.user;

    // Transform arrays to JSON strings for storage
    const permitData = transformPermitForStorage({
      title,
      description,
      location,
      workType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      priority: priority || 'MEDIUM',
      hazards: hazards || [],
      precautions: precautions || [],
      equipment: equipment || [],
      workers: workers || [],
      vendorDetails: vendorDetails || null,
      contractorName: contractorName || vendorDetails?.vendorName || null,
      contractorPhone: contractorPhone || vendorDetails?.vendorPhone || null,
      companyName: companyName || vendorDetails?.vendorCompany || null,
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'PENDING',
      createdBy: user.id,
    });

    // Create permit with automatic approval record
    const permit = await prisma.$transaction(async (tx) => {
      // Generate custom permit number
      const permitNumber = await generatePermitNumber(tx);
      
      // Create permit request with custom permit number
      const newPermit = await tx.permitRequest.create({
        data: {
          ...permitData,
          permitNumber,
        },
      });

      // Automatically create approval record
      await tx.permitApproval.create({
        data: {
          permitId: newPermit.id,
          approverRole: 'FIREMAN',
          decision: 'PENDING',
        },
      });

      return newPermit;
    });

    // Fetch complete permit with relations
    const completePermit = await prisma.permitRequest.findUnique({
      where: { id: permit.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        approvals: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PERMIT_CREATED',
      entity: 'PermitRequest',
      entityId: permit.id,
      newValue: { title, workType, status: 'PENDING' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Notify all Firemen about the new permit
    try {
      const firemen = await prisma.user.findMany({
        where: {
          role: { name: 'FIREMAN' },
          isActive: true,
          isApproved: true,
        },
        select: { email: true },
      });
      const firemanEmails = firemen.map(f => f.email);
      if (firemanEmails.length > 0) {
        await notifyFiremenNewPermit({
          title,
          workType,
          location,
          startDate,
          endDate,
          priority: priority || 'MEDIUM',
          createdBy: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          },
        }, firemanEmails);
      }
    } catch (notifyError) {
      console.error('Failed to notify firemen:', notifyError);
    }

    res.status(201).json({
      message: 'Permit request created successfully',
      permit: transformPermitResponse(completePermit),
    });
  } catch (error) {
    console.error('Create permit error:', error);
    res.status(500).json({ message: 'Error creating permit' });
  }
};

// Update permit
const updatePermit = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const {
      title,
      description,
      location,
      workType,
      startDate,
      endDate,
      priority,
      hazards,
      precautions,
      equipment,
      workers,
      vendorDetails,
      contractorName,
      contractorPhone,
      companyName,
      timezone,
    } = req.body;

    const existingPermit = await prisma.permitRequest.findUnique({
      where: { id },
    });

    if (!existingPermit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    // Only creator can update, and only if still pending
    if (user.role === 'REQUESTOR' && existingPermit.createdBy !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (existingPermit.status !== 'PENDING' && user.role !== 'ADMIN') {
      return res.status(400).json({ 
        message: 'Cannot update permit that is already processed' 
      });
    }

    // Build update data
    const updateData = transformPermitForStorage({
      title,
      description,
      location,
      workType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      priority,
      hazards,
      precautions,
      equipment,
      workers,
      vendorDetails,
      contractorName: contractorName || vendorDetails?.vendorName,
      contractorPhone: contractorPhone || vendorDetails?.vendorPhone,
      companyName: companyName || vendorDetails?.vendorCompany,
      timezone,
    });

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const permit = await prisma.permitRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        approvals: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PERMIT_UPDATED',
      entity: 'PermitRequest',
      entityId: id,
      oldValue: { title: existingPermit.title, workType: existingPermit.workType },
      newValue: { title: permit.title, workType: permit.workType },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Permit updated successfully', permit: transformPermitResponse(permit) });
  } catch (error) {
    console.error('Update permit error:', error);
    res.status(500).json({ message: 'Error updating permit' });
  }
};

// Delete permit
const deletePermit = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const existingPermit = await prisma.permitRequest.findUnique({
      where: { id },
    });

    if (!existingPermit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    // Admin and Fireman can delete any permit
    // Requestor can only delete their own pending permits
    if (user.role === 'REQUESTOR') {
      if (existingPermit.createdBy !== user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (existingPermit.status !== 'PENDING') {
        return res.status(400).json({ 
          message: 'Cannot delete permit that is already processed' 
        });
      }
    }
    
    // For roles other than Admin and FIREMAN, restrict deletion
    if (!['ADMIN', 'FIREMAN'].includes(user.role) && user.role !== 'REQUESTOR') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.permitRequest.delete({
      where: { id },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PERMIT_DELETED',
      entity: 'PermitRequest',
      entityId: id,
      oldValue: { title: existingPermit.title, status: existingPermit.status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Permit deleted successfully' });
  } catch (error) {
    console.error('Delete permit error:', error);
    res.status(500).json({ message: 'Error deleting permit' });
  }
};

// Get work types - Sorted Alphabetically by label
const getWorkTypes = async (req, res) => {
  const workTypes = [
    { value: 'CHEMICAL', label: 'Chemical Handling Permit', abbr: 'CHP', icon: 'flask', color: '#ef4444' },
    { value: 'COLD_WORK', label: 'Cold Work Permit', abbr: 'CWP', icon: 'thermometer', color: '#06b6d4' },
    { value: 'CONFINED_SPACE', label: 'Confined Space Permit', abbr: 'CSP', icon: 'box', color: '#a855f7' },
    { value: 'ELECTRICAL', label: 'Electrical Work Permit', abbr: 'EWP', icon: 'zap', color: '#eab308' },
    { value: 'ENERGIZE', label: 'Energize Permit', abbr: 'EOMP', icon: 'zap', color: '#10b981' },
    { value: 'EXCAVATION', label: 'Excavation Work Permit', abbr: 'EXP', icon: 'shovel', color: '#f59e0b' },
    { value: 'GENERAL', label: 'General Permit', abbr: 'GP', icon: 'file-text', color: '#6b7280' },
    { value: 'HOT_WORK', label: 'Hot Work Permit', abbr: 'HWP', icon: 'flame', color: '#f97316' },
    { value: 'PRESSURE_TESTING', label: 'Hydro Pressure Testing', abbr: 'HPT', icon: 'droplets', color: '#0ea5e9' },
    { value: 'LIFTING', label: 'Lifting Permit', abbr: 'LP', icon: 'weight', color: '#14b8a6' },
    { value: 'LOTO', label: 'LOTO Permit', abbr: 'LOTO', icon: 'lock', color: '#6366f1' },
    { value: 'RADIATION', label: 'Radiation Work Permit', abbr: 'RWP', icon: 'radiation', color: '#84cc16' },
    { value: 'SWMS', label: 'Safe Work Method Statement', abbr: 'SWMS', icon: 'shield', color: '#f43f5e' },
    { value: 'VEHICLE', label: 'Vehicle Work Permit', abbr: 'VWP', icon: 'truck', color: '#64748b' },
    { value: 'WORKING_AT_HEIGHT', label: 'Work Height Permit', abbr: 'WHP', icon: 'arrow-up', color: '#3b82f6' },
  ];

  res.json({ workTypes });
};

// Get public permit info (for QR code scanning)
const getPublicPermitInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const permit = await prisma.permitRequest.findUnique({
      where: { id },
      select: {
        id: true,
        permitNumber: true,
        title: true,
        workType: true,
        location: true,
        startDate: true,
        endDate: true,
        status: true,
        companyName: true,
      },
    });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    res.json({ permit });
  } catch (error) {
    console.error('Get public permit error:', error);
    res.status(500).json({ message: 'Error fetching permit info' });
  }
};

// Register workers via QR code
const registerWorkers = async (req, res) => {
  try {
    const { id } = req.params;
    const { contractor, workers } = req.body;

    const permit = await prisma.permitRequest.findUnique({
      where: { id },
    });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    // Update permit with contractor and worker info
    const existingWorkers = JSON.parse(permit.workers || '[]');
    const updatedWorkers = [...existingWorkers, ...workers];

    await prisma.permitRequest.update({
      where: { id },
      data: {
        contractorName: contractor.name,
        contractorPhone: contractor.phone,
        companyName: contractor.company || permit.companyName,
        workers: JSON.stringify(updatedWorkers),
      },
    });

    // Also save workers to Worker table
    for (const worker of workers) {
      if (worker.name) {
        await prisma.worker.create({
          data: {
            name: worker.name,
            phone: worker.phone || null,
            company: contractor.company || null,
            trade: worker.trade || null,
            badgeNumber: worker.badgeNumber || null,
          },
        });
      }
    }

    // Create audit log
    await createAuditLog({
      action: 'WORKERS_REGISTERED',
      entity: 'PermitRequest',
      entityId: id,
      newValue: JSON.stringify({ contractor, workerCount: workers.length }),
    });

    res.json({ 
      message: 'Workers registered successfully',
      workerCount: workers.length 
    });
  } catch (error) {
    console.error('Register workers error:', error);
    res.status(500).json({ message: 'Error registering workers' });
  }
};

// Extend permit
const extendPermit = async (req, res) => {
  try {
    const { id } = req.params;
    const { extendedUntil, reason } = req.body;
    const user = req.user;

    const permit = await prisma.permitRequest.findUnique({ where: { id } });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    if (permit.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Only approved permits can be extended' });
    }

    const updatedPermit = await prisma.permitRequest.update({
      where: { id },
      data: {
        isExtended: true,
        extendedUntil: new Date(extendedUntil),
        status: 'EXTENDED',
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PERMIT_EXTENDED',
      entity: 'PermitRequest',
      entityId: id,
      oldValue: { endDate: permit.endDate },
      newValue: { extendedUntil, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Permit extended successfully', permit: updatedPermit });
  } catch (error) {
    console.error('Extend permit error:', error);
    res.status(500).json({ message: 'Error extending permit' });
  }
};

// Revoke permit
const revokePermit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, comment } = req.body;
    const user = req.user;

    const permit = await prisma.permitRequest.findUnique({ where: { id } });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    if (!['APPROVED', 'EXTENDED', 'REAPPROVED'].includes(permit.status)) {
      return res.status(400).json({ message: 'Only approved/extended/reapproved permits can be revoked' });
    }

    // Update permit status
    const updatedPermit = await prisma.permitRequest.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    // Try to record action history (table might not exist yet)
    try {
      await prisma.permitActionHistory.create({
        data: {
          permitId: id,
          action: 'REVOKED',
          performedBy: user.id,
          performedByName: `${user.firstName} ${user.lastName}`,
          performedByRole: user.roleName || user.role,
          comment: comment || reason,
          previousStatus: permit.status,
          newStatus: 'REVOKED',
        },
      });
    } catch (historyError) {
      console.log('Could not record action history:', historyError.message);
    }

    await createAuditLog({
      userId: user.id,
      action: 'PERMIT_REVOKED',
      entity: 'PermitRequest',
      entityId: id,
      oldValue: { status: permit.status },
      newValue: { status: 'REVOKED', reason, comment },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Permit revoked successfully', permit: updatedPermit });
  } catch (error) {
    console.error('Revoke permit error:', error);
    res.status(500).json({ message: 'Error revoking permit' });
  }
};

// Re-approve revoked permit
const reapprovePermit = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, signature } = req.body;
    const user = req.user;

    const permit = await prisma.permitRequest.findUnique({ where: { id } });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    if (permit.status !== 'REVOKED') {
      return res.status(400).json({ message: 'Only revoked permits can be re-approved' });
    }

    // Update permit status
    const updatedPermit = await prisma.permitRequest.update({
      where: { id },
      data: { status: 'REAPPROVED' },
    });

    // Create new approval record
    await prisma.permitApproval.create({
      data: {
        permitId: id,
        approverName: `${user.firstName} ${user.lastName}`,
        approverRole: user.role,
        decision: 'REAPPROVED',
        comment: comment,
        signature: signature,
        signedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    // Try to record action history (table might not exist yet)
    try {
      await prisma.permitActionHistory.create({
        data: {
          permitId: id,
          action: 'REAPPROVED',
          performedBy: user.id,
          performedByName: `${user.firstName} ${user.lastName}`,
          performedByRole: user.roleName || user.role,
          comment: comment,
          previousStatus: permit.status,
          newStatus: 'REAPPROVED',
          signature: signature,
        },
      });
    } catch (historyError) {
      console.log('Could not record action history:', historyError.message);
    }

    await createAuditLog({
      userId: user.id,
      action: 'PERMIT_REAPPROVED',
      entity: 'PermitRequest',
      entityId: id,
      oldValue: { status: permit.status },
      newValue: { status: 'REAPPROVED', comment },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Permit re-approved successfully', permit: updatedPermit });
  } catch (error) {
    console.error('Re-approve permit error:', error);
    res.status(500).json({ message: 'Error re-approving permit' });
  }
};

// Get permit action history
const getPermitActionHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the table exists (might not be migrated yet)
    let actionHistory = [];
    try {
      actionHistory = await prisma.permitActionHistory.findMany({
        where: { permitId: id },
        orderBy: { createdAt: 'asc' },
      });
    } catch (tableError) {
      // Table might not exist yet, return empty array
      console.log('PermitActionHistory table may not exist yet:', tableError.message);
      actionHistory = [];
    }

    res.json({ actionHistory });
  } catch (error) {
    console.error('Get action history error:', error);
    res.status(500).json({ message: 'Error fetching action history', actionHistory: [] });
  }
};

// Transfer permit
const transferPermit = async (req, res) => {
  try {
    const { id } = req.params;
    const { newOwnerId, reason } = req.body;
    const user = req.user;

    const permit = await prisma.permitRequest.findUnique({ where: { id } });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    const newOwner = await prisma.user.findUnique({ where: { id: newOwnerId } });

    if (!newOwner) {
      return res.status(404).json({ message: 'New owner not found' });
    }

    const updatedPermit = await prisma.permitRequest.update({
      where: { id },
      data: { createdBy: newOwnerId },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PERMIT_TRANSFERRED',
      entity: 'PermitRequest',
      entityId: id,
      oldValue: { createdBy: permit.createdBy },
      newValue: { createdBy: newOwnerId, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Permit transferred successfully', permit: updatedPermit });
  } catch (error) {
    console.error('Transfer permit error:', error);
    res.status(500).json({ message: 'Error transferring permit' });
  }
};

// Close permit with checklist
const closePermit = async (req, res) => {
  try {
    const { id } = req.params;
    const { closureChecklist, comments } = req.body;
    const user = req.user;

    const permit = await prisma.permitRequest.findUnique({ where: { id } });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    if (!['APPROVED', 'EXTENDED'].includes(permit.status)) {
      return res.status(400).json({ message: 'Only approved/extended permits can be closed' });
    }

    const updatedPermit = await prisma.permitRequest.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closureChecklist: JSON.stringify(closureChecklist || []),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PERMIT_CLOSED',
      entity: 'PermitRequest',
      entityId: id,
      oldValue: { status: permit.status },
      newValue: { status: 'CLOSED', closureChecklist, comments },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Permit closed successfully', permit: updatedPermit });
  } catch (error) {
    console.error('Close permit error:', error);
    res.status(500).json({ message: 'Error closing permit' });
  }
};

// Update permit measures
const updateMeasures = async (req, res) => {
  try {
    const { id } = req.params;
    const { measures } = req.body;
    const user = req.user;

    const permit = await prisma.permitRequest.findUnique({ where: { id } });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    const updatedPermit = await prisma.permitRequest.update({
      where: { id },
      data: { measures: JSON.stringify(measures) },
    });

    await createAuditLog({
      userId: user.id,
      action: 'MEASURES_UPDATED',
      entity: 'PermitRequest',
      entityId: id,
      newValue: { measuresCount: measures.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Measures updated successfully', permit: updatedPermit });
  } catch (error) {
    console.error('Update measures error:', error);
    res.status(500).json({ message: 'Error updating measures' });
  }
};

// Add workers to permit
const addWorkers = async (req, res) => {
  try {
    const { id } = req.params;
    const { workers: newWorkers } = req.body;
    const user = req.user;

    const permit = await prisma.permitRequest.findUnique({ where: { id } });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    const existingWorkers = JSON.parse(permit.workers || '[]');
    const updatedWorkers = [...existingWorkers, ...newWorkers.map(w => ({
      ...w,
      addedAt: new Date().toISOString(),
      addedBy: user.id,
    }))];

    const updatedPermit = await prisma.permitRequest.update({
      where: { id },
      data: { workers: JSON.stringify(updatedWorkers) },
    });

    await createAuditLog({
      userId: user.id,
      action: 'WORKERS_ADDED',
      entity: 'PermitRequest',
      entityId: id,
      newValue: { addedCount: newWorkers.length, totalCount: updatedWorkers.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Workers added successfully', permit: updatedPermit });
  } catch (error) {
    console.error('Add workers error:', error);
    res.status(500).json({ message: 'Error adding workers' });
  }
};

module.exports = {
  getAllPermits,
  getPermitById,
  createPermit,
  updatePermit,
  deletePermit,
  getWorkTypes,
  getPublicPermitInfo,
  registerWorkers,
  extendPermit,
  revokePermit,
  reapprovePermit,
  transferPermit,
  closePermit,
  updateMeasures,
  addWorkers,
  getPermitActionHistory,
};
