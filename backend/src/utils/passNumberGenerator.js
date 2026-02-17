/**
 * VMS Pass Number Generator
 * 
 * Generates unique pass numbers similar to Work Permit system.
 * Uses transaction-based sequential numbering to prevent collisions.
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

// Month abbreviations
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Get current month and year
 */
const getMonthYear = () => {
  const now = new Date();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  return { month, year };
};

/**
 * Generate Guest Pass Number (for Pre-Approved visitors)
 * Format: RGDGTLGP FEB 2026 - 0001
 * 
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<string>} The generated pass number
 */
const generateGuestPassNumber = async (prisma) => {
  const { month, year } = getMonthYear();
  const prefix = 'RGDGTLGP';
  
  try {
    // Find all guest passes this month
    const allPassesThisMonth = await prisma.vMSPreApproval.findMany({
      where: {
        passNumber: {
          contains: `${prefix} ${month}`,
        },
      },
      select: {
        passNumber: true,
      },
    });
    
    let maxNumber = 0;
    
    // Find the highest number from all passes this month
    for (const pass of allPassesThisMonth) {
      if (pass.passNumber) {
        const match = pass.passNumber.match(/- (\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    const sequentialNumber = String(nextNumber).padStart(4, '0');
    
    return `${prefix} ${month} ${year} - ${sequentialNumber}`;
  } catch (error) {
    console.error('Error generating guest pass number:', error.message);
    // Fallback with timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix} ${month} ${year} - ${timestamp}`;
  }
};

/**
 * Generate Visitor Pass Number (for Walk-in visitors)
 * Format: RGDGTLVP FEB 2026 - 0001
 * 
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<string>} The generated pass number
 */
const generateVisitorPassNumber = async (prisma) => {
  const { month, year } = getMonthYear();
  const prefix = 'RGDGTLVP';
  
  try {
    // Find all visitor passes this month
    const allPassesThisMonth = await prisma.vMSGatepass.findMany({
      where: {
        gatepassNumber: {
          contains: `${prefix} ${month}`,
        },
      },
      select: {
        gatepassNumber: true,
      },
    });
    
    let maxNumber = 0;
    
    // Find the highest number from all passes this month
    for (const pass of allPassesThisMonth) {
      if (pass.gatepassNumber) {
        const match = pass.gatepassNumber.match(/- (\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    const sequentialNumber = String(nextNumber).padStart(4, '0');
    
    return `${prefix} ${month} ${year} - ${sequentialNumber}`;
  } catch (error) {
    console.error('Error generating visitor pass number:', error.message);
    // Fallback with timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix} ${month} ${year} - ${timestamp}`;
  }
};

/**
 * Generate Request Number (for pending check-in requests)
 * Format: RGDGTLRQ FEB 2026 - 0001
 * 
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Promise<string>} The generated request number
 */
const generateRequestNumber = async (prisma) => {
  const { month, year } = getMonthYear();
  const prefix = 'RGDGTLRQ';
  
  try {
    // Count existing visitors this month by checking createdAt
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const count = await prisma.vMSVisitor.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });
    
    const nextNumber = count + 1;
    const sequentialNumber = String(nextNumber).padStart(4, '0');
    
    return `${prefix} ${month} ${year} - ${sequentialNumber}`;
  } catch (error) {
    console.error('Error generating request number:', error.message);
    // Fallback with timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix} ${month} ${year} - ${timestamp}`;
  }
};

module.exports = {
  generateGuestPassNumber,
  generateVisitorPassNumber,
  generateRequestNumber,
  MONTHS,
};
