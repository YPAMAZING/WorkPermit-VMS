import { useState, useEffect, useCallback, useMemo } from 'react'
import { usersAPI, rolesAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Users as UsersIcon,
  Shield,
  User,
  Mail,
  Building,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  HardHat,
  ClipboardCheck,
  Phone,
  Calendar,
  UserCheck,
  Bell,
  ShieldPlus,
  Loader2,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

const Users = () => {
  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    page: 1,
  })
  const [modal, setModal] = useState({ open: false, type: null, user: null })
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'REQUESTOR',
    department: '',
    phone: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('approved')
  const [rejectReason, setRejectReason] = useState('')
  const [userStats, setUserStats] = useState(null)
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [roles, setRoles] = useState([])

  // Debounced search
  const handleSearchChange = useCallback((value) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value, page: 1 }))
    }, 300)
    setSearchTimeout(timeout)
  }, [searchTimeout])

  useEffect(() => {
    fetchPendingUsers()
    fetchUserStats()
    fetchRoles()
  }, [])

  // Fetch all roles from database
  const fetchRoles = useCallback(async () => {
    try {
      const response = await rolesAPI.getAll()
      setRoles(response.data.roles || response.data || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [filters])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await usersAPI.getAll({
        page: filters.page,
        limit: 10,
        search: filters.search,
        role: filters.role,
        status: 'approved',
      })
      setUsers(response.data.users)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Error fetching users')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchPendingUsers = useCallback(async () => {
    setPendingLoading(true)
    try {
      const response = await usersAPI.getPending()
      setPendingUsers(response.data.users)
    } catch (error) {
      console.error('Error fetching pending users:', error)
    } finally {
      setPendingLoading(false)
    }
  }, [])

  const fetchUserStats = useCallback(async () => {
    try {
      const response = await usersAPI.getStats()
      setUserStats(response.data)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }, [])

  const handleApproveUser = async (userId) => {
    try {
      await usersAPI.approve(userId)
      toast.success('User approved successfully!')
      fetchPendingUsers()
      fetchUsers()
      fetchUserStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error approving user')
    }
  }

  const handleRejectUser = async (userId) => {
    try {
      await usersAPI.reject(userId, rejectReason)
      toast.success('User registration rejected')
      setRejectReason('')
      closeModal()
      fetchPendingUsers()
      fetchUserStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error rejecting user')
    }
  }

  const openCreateModal = (role = 'REQUESTOR') => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: role,
      department: '',
      phone: '',
    })
    setModal({ open: true, type: 'create', user: null })
  }

  const openCreateAdminModal = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'ADMIN',
      department: 'Administration',
      phone: '',
    })
    setModal({ open: true, type: 'create-admin', user: null })
  }

  const openEditModal = (user) => {
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name || user.role || 'REQUESTOR',
      department: user.department || '',
      phone: user.phone || '',
      isActive: user.isActive,
      companyName: user.companyName || '',
      hasVMSAccess: user.hasVMSAccess || false,
    })
    setModal({ open: true, type: 'edit', user })
  }

  const openDeleteModal = (user) => {
    setModal({ open: true, type: 'delete', user })
  }

  const openRejectModal = (user) => {
    setRejectReason('')
    setModal({ open: true, type: 'reject', user })
  }

  const closeModal = () => {
    setModal({ open: false, type: null, user: null })
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'REQUESTOR',
      department: '',
      phone: '',
      companyName: '',
      hasVMSAccess: false,
    })
    setShowPassword(false)
    setRejectReason('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (modal.type === 'create' || modal.type === 'create-admin') {
        await usersAPI.create(formData)
        toast.success(modal.type === 'create-admin' ? 'Admin created successfully! They can login now.' : 'User created successfully')
      } else if (modal.type === 'edit') {
        const updateData = { ...formData }
        if (!updateData.password) delete updateData.password
        await usersAPI.update(modal.user.id, updateData)
        toast.success('User updated successfully')
      }
      fetchUsers()
      fetchUserStats()
      closeModal()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!modal.user) return

    setSubmitting(true)
    try {
      const deletedUserId = modal.user.id
      await usersAPI.delete(deletedUserId)
      toast.success('User deleted successfully')
      // Immediately remove from local state for instant UI update
      setUsers(prevUsers => prevUsers.filter(user => user.id !== deletedUserId))
      setPendingUsers(prevPending => prevPending.filter(user => user.id !== deletedUserId))
      fetchUserStats()
      closeModal()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting user')
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleBadge = useMemo(() => (roleName) => {
    const role = typeof roleName === 'object' ? roleName?.name : roleName
    const badges = {
      ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin', icon: Shield },
      FIREMAN: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Fireman', icon: HardHat },
      SAFETY_OFFICER: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Fireman', icon: HardHat }, // Backward compatibility
      REQUESTOR: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Requestor', icon: ClipboardCheck },
    }
    // Check if role exists in predefined badges, otherwise create a custom badge
    if (badges[role]) {
      return badges[role]
    }
    // For custom roles, find from fetched roles or create default
    const customRole = roles.find(r => r.name === role)
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      label: customRole?.displayName || role,
      icon: Shield
    }
  }, [roles])

  // Loading skeleton component
  const TableSkeleton = () => (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with Stats - Compact */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">Manage users and approvals</p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">{userStats?.activeUsers || 0} Active</span>
          </div>
          {pendingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">{pendingUsers.length} Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
        <button 
          onClick={openCreateAdminModal} 
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
        >
          <ShieldPlus className="w-4 h-4" />
          Create Admin
        </button>
        <button 
          onClick={() => openCreateModal('REQUESTOR')} 
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
        <div className="flex-1" />
        {pendingUsers.length > 0 && (
          <button 
            onClick={() => setActiveTab('pending')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-200 transition-all"
          >
            <Bell className="w-4 h-4" />
            {pendingUsers.length} Pending Approval
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'approved' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === 'pending' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending
          {pendingUsers.length > 0 && (
            <span className="w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Users Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingLoading ? (
            <div className="card p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-gray-500">
              <CheckCircle2 className="w-12 h-12 text-gray-300 mb-3" />
              <p className="font-medium text-gray-700">No Pending Registrations</p>
              <p className="text-sm text-gray-500">All registrations have been processed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingUsers.map((user) => {
                const roleBadge = getRoleBadge(user.requestedRole)
                const RoleIcon = roleBadge.icon
                return (
                  <div key={user.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 border-b border-amber-100 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge.bg} ${roleBadge.text}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleBadge.label}
                      </span>
                      <span className="text-xs text-amber-600">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#1e3a6e] to-[#2a4a80] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-white">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate text-sm">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      {(user.phone || user.department) && (
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {user.phone}
                            </span>
                          )}
                          {user.department && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" /> {user.department}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex border-t border-gray-100">
                      <button
                        onClick={() => openRejectModal(user)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <div className="w-px bg-gray-100" />
                      <button
                        onClick={() => handleApproveUser(user.id)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Approved Users Tab */}
      {activeTab === 'approved' && (
        <>
          {/* Search Bar - Simplified */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                defaultValue={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#1e3a6e] focus:ring-1 focus:ring-[#1e3a6e]/20 outline-none transition-all"
              />
            </div>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#1e3a6e] outline-none"
            >
              <option value="">All Roles</option>
              {roles.length > 0 ? (
                roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.displayName || role.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="ADMIN">Admin</option>
                  <option value="FIREMAN">Fireman</option>
                  <option value="REQUESTOR">Requestor</option>
                </>
              )}
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {loading ? (
              <TableSkeleton />
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <UsersIcon className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-medium">No users found</p>
                <button onClick={() => openCreateModal()} className="btn btn-primary mt-3 text-sm">
                  <Plus className="w-4 h-4 mr-1" /> Add User
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Department</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((user) => {
                      const roleBadge = getRoleBadge(user.role?.name || user.role)
                      const RoleIcon = roleBadge.icon
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-[#1e3a6e] to-[#2a4a80] rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-white">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge.bg} ${roleBadge.text}`}>
                              <RoleIcon className="w-3 h-3" />
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-sm text-gray-600">{user.department || '—'}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-1.5 text-gray-400 hover:text-[#1e3a6e] hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(user)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-600 px-2">
                    {pagination.page}/{pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={filters.page === pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Admin Modal */}
      {modal.open && modal.type === 'create-admin' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white rounded-t-2xl">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <ShieldPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Create Admin Account</h3>
                <p className="text-xs text-gray-500">Full system access will be granted</p>
              </div>
              <button onClick={closeModal} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                    placeholder="admin@company.com"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none"
                  placeholder="Administration"
                />
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-700">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Admin Role</span>
                </div>
                <p className="text-xs text-purple-600 mt-1">This user will have full access to all system features including user management, approvals, and settings.</p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 text-sm flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ShieldPlus className="w-4 h-4" />
                      Create Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {modal.open && (modal.type === 'create' || modal.type === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modal.type === 'create' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                {modal.type === 'create' ? (
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Edit className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {modal.type === 'create' ? 'Add New User' : 'Edit User'}
                </h3>
                <p className="text-xs text-gray-500">
                  {modal.type === 'create' ? 'Create a new user account' : 'Update user details'}
                </p>
              </div>
              <button onClick={closeModal} className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a6e] focus:ring-1 focus:ring-[#1e3a6e]/20 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a6e] focus:ring-1 focus:ring-[#1e3a6e]/20 outline-none"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a6e] focus:ring-1 focus:ring-[#1e3a6e]/20 outline-none"
                  required
                  disabled={modal.type === 'edit'}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password {modal.type === 'create' ? '*' : '(leave blank to keep)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a6e] focus:ring-1 focus:ring-[#1e3a6e]/20 outline-none"
                    required={modal.type === 'create'}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a6e] outline-none"
                    required
                  >
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.displayName || role.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="REQUESTOR">Requestor</option>
                        <option value="FIREMAN">Fireman</option>
                        <option value="ADMIN">Admin</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#1e3a6e] focus:ring-1 focus:ring-[#1e3a6e]/20 outline-none"
                  />
                </div>
              </div>
              
              {modal.type === 'edit' && (
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#1e3a6e] focus:ring-[#1e3a6e]"
                  />
                  <span className="text-sm text-gray-700">User is active</span>
                </label>
              )}
              
              {/* VMS Access Toggle - Only for REQUESTOR role */}
              {modal.type === 'edit' && (formData.role === 'REQUESTOR' || modal.user?.role?.name === 'REQUESTOR') && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-teal-600" />
                      <span className="text-sm font-medium text-teal-800">VMS Access</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasVMSAccess || false}
                        onChange={(e) => setFormData({ ...formData, hasVMSAccess: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                  {formData.hasVMSAccess && (
                    <div>
                      <label className="block text-xs font-medium text-teal-700 mb-1">Company Name (for VMS)</label>
                      <input
                        type="text"
                        value={formData.companyName || ''}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none bg-white"
                        placeholder="e.g., Vodafone, HCL Technologies"
                      />
                      <p className="text-xs text-teal-600 mt-1">Enabling VMS access will automatically turn ON approval-based visitors for this company.</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-[#1e3a6e] text-white font-medium rounded-lg hover:bg-[#162d57] transition-colors disabled:opacity-70 text-sm flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : modal.type === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal.open && modal.type === 'delete' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete User</h3>
              <p className="text-gray-500 text-sm mb-5">
                Delete <span className="font-semibold text-gray-700">{modal.user?.firstName} {modal.user?.lastName}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm" disabled={submitting}>
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {modal.open && modal.type === 'reject' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Reject Registration</h3>
                  <p className="text-xs text-gray-500">{modal.user?.firstName} {modal.user?.lastName}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none min-h-[80px]"
                  placeholder="Provide a reason..."
                />
              </div>
              
              <div className="flex gap-2">
                <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  Cancel
                </button>
                <button 
                  onClick={() => handleRejectUser(modal.user.id)} 
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
