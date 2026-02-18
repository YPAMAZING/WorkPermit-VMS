import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { employeePassApi, companySettingsApi } from '../../services/vmsApi'
import {
  FileText,
  Search,
  Plus,
  Eye,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  User,
  Phone,
  Building,
  Building2,
  Briefcase,
  X,
  Save,
  Share2,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react'

const VMSGatepasses = () => {
  const { canCreateGatepasses, canEditGatepasses, isAdmin, isReceptionist, isSecurityGuard, user, isCompanyUser } = useVMSAuth()
  
  // Can see all companies (admin, reception, guard)
  const canSeeAllCompanies = isAdmin || isReceptionist || isSecurityGuard
  
  // Company user without a companyId needs to select a company when creating pass
  const companyUserNeedsSelection = isCompanyUser && !user?.companyId
  
  // Can create employee passes: Admin, Reception, or Company Users (for their own company)
  const canCreateEmployeePass = isAdmin || isReceptionist || isCompanyUser || canCreateGatepasses || user?.companyId
  const [passes, setPasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ status: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPassModal, setShowPassModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revoked: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  // New employee pass form
  const [newPass, setNewPass] = useState({
    employeeName: '',
    phone: '',
    email: '',
    department: '',
    designation: '',
    joiningDate: '',
    validUntil: '',
    photo: null,
    companyId: user?.companyId || '',
  })

  const fetchPasses = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: filters.status || undefined,
        companyId: selectedCompanyId || undefined,
      }
      const response = await employeePassApi.getAll(params)
      setPasses(response.data.passes || [])
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }))
    } catch (error) {
      console.error('Failed to fetch passes:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchStats = async () => {
    try {
      const params = selectedCompanyId ? { companyId: selectedCompanyId } : {}
      const response = await employeePassApi.getStats(params)
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchCompanies = async () => {
    // Fetch companies for admin/reception OR company users who need to select a company
    if (!canSeeAllCompanies && !companyUserNeedsSelection) return
    try {
      const response = await companySettingsApi.getDropdown()
      setCompanies(response.data || [])
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchPasses()
    fetchStats()
  }, [pagination.page, filters, selectedCompanyId])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchPasses()
      } else {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(debounce)
  }, [search])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPasses()
    fetchStats()
  }

  const statusColors = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    EXPIRED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    REVOKED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewPass(prev => ({ ...prev, photo: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreatePass = async (e) => {
    e.preventDefault()
    if (!newPass.employeeName || !newPass.phone || !newPass.department || !newPass.validUntil) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    setSaving(true)
    try {
      const response = await employeePassApi.create({
        employeeName: newPass.employeeName,
        phone: newPass.phone,
        email: newPass.email || null,
        photo: newPass.photo || null,
        department: newPass.department,
        designation: newPass.designation || null,
        joiningDate: newPass.joiningDate || null,
        validUntil: newPass.validUntil,
        companyId: newPass.companyId || user?.companyId || null,
      })
      
      setMessage({ type: 'success', text: 'Employee pass created successfully!' })
      setShowCreateModal(false)
      setNewPass({
        employeeName: '',
        phone: '',
        email: '',
        department: '',
        designation: '',
        joiningDate: '',
        validUntil: '',
        photo: null,
        companyId: user?.companyId || '',
      })
      fetchPasses()
      fetchStats()
      
      // Show the created pass
      if (response.data.pass) {
        setShowPassModal(response.data.pass)
      }
    } catch (error) {
      console.error('Failed to create pass:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create pass' })
    } finally {
      setSaving(false)
    }
  }

  const handleShareWhatsApp = (pass) => {
    const passUrl = `${window.location.origin}/vms/employee-pass/${pass.id}`
    const message = `
*Employee Pass - Reliable Group*

Name: ${pass.employeeName}
Pass No: ${pass.passNumber}
Department: ${pass.department || 'N/A'}
${pass.designation ? `Designation: ${pass.designation}` : ''}
Valid Until: ${new Date(pass.validUntil).toLocaleDateString()}

Show this pass at entry gate.
Pass Link: ${passUrl}
    `.trim()
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    
    // Mark as shared
    employeePassApi.markShared(pass.id, 'WHATSAPP').catch(console.error)
  }

  const handleRevokePass = async (passId) => {
    const reason = window.prompt('Enter reason for revoking this pass (optional):')
    if (reason === null) return // User cancelled
    
    try {
      await employeePassApi.revoke(passId, reason)
      setMessage({ type: 'success', text: 'Pass revoked successfully' })
      fetchPasses()
      fetchStats()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke pass' })
    }
  }

  const handleDeletePass = async (passId) => {
    if (!window.confirm('Are you sure you want to delete this pass? This cannot be undone.')) return
    
    try {
      await employeePassApi.delete(passId)
      setMessage({ type: 'success', text: 'Pass deleted successfully' })
      fetchPasses()
      fetchStats()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete pass' })
    }
  }

  // Calculate default valid until (2 months from today)
  const getDefaultValidUntil = () => {
    const date = new Date()
    date.setMonth(date.getMonth() + 2)
    return date.toISOString().split('T')[0]
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employee Pass</h1>
          <p className="text-gray-500 mt-1">Create temporary passes for new employees (before ID card issuance)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {canCreateEmployeePass && (
            <button
              onClick={() => {
                setNewPass(prev => ({ ...prev, validUntil: getDefaultValidUntil(), companyId: user?.companyId || '' }))
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus size={18} />
              Create Employee Pass
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Passes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.expired}</p>
              <p className="text-xs text-gray-500">Expired</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.revoked}</p>
              <p className="text-xs text-gray-500">Revoked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Briefcase size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-800">New Employee Pass</h3>
            <p className="text-sm text-blue-600 mt-1">
              Create temporary passes for new joiners who haven't received their ID cards yet. 
              Passes are valid for up to 2 months and can be shared via WhatsApp. 
              Employees can show this pass at the entry gate until their official ID is issued.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, pass number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
            {canSeeAllCompanies && companies.length > 0 && (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.displayName || company.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>
            <button
              onClick={() => {
                setFilters({ status: '' })
                setSelectedCompanyId('')
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Passes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : passes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Briefcase size={48} className="mb-3 text-gray-300" />
            <p>No employee passes found</p>
            {canCreateEmployeePass && (
              <button
                onClick={() => {
                  setNewPass(prev => ({ ...prev, validUntil: getDefaultValidUntil(), companyId: user?.companyId || '' }))
                  setShowCreateModal(true)
                }}
                className="mt-4 text-teal-600 hover:text-teal-700"
              >
                Create your first employee pass
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pass No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                    {canSeeAllCompanies && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valid Until</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {passes.map((pass) => {
                    const isExpired = new Date(pass.validUntil) < new Date()
                    const status = pass.status === 'REVOKED' ? 'REVOKED' : (isExpired ? 'EXPIRED' : 'ACTIVE')
                    const statusStyle = statusColors[status] || statusColors.ACTIVE
                    const StatusIcon = statusStyle.icon
                    
                    return (
                      <tr key={pass.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-mono font-medium text-gray-800">{pass.passNumber}</p>
                          <p className="text-xs text-gray-400">
                            Created {formatDate(pass.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center overflow-hidden">
                              {pass.photo ? (
                                <img src={pass.photo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-teal-600 font-semibold text-sm">
                                  {pass.employeeName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{pass.employeeName}</p>
                              <p className="text-xs text-gray-500">{pass.phone}</p>
                            </div>
                          </div>
                        </td>
                        {canSeeAllCompanies && (
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-gray-400" />
                              <p className="text-sm text-gray-600">{pass.companyName || pass.company?.displayName || pass.company?.name || '-'}</p>
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-600">{pass.department || '-'}</p>
                          {pass.designation && (
                            <p className="text-xs text-gray-400">{pass.designation}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <p className="text-sm text-gray-600">
                              {formatDate(pass.validUntil)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                            <StatusIcon size={12} />
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setShowPassModal(pass)}
                              className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="View Pass"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleShareWhatsApp(pass)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Share on WhatsApp"
                            >
                              <Share2 size={18} />
                            </button>
                            {status === 'ACTIVE' && isAdmin && (
                              <button
                                onClick={() => handleRevokePass(pass.id)}
                                className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Revoke Pass"
                              >
                                <XCircle size={18} />
                              </button>
                            )}
                            {status !== 'ACTIVE' && isAdmin && (
                              <button
                                onClick={() => handleDeletePass(pass.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Pass"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-4 py-2 text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Employee Pass Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Create Employee Pass</h2>
                <p className="text-sm text-gray-500">Temporary pass for new joiners</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePass} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {newPass.photo ? (
                      <img src={newPass.photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 bg-teal-600 text-white rounded-full cursor-pointer hover:bg-teal-700">
                    <Plus size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Company Selection - For Admin/Reception or Company Users without assigned company */}
              {(canSeeAllCompanies || companyUserNeedsSelection) && companies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 size={14} className="inline mr-1" />
                    Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newPass.companyId}
                    onChange={(e) => setNewPass(prev => ({ ...prev, companyId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.displayName || company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={14} className="inline mr-1" />
                  Employee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPass.employeeName}
                  onChange={(e) => setNewPass(prev => ({ ...prev, employeeName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone size={14} className="inline mr-1" />
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newPass.phone}
                    onChange={(e) => setNewPass(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newPass.email}
                    onChange={(e) => setNewPass(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="email@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building size={14} className="inline mr-1" />
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPass.department}
                    onChange={(e) => setNewPass(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., IT, HR, Sales"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Briefcase size={14} className="inline mr-1" />
                    Designation
                  </label>
                  <input
                    type="text"
                    value={newPass.designation}
                    onChange={(e) => setNewPass(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., Software Engineer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={newPass.joiningDate}
                    onChange={(e) => setNewPass(prev => ({ ...prev, joiningDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock size={14} className="inline mr-1" />
                    Valid Until <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newPass.validUntil}
                    onChange={(e) => setNewPass(prev => ({ ...prev, validUntil: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Default: 2 months from today</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Create Pass
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Pass Modal */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Pass Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-4 text-white text-center flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 mx-auto bg-white rounded-lg p-1.5 mb-2" />
              <h2 className="text-lg font-bold">Reliable Group</h2>
              <p className="text-teal-100 text-xs">Employee Entry Pass</p>
            </div>

            {/* Pass Content - Scrollable */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Photo & Name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {showPassModal.photo ? (
                    <img src={showPassModal.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-100">
                      <User size={24} className="text-teal-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {showPassModal.employeeName}
                  </h3>
                  <p className="text-gray-500 text-sm">{showPassModal.designation || 'New Joiner'}</p>
                  <p className="text-xs text-gray-400">{showPassModal.department}</p>
                </div>
              </div>

              {/* Pass Details */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Pass Number</span>
                  <span className="font-mono font-semibold text-gray-800 text-xs">{showPassModal.passNumber}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Phone</span>
                  <span className="text-gray-800">{showPassModal.phone}</span>
                </div>
                {showPassModal.joiningDate && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Joining Date</span>
                    <span className="text-gray-800">{formatDate(showPassModal.joiningDate)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Valid Until</span>
                  <span className="text-gray-800">{formatDate(showPassModal.validUntil)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    showPassModal.status === 'REVOKED' ? 'bg-gray-100 text-gray-700' :
                    new Date(showPassModal.validUntil) < new Date() 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {showPassModal.status === 'REVOKED' ? 'REVOKED' :
                     new Date(showPassModal.validUntil) < new Date() ? 'EXPIRED' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              {showPassModal.qrCode && (
                <div className="flex justify-center mb-4">
                  <img src={showPassModal.qrCode} alt="QR Code" className="w-28 h-28" />
                </div>
              )}
            </div>

            {/* Actions - Fixed at bottom */}
            <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0 bg-gray-50">
              <button
                onClick={() => handleShareWhatsApp(showPassModal)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Share2 size={16} />
                Share on WhatsApp
              </button>
              <button
                onClick={() => setShowPassModal(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VMSGatepasses
