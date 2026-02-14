import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { gatepassesApi } from '../../services/vmsApi'
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
  Briefcase,
  X,
  Save,
  Share2,
  Download,
  Trash2,
} from 'lucide-react'

const VMSGatepasses = () => {
  const { canCreateGatepasses, canEditGatepasses, isAdmin } = useVMSAuth()
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
  })

  const fetchPasses = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: filters.status || undefined,
        type: 'EMPLOYEE', // Only fetch employee passes
      }
      const response = await gatepassesApi.getAll(params)
      setPasses(response.data.gatepasses || [])
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }))
    } catch (error) {
      console.error('Failed to fetch passes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPasses()
  }, [pagination.page, filters])

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
      const response = await gatepassesApi.create({
        ...newPass,
        type: 'EMPLOYEE',
        visitorName: newPass.employeeName,
        visitorPhone: newPass.phone,
        visitorEmail: newPass.email,
        purpose: 'NEW_EMPLOYEE',
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
      })
      fetchPasses()
      // Show the created pass
      if (response.data.gatepass) {
        setShowPassModal(response.data.gatepass)
      }
    } catch (error) {
      console.error('Failed to create pass:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create pass' })
    } finally {
      setSaving(false)
    }
  }

  const handleShareWhatsApp = (pass) => {
    const passUrl = `${window.location.origin}/pass/${pass.id}`
    const message = `
*Employee Pass - Reliable Group*

Name: ${pass.visitorName || pass.employeeName}
Pass No: ${pass.gatepassNumber}
Department: ${pass.department || 'N/A'}
Valid Until: ${new Date(pass.validUntil).toLocaleDateString()}

Show this pass at entry gate.
Pass Link: ${passUrl}
    `.trim()
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleRevokePass = async (passId) => {
    if (!window.confirm('Are you sure you want to revoke this pass?')) return
    
    try {
      await gatepassesApi.cancel(passId)
      setMessage({ type: 'success', text: 'Pass revoked successfully' })
      fetchPasses()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke pass' })
    }
  }

  // Calculate default valid until (2 months from today)
  const getDefaultValidUntil = () => {
    const date = new Date()
    date.setMonth(date.getMonth() + 2)
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Visitor Pass</h1>
          <p className="text-gray-500 mt-1">Create temporary passes for new employees (before ID card issuance)</p>
        </div>
        {(canCreateGatepasses || isAdmin) && (
          <button
            onClick={() => {
              setNewPass(prev => ({ ...prev, validUntil: getDefaultValidUntil() }))
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus size={18} />
            Create Employee Pass
          </button>
        )}
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
            <FileText size={20} className="text-blue-600" />
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
              onClick={() => setFilters({ status: '' })}
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
            <FileText size={48} className="mb-3 text-gray-300" />
            <p>No employee passes found</p>
            {(canCreateGatepasses || isAdmin) && (
              <button
                onClick={() => {
                  setNewPass(prev => ({ ...prev, validUntil: getDefaultValidUntil() }))
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valid Until</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {passes.map((pass) => {
                    const isExpired = new Date(pass.validUntil) < new Date()
                    const status = pass.status === 'CANCELLED' ? 'REVOKED' : (isExpired ? 'EXPIRED' : 'ACTIVE')
                    const statusStyle = statusColors[status] || statusColors.ACTIVE
                    const StatusIcon = statusStyle.icon
                    
                    return (
                      <tr key={pass.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-mono font-medium text-gray-800">{pass.gatepassNumber}</p>
                          <p className="text-xs text-gray-400">
                            Created {new Date(pass.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center overflow-hidden">
                              {pass.photo || pass.visitorPhoto ? (
                                <img src={pass.photo || pass.visitorPhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-teal-600 font-semibold text-sm">
                                  {(pass.visitorName || pass.employeeName)?.split(' ').map(n => n[0]).join('')}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{pass.visitorName || pass.employeeName}</p>
                              <p className="text-xs text-gray-500">{pass.visitorPhone || pass.phone}</p>
                            </div>
                          </div>
                        </td>
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
                              {new Date(pass.validUntil).toLocaleDateString()}
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
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Revoke Pass"
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
                    placeholder="+91 9876543210"
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
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            {/* Pass Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white text-center">
              <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto bg-white rounded-lg p-2 mb-3" />
              <h2 className="text-xl font-bold">Reliable Group</h2>
              <p className="text-teal-100 text-sm">Employee Entry Pass</p>
            </div>

            {/* Pass Content */}
            <div className="p-6">
              {/* Photo & Name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {showPassModal.photo || showPassModal.visitorPhoto ? (
                    <img src={showPassModal.photo || showPassModal.visitorPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-100">
                      <User size={32} className="text-teal-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {showPassModal.visitorName || showPassModal.employeeName}
                  </h3>
                  <p className="text-gray-500">{showPassModal.designation || 'New Joiner'}</p>
                  <p className="text-sm text-gray-400">{showPassModal.department}</p>
                </div>
              </div>

              {/* Pass Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Pass Number</span>
                  <span className="font-mono font-semibold text-gray-800">{showPassModal.gatepassNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Phone</span>
                  <span className="text-gray-800">{showPassModal.visitorPhone || showPassModal.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Valid Until</span>
                  <span className="text-gray-800">{new Date(showPassModal.validUntil).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    new Date(showPassModal.validUntil) < new Date() 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {new Date(showPassModal.validUntil) < new Date() ? 'EXPIRED' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              {showPassModal.qrCode && (
                <div className="flex justify-center mb-6">
                  <img src={showPassModal.qrCode} alt="QR Code" className="w-32 h-32" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleShareWhatsApp(showPassModal)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Share2 size={18} />
                  Share on WhatsApp
                </button>
                <button
                  onClick={() => setShowPassModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VMSGatepasses
