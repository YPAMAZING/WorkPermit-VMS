/**
 * Helper functions to handle JSON array fields for SQLite
 * SQLite doesn't support native arrays, so we store them as JSON strings
 */

/**
 * Parse a JSON string field to array, with fallback
 */
const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Parse a JSON string field to object, with fallback
 */
const parseJsonObject = (value) => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value;
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Stringify an object to JSON for storage
 */
const stringifyObject = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

/**
 * Stringify an array to JSON for storage
 */
const stringifyArray = (value) => {
  if (!value) return '[]';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

/**
 * Transform permit response - parse JSON array fields
 */
const transformPermitResponse = (permit) => {
  if (!permit) return null;
  
  return {
    ...permit,
    hazards: parseJsonArray(permit.hazards),
    precautions: parseJsonArray(permit.precautions),
    equipment: parseJsonArray(permit.equipment),
    workers: parseJsonArray(permit.workers),
    measures: parseJsonArray(permit.measures),
    closureChecklist: parseJsonArray(permit.closureChecklist),
    vendorDetails: parseJsonObject(permit.vendorDetails),
  };
};

/**
 * Transform permit data for storage - stringify array fields
 */
const transformPermitForStorage = (data) => {
  const transformed = { ...data };
  
  if (data.hazards !== undefined) {
    transformed.hazards = stringifyArray(data.hazards);
  }
  if (data.precautions !== undefined) {
    transformed.precautions = stringifyArray(data.precautions);
  }
  if (data.equipment !== undefined) {
    transformed.equipment = stringifyArray(data.equipment);
  }
  if (data.workers !== undefined) {
    transformed.workers = stringifyArray(data.workers);
  }
  if (data.measures !== undefined) {
    transformed.measures = stringifyArray(data.measures);
  }
  if (data.closureChecklist !== undefined) {
    transformed.closureChecklist = stringifyArray(data.closureChecklist);
  }
  if (data.vendorDetails !== undefined) {
    transformed.vendorDetails = stringifyObject(data.vendorDetails);
  }
  
  return transformed;
};

module.exports = {
  parseJsonArray,
  parseJsonObject,
  stringifyArray,
  stringifyObject,
  transformPermitResponse,
  transformPermitForStorage,
};
