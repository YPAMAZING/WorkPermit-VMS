import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance for MIS API
const misAxios = axios.create({
  baseURL: `${API_URL}/mis`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
misAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mis_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
misAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear and redirect
      localStorage.removeItem('mis_token')
      // Only redirect if on a MIS route
      if (window.location.pathname.startsWith('/mis')) {
        window.location.href = '/mis/login'
      }
    }
    return Promise.reject(error)
  }
)

// MIS API methods
const misApi = {
  // Auth
  auth: {
    login: async (email, password) => {
      const response = await misAxios.post('/auth/login', { email, password })
      return response.data
    },
    me: async () => {
      const response = await misAxios.get('/auth/me')
      return response.data
    },
    logout: async () => {
      const response = await misAxios.post('/auth/logout')
      return response.data
    },
    changePassword: async (currentPassword, newPassword) => {
      const response = await misAxios.post('/auth/change-password', { currentPassword, newPassword })
      return response.data
    },
  },

  // Dashboard
  dashboard: {
    getStats: async () => {
      const response = await misAxios.get('/dashboard/stats')
      return response.data
    },
    getAnalytics: async (params) => {
      const response = await misAxios.get('/dashboard/analytics', { params })
      return response.data
    },
  },

  // Meters
  meters: {
    getConfigs: async (params) => {
      const response = await misAxios.get('/meters/configs', { params })
      return response.data
    },
    createConfig: async (data) => {
      const response = await misAxios.post('/meters/configs', data)
      return response.data
    },
    getReadings: async (params) => {
      const response = await misAxios.get('/meters/readings', { params })
      return response.data
    },
    getReading: async (id) => {
      const response = await misAxios.get(`/meters/readings/${id}`)
      return response.data
    },
    createReading: async (data) => {
      const response = await misAxios.post('/meters/readings', data)
      return response.data
    },
    updateReading: async (id, data) => {
      const response = await misAxios.put(`/meters/readings/${id}`, data)
      return response.data
    },
    deleteReading: async (id) => {
      const response = await misAxios.delete(`/meters/readings/${id}`)
      return response.data
    },
    verifyReading: async (id, verificationNotes) => {
      const response = await misAxios.post(`/meters/readings/${id}/verify`, { verificationNotes })
      return response.data
    },
  },

  // Users
  users: {
    getAll: async (params) => {
      const response = await misAxios.get('/users', { params })
      return response.data
    },
    getRoles: async () => {
      const response = await misAxios.get('/users/roles')
      return response.data
    },
    create: async (data) => {
      const response = await misAxios.post('/users', data)
      return response.data
    },
    update: async (id, data) => {
      const response = await misAxios.put(`/users/${id}`, data)
      return response.data
    },
    approve: async (id) => {
      const response = await misAxios.post(`/users/${id}/approve`)
      return response.data
    },
    resetPassword: async (id, newPassword) => {
      const response = await misAxios.post(`/users/${id}/reset-password`, { newPassword })
      return response.data
    },
    delete: async (id) => {
      const response = await misAxios.delete(`/users/${id}`)
      return response.data
    },
  },

  // Health check
  health: async () => {
    const response = await misAxios.get('/health')
    return response.data
  },
}

export default misApi
