import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { user, token } = response.data
    localStorage.setItem('token', token)
    setUser(user)
    return user
  }

  const register = async (data) => {
    const response = await api.post('/auth/register', data)
    
    // Check if registration requires approval
    if (response.data.requiresApproval) {
      // Don't set user or token - they need to wait for approval
      return {
        requiresApproval: true,
        message: response.data.message,
      }
    }
    
    // Requestor role - auto-approved, login immediately
    const { user, token } = response.data
    localStorage.setItem('token', token)
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }))
  }

  // ============ CORE PERMISSION CHECK ============
  // Check if user has a specific permission
  // IMPORTANT: All permission checks should go through this function
  // Permissions are loaded from the database based on user's role
  const hasPermission = (permission) => {
    if (!user) return false
    // Check user's permissions array from their assigned role
    return user.permissions?.includes(permission) || false
  }

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions) => {
    if (!user) return false
    return permissions.some(p => user.permissions?.includes(p))
  }

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissions) => {
    if (!user) return false
    return permissions.every(p => user.permissions?.includes(p))
  }

  // ============ APPROVAL PERMISSIONS ============
  const canViewApprovals = () => hasAnyPermission(['approvals.view', 'approvals.approve'])

  const canApprove = () => hasPermission('approvals.approve')

  const canReapprove = () => hasAnyPermission(['approvals.reapprove', 'permits.reapprove'])

  const canSignApprovals = () => hasAnyPermission(['approvals.sign', 'approvals.approve'])

  // ============ PERMIT PERMISSIONS ============
  const canViewAllPermits = () => hasAnyPermission(['permits.view', 'permits.view_all'])

  const canViewOwnPermits = () => hasAnyPermission(['permits.view_own', 'permits.view', 'permits.view_all', 'permits.create'])

  const canCreatePermits = () => hasPermission('permits.create')

  const canEditPermits = () => hasPermission('permits.edit')

  const canDeletePermits = () => hasPermission('permits.delete')

  const canExtendPermits = () => hasPermission('permits.extend')

  const canRevokePermits = () => hasPermission('permits.revoke')

  const canReapprovePermits = () => hasPermission('permits.reapprove')

  const canClosePermits = () => hasPermission('permits.close')

  const canApprovePermits = () => hasPermission('permits.approve')

  const canExportPermitPDF = () => hasPermission('permits.export')

  // ============ USER PERMISSIONS ============
  const canViewUsers = () => hasPermission('users.view')

  const canManageUsers = () => hasAnyPermission(['users.view', 'users.edit', 'users.create', 'users.delete'])

  const canCreateUsers = () => hasPermission('users.create')

  const canEditUsers = () => hasPermission('users.edit')

  const canDeleteUsers = () => hasPermission('users.delete')

  const canAssignRoles = () => hasAnyPermission(['users.edit', 'users.assign_role'])

  // ============ ROLE PERMISSIONS ============
  const canViewRoles = () => hasPermission('roles.view')

  const canCreateRoles = () => hasPermission('roles.create')

  const canEditRoles = () => hasPermission('roles.edit')

  const canDeleteRoles = () => hasPermission('roles.delete')

  // ============ WORKER PERMISSIONS ============
  const canViewWorkers = () => hasPermission('workers.view')

  const canCreateWorkers = () => hasPermission('workers.create')

  const canEditWorkers = () => hasPermission('workers.edit')

  const canDeleteWorkers = () => hasPermission('workers.delete')

  // ============ SETTINGS PERMISSIONS ============
  const canViewSettings = () => hasPermission('settings.view') || true // Everyone can view their own profile settings

  const canEditSettings = () => hasPermission('settings.edit')

  const canEditSystemSettings = () => hasPermission('settings.system')

  // ============ AUDIT PERMISSIONS ============
  const canViewAuditLogs = () => hasPermission('audit.view')

  // ============ DASHBOARD PERMISSIONS ============
  const canViewDashboard = () => hasPermission('dashboard.view')

  const canViewStatistics = () => hasPermission('dashboard.stats')

  // ============ VMS PERMISSIONS ============
  const canAccessVMSAdmin = () => hasPermission('vms.admin')

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    
    // Token access for push notifications
    getToken: () => localStorage.getItem('token'),
    
    // Role checks (for UI display purposes only, NOT for permission checks)
    isAdmin: user?.role === 'ADMIN',
    isFireman: user?.role === 'FIREMAN' || user?.role === 'SAFETY_OFFICER',
    isSafetyOfficer: user?.role === 'FIREMAN' || user?.role === 'SAFETY_OFFICER',
    isRequestor: user?.role === 'REQUESTOR',
    
    // Core permission functions - USE THESE FOR ALL PERMISSION CHECKS
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Approval permissions
    canViewApprovals,
    canApprove,
    canReapprove,
    canSignApprovals,
    
    // Permit permissions
    canViewAllPermits,
    canViewOwnPermits,
    canCreatePermits,
    canEditPermits,
    canDeletePermits,
    canExtendPermits,
    canRevokePermits,
    canReapprovePermits,
    canClosePermits,
    canApprovePermits,
    canExportPermitPDF,
    
    // User permissions
    canViewUsers,
    canManageUsers,
    canCreateUsers,
    canEditUsers,
    canDeleteUsers,
    canAssignRoles,
    
    // Role permissions
    canViewRoles,
    canCreateRoles,
    canEditRoles,
    canDeleteRoles,
    
    // Worker permissions
    canViewWorkers,
    canCreateWorkers,
    canEditWorkers,
    canDeleteWorkers,
    
    // Settings permissions
    canViewSettings,
    canEditSettings,
    canEditSystemSettings,
    
    // Audit permissions
    canViewAuditLogs,
    
    // Dashboard permissions
    canViewDashboard,
    canViewStatistics,
    
    // VMS permissions
    canAccessVMSAdmin,
    
    // User permissions array (for debugging/display)
    permissions: user?.permissions || [],
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
