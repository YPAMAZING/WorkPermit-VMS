import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const VMSAuthContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const VMSAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get VMS token from localStorage (use main auth token)
  const getToken = () => localStorage.getItem('vms_token') || localStorage.getItem('token')
  const setToken = (token) => localStorage.setItem('vms_token', token)
  const removeToken = () => localStorage.removeItem('vms_token')

  // Create axios instance for main API (use Work Permit auth)
  const mainApi = axios.create({
    baseURL: API_URL,
  })

  // Create axios instance for VMS API
  const vmsApi = axios.create({
    baseURL: `${API_URL}/vms`,
  })

  // Add auth header to requests
  const addAuthHeader = (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }

  mainApi.interceptors.request.use(addAuthHeader)
  vmsApi.interceptors.request.use(addAuthHeader)

  // Handle auth errors
  const handleAuthError = (error) => {
    if (error.response?.status === 401) {
      removeToken()
      setUser(null)
    }
    return Promise.reject(error)
  }

  mainApi.interceptors.response.use((response) => response, handleAuthError)
  vmsApi.interceptors.response.use((response) => response, handleAuthError)

  // Check if user has permission
  const hasPermission = useCallback((permission) => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'VMS_ADMIN' || user.role === 'admin') return true
    return user.permissions?.includes(permission) || false
  }, [user])

  // Check if user has any of the permissions
  const hasAnyPermission = useCallback((permissions) => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'VMS_ADMIN' || user.role === 'admin') return true
    return permissions.some(p => user.permissions?.includes(p))
  }, [user])

  // Role checks - support both VMS roles and Work Permit roles
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'VMS_ADMIN' || user?.role === 'admin'
  const isSecuritySupervisor = user?.role === 'SECURITY_SUPERVISOR'
  const isSecurityGuard = user?.role === 'SECURITY_GUARD' || user?.role === 'guard'
  const isReceptionist = user?.role === 'RECEPTIONIST' || user?.role === 'reception'
  const isHost = user?.role === 'HOST'

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        // Try VMS auth first, then fallback to main auth
        try {
          const response = await vmsApi.get('/auth/me')
          setUser(response.data)
        } catch (vmsErr) {
          // Fallback to main Work Permit auth
          const response = await mainApi.get('/auth/me')
          const userData = response.data.user || response.data
          // Add VMS permissions for Work Permit users
          setUser({
            ...userData,
            permissions: [
              'vms.dashboard.view',
              'vms.visitors.view', 'vms.visitors.create', 'vms.visitors.edit',
              'vms.gatepasses.view', 'vms.gatepasses.create', 'vms.gatepasses.edit',
              'vms.checkin.view', 'vms.checkin.approve', 'vms.checkin.manage',
              'vms.preapproved.view', 'vms.preapproved.create',
              'vms.blacklist.view',
              'vms.reports.view',
            ]
          })
        }
      } catch (err) {
        console.error('Failed to load VMS user:', err)
        removeToken()
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Login - Try VMS auth first, then fallback to main Work Permit auth
  const login = async (email, password) => {
    try {
      setError(null)
      
      // Try VMS login first
      try {
        const response = await vmsApi.post('/auth/login', { email, password })
        const { token, user: userData } = response.data
        setToken(token)
        setUser(userData)
        return { success: true }
      } catch (vmsErr) {
        // Fallback to main Work Permit auth
        const response = await mainApi.post('/auth/login', { email, password })
        const { token, user: userData } = response.data
        setToken(token)
        // Add VMS permissions for Work Permit users
        setUser({
          ...userData,
          permissions: [
            'vms.dashboard.view',
            'vms.visitors.view', 'vms.visitors.create', 'vms.visitors.edit',
            'vms.gatepasses.view', 'vms.gatepasses.create', 'vms.gatepasses.edit',
            'vms.checkin.view', 'vms.checkin.approve', 'vms.checkin.manage',
            'vms.preapproved.view', 'vms.preapproved.create',
            'vms.blacklist.view',
            'vms.reports.view',
          ]
        })
        return { success: true }
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Register
  const register = async (data) => {
    try {
      setError(null)
      const response = await vmsApi.post('/auth/register', data)
      
      if (response.data.token) {
        setToken(response.data.token)
        setUser(response.data.user)
        return { success: true, autoApproved: true }
      }
      
      return { 
        success: true, 
        autoApproved: false, 
        message: response.data.message 
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Logout
  const logout = () => {
    removeToken()
    setUser(null)
  }

  // Update profile
  const updateProfile = async (data) => {
    try {
      const response = await vmsApi.put('/auth/profile', data)
      setUser(response.data.user)
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Update failed'
      return { success: false, error: message }
    }
  }

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await vmsApi.put('/auth/password', { currentPassword, newPassword })
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Password change failed'
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    isSecuritySupervisor,
    isSecurityGuard,
    isReceptionist,
    isHost,
    vmsApi,
    // Permission shortcuts
    canViewDashboard: hasPermission('vms.dashboard.view'),
    canViewVisitors: hasPermission('vms.visitors.view'),
    canCreateVisitors: hasPermission('vms.visitors.create'),
    canEditVisitors: hasPermission('vms.visitors.edit'),
    canDeleteVisitors: hasPermission('vms.visitors.delete'),
    canViewGatepasses: hasPermission('vms.gatepasses.view'),
    canCreateGatepasses: hasPermission('vms.gatepasses.create'),
    canEditGatepasses: hasPermission('vms.gatepasses.edit'),
    canCancelGatepasses: hasPermission('vms.gatepasses.cancel'),
    canViewPreapproved: hasPermission('vms.preapproved.view'),
    canCreatePreapproved: hasPermission('vms.preapproved.create'),
    canViewBlacklist: hasPermission('vms.blacklist.view'),
    canManageBlacklist: hasPermission('vms.blacklist.create'),
    canViewReports: hasPermission('vms.reports.view'),
    canExportReports: hasPermission('vms.reports.export'),
    canManageSettings: hasPermission('vms.settings.edit'),
    canManageUsers: hasPermission('vms.users.edit'),
  }

  return (
    <VMSAuthContext.Provider value={value}>
      {children}
    </VMSAuthContext.Provider>
  )
}

export const useVMSAuth = () => {
  const context = useContext(VMSAuthContext)
  if (!context) {
    throw new Error('useVMSAuth must be used within VMSAuthProvider')
  }
  return context
}

export default VMSAuthContext
