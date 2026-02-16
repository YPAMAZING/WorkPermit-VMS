import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { visitorsApi } from '../../services/vmsApi'
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
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  Home,
  ArrowLeftRight,
  Shield,
} from 'lucide-react'

const CompanyDashboard = () => {
  const { user, logout, isAdmin, isCompanyUser, isReceptionist, isSecurityGuard } = useVMSAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true)
      
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
      await visitorsApi.approve(visitorId)
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
      await visitorsApi.reject(visitorId, reason)
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

  const handleLogout = () => {
    logout()
    navigate('/select-system')
  }

  const handleSwitchSystem = () => {
    navigate('/select-system')
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
    { id: 'pending', label: 'Pending', count: stats.pending, icon: Clock },
    { id: 'approved', label: 'Approved', count: stats.approved, icon: CheckCircle },
    { id: 'checked_in', label: 'Inside', count: stats.checkedIn, icon: UserCheck },
    { id: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircle },
    { id: 'all', label: 'All', count: null, icon: Users },
  ]

  // Navigation items for Company/Reception/Guard users
  const navItems = [
    {
      name: 'Main Dashboard',
      path: '/vms/admin/company-dashboard',
      icon: LayoutDashboard,
      active: location.pathname === '/vms/admin/company-dashboard',
    },
    {
      name: 'Visitor Check-In',
      path: '/vms/admin/guard',
      icon: UserCheck,
      active: location.pathname === '/vms/admin/guard',
    },
  ]

  // Add admin-only navigation if user is admin
  if (isAdmin) {
    navItems.push(
      {
        name: 'Admin Dashboard',
        path: '/vms/admin/dashboard',
        icon: Shield,
        active: location.pathname === '/vms/admin/dashboard',
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-teal-600 text-white rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 w-64
          bg-gradient-to-b from-teal-700 to-teal-900 text-white
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-20 px-4 border-b border-teal-600">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-10 h-10 object-contain bg-white rounded-lg p-1"
          />
          <div>
            <h1 className="font-bold text-sm leading-tight">WP and VMS</h1>
            <p className="text-xs text-teal-200">Company Portal</p>
          </div>
        </div>

        {/* Switch System Button */}
        <div className="px-3 pt-4">
          <button
            onClick={handleSwitchSystem}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-teal-100 transition-all border border-teal-500/30"
          >
            <Home size={18} />
            <span className="flex-1 text-left text-sm font-medium">Switch System</span>
            <ArrowLeftRight size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  setSidebarOpen(false)
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 mb-1 rounded-lg transition-all
                  ${item.active
                    ? 'bg-white text-teal-700 shadow-lg'
                    : 'text-teal-100 hover:bg-teal-600'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </button>
            )
          })}
        </nav>

        {/* User Info - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-teal-600 bg-teal-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-teal-200 truncate">{user?.roleName || user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-20">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="ml-12 lg:ml-0">
                <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Company Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {user?.company?.displayName || 'Manage visitor approvals'}
                </p>
              </div>
              <button
                onClick={fetchVisitors}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
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

          {/* Stats Cards - Responsive Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 lg:p-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="lg:w-5 lg:h-5 text-yellow-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl lg:text-2xl font-bold text-yellow-700">{stats.pending}</p>
                  <p className="text-xs lg:text-sm text-yellow-600 truncate">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 lg:p-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={16} className="lg:w-5 lg:h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl lg:text-2xl font-bold text-green-700">{stats.approved}</p>
                  <p className="text-xs lg:text-sm text-green-600 truncate">Approved</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 lg:p-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserCheck size={16} className="lg:w-5 lg:h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl lg:text-2xl font-bold text-blue-700">{stats.checkedIn}</p>
                  <p className="text-xs lg:text-sm text-blue-600 truncate">Inside</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 lg:p-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <XCircle size={16} className="lg:w-5 lg:h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl lg:text-2xl font-bold text-red-700">{stats.rejected}</p>
                  <p className="text-xs lg:text-sm text-red-600 truncate">Rejected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs - Scrollable on mobile */}
          <div className="border-b border-gray-200 -mx-4 px-4 lg:mx-0 lg:px-0">
            <nav className="flex space-x-1 lg:space-x-4 overflow-x-auto pb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setPage(1); }}
                  className={`flex items-center gap-1 lg:gap-2 px-3 py-2 lg:py-3 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={14} className="lg:w-[18px] lg:h-[18px]" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`px-1.5 lg:px-2 py-0.5 rounded-full text-xs ${
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
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading visitors...</p>
              </div>
            ) : visitors.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No visitors found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {activeTab === 'pending' ? 'No pending approvals' : 'No visitors match your criteria'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {visitors.map((visitor) => (
                  <div key={visitor.id} className="p-3 lg:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Photo */}
                        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {visitor.photo ? (
                            <img src={visitor.photo} alt={visitor.visitorName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Users size={20} />
                            </div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-800 text-sm lg:text-base truncate">{visitor.visitorName}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Phone size={12} />
                              {visitor.phone}
                            </span>
                            {visitor.companyFrom && (
                              <span className="flex items-center gap-1 hidden sm:flex">
                                <Building size={12} />
                                <span className="truncate max-w-[120px]">{visitor.companyFrom}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span className="truncate">Purpose: {visitor.purpose}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions - Responsive */}
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
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                              ) : (
                                <>
                                  <Check size={14} />
                                  <span className="hidden sm:inline">Approve</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(visitor.id)}
                              disabled={actionLoading === visitor.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-xs"
                            >
                              <X size={14} />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 lg:p-4 border-t border-gray-100">
                <p className="text-xs lg:text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 lg:p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 lg:p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
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
                {selectedVisitor.photo && (
                  <div className="text-center">
                    <img 
                      src={selectedVisitor.photo} 
                      alt={selectedVisitor.visitorName} 
                      className="w-24 h-24 lg:w-32 lg:h-32 rounded-xl object-cover mx-auto"
                    />
                  </div>
                )}

                {/* Info Grid - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium text-sm">{selectedVisitor.visitorName}</p>
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
                    <p className="font-medium text-sm">{selectedVisitor.companyFrom || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Purpose</p>
                    <p className="font-medium text-sm">{selectedVisitor.purpose}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Person to Meet</p>
                    <p className="font-medium text-sm">{selectedVisitor.personToMeet || '-'}</p>
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
                    <p className="font-medium text-sm">{formatDate(selectedVisitor.createdAt)}</p>
                  </div>
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
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleApprove(selectedVisitor.id)}
                      disabled={actionLoading === selectedVisitor.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Check size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedVisitor.id)}
                      disabled={actionLoading === selectedVisitor.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <X size={18} />
                      Reject
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
