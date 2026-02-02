import { useState, useEffect } from 'react'
import { rolesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Lock,
  Eye,
  Palette,
  Settings,
} from 'lucide-react'

// Module icons
const moduleIcons = {
  dashboard: '📊',
  permits: '📋',
  approvals: '✅',
  workers: '👷',
  users: '👥',
  roles: '🔐',
  meters: '📏',
  settings: '⚙️',
  audit: '📝',
}

// Color options for UI customization
const colorOptions = [
  { name: 'slate', label: 'Slate', class: 'bg-slate-500' },
  { name: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { name: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { name: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { name: 'rose', label: 'Rose', class: 'bg-rose-500' },
  { name: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { name: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
]

const RoleManagement = () => {
  const { user } = useAuth()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [expandedRole, setExpandedRole] = useState(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: [],
    uiConfig: {
      sidebarColor: 'slate',
      accentColor: 'emerald',
      showAllMenus: false,
      dashboardWidgets: ['stats', 'activity'],
    },
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rolesAPI.getAll(),
        rolesAPI.getPermissions(),
      ])
      setRoles(rolesRes.data.roles)
      setPermissions(permsRes.data.grouped)
    } catch (error) {
      toast.error('Error fetching roles data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = () => {
    setEditingRole(null)
    setFormData({
      name: '',
      displayName: '',
      description: '',
      permissions: [],
      uiConfig: {
        sidebarColor: 'slate',
        accentColor: 'emerald',
        showAllMenus: false,
        dashboardWidgets: ['stats', 'activity'],
      },
    })
    setShowModal(true)
  }

  const handleEditRole = (role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      permissions: role.permissions || [],
      uiConfig: role.uiConfig || {
        sidebarColor: 'slate',
        accentColor: 'emerald',
        showAllMenus: false,
        dashboardWidgets: ['stats', 'activity'],
      },
    })
    setShowModal(true)
  }

  const handleDeleteRole = async (role) => {
    if (role.isSystem) {
      toast.error('Cannot delete system roles')
      return
    }

    if (!confirm(`Are you sure you want to delete "${role.displayName}"?`)) {
      return
    }

    try {
      await rolesAPI.delete(role.id)
      toast.success('Role deleted successfully')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting role')
    }
  }

  const handlePermissionToggle = (permKey) => {
    const newPerms = formData.permissions.includes(permKey)
      ? formData.permissions.filter(p => p !== permKey)
      : [...formData.permissions, permKey]
    setFormData({ ...formData, permissions: newPerms })
  }

  const handleSelectAllModule = (module) => {
    const modulePerms = permissions[module]?.map(p => p.key) || []
    const allSelected = modulePerms.every(p => formData.permissions.includes(p))
    
    if (allSelected) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => !modulePerms.includes(p))
      })
    } else {
      const newPerms = [...new Set([...formData.permissions, ...modulePerms])]
      setFormData({ ...formData, permissions: newPerms })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingRole) {
        await rolesAPI.update(editingRole.id, formData)
        toast.success('Role updated successfully')
      } else {
        await rolesAPI.create(formData)
        toast.success('Role created successfully')
      }
      setShowModal(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving role')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-500 mt-1">Manage roles and permissions for users</p>
        </div>
        <button
          onClick={handleCreateRole}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Role
        </button>
      </div>

      {/* Roles List */}
      <div className="space-y-4">
        {roles.map((role) => (
          <div 
            key={role.id} 
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Role Header */}
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  role.isSystem ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                  <Shield className={`w-6 h-6 ${
                    role.isSystem ? 'text-purple-600' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{role.displayName}</h3>
                    {role.isSystem && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{role.description || role.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{role.userCount} users</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Eye className="w-4 h-4" />
                  <span>{role.permissions?.length || 0} permissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditRole(role); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {expandedRole === role.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded Details */}
            {expandedRole === role.id && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Permissions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Permissions</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Object.entries(permissions).map(([module, perms]) => {
                        const modulePerms = perms.map(p => p.key)
                        const enabledCount = modulePerms.filter(p => role.permissions?.includes(p)).length
                        
                        return (
                          <div key={module} className="bg-white rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize flex items-center gap-2">
                                <span>{moduleIcons[module] || '📦'}</span>
                                {module}
                              </span>
                              <span className="text-xs text-gray-500">
                                {enabledCount}/{perms.length}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {perms.map(perm => (
                                <span
                                  key={perm.key}
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    role.permissions?.includes(perm.key)
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-gray-100 text-gray-400'
                                  }`}
                                >
                                  {perm.action}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* UI Config */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">UI Configuration</h4>
                    <div className="bg-white rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Sidebar Color</span>
                        <span className={`w-6 h-6 rounded-full bg-${role.uiConfig?.sidebarColor || 'slate'}-500`}></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Accent Color</span>
                        <span className={`w-6 h-6 rounded-full bg-${role.uiConfig?.accentColor || 'emerald'}-500`}></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Show All Menus</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          role.uiConfig?.showAllMenus ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {role.uiConfig?.showAllMenus ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Role Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                      className="input"
                      placeholder="ROLE_NAME"
                      disabled={editingRole?.isSystem}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Display Name *</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="input"
                      placeholder="Role Display Name"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input"
                      rows={2}
                      placeholder="Role description..."
                    />
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <label className="label flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Permissions
                  </label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {Object.entries(permissions).map(([module, perms], idx) => {
                      const modulePerms = perms.map(p => p.key)
                      const allSelected = modulePerms.every(p => formData.permissions.includes(p))
                      const someSelected = modulePerms.some(p => formData.permissions.includes(p))
                      
                      return (
                        <div 
                          key={module} 
                          className={`p-4 ${idx > 0 ? 'border-t border-gray-200' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
                                onChange={() => handleSelectAllModule(module)}
                                className="w-4 h-4 text-emerald-600 rounded"
                              />
                              <span className="font-medium capitalize flex items-center gap-2">
                                {moduleIcons[module] || '📦'} {module}
                              </span>
                            </label>
                            <span className="text-xs text-gray-500">
                              {modulePerms.filter(p => formData.permissions.includes(p)).length}/{perms.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                            {perms.map(perm => (
                              <label
                                key={perm.key}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                  formData.permissions.includes(perm.key)
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(perm.key)}
                                  onChange={() => handlePermissionToggle(perm.key)}
                                  className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <span className="text-sm">{perm.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* UI Customization */}
                <div>
                  <label className="label flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    UI Customization
                  </label>
                  <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                    {/* Sidebar Color */}
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Sidebar Color</label>
                      <div className="flex gap-2">
                        {colorOptions.map(color => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              uiConfig: { ...formData.uiConfig, sidebarColor: color.name }
                            })}
                            className={`w-8 h-8 rounded-full ${color.class} ${
                              formData.uiConfig.sidebarColor === color.name
                                ? 'ring-2 ring-offset-2 ring-gray-400'
                                : ''
                            }`}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Accent Color</label>
                      <div className="flex gap-2">
                        {colorOptions.map(color => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              uiConfig: { ...formData.uiConfig, accentColor: color.name }
                            })}
                            className={`w-8 h-8 rounded-full ${color.class} ${
                              formData.uiConfig.accentColor === color.name
                                ? 'ring-2 ring-offset-2 ring-gray-400'
                                : ''
                            }`}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Show All Menus */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.uiConfig.showAllMenus}
                        onChange={(e) => setFormData({
                          ...formData,
                          uiConfig: { ...formData.uiConfig, showAllMenus: e.target.checked }
                        })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="text-sm">Show all menu items (even without access)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingRole ? 'Update Role' : 'Create Role'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleManagement
