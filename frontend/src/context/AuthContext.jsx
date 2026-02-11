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

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user) return false
    // Admin has all permissions
    if (user.role === 'ADMIN') return true
    // Check user's permissions array
    return user.permissions?.includes(permission) || false
  }

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions) => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return permissions.some(p => user.permissions?.includes(p))
  }

  // ============ APPROVAL PERMISSIONS ============
  // Check if user can view approvals
  const canViewApprovals = () => {
    if (!user) return false
    // Support both FIREMAN and SAFETY_OFFICER for backward compatibility
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('approvals.view')
  }

  // Check if user can approve/reject permits
  const canApprove = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('approvals.approve')
  }

  // Check if user can re-approve revoked permits
  const canReapprove = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('approvals.reapprove') || hasPermission('permits.reapprove')
  }

  // Check if user can sign approvals
  const canSignApprovals = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('approvals.sign')
  }

  // ============ PERMIT PERMISSIONS ============
  // Check if user can view all permits
  const canViewAllPermits = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('permits.view_all')
  }

  // Check if user can create permits
  const canCreatePermits = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('permits.create')
  }

  // Check if user can edit permits
  const canEditPermits = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('permits.edit')
  }

  // Check if user can delete permits
  const canDeletePermits = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('permits.delete')
  }

  // Check if user can extend permits
  const canExtendPermits = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('permits.extend')
  }

  // Check if user can revoke permits
  const canRevokePermits = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('permits.revoke')
  }

  // Check if user can re-approve revoked permits
  const canReapprovePermits = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('permits.reapprove')
  }

  // Check if user can close permits
  const canClosePermits = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('permits.close')
  }

  // Check if user can export permit PDF
  const canExportPermitPDF = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('permits.export')
  }

  // ============ USER PERMISSIONS ============
  // Check if user can view users
  const canViewUsers = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('users.view')
  }

  // Check if user can manage users
  const canManageUsers = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasAnyPermission(['users.view', 'users.edit', 'users.create', 'users.delete'])
  }

  // Check if user can create users
  const canCreateUsers = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('users.create')
  }

  // Check if user can edit users
  const canEditUsers = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('users.edit')
  }

  // Check if user can delete users
  const canDeleteUsers = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('users.delete')
  }

  // Check if user can assign roles
  const canAssignRoles = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('users.assign_role')
  }

  // ============ ROLE PERMISSIONS ============
  // Check if user can view roles
  const canViewRoles = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('roles.view')
  }

  // Check if user can create roles
  const canCreateRoles = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('roles.create')
  }

  // Check if user can edit roles
  const canEditRoles = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('roles.edit')
  }

  // Check if user can delete roles
  const canDeleteRoles = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('roles.delete')
  }

  // ============ WORKER PERMISSIONS ============
  const canViewWorkers = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('workers.view')
  }

  const canCreateWorkers = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('workers.create')
  }

  const canEditWorkers = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('workers.edit')
  }

  const canDeleteWorkers = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('workers.delete')
  }

  // ============ SETTINGS PERMISSIONS ============
  const canViewSettings = () => {
    if (!user) return false
    return true // Everyone can view their own settings
  }

  const canEditSettings = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('settings.edit')
  }

  const canEditSystemSettings = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('settings.system')
  }

  // ============ AUDIT PERMISSIONS ============
  const canViewAuditLogs = () => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return hasPermission('audit.view')
  }

  // ============ DASHBOARD PERMISSIONS ============
  const canViewDashboard = () => {
    if (!user) return false
    return hasPermission('dashboard.view') || user.role === 'ADMIN'
  }

  const canViewStatistics = () => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'FIREMAN' || user.role === 'SAFETY_OFFICER') return true
    return hasPermission('dashboard.stats')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    // Role checks (for backward compatibility with system roles)
    isAdmin: user?.role === 'ADMIN',
    isFireman: user?.role === 'FIREMAN' || user?.role === 'SAFETY_OFFICER',
    isSafetyOfficer: user?.role === 'FIREMAN' || user?.role === 'SAFETY_OFFICER', // Alias for backward compatibility
    isRequestor: user?.role === 'REQUESTOR',
    // Permission-based checks (works with custom roles too)
    hasPermission,
    hasAnyPermission,
    // Approval permissions
    canViewApprovals,
    canApprove,
    canReapprove,
    canSignApprovals,
    // Permit permissions
    canViewAllPermits,
    canCreatePermits,
    canEditPermits,
    canDeletePermits,
    canExtendPermits,
    canRevokePermits,
    canReapprovePermits,
    canClosePermits,
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
    // User permissions array
    permissions: user?.permissions || [],
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
