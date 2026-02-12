// VMS Database Prisma Client
// This connects to the SEPARATE VMS database
// If VMS database is not configured, it returns null

let vmsPrisma = null;

try {
  // Only try to load VMS client if VMS_DATABASE_URL is configured
  if (!process.env.VMS_DATABASE_URL) {
    console.log('⚠️ VMS_DATABASE_URL not configured - VMS features disabled');
    console.log('   To enable VMS, add VMS_DATABASE_URL to your .env file');
  } else {
    const { PrismaClient } = require('.prisma/vms-client');
    
    vmsPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    // Handle connection
    vmsPrisma.$connect()
      .then(() => {
        console.log('✅ Connected to VMS database');
      })
      .catch((error) => {
        console.error('❌ Failed to connect to VMS database:', error.message);
        console.log('   VMS features will be disabled');
        vmsPrisma = null;
      });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      if (vmsPrisma) {
        await vmsPrisma.$disconnect();
      }
    });
  }
} catch (error) {
  console.log('⚠️ VMS Prisma client not available:', error.message);
  console.log('   This is OK if you are not using VMS features');
  console.log('   To enable VMS:');
  console.log('   1. Add VMS_DATABASE_URL to .env');
  console.log('   2. Run: npx prisma generate --schema=./prisma-vms/schema.prisma');
  console.log('   3. Run: npx prisma db push --schema=./prisma-vms/schema.prisma');
}

module.exports = vmsPrisma;
