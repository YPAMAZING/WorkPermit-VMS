// VMS API Service
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const VMS_API_URL = `${API_URL}/vms`

// Create axios instance
const vmsApi = axios.create({
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

// Dashboard API
export const dashboardApi = {
  getOverview: () => vmsApi.get('/dashboard/overview'),
  getWeeklyStats: () => vmsApi.get('/dashboard/weekly-stats'),
  getTodayExpected: () => vmsApi.get('/dashboard/today-expected'),
  getAlerts: () => vmsApi.get('/dashboard/alerts'),
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

export default vmsApi
