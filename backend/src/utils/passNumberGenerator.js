/**
 * VMS Pass Number Generator
 * 
 * Generates unique pass numbers similar to Work Permit system.
 * Uses count-based sequential numbering.
 * 
 * Pass Number Formats:
 * 1. Pre-Approved Guest Pass: RGDGTLGP FEB 2026 - 0001
 * 2. Walk-in Visitor Pass: RGDGTLVP FEB 2026 - 0001
 * 3. Request Number: RGDGTLRQ FEB 2026 - 0001
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
 * Get start of current month
 */
const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
};

/**
 * Generate Guest Pass Number (for Pre-Approved visitors)
 * Format: RGDGTLGP FEB 2026 - 0001
 */
const generateGuestPassNumber = async (prisma) => {
  const { month, year } = getMonthYear();
  const prefix = 'RGDGTLGP';
  
  try {
    const startOfMonth = getStartOfMonth();
    
    // Count pre-approvals created this month
    const count = await prisma.vMSPreApproval.count({
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
    console.error('Error generating guest pass number:', error.message);
    // Fallback with timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix} ${month} ${year} - ${timestamp}`;
  }
};

/**
 * Generate Visitor Pass Number (for Walk-in visitors)
 * Format: RGDGTLVP FEB 2026 - 0001
 */
const generateVisitorPassNumber = async (prisma) => {
  const { month, year } = getMonthYear();
  const prefix = 'RGDGTLVP';
  
  try {
    const startOfMonth = getStartOfMonth();
    
    // Count gatepasses created this month (use validFrom as it always exists)
    const count = await prisma.vMSGatepass.count({
      where: {
        validFrom: {
          gte: startOfMonth,
        },
      },
    });
    
    const nextNumber = count + 1;
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
 */
const generateRequestNumber = async (prisma) => {
  const { month, year } = getMonthYear();
  const prefix = 'RGDGTLRQ';
  
  try {
    const startOfMonth = getStartOfMonth();
    
    // Count visitors created this month
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
