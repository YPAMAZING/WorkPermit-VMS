import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { approvalsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  MapPin,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
} from 'lucide-react'
import { format } from 'date-fns'

const Approvals = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    decision: searchParams.get('decision') || '',
    page: parseInt(searchParams.get('page')) || 1,
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchApprovals()
    fetchStats()
    // Update URL params
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.decision) params.set('decision', filters.decision)
    if (filters.page > 1) params.set('page', filters.page)
    setSearchParams(params)
  }, [filters])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      const response = await approvalsAPI.getAll({
        page: filters.page,
        limit: 10,
        search: filters.search,
        decision: filters.decision,
      })
      setApprovals(response.data.approvals)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Error fetching approvals')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await approvalsAPI.getStats()
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const getDecisionBadge = (decision) => {
    const badges = {
      PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Clock className="w-3.5 h-3.5" /> },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3.5 h-3.5" /> },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3.5 h-3.5" /> },
    }
    return badges[decision] || badges.PENDING
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Permit Approvals</h1>
        <p className="text-gray-500 mt-1">Review and process permit requests</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                <p className="text-sm text-gray-500">Rejected</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <CheckSquare className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.approvalRate}%</p>
                <p className="text-sm text-gray-500">Approval Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by permit title or location..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="input pl-11"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 animate-slide-up">
            <div>
              <label className="label">Decision Status</label>
              <select
                value={filters.decision}
                onChange={(e) => setFilters({ ...filters, decision: e.target.value, page: 1 })}
                className="input"
              >
                <option value="">All Decisions</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ search: '', decision: '', page: 1 })}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approvals List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <CheckSquare className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium">No approvals found</p>
            <p className="text-sm mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Permit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requestor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Work Period</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Decision</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Processed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvals.map((approval) => {
                  const decisionBadge = getDecisionBadge(approval.decision)
                  return (
                    <tr key={approval.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${decisionBadge.bg}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <Link
                              to={`/approvals/${approval.id}`}
                              className="font-medium text-gray-900 hover:text-primary-600"
                            >
                              {approval.permit?.title}
                            </Link>
                            <p className="text-sm text-gray-500">{approval.permit?.workType?.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          {approval.permit?.user?.firstName} {approval.permit?.user?.lastName}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{approval.permit?.user?.department}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {approval.permit?.location}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {approval.permit?.startDate && format(new Date(approval.permit.startDate), 'MMM dd')} - {approval.permit?.endDate && format(new Date(approval.permit.endDate), 'MMM dd')}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${decisionBadge.bg} ${decisionBadge.text}`}>
                          {decisionBadge.icon}
                          <span className="ml-1">{approval.decision}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {approval.approvedAt ? (
                          <div>
                            <p className="text-sm text-gray-600">
                              {format(new Date(approval.approvedAt), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-gray-500">{approval.approverName}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end">
                          <Link
                            to={`/approvals/${approval.id}`}
                            className={`btn ${approval.decision === 'PENDING' ? 'btn-primary' : 'btn-secondary'} py-1.5 px-3 text-sm`}
                          >
                            {approval.decision === 'PENDING' ? 'Review' : 'View'}
                            <Eye className="w-4 h-4 ml-1" />
                          </Link>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="btn btn-secondary py-1.5 px-3"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page === pagination.totalPages}
                className="btn btn-secondary py-1.5 px-3"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Approvals
