// VMS API Service - Multi-Tenant with QR Check-in Support
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const VMS_API_URL = `${API_URL}/vms`

// Create axios instance for authenticated requests
const vmsApi = axios.create({
  baseURL: VMS_API_URL,
})

// Create public axios instance (no auth required)
const publicApi = axios.create({
  baseURL: VMS_API_URL,
})

// Add auth header
vmsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('vms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
vmsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vms_token')
      window.location.href = '/vms/login'
    }
    return Promise.reject(error)
  }
)

// ================================
// PUBLIC API (No Auth Required)
// ================================

// Public Check-in API (for QR code flow)
export const publicCheckInApi = {
  // Get company info by code (for QR form)
  getCompanyByCode: (companyCode) => publicApi.get(`/checkin/company/${companyCode}`),
  
  // Submit self check-in request
  submitRequest: (data) => publicApi.post('/checkin/submit', data),
  
  // Get check-in request status
  getStatus: (requestNumber) => publicApi.get(`/checkin/status/${requestNumber}`),
}

// ================================
// PROTECTED API (Auth Required)
// ================================

// Dashboard API
export const dashboardApi = {
  getOverview: () => vmsApi.get('/dashboard/overview'),
  getWeeklyStats: () => vmsApi.get('/dashboard/weekly-stats'),
  getTodayExpected: () => vmsApi.get('/dashboard/today-expected'),
  getAlerts: () => vmsApi.get('/dashboard/alerts'),
}

// Company Management API (Multi-tenant)
export const companyApi = {
  getAll: (params) => vmsApi.get('/companies', { params }),
  getById: (id) => vmsApi.get(`/companies/${id}`),
  getMyCompany: () => vmsApi.get('/companies/my'),
  getQRCode: (id) => vmsApi.get(`/companies/${id}/qr-code`),
  create: (data) => vmsApi.post('/companies', data),
  update: (id, data) => vmsApi.put(`/companies/${id}`, data),
  updateSettings: (id, settings) => vmsApi.patch(`/companies/${id}/settings`, settings),
  regenerateQR: (id) => vmsApi.post(`/companies/${id}/regenerate-qr`),
  addDepartment: (id, data) => vmsApi.post(`/companies/${id}/departments`, data),
  updateDepartment: (companyId, deptId, data) => vmsApi.put(`/companies/${companyId}/departments/${deptId}`, data),
  deleteDepartment: (companyId, deptId) => vmsApi.delete(`/companies/${companyId}/departments/${deptId}`),
}

// Check-in Management API (Guard/Reception)
export const checkInApi = {
  // Get pending requests
  getPending: () => vmsApi.get('/checkin/requests/pending'),
  
  // Get all requests with filters
  getAll: (params) => vmsApi.get('/checkin/requests', { params }),
  
  // Get live feed (for guard dashboard)
  getLiveFeed: (since) => vmsApi.get('/checkin/live-feed', { params: { since } }),
  
  // Get single request
  getById: (id) => vmsApi.get(`/checkin/requests/${id}`),
  
  // Get statistics
  getStats: () => vmsApi.get('/checkin/stats'),
  
  // Actions
  approve: (id, note) => vmsApi.post(`/checkin/requests/${id}/approve`, { note }),
  reject: (id, reason) => vmsApi.post(`/checkin/requests/${id}/reject`, { reason }),
  checkIn: (id) => vmsApi.post(`/checkin/requests/${id}/check-in`),
  checkOut: (id, securityRemarks) => vmsApi.post(`/checkin/requests/${id}/check-out`, { securityRemarks }),
  
  // Search visitor
  searchVisitor: (q) => vmsApi.get('/checkin/search', { params: { q } }),
}

// Visitors API
export const visitorsApi = {
  getAll: (params) => vmsApi.get('/visitors', { params }),
  getById: (id) => vmsApi.get(`/visitors/${id}`),
  searchByPhone: (phone) => vmsApi.get('/visitors/search', { params: { phone } }),
  getStats: () => vmsApi.get('/visitors/stats'),
  create: (data) => vmsApi.post('/visitors', data),
  update: (id, data) => vmsApi.put(`/visitors/${id}`, data),
  delete: (id) => vmsApi.delete(`/visitors/${id}`),
}

// Gatepasses API
export const gatepassesApi = {
  getAll: (params) => vmsApi.get('/gatepasses', { params }),
  getById: (id) => vmsApi.get(`/gatepasses/${id}`),
  getByNumber: (gatepassNumber) => vmsApi.get(`/gatepasses/verify/${gatepassNumber}`),
  getTodaySummary: () => vmsApi.get('/gatepasses/today-summary'),
  getStats: (period) => vmsApi.get('/gatepasses/stats', { params: { period } }),
  create: (data) => vmsApi.post('/gatepasses', data),
  update: (id, data) => vmsApi.put(`/gatepasses/${id}`, data),
  updateStatus: (id, status, securityRemarks) => 
    vmsApi.patch(`/gatepasses/${id}/status`, { status, securityRemarks }),
  cancel: (id, reason) => vmsApi.patch(`/gatepasses/${id}/cancel`, { reason }),
}

// Pre-approved Visitors API
export const preapprovedApi = {
  getAll: (params) => vmsApi.get('/preapproved', { params }),
  getById: (id) => vmsApi.get(`/preapproved/${id}`),
  check: (params) => vmsApi.get('/preapproved/check', { params }),
  getStats: () => vmsApi.get('/preapproved/stats'),
  create: (data) => vmsApi.post('/preapproved', data),
  update: (id, data) => vmsApi.put(`/preapproved/${id}`, data),
  use: (id) => vmsApi.patch(`/preapproved/${id}/use`),
  cancel: (id, reason) => vmsApi.patch(`/preapproved/${id}/cancel`, { reason }),
  delete: (id) => vmsApi.delete(`/preapproved/${id}`),
}

// Blacklist API
export const blacklistApi = {
  getAll: (params) => vmsApi.get('/blacklist', { params }),
  getById: (id) => vmsApi.get(`/blacklist/${id}`),
  check: (params) => vmsApi.get('/blacklist/check', { params }),
  getReasons: () => vmsApi.get('/blacklist/reasons'),
  getStats: () => vmsApi.get('/blacklist/stats'),
  add: (data) => vmsApi.post('/blacklist', data),
  update: (id, data) => vmsApi.put(`/blacklist/${id}`, data),
  remove: (id, reason) => vmsApi.patch(`/blacklist/${id}/remove`, { reason }),
  delete: (id) => vmsApi.delete(`/blacklist/${id}`),
}

// Company Settings API (Approval-based visitor feature)
export const companySettingsApi = {
  // Get all companies with settings
  getAll: () => vmsApi.get('/company-settings'),
  
  // Get companies with approval settings (admin view)
  getApprovalSettings: () => vmsApi.get('/company-settings/approval-settings'),
  
  // Get company by ID
  getById: (id) => vmsApi.get(`/company-settings/${id}`),
  
  // Get company settings by name (public - for visitor registration)
  getByName: (name) => publicApi.get(`/company-settings/by-name/${encodeURIComponent(name)}`),
  
  // Get companies for dropdown (public - for forms)
  getDropdown: () => publicApi.get('/company-settings/dropdown'),
  
  // Create new company
  create: (data) => vmsApi.post('/company-settings', data),
  
  // Update company
  update: (id, data) => vmsApi.put(`/company-settings/${id}`, data),
  
  // Toggle approval requirement (main feature)
  toggleApproval: (id, requireApproval) => 
    vmsApi.post(`/company-settings/${id}/toggle-approval`, { requireApproval }),
  
  // Bulk update approval settings
  bulkUpdateApproval: (updates) => 
    vmsApi.post('/company-settings/bulk-update-approval', { updates }),
  
  // Sync companies from frontend list
  syncCompanies: (companies) => 
    vmsApi.post('/company-settings/sync', { companies }),
  
  // Seed default companies (add all predefined companies)
  seedDefaults: () => vmsApi.post('/company-settings/seed-defaults'),
  
  // Delete company
  delete: (id) => vmsApi.delete(`/company-settings/${id}`),
}

// ================================
// COMBINED VMS API (for convenience)
// ================================
export const vmsAPI = {
  // Visitor Registration (Public - for QR scan flow)
  createVisitor: (data) => publicApi.post('/visitors/register', data),
  
  // Pre-Approval (Company creates pre-approved passes)
  createPreApproval: (data) => vmsApi.post('/preapproved', data),
  
  // Get all visitors for a company (role-based)
  getVisitors: (params) => vmsApi.get('/visitors', { params }),
  
  // Get visitor by ID
  getVisitorById: (id) => vmsApi.get(`/visitors/${id}`),
  
  // Check-in/Check-out
  checkInVisitor: (id) => vmsApi.post(`/visitors/${id}/checkin`),
  checkOutVisitor: (id) => vmsApi.post(`/visitors/${id}/checkout`),
  
  // Dashboard stats
  getDashboardStats: () => vmsApi.get('/dashboard/stats'),
  
  // Get today's entries (daily + pre-approved tabs)
  getTodayEntries: (type) => vmsApi.get('/entries/today', { params: { type } }),
  
  // Get pre-approved visitors
  getPreApproved: (params) => vmsApi.get('/preapproved', { params }),
}

export default vmsApi
