import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { gatepassesApi } from '../../services/vmsApi'
import {
  FileText,
  Search,
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
  X,
  Share2,
  Download,
  Trash2,
  RefreshCw,
} from 'lucide-react'

const VMSVisitorPasses = () => {
  const { isAdmin, hasPermission } = useVMSAuth()
  const [passes, setPasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ status: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [showPassModal, setShowPassModal] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [refreshing, setRefreshing] = useState(false)

  const fetchPasses = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: filters.status || undefined,
        // All gate passes are visitor passes (employee passes will have separate table)
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
      setRefreshing(false)
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

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPasses()
  }

  const statusColors = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    USED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
    EXPIRED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
  }

  const handleShareWhatsApp = (pass) => {
    const passUrl = `${window.location.origin}/vms/pass/${pass.id}`
    const message = `
*Visitor Pass - Reliable Group*

Name: ${pass.visitor?.name || pass.visitorName || 'N/A'}
Pass No: ${pass.gatepassNumber}
Purpose: ${pass.visitor?.purpose || pass.purpose || 'Visit'}
Valid Until: ${new Date(pass.validUntil).toLocaleDateString()}

Show this pass at entry gate.
Pass Link: ${passUrl}
    `.trim()
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleCancelPass = async (passId) => {
    if (!window.confirm('Are you sure you want to cancel this pass?')) return
    
    try {
      await gatepassesApi.cancel(passId)
      setMessage({ type: 'success', text: 'Pass cancelled successfully' })
      fetchPasses()
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel pass' })
    }
  }

  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Visitor Passes</h1>
          <p className="text-gray-500 mt-1">View and manage visitor gate passes</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
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
            <h3 className="font-medium text-blue-800">Visitor Gate Passes</h3>
            <p className="text-sm text-blue-600 mt-1">
              Gate passes are automatically generated when visitors are approved and checked in.
              These passes allow visitors to enter the premises during their valid period.
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
              placeholder="Search by visitor name, phone, pass number..."
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
              <option value="USED">Used</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
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
            <p>No visitor passes found</p>
            <p className="text-sm text-gray-400 mt-2">
              Passes are created when visitors are approved and checked in
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pass No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Visitor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valid Until</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {passes.map((pass) => {
                    const isExpired = new Date(pass.validUntil) < new Date()
                    const status = pass.status === 'CANCELLED' ? 'CANCELLED' : (isExpired ? 'EXPIRED' : pass.status || 'ACTIVE')
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
                              {pass.visitor?.photo ? (
                                <img src={pass.visitor.photo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-teal-600 font-semibold text-sm">
                                  {(pass.visitor?.name || pass.visitorName || 'V')?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{pass.visitor?.name || pass.visitorName || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{pass.visitor?.phone || pass.visitorPhone || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-600">{pass.visitor?.companyFrom || pass.company?.displayName || '-'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-600">{pass.visitor?.purpose || pass.purpose || '-'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <p className="text-sm text-gray-600">
                              {formatDateTime(pass.validUntil)}
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
                                onClick={() => handleCancelPass(pass.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancel Pass"
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

      {/* View Pass Modal */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            {/* Pass Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white text-center">
              <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto bg-white rounded-lg p-2 mb-3" />
              <h2 className="text-xl font-bold">Reliable Group</h2>
              <p className="text-teal-100 text-sm">Visitor Gate Pass</p>
            </div>

            {/* Pass Content */}
            <div className="p-6">
              {/* Photo & Name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {showPassModal.visitor?.photo ? (
                    <img src={showPassModal.visitor.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-100">
                      <User size={32} className="text-teal-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {showPassModal.visitor?.name || showPassModal.visitorName || 'Visitor'}
                  </h3>
                  <p className="text-gray-500">{showPassModal.visitor?.companyFrom || '-'}</p>
                  <p className="text-sm text-gray-400">{showPassModal.visitor?.phone || showPassModal.visitorPhone}</p>
                </div>
              </div>

              {/* Pass Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Pass Number</span>
                  <span className="font-mono font-semibold text-gray-800">{showPassModal.gatepassNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Purpose</span>
                  <span className="text-gray-800">{showPassModal.visitor?.purpose || showPassModal.purpose || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Meeting</span>
                  <span className="text-gray-800">{showPassModal.visitor?.personToMeet || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Check-in</span>
                  <span className="text-gray-800">{formatDateTime(showPassModal.visitor?.checkInTime)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Valid Until</span>
                  <span className="text-gray-800">{formatDateTime(showPassModal.validUntil)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    new Date(showPassModal.validUntil) < new Date() 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {new Date(showPassModal.validUntil) < new Date() ? 'EXPIRED' : showPassModal.status || 'ACTIVE'}
                  </span>
                </div>
              </div>

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

export default VMSVisitorPasses
