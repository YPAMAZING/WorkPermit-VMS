import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { dashboardApi, gatepassesApi } from '../../services/vmsApi'
import {
  Users,
  FileText,
  UserCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

const VMSDashboard = () => {
  const { user, isAdmin, isCompanyUser, isReceptionist, isSecurityGuard } = useVMSAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [weeklyStats, setWeeklyStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  // Company users should not access the main dashboard - redirect to company dashboard
  // Check both isCompanyUser flag AND if user has companyId but is not admin/reception/guard
  const shouldRedirectToCompanyDashboard = isCompanyUser || 
    (user?.companyId && !isAdmin && !isReceptionist && !isSecurityGuard)
  
  if (shouldRedirectToCompanyDashboard) {
    return <Navigate to="/vms/admin/company-dashboard" replace />
  }

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      const [overviewRes, weeklyRes, alertsRes] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getWeeklyStats(),
        dashboardApi.getAlerts(),
      ])
      setOverview(overviewRes.data)
      setWeeklyStats(weeklyRes.data)
      setAlerts(alertsRes.data.alerts || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
      </div>
    )
  }

  const todayStats = overview?.today?.gatepasses || {}
  const summaryStats = overview?.summary || {}

  const statCards = [
    {
      title: "Today's Visitor Passes",
      value: todayStats.total || 0,
      icon: FileText,
      color: 'bg-blue-500',
      subStats: [
        { label: 'Scheduled', value: todayStats.scheduled || 0, color: 'text-yellow-600' },
        { label: 'Active', value: todayStats.active || 0, color: 'text-green-600' },
        { label: 'Completed', value: todayStats.completed || 0, color: 'text-gray-600' },
      ],
    },
    {
      title: 'Total Visitors',
      value: summaryStats.totalVisitors || 0,
      icon: Users,
      color: 'bg-teal-500',
      subStats: [
        { label: 'New Today', value: overview?.today?.newVisitors || 0, color: 'text-teal-600' },
      ],
    },
    {
      title: 'Pre-approved',
      value: summaryStats.activePreApprovals || 0,
      icon: UserCheck,
      color: 'bg-green-500',
      subStats: [
        { label: 'Valid Today', value: overview?.today?.preApprovalsValid || 0, color: 'text-green-600' },
      ],
    },
    {
      title: 'Blacklisted',
      value: summaryStats.activeBlacklist || 0,
      icon: ShieldAlert,
      color: 'bg-red-500',
    },
  ]

  const purposeColors = {
    MEETING: 'bg-blue-100 text-blue-800',
    INTERVIEW: 'bg-purple-100 text-purple-800',
    DELIVERY: 'bg-yellow-100 text-yellow-800',
    MAINTENANCE: 'bg-orange-100 text-orange-800',
    CONTRACTOR: 'bg-teal-100 text-teal-800',
    EVENT: 'bg-pink-100 text-pink-800',
    PERSONAL: 'bg-gray-100 text-gray-800',
    OTHER: 'bg-gray-100 text-gray-800',
  }

  const statusColors = {
    SCHEDULED: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {user?.firstName}! Here's today's overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/vms/admin/preapproved/new')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserCheck size={18} />
            Pre-approve Visitor
          </button>
          <button
            onClick={() => navigate('/vms/admin/guard')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <FileText size={18} />
            Visitor Check-In
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                  {stat.subStats && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      {stat.subStats.map((sub, i) => (
                        <span key={i} className={`text-xs ${sub.color}`}>
                          {sub.label}: <span className="font-semibold">{sub.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Visitor Passes */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Recent Visitor Passes</h2>
            <button
              onClick={() => navigate('/vms/admin/gatepasses')}
              className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {overview?.recentGatepasses?.length > 0 ? (
              overview.recentGatepasses.map((gp) => (
                <div
                  key={gp.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/vms/admin/gatepasses/${gp.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      {gp.visitorPhoto ? (
                        <img src={gp.visitorPhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{gp.visitorName}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {gp.visitorCompany} • {gp.hostName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[gp.status] || 'bg-gray-100'}`}>
                        {gp.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{gp.gatepassNumber}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No recent visitor passes</p>
              </div>
            )}
          </div>
        </div>

        {/* Alerts & Purpose Breakdown */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Alerts</h2>
              <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                {alerts.length}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {alerts.length > 0 ? (
                alerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className="p-4 border-b border-gray-50 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        alert.severity === 'danger' ? 'bg-red-100' :
                        alert.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <AlertTriangle size={16} className={
                          alert.severity === 'danger' ? 'text-red-600' :
                          alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                  <p className="text-sm">All clear! No alerts.</p>
                </div>
              )}
            </div>
          </div>

          {/* Purpose Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Today by Purpose</h2>
            {overview?.purposeBreakdown?.length > 0 ? (
              <div className="space-y-3">
                {overview.purposeBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${purposeColors[item.purpose] || purposeColors.OTHER}`}>
                      {item.purpose.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-gray-700">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm py-4">No visitor passes today</p>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      {weeklyStats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Weekly Trend</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-teal-500 rounded-full" /> Visitor Passes
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full" /> New Visitors
              </span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weeklyStats.dailyStats?.map((day, index) => (
              <div key={index} className="text-center">
                <div className="mb-2">
                  <div
                    className="mx-auto bg-teal-100 rounded-lg"
                    style={{
                      height: `${Math.max(20, Math.min(100, day.gatepasses * 10))}px`,
                      width: '24px',
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">{day.dayName}</p>
                <p className="text-xs font-semibold text-gray-700">{day.gatepasses}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Total Visitor Passes</p>
              <p className="text-xl font-bold text-gray-800">{weeklyStats.totals?.gatepasses || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">New Visitors</p>
              <p className="text-xl font-bold text-gray-800">{weeklyStats.totals?.visitors || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-xl font-bold text-teal-600">{weeklyStats.totals?.completionRate || 0}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VMSDashboard
