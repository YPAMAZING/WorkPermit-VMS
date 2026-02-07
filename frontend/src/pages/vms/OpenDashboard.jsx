// Open VMS Dashboard - No Login Required
// Shows all recent visitors and allows pass verification
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { publicCheckInApi } from '../../services/vmsApi'
import {
  Users, Clock, CheckCircle, XCircle, UserCheck, LogOut,
  RefreshCw, AlertCircle, Eye, Phone, Building2, Search,
  QrCode, Shield, User, Calendar, ChevronRight,
  Loader2, X, Check, Timer, ScanLine, Briefcase
} from 'lucide-react'

const OpenDashboard = () => {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [visitors, setVisitors] = useState([])
  const [stats, setStats] = useState({ today: 0, inside: 0, pending: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  
  // Fetch all recent visitors
  const fetchVisitors = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      
      const response = await publicCheckInApi.getRecentVisitors()
      setVisitors(response.data.visitors || [])
      setStats(response.data.stats || { today: 0, inside: 0, pending: 0 })
      setLastUpdate(new Date().toISOString())
      setError(null)
    } catch (err) {
      console.error('Failed to fetch visitors:', err)
      setError('Failed to load visitors')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])
  
  // Initial load
  useEffect(() => {
    fetchVisitors()
  }, [fetchVisitors])
  
  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchVisitors(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchVisitors])
  
  // Verify visitor pass
  const handleVerify = async () => {
    if (!verifyCode.trim()) return
    
    setVerifying(true)
    setVerifyResult(null)
    try {
      const response = await publicCheckInApi.verifyPass(verifyCode.trim().toUpperCase())
      setVerifyResult({
        success: true,
        data: response.data
      })
    } catch (err) {
      setVerifyResult({
        success: false,
        message: err.response?.data?.message || 'Pass not found'
      })
    } finally {
      setVerifying(false)
    }
  }
  
  // Filter visitors
  const filteredVisitors = visitors.filter(v => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      v.firstName?.toLowerCase().includes(query) ||
      v.lastName?.toLowerCase().includes(query) ||
      v.phone?.includes(query) ||
      v.passCode?.toLowerCase().includes(query) ||
      v.companyName?.toLowerCase().includes(query)
    )
  })
  
  // Format time
  const formatTime = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Format date
  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    })
  }
  
  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: Clock },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Pass Ready', icon: CheckCircle },
      CHECKED_IN: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Inside', icon: UserCheck },
      CHECKED_OUT: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Left', icon: LogOut },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', icon: XCircle },
      EXPIRED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expired', icon: AlertCircle },
    }
    const badge = badges[status] || badges.PENDING
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading visitor dashboard...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Visitor Management</h1>
                <p className="text-blue-100 text-sm">Real-time visitor tracking</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Auto-refresh indicator */}
              <div className="hidden md:flex items-center gap-2 text-sm text-blue-100">
                <Timer className="w-4 h-4" />
                <span>Auto-refresh: 10s</span>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={() => fetchVisitors(true)}
                disabled={refreshing}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Visitors</p>
                <p className="text-3xl font-bold text-gray-800">{stats.today}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Currently Inside</p>
                <p className="text-3xl font-bold text-gray-800">{stats.inside}</p>
              </div>
              <Users className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Entry</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-50" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visitor List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, pass code, or company..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Visitor List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Recent Visitors</h2>
                <p className="text-sm text-gray-500">Showing {filteredVisitors.length} visitors</p>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 border-b border-red-100">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredVisitors.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="mt-4 text-gray-500">
                      {searchQuery ? 'No visitors match your search' : 'No visitors yet today'}
                    </p>
                  </div>
                ) : (
                  filteredVisitors.map(visitor => (
                    <div 
                      key={visitor.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Photo */}
                        {visitor.photo ? (
                          <img 
                            src={visitor.photo} 
                            alt="" 
                            className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-7 h-7 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800 truncate">
                              {visitor.firstName} {visitor.lastName}
                            </h3>
                            {getStatusBadge(visitor.status)}
                          </div>
                          
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {visitor.phone}
                            </span>
                            {visitor.companyName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {visitor.companyName}
                              </span>
                            )}
                            {visitor.visitorCompany && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {visitor.visitorCompany}
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
                            <span>Pass: <strong className="text-gray-600">{visitor.passCode}</strong></span>
                            <span>{formatDate(visitor.createdAt)} at {formatTime(visitor.createdAt)}</span>
                            {visitor.hostName && <span>Meeting: {visitor.hostName}</span>}
                          </div>
                        </div>
                        
                        {/* View Pass Button */}
                        <button
                          onClick={() => navigate(`/vms/pass/${visitor.passCode}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Pass"
                        >
                          <QrCode className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Verify Pass Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ScanLine className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Verify Pass</h3>
                  <p className="text-sm text-gray-500">Enter pass code to verify</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                  placeholder="Enter Pass Code (e.g., VIS-XXXXXX)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-center text-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                
                <button
                  onClick={handleVerify}
                  disabled={verifying || !verifyCode.trim()}
                  className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Verify Pass
                    </>
                  )}
                </button>
              </div>
              
              {/* Verify Result */}
              {verifyResult && (
                <div className={`mt-4 p-4 rounded-xl ${
                  verifyResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {verifyResult.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">Valid Pass</span>
                      </div>
                      <div className="text-sm text-green-800">
                        <p><strong>Name:</strong> {verifyResult.data.firstName} {verifyResult.data.lastName}</p>
                        <p><strong>Status:</strong> {verifyResult.data.status}</p>
                        <p><strong>Company:</strong> {verifyResult.data.companyName || 'General'}</p>
                        <p><strong>Purpose:</strong> {verifyResult.data.purpose}</p>
                        {verifyResult.data.hostName && (
                          <p><strong>Meeting:</strong> {verifyResult.data.hostName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle className="w-5 h-5" />
                      <span>{verifyResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Links</h3>
              <div className="space-y-2">
                <a
                  href="/vms/checkin/RELIABLE"
                  target="_blank"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">Reliable Group Check-in</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
                
                <a
                  href="/vms/checkin/TECHPARK"
                  target="_blank"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">TechPark Check-in</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
                
                <a
                  href="/vms/checkin/BIZCENTRE"
                  target="_blank"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700">Business Centre Check-in</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
                
                <hr className="my-3" />
                
                <a
                  href="/vms/admin"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Admin Panel</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            </div>
            
            {/* Company Portal Access */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-sm p-6 text-white">
              <Building2 className="w-8 h-8 mb-3 opacity-80" />
              <h3 className="font-semibold mb-2">Company Portal</h3>
              <p className="text-sm text-blue-100 mb-4">
                Access your company's visitor dashboard with your unique ID
              </p>
              <button
                onClick={() => navigate('/vms/company-login')}
                className="w-full py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                Access Company Portal
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center py-4 text-xs text-gray-400">
        Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Loading...'}
        <span className="mx-2">•</span>
        Visitor Management System
      </div>
    </div>
  )
}

export default OpenDashboard
