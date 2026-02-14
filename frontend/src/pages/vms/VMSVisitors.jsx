import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { visitorsApi } from '../../services/vmsApi'
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  Building,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Calendar,
  Clock,
  User,
  FileText,
  Car,
  CheckCircle,
  Save,
} from 'lucide-react'

const VMSVisitors = () => {
  const { canCreateVisitors, canEditVisitors, canDeleteVisitors, isAdmin } = useVMSAuth()
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ isBlacklisted: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [error, setError] = useState(null)
  const [viewVisitor, setViewVisitor] = useState(null)
  const [editVisitor, setEditVisitor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const fetchVisitors = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        isBlacklisted: filters.isBlacklisted || undefined,
      }
      const response = await visitorsApi.getAll(params)
      setVisitors(response.data.visitors || [])
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }))
    } catch (error) {
      console.error('Failed to fetch visitors:', error)
      setError(error.response?.data?.message || 'Failed to load visitors. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVisitors()
  }, [pagination.page, filters])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchVisitors()
      } else {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(debounce)
  }, [search])

  const handleDelete = async (id) => {
    try {
      await visitorsApi.delete(id)
      setDeleteConfirm(null)
      setMessage({ type: 'success', text: 'Visitor deleted successfully' })
      fetchVisitors()
    } catch (error) {
      console.error('Failed to delete visitor:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete visitor' })
    }
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await visitorsApi.update(editVisitor.id, editVisitor)
      setEditVisitor(null)
      setMessage({ type: 'success', text: 'Visitor updated successfully' })
      fetchVisitors()
    } catch (error) {
      console.error('Failed to update visitor:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update visitor' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Visitors</h1>
          <p className="text-gray-500 mt-1">Manage registered visitors</p>
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

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Filter Toggle */}
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

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
            <select
              value={filters.isBlacklisted}
              onChange={(e) => setFilters({ ...filters, isBlacklisted: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Visitors</option>
              <option value="false">Active Only</option>
              <option value="true">Blacklisted Only</option>
            </select>
            <button
              onClick={() => setFilters({ isBlacklisted: '' })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchVisitors}
              className="ml-auto text-red-600 hover:text-red-700 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Visitors Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Users size={48} className="mb-3 text-gray-300" />
            <p>No visitors found</p>
            <p className="text-sm text-gray-400 mt-1">Visitors will appear here when they check in</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Visitor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Visits</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center overflow-hidden">
                            {visitor.photo ? (
                              <img src={visitor.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-teal-600 font-semibold">
                                {visitor.visitorName?.[0] || 'V'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {visitor.visitorName}
                            </p>
                            <p className="text-xs text-gray-400">{visitor.id?.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone size={14} className="text-gray-400" />
                            {visitor.phone}
                          </p>
                          {visitor.email && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={14} className="text-gray-400" />
                              {visitor.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {visitor.companyToVisit ? (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Building size={14} className="text-gray-400" />
                            {visitor.companyToVisit}
                          </p>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-gray-700">
                          {visitor.totalVisits || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          visitor.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' :
                          visitor.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                          visitor.status === 'PENDING' || visitor.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                          visitor.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          visitor.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {visitor.status?.replace('_', ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewVisitor(visitor)}
                            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          {(canEditVisitors || isAdmin) && (
                            <button
                              onClick={() => setEditVisitor({...visitor})}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          {(canDeleteVisitors || isAdmin) && (
                            <button
                              onClick={() => setDeleteConfirm(visitor)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} visitors
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
          </>
        )}
      </div>

      {/* View Visitor Modal */}
      {viewVisitor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Visitor Details</h2>
                <button onClick={() => setViewVisitor(null)} className="p-1 hover:bg-white/20 rounded">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Photo & Name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-teal-100 rounded-xl overflow-hidden flex-shrink-0">
                  {viewVisitor.photo ? (
                    <img src={viewVisitor.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={32} className="text-teal-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{viewVisitor.visitorName}</h3>
                  <p className="text-gray-500">{viewVisitor.purpose || 'Visitor'}</p>
                  <span className={`inline-flex items-center mt-2 px-2 py-1 text-xs rounded-full ${
                    viewVisitor.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' :
                    viewVisitor.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {viewVisitor.status?.replace('_', ' ') || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Phone size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-800">{viewVisitor.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Mail size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-800 text-sm">{viewVisitor.email || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Building size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Company to Visit</p>
                    <p className="font-medium text-gray-800">{viewVisitor.companyToVisit || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <User size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Person to Meet</p>
                    <p className="font-medium text-gray-800">{viewVisitor.personToMeet || '-'}</p>
                  </div>
                </div>

                {viewVisitor.vehicleNumber && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Car size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Number</p>
                      <p className="font-medium text-gray-800">{viewVisitor.vehicleNumber}</p>
                    </div>
                  </div>
                )}

                {viewVisitor.idProofType && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FileText size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ID Proof</p>
                      <p className="font-medium text-gray-800">{viewVisitor.idProofType}: {viewVisitor.idProofNumber || '-'}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Calendar size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Check-in Time</p>
                      <p className="font-medium text-gray-800 text-sm">
                        {viewVisitor.checkInTime ? new Date(viewVisitor.checkInTime).toLocaleString() : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Clock size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Check-out Time</p>
                      <p className="font-medium text-gray-800 text-sm">
                        {viewVisitor.checkOutTime ? new Date(viewVisitor.checkOutTime).toLocaleString() : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewVisitor(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Visitor Modal */}
      {editVisitor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Edit Visitor</h2>
              <button onClick={() => setEditVisitor(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Name</label>
                <input
                  type="text"
                  value={editVisitor.visitorName || ''}
                  onChange={(e) => setEditVisitor({...editVisitor, visitorName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editVisitor.phone || ''}
                    onChange={(e) => setEditVisitor({...editVisitor, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editVisitor.email || ''}
                    onChange={(e) => setEditVisitor({...editVisitor, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company to Visit</label>
                <input
                  type="text"
                  value={editVisitor.companyToVisit || ''}
                  onChange={(e) => setEditVisitor({...editVisitor, companyToVisit: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Person to Meet</label>
                <input
                  type="text"
                  value={editVisitor.personToMeet || ''}
                  onChange={(e) => setEditVisitor({...editVisitor, personToMeet: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={editVisitor.purpose || ''}
                  onChange={(e) => setEditVisitor({...editVisitor, purpose: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={editVisitor.vehicleNumber || ''}
                  onChange={(e) => setEditVisitor({...editVisitor, vehicleNumber: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditVisitor(null)}
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Delete Visitor</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.visitorName}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VMSVisitors
