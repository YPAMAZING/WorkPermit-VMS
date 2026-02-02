// VMS Database Prisma Client
// This connects to the SEPARATE VMS database

const { PrismaClient } = require('.prisma/vms-client');

const vmsPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle connection errors
vmsPrisma.$connect()
  .then(() => {
    console.log('✅ Connected to VMS database');
  })
  .catch((error) => {
    console.error('❌ Failed to connect to VMS database:', error);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await vmsPrisma.$disconnect();
});

module.exports = vmsPrisma;
