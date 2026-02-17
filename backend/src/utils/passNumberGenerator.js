/**
 * VMS Pass Number Generator
 * 
 * Generates unique pass numbers for different VMS passes:
 * 
 * 1. Pre-Approved Guest Pass (RGDGTLGP):
 *    Format: RGDGTLGP FEB 2026 - 0001
 *    Full form: Reliable Group Digital Guest Pass Month Year - Serial
 * 
 * 2. Walk-in Visitor Pass (RGDGTLVP):
 *    Format: RGDGTLVP FEB 2026 - 0001
 *    Full form: Reliable Group Digital Visitor Pass Month Year - Serial
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Month abbreviations
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Generate Pre-Approved Guest Pass Number
 * Format: RGDGTLGP FEB 2026 - 0001
 * @returns {Promise<string>} The generated pass number
 */
const generateGuestPassNumber = async () => {
  const now = new Date();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  
  // Get count of pre-approvals created this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  try {
    const count = await prisma.vMSPreApproval.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });
    
    const serial = String(count + 1).padStart(4, '0');
    return `RGDGTLGP ${month} ${year} - ${serial}`;
  } catch (error) {
    console.error('Error generating guest pass number:', error);
    // Fallback with timestamp if database query fails
    const timestamp = Date.now().toString().slice(-4);
    return `RGDGTLGP ${month} ${year} - ${timestamp}`;
  }
};

/**
 * Generate Walk-in Visitor Pass Number
 * Format: RGDGTLVP FEB 2026 - 0001
 * @returns {Promise<string>} The generated pass number
 */
const generateVisitorPassNumber = async () => {
  const now = new Date();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  
  // Get count of gatepasses created this month for walk-in visitors
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  try {
    const count = await prisma.vMSGatepass.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });
    
    const serial = String(count + 1).padStart(4, '0');
    return `RGDGTLVP ${month} ${year} - ${serial}`;
  } catch (error) {
    console.error('Error generating visitor pass number:', error);
    // Fallback with timestamp if database query fails
    const timestamp = Date.now().toString().slice(-4);
    return `RGDGTLVP ${month} ${year} - ${timestamp}`;
  }
};

/**
 * Generate Request Number for pending check-in requests
 * Format: RGDGTLRQ FEB 2026 - 0001
 * Full form: Reliable Group Digital Request Month Year - Serial
 * @returns {Promise<string>} The generated request number
 */
const generateRequestNumber = async () => {
  const now = new Date();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  
  // Get count of visitors created this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  try {
    const count = await prisma.vMSVisitor.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });
    
    const serial = String(count + 1).padStart(4, '0');
    return `RGDGTLRQ ${month} ${year} - ${serial}`;
  } catch (error) {
    console.error('Error generating request number:', error);
    // Fallback with timestamp if database query fails
    const timestamp = Date.now().toString().slice(-4);
    return `RGDGTLRQ ${month} ${year} - ${timestamp}`;
  }
};

module.exports = {
  generateGuestPassNumber,
  generateVisitorPassNumber,
  generateRequestNumber,
  MONTHS,
};
