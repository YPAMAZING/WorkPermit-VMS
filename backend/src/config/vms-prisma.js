// VMS Database Configuration
// 
// NOTE: VMS now uses the MAIN database (same as Work Permit)
// This file is kept for backward compatibility but does nothing
// 
// VMS access is controlled by:
// 1. hasVMSAccess flag on User model
// 2. vms.admin permission in user's role
//
// The main Prisma client (@prisma/client) handles all VMS data

const { PrismaClient } = require('@prisma/client');

// Just export the main Prisma client
// VMS tables are in the main database schema
const vmsPrisma = new PrismaClient();

module.exports = vmsPrisma;
