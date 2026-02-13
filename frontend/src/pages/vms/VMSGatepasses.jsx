import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { gatepassesApi } from '../../services/vmsApi'
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  Download,
} from 'lucide-react'

const VMSGatepasses = () => {
  const navigate = useNavigate()
  const { canCreateGatepasses, canEditGatepasses, canCancelGatepasses } = useVMSAuth()
  const [gatepasses, setGatepasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ status: '', purpose: '', date: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [todaySummary, setTodaySummary] = useState(null)

  const fetchGatepasses = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: filters.status || undefined,
        purpose: filters.purpose || undefined,
        date: filters.date || undefined,
      }
      const response = await gatepassesApi.getAll(params)
      setGatepasses(response.data.gatepasses)
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination,
      }))
    } catch (error) {
      console.error('Failed to fetch gatepasses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTodaySummary = async () => {
    try {
      const response = await gatepassesApi.getTodaySummary()
      setTodaySummary(response.data)
    } catch (error) {
      console.error('Failed to fetch today summary:', error)
    }
  }

  useEffect(() => {
    fetchGatepasses()
    fetchTodaySummary()
  }, [pagination.page, filters])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchGatepasses()
      } else {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(debounce)
  }, [search])

  const statusColors = {
    SCHEDULED: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    EXPIRED: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
    NO_SHOW: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
  }

  const purposeLabels = {
    MEETING: 'Meeting',
    INTERVIEW: 'Interview',
    DELIVERY: 'Delivery',
    MAINTENANCE: 'Maintenance',
    CONTRACTOR: 'Contractor',
    EVENT: 'Event',
    PERSONAL: 'Personal',
    OTHER: 'Other',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gatepasses</h1>
          <p className="text-gray-500 mt-1">Manage visitor gatepasses</p>
        </div>
        {canCreateGatepasses && (
          <button
            onClick={() => navigate('/vms/admin/gatepasses/new')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus size={18} />
            New Gatepass
          </button>
        )}
      </div>

      {/* Today's Summary Cards */}
      {todaySummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">Total Today</p>
            <p className="text-2xl font-bold text-gray-800">{todaySummary.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <p className="text-xs text-yellow-600">Scheduled</p>
            <p className="text-2xl font-bold text-yellow-700">{todaySummary.byStatus?.scheduled || 0}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs text-green-600">Active</p>
            <p className="text-2xl font-bold text-green-700">{todaySummary.byStatus?.active || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-gray-700">{todaySummary.byStatus?.completed || 0}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <p className="text-xs text-red-600">Cancelled</p>
            <p className="text-2xl font-bold text-red-700">{todaySummary.byStatus?.cancelled || 0}</p>
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
              placeholder="Search by gatepass number, visitor name, phone..."
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
              <option value="SCHEDULED">Scheduled</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
            <select
              value={filters.purpose}
              onChange={(e) => setFilters({ ...filters, purpose: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Purposes</option>
              {Object.entries(purposeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={() => setFilters({ status: '', purpose: '', date: '' })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Gatepasses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : gatepasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText size={48} className="mb-3 text-gray-300" />
            <p>No gatepasses found</p>
            {canCreateGatepasses && (
              <button
                onClick={() => navigate('/vms/admin/gatepasses/new')}
                className="mt-4 text-teal-600 hover:text-teal-700"
              >
                Create your first gatepass
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gatepass</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Visitor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Host</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expected</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {gatepasses.map((gp) => {
                    const statusStyle = statusColors[gp.status] || statusColors.SCHEDULED
                    const StatusIcon = statusStyle.icon
                    return (
                      <tr key={gp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-mono font-medium text-gray-800">{gp.gatepassNumber}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(gp.issuedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center overflow-hidden">
                              {gp.visitorPhoto ? (
                                <img src={gp.visitorPhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-teal-600 font-semibold text-sm">
                                  {gp.visitorName?.split(' ').map(n => n[0]).join('')}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{gp.visitorName}</p>
                              <p className="text-xs text-gray-500">{gp.visitorPhone}</p>
                            </div>
                            {gp.isBlacklisted && (
                              <span className="p-1 bg-red-100 rounded">
                                <AlertTriangle size={14} className="text-red-600" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">
                            {purposeLabels[gp.purpose] || gp.purpose}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm text-gray-600">{gp.hostName || '-'}</p>
                            {gp.hostDepartment && (
                              <p className="text-xs text-gray-400">{gp.hostDepartment}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">
                                {new Date(gp.expectedDate).toLocaleDateString()}
                              </p>
                              {gp.expectedTimeIn && (
                                <p className="text-xs text-gray-400">{gp.expectedTimeIn}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                            <StatusIcon size={12} />
                            {gp.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/vms/admin/gatepasses/${gp.id}`)}
                              className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            {gp.qrCode && (
                              <button
                                onClick={() => {
                                  // Show QR code modal
                                  const w = window.open('', '_blank', 'width=400,height=500')
                                  w.document.write(`
                                    <html>
                                      <head><title>Gatepass QR - ${gp.gatepassNumber}</title></head>
                                      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
                                        <h2>${gp.gatepassNumber}</h2>
                                        <img src="${gp.qrCode}" alt="QR Code" style="width:200px;height:200px;" />
                                        <p>${gp.visitorName}</p>
                                        <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;cursor:pointer;">Print</button>
                                      </body>
                                    </html>
                                  `)
                                }}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Show QR"
                              >
                                <QrCode size={18} />
                              </button>
                            )}
                            {canEditGatepasses && ['SCHEDULED'].includes(gp.status) && (
                              <button
                                onClick={() => navigate(`/vms/admin/gatepasses/${gp.id}/edit`)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={18} />
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} gatepasses
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
    </div>
  )
}

export default VMSGatepasses
