import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  me: () => api.get('/auth/me'),
  // Password change with OTP
  sendPasswordOTP: () => api.post('/auth/send-password-otp'),
  changePassword: (data) => api.post('/auth/change-password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
}

// Permits API
export const permitsAPI = {
  getAll: (params) => api.get('/permits', { params }),
  getById: (id) => api.get(`/permits/${id}`),
  create: (data) => api.post('/permits', data),
  update: (id, data) => api.put(`/permits/${id}`, data),
  delete: (id) => api.delete(`/permits/${id}`),
  getWorkTypes: () => api.get('/permits/work-types'),
  // Workflow actions
  extendPermit: (id, data) => api.post(`/permits/${id}/extend`, data),
  revokePermit: (id, data) => api.post(`/permits/${id}/revoke`, data),
  reapprovePermit: (id, data) => api.post(`/permits/${id}/reapprove`, data),
  closePermit: (id, data) => api.post(`/permits/${id}/close`, data),
  transferPermit: (id, data) => api.post(`/permits/${id}/transfer`, data),
  // Action history
  getActionHistory: (id) => api.get(`/permits/${id}/action-history`),
  // Workers & Measures
  updateMeasures: (id, measures) => api.put(`/permits/${id}/measures`, { measures }),
  addWorkers: (id, workers) => api.post(`/permits/${id}/add-workers`, { workers }),
  getWorkerQR: (id) => api.get(`/workers/qr/${id}`),
  // PDF
  downloadPDF: (id) => api.get(`/permits/${id}/pdf`, { responseType: 'blob' }),
}

// Workers API
export const workersAPI = {
  getAll: (params) => api.get('/workers', { params }),
  getById: (id) => api.get(`/workers/${id}`),
  create: (data) => api.post('/workers', data),
  update: (id, data) => api.put(`/workers/${id}`, data),
  delete: (id) => api.delete(`/workers/${id}`),
  generateQR: (permitId) => api.get(`/workers/qr/${permitId}`),
}

// Approvals API
export const approvalsAPI = {
  getAll: (params) => api.get('/approvals', { params }),
  getById: (id) => api.get(`/approvals/${id}`),
  updateDecision: (id, data) => api.put(`/approvals/${id}/decision`, data),
  getPendingCount: () => api.get('/approvals/pending-count'),
  getStats: () => api.get('/approvals/stats'),
  // Safety remarks
  addRemarks: (permitId, safetyRemarks) => api.post(`/approvals/remarks/${permitId}`, { safetyRemarks }),
  getPendingRemarks: () => api.get('/approvals/pending-remarks'),
  triggerAutoClose: () => api.post('/approvals/auto-close'),
}

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  // Approval endpoints
  getPending: () => api.get('/users/pending'),
  approve: (id) => api.post(`/users/${id}/approve`),
  reject: (id, reason) => api.post(`/users/${id}/reject`, { reason }),
  getStats: () => api.get('/users/stats'),
  // VMS Integration
  toggleVMSAccess: (id, data) => api.post(`/users/${id}/vms-access`, data),
  getVMSUsers: () => api.get('/users/vms-users'),
}

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: (params) => api.get('/dashboard/activity', { params }),
}

// Roles API
export const rolesAPI = {
  getAll: () => api.get('/roles'),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
  getPermissions: () => api.get('/roles/permissions'),
  assignRole: (data) => api.post('/roles/assign', data),
}

// Meters API (Site Engineer)
export const metersAPI = {
  getAll: (params) => api.get('/meters', { params }),
  getById: (id) => api.get(`/meters/${id}`),
  create: (data) => api.post('/meters', data),
  update: (id, data) => api.put(`/meters/${id}`, data),
  delete: (id) => api.delete(`/meters/${id}`),
  verify: (id, data) => api.patch(`/meters/${id}/verify`, data),
  getTypes: () => api.get('/meters/types'),
  getAnalytics: (params) => api.get('/meters/analytics', { params }),
  export: (params) => api.get('/meters/export', { params }),
  bulkImport: (data) => api.post('/meters/bulk-import', data),
}

// SSO API
export const ssoAPI = {
  getConfig: () => api.get('/sso/config'),
  generateToken: (data) => api.post('/sso/generate', data),
  verifyToken: (token) => api.get(`/sso/verify?token=${token}`),
  validateExternal: (data) => api.post('/sso/validate-external', data),
}
