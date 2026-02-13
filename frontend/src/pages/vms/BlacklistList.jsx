import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { blacklistApi } from '../../services/vmsApi'
import {
  ShieldAlert,
  Search,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  UserX,
} from 'lucide-react'

const BlacklistList = () => {
  const navigate = useNavigate()
  const { isAdmin, hasPermission } = useVMSAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ reason: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [reasons, setReasons] = useState([])

  const canAdd = isAdmin || hasPermission('vms.blacklist.create')
  const canRemove = isAdmin || hasPermission('vms.blacklist.edit')
  const canDelete = isAdmin || hasPermission('vms.blacklist.delete')

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        reason: filters.reason || undefined,
      }
      const response = await blacklistApi.getAll(params)
      setEntries(response.data.entries || response.data.blacklist || [])
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }))
    } catch (error) {
      console.error('Failed to fetch blacklist entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await blacklistApi.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchReasons = async () => {
    try {
      const response = await blacklistApi.getReasons()
      setReasons(response.data.reasons || [])
    } catch (error) {
      console.error('Failed to fetch reasons:', error)
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
    fetchReasons()
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

  const handleRemove = async (id) => {
    const reason = window.prompt('Reason for removing from blacklist:')
    if (!reason) return
    try {
      await blacklistApi.remove(id, reason)
      fetchEntries()
      fetchStats()
    } catch (error) {
      console.error('Failed to remove:', error)
      alert('Failed to remove from blacklist')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this blacklist entry?')) return
    try {
      await blacklistApi.delete(id)
      fetchEntries()
      fetchStats()
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete entry')
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const reasonColors = {
    MISCONDUCT: 'bg-red-100 text-red-700',
    THEFT: 'bg-red-100 text-red-700',
    VIOLENCE: 'bg-red-100 text-red-700',
    FRAUD: 'bg-orange-100 text-orange-700',
    TRESPASSING: 'bg-orange-100 text-orange-700',
    HARASSMENT: 'bg-red-100 text-red-700',
    POLICY_VIOLATION: 'bg-yellow-100 text-yellow-700',
    SECURITY_THREAT: 'bg-red-100 text-red-700',
    OTHER: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Blacklist</h1>
          <p className="text-gray-500 mt-1">Manage blacklisted visitors</p>
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
          {canAdd && (
            <button
              onClick={() => navigate('/vms/admin/blacklist/new')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus size={18} />
              Add to Blacklist
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">Total Entries</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total || 0}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <p className="text-xs text-red-600">Active</p>
            <p className="text-2xl font-bold text-red-700">{stats.active || 0}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs text-green-600">Removed</p>
            <p className="text-2xl font-bold text-green-700">{stats.removed || 0}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <p className="text-xs text-orange-600">This Month</p>
            <p className="text-2xl font-bold text-orange-700">{stats.thisMonth || 0}</p>
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
              placeholder="Search by name, phone, ID number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
            <select
              value={filters.reason}
              onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Reasons</option>
              {reasons.map(reason => (
                <option key={reason} value={reason}>{reason.replace('_', ' ')}</option>
              ))}
            </select>
            <button
              onClick={() => setFilters({ reason: '' })}
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
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-500 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <ShieldAlert size={48} className="mb-3 text-gray-300" />
            <p>No blacklist entries found</p>
            <p className="text-sm text-gray-400 mt-1">The blacklist is currently empty</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Person</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Added</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <UserX size={20} className="text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {entry.visitorName || entry.name || `${entry.firstName} ${entry.lastName}`}
                            </p>
                            {entry.idNumber && (
                              <p className="text-xs text-gray-500">ID: {entry.idNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone size={12} /> {entry.phone}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${reasonColors[entry.reason] || reasonColors.OTHER}`}>
                          {entry.reason?.replace('_', ' ') || 'Unknown'}
                        </span>
                        {entry.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={entry.description}>
                            {entry.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(entry.createdAt || entry.blacklistedAt)}
                        </p>
                        {entry.addedByName && (
                          <p className="text-xs text-gray-400">by {entry.addedByName}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {entry.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                            <AlertTriangle size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                            <CheckCircle size={12} />
                            Removed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/vms/admin/blacklist/${entry.id}`)}
                            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {canRemove && entry.isActive !== false && (
                            <button
                              onClick={() => handleRemove(entry.id)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Remove from Blacklist"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Permanently"
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

export default BlacklistList
