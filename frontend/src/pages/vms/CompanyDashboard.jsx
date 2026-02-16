import { useState, useEffect, useCallback } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { checkInApi } from '../../services/vmsApi'
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  RefreshCw,
  Search,
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
  User,
  Loader2,
  Ban,
  QrCode,
} from 'lucide-react'

const CompanyDashboard = () => {
  const { user } = useVMSAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [liveFeed, setLiveFeed] = useState({
    pending: [],
    approved: [],
    checkedIn: [],
    recent: [],
    counts: { pending: 0, approved: 0, checkedIn: 0 }
  })
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      
      const [feedResponse, statsResponse] = await Promise.all([
        checkInApi.getLiveFeed(lastUpdate),
        checkInApi.getStats()
      ])
      
      setLiveFeed(feedResponse.data)
      setStats(statsResponse.data)
      setLastUpdate(new Date().toISOString())
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setMessage({ type: 'error', text: 'Failed to load visitors' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [lastUpdate])

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-refresh every 30 seconds for pending visitors
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleApprove = async (visitorId) => {
    setActionLoading(visitorId)
    try {
      await checkInApi.approve(visitorId)
      setMessage({ type: 'success', text: 'Visitor approved successfully!' })
      await fetchData(true)
      setSelectedVisitor(null)
    } catch (error) {
      console.error('Failed to approve:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to approve visitor' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    
    setActionLoading(selectedVisitor?.id)
    try {
      await checkInApi.reject(selectedVisitor.id, rejectReason)
      setMessage({ type: 'success', text: 'Visitor rejected' })
      await fetchData(true)
      setSelectedVisitor(null)
      setShowRejectModal(false)
      setRejectReason('')
    } catch (error) {
      console.error('Failed to reject:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to reject visitor' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCheckIn = async (id) => {
    setActionLoading(id)
    try {
      await checkInApi.checkIn(id)
      setMessage({ type: 'success', text: 'Visitor checked in successfully!' })
      await fetchData(true)
      setSelectedVisitor(null)
    } catch (error) {
      console.error('Failed to check-in:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to check-in visitor' })
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

  const formatTimeAgo = (date) => {
    if (!date) return ''
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(date).toLocaleDateString()
  }

  // Filter requests by search
  const filterRequests = (requests) => {
    if (!requests) return []
    if (!searchQuery.trim()) return requests
    const query = searchQuery.toLowerCase()
    return requests.filter(r => 
      r.firstName?.toLowerCase().includes(query) ||
      r.lastName?.toLowerCase().includes(query) ||
      r.visitorName?.toLowerCase().includes(query) ||
      r.phone?.includes(query) ||
      r.hostName?.toLowerCase().includes(query) ||
      r.requestNumber?.toLowerCase().includes(query)
    )
  }

  // Get current tab's visitors
  const currentVisitors = filterRequests(liveFeed[activeTab] || [])

  const tabs = [
    { id: 'pending', label: 'Pending', count: liveFeed.counts?.pending || 0, icon: Clock },
    { id: 'approved', label: 'Approved', count: liveFeed.counts?.approved || 0, icon: CheckCircle },
    { id: 'checkedIn', label: 'Inside', count: liveFeed.counts?.checkedIn || 0, icon: UserCheck },
    { id: 'recent', label: 'All Today', count: stats?.today?.total || 0, icon: Users },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Company Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.company?.displayName || 'Manage visitor approvals'} • Auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
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
          <span className="flex-1 text-sm">{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div 
          className={`bg-yellow-50 border border-yellow-200 rounded-xl p-3 lg:p-4 cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'pending' ? 'ring-2 ring-yellow-500' : ''
          }`}
          onClick={() => setActiveTab('pending')}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="lg:w-5 lg:h-5 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl lg:text-2xl font-bold text-yellow-700">{liveFeed.counts?.pending || 0}</p>
              <p className="text-xs lg:text-sm text-yellow-600 truncate">Pending</p>
            </div>
          </div>
        </div>
        <div 
          className={`bg-green-50 border border-green-200 rounded-xl p-3 lg:p-4 cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'approved' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => setActiveTab('approved')}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle size={16} className="lg:w-5 lg:h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl lg:text-2xl font-bold text-green-700">{liveFeed.counts?.approved || 0}</p>
              <p className="text-xs lg:text-sm text-green-600 truncate">Approved</p>
            </div>
          </div>
        </div>
        <div 
          className={`bg-blue-50 border border-blue-200 rounded-xl p-3 lg:p-4 cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'checkedIn' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setActiveTab('checkedIn')}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <UserCheck size={16} className="lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl lg:text-2xl font-bold text-blue-700">{liveFeed.counts?.checkedIn || 0}</p>
              <p className="text-xs lg:text-sm text-blue-600 truncate">Inside</p>
            </div>
          </div>
        </div>
        <div 
          className={`bg-purple-50 border border-purple-200 rounded-xl p-3 lg:p-4 cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'recent' ? 'ring-2 ring-purple-500' : ''
          }`}
          onClick={() => setActiveTab('recent')}
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="lg:w-5 lg:h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl lg:text-2xl font-bold text-purple-700">{stats?.today?.total || 0}</p>
              <p className="text-xs lg:text-sm text-purple-600 truncate">Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 lg:space-x-4 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 lg:gap-2 px-3 py-2 lg:py-3 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={14} className="lg:w-[18px] lg:h-[18px]" />
              {tab.label}
              <span className={`px-1.5 lg:px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by name, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        />
      </div>

      {/* Visitors List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {currentVisitors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No visitors found</p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'pending' ? 'No pending approvals' : 'No visitors match your criteria'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {currentVisitors.map((visitor) => (
              <div key={visitor.id} className="p-3 lg:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Photo */}
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {visitor.photo ? (
                        <img src={visitor.photo} alt={visitor.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User size={20} />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 text-sm lg:text-base truncate">
                        {visitor.firstName} {visitor.lastName || ''} {visitor.visitorName || ''}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {visitor.phone}
                        </span>
                        {visitor.visitorCompany && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <Building size={12} />
                            <span className="truncate max-w-[120px]">{visitor.visitorCompany}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span className="truncate">Purpose: {visitor.purpose}</span>
                        <span className="text-gray-300">•</span>
                        <span>{formatTimeAgo(visitor.submittedAt || visitor.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(visitor.status)}`}>
                      {visitor.status?.replace('_', ' ')}
                    </span>
                    
                    {(visitor.status === 'PENDING' || visitor.status === 'PENDING_APPROVAL') && (
                      <>
                        <button
                          onClick={() => handleApprove(visitor.id)}
                          disabled={actionLoading === visitor.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-xs"
                        >
                          {actionLoading === visitor.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Check size={14} />
                              <span className="hidden sm:inline">Approve</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVisitor(visitor)
                            setShowRejectModal(true)
                          }}
                          disabled={actionLoading === visitor.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-xs"
                        >
                          <X size={14} />
                          <span className="hidden sm:inline">Reject</span>
                        </button>
                      </>
                    )}

                    {visitor.status === 'APPROVED' && (
                      <button
                        onClick={() => handleCheckIn(visitor.id)}
                        disabled={actionLoading === visitor.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs"
                      >
                        {actionLoading === visitor.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <UserCheck size={14} />
                            <span className="hidden sm:inline">Check In</span>
                          </>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => setSelectedVisitor(visitor)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visitor Detail Modal */}
      {selectedVisitor && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-gray-800">Visitor Details</h2>
                <button onClick={() => setSelectedVisitor(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Photo */}
                <div className="text-center">
                  {selectedVisitor.photo ? (
                    <img 
                      src={selectedVisitor.photo} 
                      alt={selectedVisitor.firstName} 
                      className="w-24 h-24 lg:w-32 lg:h-32 rounded-xl object-cover mx-auto border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-xl bg-gray-100 flex items-center justify-center mx-auto">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium text-sm">{selectedVisitor.firstName} {selectedVisitor.lastName || ''}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-sm">{selectedVisitor.phone}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-sm">{selectedVisitor.email || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">From Company</p>
                    <p className="font-medium text-sm">{selectedVisitor.visitorCompany || '-'}</p>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-3">
                    <p className="text-xs text-teal-600">Purpose</p>
                    <p className="font-medium text-sm">{selectedVisitor.purpose}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600">Person to Meet</p>
                    <p className="font-medium text-sm">{selectedVisitor.hostName || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">ID Proof</p>
                    <p className="font-medium text-sm">
                      {selectedVisitor.idProofType ? `${selectedVisitor.idProofType}: ${selectedVisitor.idProofNumber}` : '-'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedVisitor.status)}`}>
                      {selectedVisitor.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 sm:col-span-2">
                    <p className="text-xs text-gray-500">Requested At</p>
                    <p className="font-medium text-sm">{formatDate(selectedVisitor.submittedAt || selectedVisitor.createdAt)}</p>
                  </div>
                </div>

                {/* Request Number */}
                {selectedVisitor.requestNumber && (
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Request Number</p>
                      <p className="font-mono font-bold text-gray-800">{selectedVisitor.requestNumber}</p>
                    </div>
                    <QrCode className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                {/* ID Document */}
                {(selectedVisitor.idDocumentImage || selectedVisitor.idProofImage) && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">ID Document</p>
                    <img 
                      src={selectedVisitor.idDocumentImage || selectedVisitor.idProofImage} 
                      alt="ID Document" 
                      className="w-full rounded-lg border"
                    />
                  </div>
                )}

                {/* Actions */}
                {(selectedVisitor.status === 'PENDING' || selectedVisitor.status === 'PENDING_APPROVAL') && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleApprove(selectedVisitor.id)}
                      disabled={actionLoading === selectedVisitor.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedVisitor.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Check size={18} />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectModal(true)
                      }}
                      disabled={actionLoading === selectedVisitor.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <X size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {selectedVisitor.status === 'APPROVED' && (
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => handleCheckIn(selectedVisitor.id)}
                      disabled={actionLoading === selectedVisitor.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedVisitor.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <UserCheck size={18} />
                          Check In
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-4 lg:p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Reject Entry</h3>
              <p className="text-sm text-gray-500 mt-1">
                Please provide a reason for rejecting this visitor's entry.
              </p>
            </div>
            <div className="p-4 lg:p-6">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                rows={4}
              />
            </div>
            <div className="p-4 lg:p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Ban className="w-5 h-5" />
                    Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyDashboard
