import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { preapprovedApi } from '../../services/vmsApi'
import {
  UserCheck,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  Phone,
  Mail,
  Share2,
  RefreshCw,
} from 'lucide-react'

const PreApprovedList = () => {
  const navigate = useNavigate()
  const { isAdmin, hasPermission } = useVMSAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ status: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const canCreate = isAdmin || hasPermission('vms.preapproved.create')
  const canEdit = isAdmin || hasPermission('vms.preapproved.edit')
  const canDelete = isAdmin || hasPermission('vms.preapproved.delete')

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: filters.status || undefined,
      }
      const response = await preapprovedApi.getAll(params)
      setEntries(response.data.entries || response.data.preapprovals || [])
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }))
    } catch (error) {
      console.error('Failed to fetch pre-approved entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await preapprovedApi.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchEntries(), fetchStats()])
    setRefreshing(false)
  }

  useEffect(() => {
    fetchEntries()
    fetchStats()
  }, [pagination.page, filters])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchEntries()
      } else {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(debounce)
  }, [search])

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pre-approval?')) return
    try {
      await preapprovedApi.cancel(id, 'Cancelled by admin')
      fetchEntries()
      fetchStats()
    } catch (error) {
      console.error('Failed to cancel:', error)
      alert('Failed to cancel pre-approval')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pre-approval? This cannot be undone.')) return
    try {
      await preapprovedApi.delete(id)
      fetchEntries()
      fetchStats()
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete pre-approval')
    }
  }

  const statusColors = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    USED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle },
    EXPIRED: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pre-approved Visitors</h1>
          <p className="text-gray-500 mt-1">Manage pre-approved visitor passes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          {canCreate && (
            <button
              onClick={() => navigate('/vms/pre-approval')}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus size={18} />
              New Pre-approval
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total || 0}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs text-green-600">Active</p>
            <p className="text-2xl font-bold text-green-700">{stats.active || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Used</p>
            <p className="text-2xl font-bold text-gray-700">{stats.used || 0}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <p className="text-xs text-orange-600">Expired</p>
            <p className="text-2xl font-bold text-orange-700">{stats.expired || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-600">Expected Today</p>
            <p className="text-2xl font-bold text-blue-700">{stats.upcomingToday || 0}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <UserCheck size={48} className="mb-3 text-gray-300" />
            <p>No pre-approved visitors found</p>
            {canCreate && (
              <button
                onClick={() => navigate('/vms/admin/preapproved/new')}
                className="mt-4 text-teal-600 hover:text-teal-700"
              >
                Create your first pre-approval
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Visitor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valid Period</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map((entry) => {
                    const statusStyle = statusColors[entry.status] || statusColors.ACTIVE
                    const StatusIcon = statusStyle.icon
                    const isExpired = new Date(entry.validUntil) < new Date()
                    
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                              <span className="text-teal-600 font-semibold text-sm">
                                {entry.visitorName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'V'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{entry.visitorName || `${entry.firstName} ${entry.lastName}`}</p>
                              <p className="text-xs text-gray-500">{entry.companyFrom || entry.company || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Phone size={12} /> {entry.phone}
                            </p>
                            {entry.email && (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail size={12} /> {entry.email}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{entry.purpose}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(entry.validFrom)}
                            </p>
                            <p className="text-xs text-gray-400">
                              to {formatDate(entry.validUntil)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                            <StatusIcon size={12} />
                            {entry.status}
                          </span>
                          {entry.status === 'ACTIVE' && isExpired && (
                            <span className="ml-2 text-xs text-orange-600">(Expired)</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/vms/admin/preapproved/${entry.id}`)}
                              className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            {entry.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => {
                                    // Share functionality
                                    const text = `Pre-approved visit pass:\nVisitor: ${entry.visitorName}\nValid: ${formatDate(entry.validFrom)} to ${formatDate(entry.validUntil)}\nPurpose: ${entry.purpose}`
                                    if (navigator.share) {
                                      navigator.share({ title: 'Pre-approved Pass', text })
                                    } else {
                                      navigator.clipboard.writeText(text)
                                      alert('Pass details copied to clipboard!')
                                    }
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Share"
                                >
                                  <Share2 size={18} />
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={() => navigate(`/vms/admin/preapproved/${entry.id}/edit`)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit size={18} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCancel(entry.id)}
                                  className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <XCircle size={18} />
                                </button>
                              </>
                            )}
                            {canDelete && ['CANCELLED', 'EXPIRED', 'USED'].includes(entry.status) && (
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
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
                  Page {pagination.page} of {pagination.totalPages || 1}
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
    </div>
  )
}

export default PreApprovedList
