// MIS-specific Prisma Client Configuration
// Uses SEPARATE database from Work Permit

const path = require('path');
const { PrismaClient } = require('.prisma/mis-client');

// Get absolute path to MIS database
const getMISDatabaseUrl = () => {
  if (process.env.MIS_DATABASE_URL) {
    return process.env.MIS_DATABASE_URL;
  }
  // Use absolute path relative to backend directory
  const dbPath = path.join(__dirname, '..', '..', 'prisma-mis', 'mis.db');
  return `file:${dbPath}`;
};

const misPrisma = new PrismaClient({
  datasources: {
    db: {
      url: getMISDatabaseUrl()
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = { misPrisma };
