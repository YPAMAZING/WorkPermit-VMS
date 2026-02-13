import { useState, useEffect, useCallback } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { checkInApi, visitorsApi } from '../../services/vmsApi'
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Phone,
  Mail,
  Building,
  Calendar,
  AlertTriangle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const CompanyDashboard = () => {
  const { user, isAdmin } = useVMSAuth()
  const [loading, setLoading] = useState(true)
  const [visitors, setVisitors] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    checkedIn: 0,
  })
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch visitors - the API should filter by company if user is not admin
      const params = {
        page,
        limit: 20,
        status: activeTab === 'all' ? undefined : activeTab.toUpperCase(),
        search: searchQuery || undefined,
      }
      
      const response = await visitorsApi.getAll(params)
      const data = response.data
      
      setVisitors(data.visitors || data.data || [])
      setTotalPages(data.totalPages || 1)
      
      // Fetch stats
      try {
        const statsResponse = await visitorsApi.getStats()
        if (statsResponse.data) {
          setStats({
            pending: statsResponse.data.pending || 0,
            approved: statsResponse.data.approved || 0,
            rejected: statsResponse.data.rejected || 0,
            checkedIn: statsResponse.data.checkedIn || 0,
          })
        }
      } catch (e) {
        console.log('Stats not available')
      }
    } catch (error) {
      console.error('Failed to fetch visitors:', error)
      setMessage({ type: 'error', text: 'Failed to load visitors' })
    } finally {
      setLoading(false)
    }
  }, [page, activeTab, searchQuery])

  useEffect(() => {
    fetchVisitors()
  }, [fetchVisitors])

  // Auto-refresh every 30 seconds for pending visitors
  useEffect(() => {
    if (activeTab === 'pending') {
      const interval = setInterval(fetchVisitors, 30000)
      return () => clearInterval(interval)
    }
  }, [activeTab, fetchVisitors])

  const handleApprove = async (visitorId) => {
    setActionLoading(visitorId)
    try {
      await checkInApi.approve(visitorId, 'Approved by company')
      setMessage({ type: 'success', text: 'Visitor approved successfully!' })
      fetchVisitors()
      setSelectedVisitor(null)
    } catch (error) {
      console.error('Failed to approve:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to approve visitor' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (visitorId, reason) => {
    if (!reason) {
      reason = prompt('Please provide a reason for rejection:')
      if (!reason) return
    }
    
    setActionLoading(visitorId)
    try {
      await checkInApi.reject(visitorId, reason)
      setMessage({ type: 'success', text: 'Visitor rejected' })
      fetchVisitors()
      setSelectedVisitor(null)
    } catch (error) {
      console.error('Failed to reject:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to reject visitor' })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CHECKED_IN: 'bg-blue-100 text-blue-800',
      CHECKED_OUT: 'bg-gray-100 text-gray-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const tabs = [
    { id: 'pending', label: 'Pending Approval', count: stats.pending, icon: Clock },
    { id: 'approved', label: 'Approved', count: stats.approved, icon: CheckCircle },
    { id: 'checked_in', label: 'Checked In', count: stats.checkedIn, icon: UserCheck },
    { id: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircle },
    { id: 'all', label: 'All Visitors', count: null, icon: Users },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Company Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {user?.company?.displayName || 'Manage visitor approvals for your company'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchVisitors}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              <p className="text-sm text-yellow-600">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              <p className="text-sm text-green-600">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.checkedIn}</p>
              <p className="text-sm text-blue-600">Checked In</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              <p className="text-sm text-red-600">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Visitors List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">Loading visitors...</p>
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No visitors found</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'pending' ? 'No pending approvals at the moment' : 'No visitors match your criteria'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visitors.map((visitor) => (
              <div key={visitor.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Photo */}
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {visitor.photo ? (
                        <img src={visitor.photo} alt={visitor.visitorName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Users size={24} />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="font-medium text-gray-800">{visitor.visitorName}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {visitor.phone}
                        </span>
                        {visitor.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={14} />
                            {visitor.email}
                          </span>
                        )}
                        {visitor.companyFrom && (
                          <span className="flex items-center gap-1">
                            <Building size={14} />
                            {visitor.companyFrom}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>Purpose: {visitor.purpose}</span>
                        {visitor.personToMeet && <span>Meeting: {visitor.personToMeet}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(visitor.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(visitor.status)}`}>
                      {visitor.status?.replace('_', ' ')}
                    </span>
                    
                    {(visitor.status === 'PENDING' || visitor.status === 'PENDING_APPROVAL') && (
                      <>
                        <button
                          onClick={() => handleApprove(visitor.id)}
                          disabled={actionLoading === visitor.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          {actionLoading === visitor.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <Check size={16} />
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(visitor.id)}
                          disabled={actionLoading === visitor.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => setSelectedVisitor(visitor)}
                      className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Visitor Details</h2>
                <button onClick={() => setSelectedVisitor(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Photo */}
                {selectedVisitor.photo && (
                  <div className="text-center">
                    <img 
                      src={selectedVisitor.photo} 
                      alt={selectedVisitor.visitorName} 
                      className="w-32 h-32 rounded-xl object-cover mx-auto"
                    />
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium">{selectedVisitor.visitorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium">{selectedVisitor.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{selectedVisitor.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">From Company</p>
                    <p className="font-medium">{selectedVisitor.companyFrom || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Purpose</p>
                    <p className="font-medium">{selectedVisitor.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Person to Meet</p>
                    <p className="font-medium">{selectedVisitor.personToMeet || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ID Proof</p>
                    <p className="font-medium">{selectedVisitor.idProofType}: {selectedVisitor.idProofNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedVisitor.status)}`}>
                      {selectedVisitor.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Requested At</p>
                    <p className="font-medium">{formatDate(selectedVisitor.createdAt)}</p>
                  </div>
                  {selectedVisitor.vehicleNumber && (
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Number</p>
                      <p className="font-medium">{selectedVisitor.vehicleNumber}</p>
                    </div>
                  )}
                </div>

                {/* ID Document */}
                {selectedVisitor.idDocumentImage && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">ID Document</p>
                    <img 
                      src={selectedVisitor.idDocumentImage} 
                      alt="ID Document" 
                      className="w-full rounded-lg border"
                    />
                  </div>
                )}

                {/* Actions */}
                {(selectedVisitor.status === 'PENDING' || selectedVisitor.status === 'PENDING_APPROVAL') && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleApprove(selectedVisitor.id)}
                      disabled={actionLoading === selectedVisitor.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Check size={18} />
                      Approve Visitor
                    </button>
                    <button
                      onClick={() => handleReject(selectedVisitor.id)}
                      disabled={actionLoading === selectedVisitor.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <X size={18} />
                      Reject Visitor
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyDashboard
