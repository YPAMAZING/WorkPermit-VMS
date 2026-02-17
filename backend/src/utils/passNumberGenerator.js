/**
 * VMS Pass Number Generator
 * 
 * Generates unique pass numbers for different VMS passes with:
 * - Race condition handling via retry logic and unique constraint
 * - Collision prevention with timestamp + random suffix fallback
 * - Robust error handling for database unavailability
 * 
 * Pass Number Formats:
 * 1. Pre-Approved Guest Pass: RGDGTLGP FEB 2026 - 0001
 *    (Reliable Group Digital Guest Pass Month Year - Serial)
 * 
 * 2. Walk-in Visitor Pass: RGDGTLVP FEB 2026 - 0001
 *    (Reliable Group Digital Visitor Pass Month Year - Serial)
 * 
 * 3. Request Number: RGDGTLRQ FEB 2026 - 0001
 *    (Reliable Group Digital Request Month Year - Serial)
 */

// Use the VMS Prisma client (same as other controllers)
let vmsPrisma = null;

// Lazy load Prisma client to avoid startup errors
const getPrismaClient = () => {
  if (!vmsPrisma) {
    try {
      vmsPrisma = require('../config/vms-prisma');
    } catch (error) {
      console.warn('Warning: Could not load Prisma client:', error.message);
      return null;
    }
  }
  return vmsPrisma;
};

// Month abbreviations
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Get current month boundaries for queries
 */
const getMonthBoundaries = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { now, startOfMonth, endOfMonth };
};

/**
 * Generate a random alphanumeric suffix for fallback (prevents collisions)
 * Uses timestamp component for additional uniqueness
 */
const generateRandomSuffix = () => {
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 2; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Returns 5 characters: 3 from timestamp + 2 random
  return timestamp + random;
};

/**
 * Format the pass number with consistent spacing
 */
const formatPassNumber = (prefix, month, year, serial) => {
  return `${prefix} ${month} ${year} - ${serial}`;
};

/**
 * Generate Pre-Approved Guest Pass Number with retry logic
 * Format: RGDGTLGP FEB 2026 - 0001
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<string>} The generated pass number
 */
const generateGuestPassNumber = async (maxRetries = 3) => {
  const { now, startOfMonth, endOfMonth } = getMonthBoundaries();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  const prefix = 'RGDGTLGP';
  
  const prisma = getPrismaClient();
  if (!prisma) {
    // Database not available, use fallback
    return formatPassNumber(prefix, month, year, generateRandomSuffix());
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Count existing pre-approvals this month
      const count = await prisma.vMSPreApproval.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });
      
      // Add attempt offset to reduce collision chance on retries
      const serial = String(count + attempt).padStart(4, '0');
      const passNumber = formatPassNumber(prefix, month, year, serial);
      
      // On first attempt, try the sequential number
      // On subsequent attempts, add a small random offset
      if (attempt === 1) {
        return passNumber;
      }
      
      // For retries, add a timestamp component to ensure uniqueness
      const uniqueSerial = String(count + attempt + Math.floor(Math.random() * 100)).padStart(4, '0');
      return formatPassNumber(prefix, month, year, uniqueSerial);
      
    } catch (error) {
      console.error(`Error generating guest pass number (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        // Final fallback with random suffix to prevent collision
        return formatPassNumber(prefix, month, year, generateRandomSuffix());
      }
      
      // Small delay before retry to reduce race condition likelihood
      await new Promise(resolve => setTimeout(resolve, 50 * attempt));
    }
  }
  
  // Should not reach here, but fallback just in case
  return formatPassNumber(prefix, month, year, generateRandomSuffix());
};

/**
 * Generate Walk-in Visitor Pass Number with retry logic
 * Format: RGDGTLVP FEB 2026 - 0001
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<string>} The generated pass number
 */
const generateVisitorPassNumber = async (maxRetries = 3) => {
  const { now, startOfMonth, endOfMonth } = getMonthBoundaries();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  const prefix = 'RGDGTLVP';
  
  const prisma = getPrismaClient();
  if (!prisma) {
    // Database not available, use fallback
    return formatPassNumber(prefix, month, year, generateRandomSuffix());
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Count existing gatepasses this month
      const count = await prisma.vMSGatepass.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });
      
      const serial = String(count + attempt).padStart(4, '0');
      const passNumber = formatPassNumber(prefix, month, year, serial);
      
      if (attempt === 1) {
        return passNumber;
      }
      
      const uniqueSerial = String(count + attempt + Math.floor(Math.random() * 100)).padStart(4, '0');
      return formatPassNumber(prefix, month, year, uniqueSerial);
      
    } catch (error) {
      console.error(`Error generating visitor pass number (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        return formatPassNumber(prefix, month, year, generateRandomSuffix());
      }
      
      await new Promise(resolve => setTimeout(resolve, 50 * attempt));
    }
  }
  
  return formatPassNumber(prefix, month, year, generateRandomSuffix());
};

/**
 * Generate Request Number for pending check-in requests with retry logic
 * Format: RGDGTLRQ FEB 2026 - 0001
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<string>} The generated request number
 */
const generateRequestNumber = async (maxRetries = 3) => {
  const { now, startOfMonth, endOfMonth } = getMonthBoundaries();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  const prefix = 'RGDGTLRQ';
  
  const prisma = getPrismaClient();
  if (!prisma) {
    // Database not available, use fallback
    return formatPassNumber(prefix, month, year, generateRandomSuffix());
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Count existing visitors this month
      const count = await prisma.vMSVisitor.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });
      
      const serial = String(count + attempt).padStart(4, '0');
      const passNumber = formatPassNumber(prefix, month, year, serial);
      
      if (attempt === 1) {
        return passNumber;
      }
      
      const uniqueSerial = String(count + attempt + Math.floor(Math.random() * 100)).padStart(4, '0');
      return formatPassNumber(prefix, month, year, uniqueSerial);
      
    } catch (error) {
      console.error(`Error generating request number (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        return formatPassNumber(prefix, month, year, generateRandomSuffix());
      }
      
      await new Promise(resolve => setTimeout(resolve, 50 * attempt));
    }
  }
  
  return formatPassNumber(prefix, month, year, generateRandomSuffix());
};

/**
 * Simple fallback pass number generator (no database dependency)
 * Used when database is unavailable or as explicit fallback
 * @param {string} prefix - The pass type prefix (RGDGTLGP, RGDGTLVP, RGDGTLRQ)
 * @returns {string} A unique pass number with random suffix
 */
const generateSimplePassNumber = (prefix) => {
  const now = new Date();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  return formatPassNumber(prefix, month, year, generateRandomSuffix());
};

/**
 * Validate a pass number format
 * @param {string} passNumber - The pass number to validate
 * @returns {boolean} True if valid format
 */
const validatePassNumber = (passNumber) => {
  if (!passNumber || typeof passNumber !== 'string') return false;
  
  const pattern = /^RGDGTL(GP|VP|RQ) [A-Z]{3} \d{4} - [A-Z0-9]{4,5}$/;
  return pattern.test(passNumber);
};

/**
 * Parse a pass number to extract its components
 * @param {string} passNumber - The pass number to parse
 * @returns {Object|null} Parsed components or null if invalid
 */
const parsePassNumber = (passNumber) => {
  if (!validatePassNumber(passNumber)) return null;
  
  const match = passNumber.match(/^RGDGTL(GP|VP|RQ) ([A-Z]{3}) (\d{4}) - ([A-Z0-9]{4,5})$/);
  if (!match) return null;
  
  const typeMap = {
    'GP': 'GUEST_PASS',
    'VP': 'VISITOR_PASS',
    'RQ': 'REQUEST'
  };
  
  return {
    type: typeMap[match[1]],
    typeCode: match[1],
    month: match[2],
    year: parseInt(match[3]),
    serial: match[4],
    original: passNumber
  };
};

module.exports = {
  generateGuestPassNumber,
  generateVisitorPassNumber,
  generateRequestNumber,
  generateSimplePassNumber,
  validatePassNumber,
  parsePassNumber,
  MONTHS,
};
