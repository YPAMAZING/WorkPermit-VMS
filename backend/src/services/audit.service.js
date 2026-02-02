const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createAuditLog = async ({
  userId,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
  ipAddress,
  userAgent,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

const getAuditLogs = async ({ page = 1, limit = 50, entity, entityId, userId }) => {
  const skip = (page - 1) * limit;
  
  const where = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Parse JSON strings back to objects
  const parsedLogs = logs.map(log => ({
    ...log,
    oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
    newValue: log.newValue ? JSON.parse(log.newValue) : null,
  }));

  return {
    logs: parsedLogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  createAuditLog,
  getAuditLogs,
};
