import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { permitsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Flame,
  Zap,
  ArrowUp,
  Box,
  FileText,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'

const Permits = () => {
  const { user, canDeletePermits, canCreatePermits } = useAuth()
  
  // Permission-based checks - works with both system roles and custom roles
  const userCanDelete = canDeletePermits()
  const userCanCreate = canCreatePermits()
  const [searchParams, setSearchParams] = useSearchParams()
  const [permits, setPermits] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const [workTypes, setWorkTypes] = useState([])
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    workType: searchParams.get('workType') || '',
    page: parseInt(searchParams.get('page')) || 1,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ open: false, permit: null })

  useEffect(() => {
    fetchWorkTypes()
  }, [])

  useEffect(() => {
    fetchPermits()
    // Update URL params
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.workType) params.set('workType', filters.workType)
    if (filters.page > 1) params.set('page', filters.page)
    setSearchParams(params)
  }, [filters])

  const fetchWorkTypes = async () => {
    try {
      const response = await permitsAPI.getWorkTypes()
      setWorkTypes(response.data.workTypes)
    } catch (error) {
      console.error('Error fetching work types:', error)
    }
  }

  const fetchPermits = async () => {
    setLoading(true)
    try {
      const response = await permitsAPI.getAll({
        page: filters.page,
        limit: 10,
        search: filters.search,
        status: filters.status,
        workType: filters.workType,
      })
      setPermits(response.data.permits)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Error fetching permits')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.permit) return
    
    try {
      await permitsAPI.delete(deleteModal.permit.id)
      toast.success('Permit deleted successfully')
      fetchPermits()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting permit')
    } finally {
      setDeleteModal({ open: false, permit: null })
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Clock className="w-3.5 h-3.5" /> },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3.5 h-3.5" /> },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3.5 h-3.5" /> },
    }
    return badges[status] || badges.PENDING
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      LOW: 'priority-low',
      MEDIUM: 'priority-medium',
      HIGH: 'priority-high',
      CRITICAL: 'priority-critical',
    }
    return badges[priority] || badges.MEDIUM
  }

  const getWorkTypeIcon = (type) => {
    const icons = {
      HOT_WORK: <Flame className="w-4 h-4 text-red-500" />,
      CONFINED_SPACE: <Box className="w-4 h-4 text-orange-500" />,
      ELECTRICAL: <Zap className="w-4 h-4 text-yellow-500" />,
      WORKING_AT_HEIGHT: <ArrowUp className="w-4 h-4 text-blue-500" />,
      EXCAVATION: <FileText className="w-4 h-4 text-purple-500" />,
    }
    return icons[type] || <FileText className="w-4 h-4 text-gray-500" />
  }

  const getWorkTypeLabel = (type) => {
    const workType = workTypes.find((wt) => wt.value === type)
    return workType?.label || type
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permit Requests</h1>
          <p className="text-gray-500 mt-1">Manage and track all permit requests</p>
        </div>
        <Link to="/workpermit/permits/new" className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          New Permit
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search permits..."
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

        {/* Filter options */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 animate-slide-up">
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="input"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="label">Work Type</label>
              <select
                value={filters.workType}
                onChange={(e) => setFilters({ ...filters, workType: e.target.value, page: 1 })}
                className="input"
              >
                <option value="">All Types</option>
                {workTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-end">
              <button
                onClick={() => setFilters({ search: '', status: '', workType: '', page: 1 })}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Permits Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : permits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium">No permits found</p>
            <p className="text-sm mt-1">Create a new permit to get started</p>
            <Link to="/workpermit/permits/new" className="btn btn-primary mt-4">
              <Plus className="w-5 h-5 mr-2" />
              Create Permit
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Permit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {permits.map((permit) => {
                  const statusBadge = getStatusBadge(permit.status)
                  return (
                    <tr key={permit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            {getWorkTypeIcon(permit.workType)}
                          </div>
                          <div>
                            <Link
                              to={`/workpermit/permits/${permit.id}`}
                              className="font-medium text-gray-900 hover:text-primary-600"
                            >
                              {permit.title}
                            </Link>
                            <p className="text-sm text-gray-500">
                              {permit.user?.firstName} {permit.user?.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">
                          {getWorkTypeLabel(permit.workType)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {permit.location}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(permit.startDate), 'MMM dd')} - {format(new Date(permit.endDate), 'MMM dd')}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${getPriorityBadge(permit.priority)}`}>
                          {permit.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.icon}
                          <span className="ml-1">{permit.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/workpermit/permits/${permit.id}`}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {/* Users with delete permission can delete any permit, Requestor can delete their own pending permits */}
                          {(userCanDelete || (permit.status === 'PENDING' && permit.createdBy === user?.id)) && (
                            <button
                              onClick={() => setDeleteModal({ open: true, permit })}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ open: false, permit: null })}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Permit</h3>
              <p className="text-gray-500 mb-6">
                Are you sure you want to delete "{deleteModal.permit?.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteModal({ open: false, permit: null })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleDelete} className="btn btn-danger">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Permits
