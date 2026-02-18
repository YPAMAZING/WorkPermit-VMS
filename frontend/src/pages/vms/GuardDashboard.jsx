// Guard/Reception Live Feed Dashboard
// Real-time view of visitor check-in requests with approve/reject/check-in actions
import { useState, useEffect, useCallback } from 'react'
import { checkInApi } from '../../services/vmsApi'
import { useVMSAuth } from '../../context/VMSAuthContext'
import {
  Users, Clock, CheckCircle, XCircle, UserCheck,
  RefreshCw, AlertCircle, Eye, Phone, Search,
  Bell, User, Calendar,
  Loader2, X, Check, Ban, QrCode, Timer
} from 'lucide-react'

const GuardDashboard = () => {
  const { user, isReceptionist, isSecurityGuard, isCompanyUser, isAdmin } = useVMSAuth()
  
  // Reception/Guard can only check-in, NOT approve/reject
  // Only Company users and Admins can approve/reject
  const canApproveReject = isCompanyUser || isAdmin
  
  // Only Reception, Security Guard, and Admin can check-in visitors
  // Company users CANNOT check-in (they only approve/reject)
  const canCheckIn = isReceptionist || isSecurityGuard || isAdmin
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [liveFeed, setLiveFeed] = useState({
    pending: [],
    approved: [],
    checkedIn: [],
    rejected: [],
    recent: [],
    counts: { pending: 0, approved: 0, checkedIn: 0, rejected: 0 }
  })
  const [stats, setStats] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  
  // Fetch live feed data
  const fetchLiveFeed = useCallback(async (isRefresh = false) => {
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
      setError(null)
    } catch (err) {
      console.error('Failed to fetch live feed:', err)
      setError('Failed to load data. Please refresh.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [lastUpdate])
  
  // Initial load
  useEffect(() => {
    fetchLiveFeed()
  }, [])
  
  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveFeed(true)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [fetchLiveFeed])
  
  // Handle approve
  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await checkInApi.approve(id)
      await fetchLiveFeed(true)
      setSelectedRequest(null)
    } catch (err) {
      console.error('Failed to approve:', err)
      alert(err.response?.data?.message || 'Failed to approve request')
    } finally {
      setActionLoading(null)
    }
  }
  
  // Handle reject
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    
    setActionLoading(selectedRequest?.id)
    try {
      await checkInApi.reject(selectedRequest.id, rejectReason)
      await fetchLiveFeed(true)
      setSelectedRequest(null)
      setShowRejectModal(false)
      setRejectReason('')
    } catch (err) {
      console.error('Failed to reject:', err)
      alert(err.response?.data?.message || 'Failed to reject request')
    } finally {
      setActionLoading(null)
    }
  }
  
  // Handle check-in
  const handleCheckIn = async (id) => {
    setActionLoading(id)
    try {
      await checkInApi.checkIn(id)
      await fetchLiveFeed(true)
      setSelectedRequest(null)
    } catch (err) {
      console.error('Failed to check-in:', err)
      alert(err.response?.data?.message || 'Failed to check-in visitor')
    } finally {
      setActionLoading(null)
    }
  }
  
  // Filter requests by search
  const filterRequests = (requests) => {
    if (!searchQuery.trim()) return requests
    const query = searchQuery.toLowerCase()
    return requests.filter(r => 
      r.visitorName?.toLowerCase().includes(query) ||
      r.phone?.includes(query) ||
      r.personToMeet?.toLowerCase().includes(query) ||
      r.companyToVisit?.toLowerCase().includes(query) ||
      r.id?.toLowerCase().includes(query)
    )
  }
  
  // Format time ago
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
  
  // Get status badge - shows different labels for reception/guard vs company users
  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        // Reception/Guard sees "Waiting for Approval", Company users see "Pending"
        label: canApproveReject ? 'Pending' : 'Waiting for Approval'
      },
      APPROVED: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        // Reception/Guard sees "Ready for Check-In"
        label: canApproveReject ? 'Approved' : 'Ready for Check-In'
      },
      CHECKED_IN: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Inside' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      CHECKED_OUT: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Left' },
      EXPIRED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expired' },
    }
    const badge = badges[status] || badges.PENDING
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }
  
  // Request Card Component
  const RequestCard = ({ request, showActions = true }) => (
    <div 
      className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        selectedRequest?.id === request.id ? 'ring-2 ring-teal-500 border-teal-500' : 'border-gray-200'
      }`}
      onClick={() => setSelectedRequest(request)}
    >
      <div className="p-3 lg:p-4">
        <div className="flex items-start justify-between">
          {/* Visitor Info */}
          <div className="flex items-center gap-2 lg:gap-3">
            {request.photo ? (
              <img 
                src={request.photo} 
                alt="" 
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800 text-sm lg:text-base truncate">
                {request.visitorName || 'Unknown Visitor'}
              </h3>
              <p className="text-xs lg:text-sm text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {request.phone}
              </p>
            </div>
          </div>
          
          {/* Status & Time */}
          <div className="text-right flex-shrink-0">
            {getStatusBadge(request.status)}
            <p className="text-xs text-gray-400 mt-1">
              {formatTimeAgo(request.submittedAt)}
            </p>
          </div>
        </div>
        
        {/* Visit Details */}
        <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs lg:text-sm">
          <div>
            <p className="text-gray-400 text-xs">Purpose</p>
            <p className="text-gray-700 font-medium truncate">{request.purpose}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Meeting</p>
            <p className="text-gray-700 font-medium truncate">{request.personToMeet || '-'}</p>
          </div>
        </div>
        
        {/* Quick Actions */}
        {showActions && (
          <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-100 flex gap-2">
            {request.status === 'PENDING' && canApproveReject && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleApprove(request.id) }}
                  disabled={actionLoading === request.id}
                  className="flex-1 py-2 bg-green-600 text-white text-xs lg:text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {actionLoading === request.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Approve
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedRequest(request);
                    setShowRejectModal(true) 
                  }}
                  className="flex-1 py-2 bg-red-600 text-white text-xs lg:text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
            {request.status === 'PENDING' && !canApproveReject && (
              <div className="flex-1 py-2 bg-yellow-100 text-yellow-800 text-xs lg:text-sm font-medium rounded-lg flex items-center justify-center gap-1 animate-pulse">
                <Clock className="w-4 h-4" />
                Waiting for Approval
              </div>
            )}
            {request.status === 'APPROVED' && canCheckIn && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedRequest(request) }}
                className="flex-1 py-2 bg-green-600 text-white text-xs lg:text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-4 h-4" />
                Verify & Check In
              </button>
            )}
            {request.status === 'APPROVED' && !canCheckIn && (
              <div className="flex-1 py-2 bg-green-100 text-green-700 text-xs lg:text-sm font-medium rounded-lg flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Approved
              </div>
            )}
            {request.status === 'REJECTED' && (
              <div className="flex-1 py-2 bg-red-100 text-red-700 text-xs lg:text-sm font-medium rounded-lg flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4" />
                Rejected
              </div>
            )}
            {request.status === 'CHECKED_IN' && (
              <div className="flex-1 py-2 bg-blue-100 text-blue-700 text-xs lg:text-sm font-medium rounded-lg flex items-center justify-center gap-1">
                <UserCheck className="w-4 h-4" />
                Inside Premises
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
  
  // Loading state
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
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Visitor Check-In</h1>
          <p className="text-sm text-gray-500">
            {user?.companyName || 'Visitor Management'} • Auto-refreshes every 5s
          </p>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Refresh Button */}
          <button
            onClick={() => fetchLiveFeed(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {/* Notification Bell */}
          {liveFeed.counts.pending > 0 && (
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {liveFeed.counts.pending}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        {/* Pending */}
        <div 
          className={`bg-white rounded-xl p-3 lg:p-4 border-l-4 border-yellow-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'pending' ? 'ring-2 ring-yellow-500' : ''
          }`}
          onClick={() => setActiveTab('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">Pending</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-800">{liveFeed.counts.pending}</p>
            </div>
            <Clock className="w-8 h-8 lg:w-10 lg:h-10 text-yellow-500 opacity-50" />
          </div>
          <p className="text-xs text-yellow-600 mt-1 lg:mt-2">Awaiting approval</p>
        </div>
        
        {/* Approved */}
        <div 
          className={`bg-white rounded-xl p-3 lg:p-4 border-l-4 border-green-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'approved' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => setActiveTab('approved')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">Approved</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-800">{liveFeed.counts.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 lg:w-10 lg:h-10 text-green-500 opacity-50" />
          </div>
          <p className="text-xs text-green-600 mt-1 lg:mt-2">Ready for entry</p>
        </div>
        
        {/* Inside */}
        <div 
          className={`bg-white rounded-xl p-3 lg:p-4 border-l-4 border-blue-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'checkedIn' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setActiveTab('checkedIn')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">Inside</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-800">{liveFeed.counts.checkedIn}</p>
            </div>
            <Users className="w-8 h-8 lg:w-10 lg:h-10 text-blue-500 opacity-50" />
          </div>
          <p className="text-xs text-blue-600 mt-1 lg:mt-2">Currently in premises</p>
        </div>
        
        {/* Rejected */}
        <div 
          className={`bg-white rounded-xl p-3 lg:p-4 border-l-4 border-red-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'rejected' ? 'ring-2 ring-red-500' : ''
          }`}
          onClick={() => setActiveTab('rejected')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">Rejected</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-800">{liveFeed.counts.rejected || 0}</p>
            </div>
            <XCircle className="w-8 h-8 lg:w-10 lg:h-10 text-red-500 opacity-50" />
          </div>
          <p className="text-xs text-red-600 mt-1 lg:mt-2">Denied entry</p>
        </div>
        
        {/* Today Total */}
        <div 
          className={`bg-white rounded-xl p-3 lg:p-4 border-l-4 border-purple-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
            activeTab === 'recent' ? 'ring-2 ring-purple-500' : ''
          }`}
          onClick={() => setActiveTab('recent')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-gray-500">Today</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-800">{stats?.today?.total || 0}</p>
            </div>
            <Calendar className="w-8 h-8 lg:w-10 lg:h-10 text-purple-500 opacity-50" />
          </div>
          <p className="text-xs text-purple-600 mt-1 lg:mt-2">Total requests</p>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone, or request number..."
          className="w-full pl-10 pr-4 py-2.5 lg:py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
        />
      </div>
      
      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - List */}
        <div className="space-y-3 lg:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base lg:text-lg font-semibold text-gray-800 capitalize">
              {activeTab === 'checkedIn' ? 'Currently Inside' : activeTab === 'rejected' ? 'Rejected' : activeTab} Requests
            </h2>
            <span className="text-xs lg:text-sm text-gray-500">
              {filterRequests(liveFeed[activeTab] || []).length} items
            </span>
          </div>
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 lg:p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-xs lg:text-sm text-red-700 flex-1">{error}</p>
              <button
                onClick={() => fetchLiveFeed()}
                className="text-xs lg:text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Request List */}
          <div className="space-y-3 max-h-[500px] lg:max-h-[600px] overflow-y-auto pr-2">
            {filterRequests(liveFeed[activeTab] || []).length === 0 ? (
              <div className="bg-white rounded-xl p-6 lg:p-8 text-center">
                <Users className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 mx-auto" />
                <p className="mt-3 lg:mt-4 text-gray-500 text-sm">
                  {searchQuery ? 'No matching requests found' : `No ${activeTab} requests`}
                </p>
              </div>
            ) : (
              filterRequests(liveFeed[activeTab] || []).map(request => (
                <RequestCard 
                  key={request.id} 
                  request={request}
                  showActions={activeTab !== 'recent' && activeTab !== 'rejected'}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Right Column - Detail View */}
        <div className="hidden lg:block">
          {selectedRequest ? (
            <div className="bg-white rounded-xl shadow-sm sticky top-4">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Request Details</h3>
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                {/* Visitor Photo & Basic Info */}
                <div className="flex items-center gap-4">
                  {selectedRequest.photo ? (
                    <img 
                      src={selectedRequest.photo} 
                      alt="" 
                      className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-xl font-semibold text-gray-800">
                      {selectedRequest.visitorName || `${selectedRequest.firstName || ''} ${selectedRequest.lastName || ''}`.trim() || 'Unknown'}
                    </h4>
                    {selectedRequest.companyFrom && (
                      <p className="text-gray-500">{selectedRequest.companyFrom}</p>
                    )}
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
                
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Phone</p>
                    <p className="font-medium text-gray-800">{selectedRequest.phone || '-'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <p className="font-medium text-gray-800 truncate">{selectedRequest.email || '-'}</p>
                  </div>
                </div>
                
                {/* Company To Visit */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Company to Visit</p>
                  <p className="font-medium text-gray-800">{selectedRequest.companyToVisit || selectedRequest.company?.displayName || selectedRequest.company?.name || '-'}</p>
                </div>
                
                {/* Visit Purpose */}
                <div className="p-3 bg-teal-50 rounded-lg">
                  <p className="text-xs text-teal-600 mb-1">Purpose of Visit</p>
                  <p className="font-medium text-gray-800">{selectedRequest.purpose || '-'}</p>
                </div>
                
                {/* Person to Meet */}
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 mb-1">Person to Meet</p>
                  <p className="font-medium text-gray-800">{selectedRequest.personToMeet || '-'}</p>
                </div>
                
                {/* Vehicle Number (if any) */}
                {selectedRequest.vehicleNumber && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Vehicle Number</p>
                    <p className="font-medium text-gray-800">{selectedRequest.vehicleNumber}</p>
                  </div>
                )}
                
                {/* Check-in Time */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Check-in Time</p>
                  <p className="font-medium text-gray-800">
                    {selectedRequest.checkInTime 
                      ? new Date(selectedRequest.checkInTime).toLocaleString('en-IN', { 
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true
                        })
                      : selectedRequest.createdAt
                        ? new Date(selectedRequest.createdAt).toLocaleString('en-IN', { 
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true
                          })
                        : '-'}
                  </p>
                </div>
                
                {/* ID Proof */}
                {(selectedRequest.idProofType || selectedRequest.idDocumentImage) && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">ID Proof</p>
                    {selectedRequest.idProofType && selectedRequest.idProofType !== 'NONE' && (
                      <p className="font-medium text-gray-800">
                        {selectedRequest.idProofType.replace(/_/g, ' ').toUpperCase()}: {selectedRequest.idProofNumber || '-'}
                      </p>
                    )}
                    {selectedRequest.idDocumentImage && (
                      <img 
                        src={selectedRequest.idDocumentImage} 
                        alt="ID Document" 
                        className="mt-2 w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-white"
                      />
                    )}
                  </div>
                )}
                
                {/* Rejection Reason (for rejected requests) */}
                {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-800">{selectedRequest.rejectionReason}</p>
                  </div>
                )}
                
                {/* Request Number */}
                <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Request ID</p>
                    <p className="font-mono font-bold text-gray-800 text-sm">{selectedRequest.id}</p>
                  </div>
                  <QrCode className="w-8 h-8 text-gray-400" />
                </div>
                
                {/* Actions */}
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  {selectedRequest.status === 'PENDING' && canApproveReject && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={actionLoading === selectedRequest.id}
                        className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {actionLoading === selectedRequest.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-5 h-5" />
                            Approve Entry
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="w-full py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Ban className="w-5 h-5" />
                        Reject Entry
                      </button>
                    </>
                  )}
                  {selectedRequest.status === 'PENDING' && !canApproveReject && (
                    <div className="w-full py-3 bg-yellow-100 text-yellow-800 font-medium rounded-xl flex items-center justify-center gap-2 animate-pulse">
                      <Clock className="w-5 h-5" />
                      Waiting for Approval
                    </div>
                  )}
                  {selectedRequest.status === 'APPROVED' && canCheckIn && (
                    <div className="space-y-3">
                      {/* Verification Checklist */}
                      <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Approved - Please Verify Before Check-In:
                        </p>
                        <ul className="text-xs text-green-700 space-y-1 ml-6">
                          <li>• Verify visitor's photo matches their face</li>
                          <li>• Check ID proof ({selectedRequest.idProofType?.replace(/_/g, ' ') || 'ID document'})</li>
                          <li>• Confirm purpose: {selectedRequest.purpose}</li>
                          <li>• Meeting with: {selectedRequest.hostName || 'N/A'}</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => handleCheckIn(selectedRequest.id)}
                        disabled={actionLoading === selectedRequest.id}
                        className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {actionLoading === selectedRequest.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-5 h-5" />
                            Complete Check-In
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {selectedRequest.status === 'APPROVED' && !canCheckIn && (
                    <div className="w-full py-3 bg-green-100 text-green-700 font-medium rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Approved - Check-In at Reception
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center sticky top-4">
              <Eye className="w-16 h-16 text-gray-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-600">Select a request</h3>
              <p className="mt-2 text-gray-400">Click on a request card to view details</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Detail Modal */}
      {selectedRequest && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl shadow-xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Request Details</h3>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Visitor Info */}
              <div className="flex items-center gap-3">
                {selectedRequest.photo ? (
                  <img 
                    src={selectedRequest.photo} 
                    alt="" 
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-gray-800 truncate">
                    {selectedRequest.visitorName || 'Unknown Visitor'}
                  </h4>
                  <p className="text-sm text-gray-500">{selectedRequest.phone || '-'}</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-medium text-sm text-gray-800 truncate">{selectedRequest.email || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">From Company</p>
                  <p className="font-medium text-sm text-gray-800 truncate">{selectedRequest.companyFrom || '-'}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg col-span-2">
                  <p className="text-xs text-blue-600">Company to Visit</p>
                  <p className="font-medium text-gray-800">{selectedRequest.companyToVisit || selectedRequest.company?.displayName || '-'}</p>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg col-span-2">
                  <p className="text-xs text-teal-600">Purpose</p>
                  <p className="font-medium text-gray-800">{selectedRequest.purpose || '-'}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg col-span-2">
                  <p className="text-xs text-green-600">Person to Meet</p>
                  <p className="font-medium text-gray-800">{selectedRequest.personToMeet || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-400">Check-in Time</p>
                  <p className="font-medium text-sm text-gray-800">
                    {selectedRequest.checkInTime 
                      ? new Date(selectedRequest.checkInTime).toLocaleString('en-IN', { 
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit', 
                          hour12: true 
                        })
                      : selectedRequest.createdAt
                        ? new Date(selectedRequest.createdAt).toLocaleString('en-IN', { 
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: true 
                          })
                        : '-'}
                  </p>
                </div>
              </div>

              {/* ID Proof */}
              {selectedRequest.idDocumentImage && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">ID Document</p>
                  <img 
                    src={selectedRequest.idDocumentImage} 
                    alt="ID Document" 
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-white"
                  />
                </div>
              )}
              
              {/* Request ID */}
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Request ID</p>
                  <p className="font-mono font-bold text-gray-800 text-sm">{selectedRequest.id}</p>
                </div>
                <QrCode className="w-6 h-6 text-gray-400" />
              </div>
              
              {/* Actions */}
              <div className="pt-4 space-y-2">
                {selectedRequest.status === 'PENDING' && canApproveReject && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={actionLoading === selectedRequest.id}
                      className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading === selectedRequest.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Approve Entry
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="w-full py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Ban className="w-5 h-5" />
                      Reject Entry
                    </button>
                  </>
                )}
                {selectedRequest.status === 'PENDING' && !canApproveReject && (
                  <div className="w-full py-3 bg-yellow-100 text-yellow-800 font-medium rounded-xl flex items-center justify-center gap-2 animate-pulse">
                    <Clock className="w-5 h-5" />
                    Waiting for Approval
                  </div>
                )}
                {selectedRequest.status === 'APPROVED' && canCheckIn && (
                  <div className="space-y-3">
                    {/* Verification Checklist - Mobile */}
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Approved - Please Verify:
                      </p>
                      <ul className="text-xs text-green-700 space-y-1 ml-6">
                        <li>• Verify photo matches visitor's face</li>
                        <li>• Check ID proof</li>
                        <li>• Confirm purpose: {selectedRequest.purpose}</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => handleCheckIn(selectedRequest.id)}
                      disabled={actionLoading === selectedRequest.id}
                      className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading === selectedRequest.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-5 h-5" />
                          Complete Check-In
                        </>
                      )}
                    </button>
                  </div>
                )}
                {selectedRequest.status === 'APPROVED' && !canCheckIn && (
                  <div className="w-full py-3 bg-green-100 text-green-700 font-medium rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Approved - Check-In at Reception
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

export default GuardDashboard
