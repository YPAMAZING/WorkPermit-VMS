import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Users,
  Shield,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Simple MIS Permission list
const misPermissions = [
  { key: 'mis.access', name: 'Access MIS' },
  { key: 'mis.dashboard', name: 'View Dashboard' },
  { key: 'meters.view', name: 'View Readings' },
  { key: 'meters.create', name: 'Create Readings' },
  { key: 'meters.edit', name: 'Edit Readings' },
  { key: 'meters.delete', name: 'Delete Readings' },
  { key: 'meters.verify', name: 'Verify Readings' },
  { key: 'meters.analytics', name: 'View Analytics' },
  { key: 'meters.export', name: 'Export Data' },
]

const MISSettings = ({ initialTab = 'roles' }) => {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [showNewRoleForm, setShowNewRoleForm] = useState(false)
  const [newRole, setNewRole] = useState({ name: '', displayName: '', description: '', permissions: [] })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    // Fetch roles and users in parallel
    const results = await Promise.allSettled([
      fetchRoles(token),
      fetchUsers(token)
    ])
    
    // Check if both failed
    const rolesFailed = results[0].status === 'rejected'
    const usersFailed = results[1].status === 'rejected'
    
    if (rolesFailed && usersFailed) {
      setError('Unable to access settings. You may not have the required permissions.')
    }
    
    setLoading(false)
  }

  const fetchRoles = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // 10 second timeout
      })
      
      const allRoles = Array.isArray(response.data) ? response.data : (response.data.roles || [])
      
      // Filter to MIS-related roles
      const misRoles = allRoles.filter(r => {
        const name = r.name || ''
        const perms = Array.isArray(r.permissions) ? r.permissions : 
                      (typeof r.permissions === 'string' ? JSON.parse(r.permissions || '[]') : [])
        return name.includes('MIS') || 
               name === 'SITE_ENGINEER' || 
               name === 'ADMIN' ||
               name === 'FIREMAN' ||
               perms.some(p => typeof p === 'string' && (p.startsWith('mis.') || p.startsWith('meters.')))
      })
      
      setRoles(misRoles.length > 0 ? misRoles : allRoles.slice(0, 10))
      return true
    } catch (err) {
      console.error('Error fetching roles:', err.response?.status, err.message)
      
      // If 403 Forbidden - user doesn't have roles.view permission
      if (err.response?.status === 403) {
        // Don't set error here - we might still be able to show users
        setRoles([])
      } else {
        throw err
      }
      return false
    }
  }

  const fetchUsers = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      })
      
      const allUsers = response.data.users || []
      
      // Filter to MIS-related users
      const misUsers = allUsers.filter(u => {
        const perms = u.permissions || []
        const role = u.role || u.roleName || ''
        return role.includes('MIS') || 
               role === 'SITE_ENGINEER' || 
               role === 'ADMIN' ||
               (Array.isArray(perms) && perms.some(p => typeof p === 'string' && (p.startsWith('mis.') || p.startsWith('meters.'))))
      })
      
      setUsers(misUsers.length > 0 ? misUsers : allUsers.slice(0, 20))
      return true
    } catch (err) {
      console.error('Error fetching users:', err.response?.status, err.message)
      setUsers([])
      return false
    }
  }

  const handleSaveRole = async (roleData, isNew = false) => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (isNew) {
        await axios.post(`${API_URL}/roles`, {
          ...roleData,
          name: roleData.name.toUpperCase().replace(/\s+/g, '_'),
        }, { headers: { Authorization: `Bearer ${token}` } })
        toast.success('Role created')
        setShowNewRoleForm(false)
        setNewRole({ name: '', displayName: '', description: '', permissions: [] })
      } else {
        await axios.put(`${API_URL}/roles/${roleData.id}`, roleData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success('Role updated')
        setEditingRole(null)
      }
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving role')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Delete this role?')) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Role deleted')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting role')
    }
  }

  const togglePermission = (key, isNew = false) => {
    if (isNew) {
      setNewRole(prev => ({
        ...prev,
        permissions: prev.permissions.includes(key)
          ? prev.permissions.filter(p => p !== key)
          : [...prev.permissions, key]
      }))
    } else if (editingRole) {
      const perms = editingRole.permissions || []
      setEditingRole(prev => ({
        ...prev,
        permissions: perms.includes(key)
          ? perms.filter(p => p !== key)
          : [...perms, key]
      }))
    }
  }

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // Full Error State (both roles and users failed)
  if (error && roles.length === 0 && users.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MIS Settings</h1>
          <p className="text-gray-500">Manage MIS roles and user access</p>
        </div>
        
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Limited Access</h2>
              <p className="text-gray-600 mt-1">{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                This usually happens when your role doesn't include the <code className="bg-yellow-100 px-1 rounded">roles.view</code> permission.
              </p>
              <div className="mt-4 flex gap-3">
                <button 
                  onClick={fetchData} 
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Show current user info for debugging */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Your Account (Debug Info)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name:</span>
              <span className="font-medium">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role (from context):</span>
              <span className="font-medium text-purple-600">{user?.role || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role Name:</span>
              <span className="font-medium">{user?.roleName || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Is Admin (context):</span>
              <span className={`font-medium ${isAdmin ? 'text-green-600' : 'text-red-600'}`}>
                {isAdmin ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Permissions:</span>
              <span className="font-medium text-xs">
                {user?.permissions?.length || 0} permissions
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> The Settings page requires <code className="bg-gray-100 px-1 rounded">roles.view</code> permission, 
              or the ADMIN role. If your role is 'ADMIN' but you still see this error, 
              please try logging out and logging back in.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MIS Settings</h1>
        <p className="text-gray-500">Manage MIS roles and user access</p>
      </div>

      {/* Partial Access Warning */}
      {roles.length === 0 && users.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            You don't have permission to manage roles. Showing MIS users only.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roles' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-1.5" />
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />
          Users ({users.length})
        </button>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {roles.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">No roles to display</p>
              <p className="text-gray-500 text-sm mt-1">You may not have permission to view roles</p>
            </div>
          ) : (
            <>
              {/* Create Role Button */}
              {isAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowNewRoleForm(!showNewRoleForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                    Create Role
                  </button>
                </div>
              )}

              {/* New Role Form */}
              {showNewRoleForm && (
                <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
                  <h3 className="font-semibold mb-3">New MIS Role</h3>
                  <div className="grid sm:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={(e) => setNewRole(p => ({ ...p, name: e.target.value }))}
                      placeholder="Role Name (e.g., MIS_SUPERVISOR)"
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={newRole.displayName}
                      onChange={(e) => setNewRole(p => ({ ...p, displayName: e.target.value }))}
                      placeholder="Display Name"
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {misPermissions.map(p => (
                      <label key={p.key} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                        newRole.permissions.includes(p.key) ? 'bg-purple-200 text-purple-800' : 'bg-white border text-gray-700'
                      }`}>
                        <input
                          type="checkbox"
                          checked={newRole.permissions.includes(p.key)}
                          onChange={() => togglePermission(p.key, true)}
                          className="w-3 h-3"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowNewRoleForm(false); setNewRole({ name: '', displayName: '', description: '', permissions: [] }) }}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveRole(newRole, true)}
                      disabled={saving || !newRole.name || !newRole.displayName}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Create'}
                    </button>
                  </div>
                </div>
              )}

              {/* Roles Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {roles.map(role => {
                  const perms = typeof role.permissions === 'string' 
                    ? JSON.parse(role.permissions || '[]') 
                    : (role.permissions || [])
                  const isEditing = editingRole?.id === role.id
                  
                  return (
                    <div key={role.id} className={`bg-white rounded-xl border p-4 transition-shadow ${
                      isEditing ? 'border-purple-400 shadow-md' : 'border-gray-200 hover:shadow-sm'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield className={`w-5 h-5 ${role.isSystem ? 'text-blue-600' : 'text-purple-600'}`} />
                          <div>
                            <h3 className="font-semibold text-gray-900">{role.displayName}</h3>
                            <p className="text-xs text-gray-500">{role.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {role.isSystem && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">System</span>
                          )}
                          {!role.isSystem && isAdmin && (
                            <>
                              <button
                                onClick={() => setEditingRole(isEditing ? null : { ...role, permissions: perms })}
                                className={`p-1.5 rounded transition-colors ${isEditing ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-500'}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteRole(role.id)} 
                                className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-3 mt-3 pt-3 border-t">
                          <input
                            type="text"
                            value={editingRole.displayName}
                            onChange={(e) => setEditingRole(p => ({ ...p, displayName: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {misPermissions.map(p => (
                              <label key={p.key} className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                editingRole.permissions.includes(p.key) ? 'bg-purple-200 text-purple-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={editingRole.permissions.includes(p.key)}
                                  onChange={() => togglePermission(p.key)}
                                  className="w-3 h-3"
                                />
                                {p.name}
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={() => setEditingRole(null)} className="px-3 py-1.5 border rounded-lg text-sm">
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveRole(editingRole)}
                              disabled={saving}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {perms.slice(0, 4).map(p => (
                            <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {typeof p === 'string' ? p.split('.')[1] : p}
                            </span>
                          ))}
                          {perms.length > 4 && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                              +{perms.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold">MIS Users</h3>
              <p className="text-sm text-gray-500">Users with MIS system access</p>
            </div>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
              {users.length} users
            </span>
          </div>
          
          {users.length > 0 ? (
            <div className="divide-y">
              {users.map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.isActive !== false && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'SITE_ENGINEER' ? 'bg-orange-100 text-orange-700' :
                      u.role === 'FIREMAN' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {u.roleName || u.role?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No MIS users found</p>
              <p className="text-sm mt-1">Users with MIS permissions will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MISSettings
