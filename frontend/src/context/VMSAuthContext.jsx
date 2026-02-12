import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const VMSAuthContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const VMSAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get token from localStorage (shared with Work Permit)
  const getToken = () => localStorage.getItem('vms_token') || localStorage.getItem('token')
  const setToken = (token) => {
    localStorage.setItem('vms_token', token)
    localStorage.setItem('token', token) // Also set main token for shared auth
  }
  const removeToken = () => {
    localStorage.removeItem('vms_token')
  }

  // Create axios instance for Work Permit API (main auth)
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

  // Default VMS permissions for all logged-in users
  const DEFAULT_VMS_PERMISSIONS = [
    'vms.dashboard.view',
    'vms.visitors.view', 'vms.visitors.create', 'vms.visitors.edit',
    'vms.gatepasses.view', 'vms.gatepasses.create', 'vms.gatepasses.edit',
    'vms.checkin.view', 'vms.checkin.approve', 'vms.checkin.manage',
    'vms.preapproved.view', 'vms.preapproved.create',
    'vms.blacklist.view',
    'vms.reports.view',
  ]

  // Check if user has permission
  const hasPermission = useCallback((permission) => {
    if (!user) return false
    // Admin roles have all permissions
    if (['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) return true
    return user.permissions?.includes(permission) || false
  }, [user])

  // Check if user has any of the permissions
  const hasAnyPermission = useCallback((permissions) => {
    if (!user) return false
    if (['ADMIN', 'VMS_ADMIN', 'admin', 'FIREMAN'].includes(user.role)) return true
    return permissions.some(p => user.permissions?.includes(p))
  }, [user])

  // Role checks
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'VMS_ADMIN' || user?.role === 'admin' || user?.role === 'FIREMAN'
  const isSecuritySupervisor = user?.role === 'SECURITY_SUPERVISOR'
  const isSecurityGuard = user?.role === 'SECURITY_GUARD'
  const isReceptionist = user?.role === 'RECEPTIONIST'
  const isHost = user?.role === 'HOST'
  const isRequestor = user?.role === 'REQUESTOR' // Company tenant user
  
  // Check if user can access VMS (Admin, Guard, Reception, or REQUESTOR with VMS access)
  const canAccessVMS = isAdmin || isSecuritySupervisor || isSecurityGuard || isReceptionist || 
                       (isRequestor && user?.hasVMSAccess)

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        // Use VMS auth endpoint (separate vms_users table)
        const response = await vmsApi.get('/auth/me')
        const userData = response.data.user || response.data
        
        // Add VMS permissions
        setUser({
          ...userData,
          permissions: userData.permissions || DEFAULT_VMS_PERMISSIONS
        })
      } catch (err) {
        console.error('Auth load failed:', err)
        removeToken()
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Login - Use VMS authentication (separate user table)
  const login = async (email, password) => {
    try {
      setError(null)
      
      // Use VMS authentication endpoint (separate vms_users table)
      const response = await vmsApi.post('/auth/login', { email, password })
      const { token, user: userData } = response.data
      
      setToken(token)
      setUser({
        ...userData,
        permissions: userData.permissions || DEFAULT_VMS_PERMISSIONS
      })
      
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.'
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
      const response = await mainApi.put('/auth/profile', data)
      setUser(prev => ({ ...prev, ...response.data.user }))
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Update failed'
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateProfile,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    isSecuritySupervisor,
    isSecurityGuard,
    isReceptionist,
    isHost,
    isRequestor,
    canAccessVMS,
    vmsApi,
    mainApi,
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
