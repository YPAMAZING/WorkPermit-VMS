import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { dashboardApi, visitorsApi, gatepassesApi } from '../../services/vmsApi'
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  PieChart,
} from 'lucide-react'

const VMSReports = () => {
  const { isAdmin } = useVMSAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })
  const [reportData, setReportData] = useState({
    overview: null,
    weeklyStats: null,
    visitorStats: null,
    gatepassStats: null,
  })

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const [overview, weeklyStats, gatepassStats] = await Promise.all([
        dashboardApi.getOverview().catch(() => ({ data: {} })),
        dashboardApi.getWeeklyStats().catch(() => ({ data: {} })),
        gatepassesApi.getStats('month').catch(() => ({ data: {} })),
      ])

      setReportData({
        overview: overview.data,
        weeklyStats: weeklyStats.data,
        gatepassStats: gatepassStats.data,
      })
    } catch (error) {
      console.error('Failed to fetch report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchReportData()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const handleExport = (type) => {
    // Generate CSV data
    const csvData = []
    
    if (type === 'visitors') {
      csvData.push(['Date', 'Total Visitors', 'New Visitors', 'Checked In', 'Checked Out'])
      reportData.weeklyStats?.dailyStats?.forEach(day => {
        csvData.push([day.date, day.visitors || 0, day.visitors || 0, 0, 0])
      })
    } else if (type === 'gatepasses') {
      csvData.push(['Date', 'Total', 'Active', 'Completed', 'Cancelled'])
      reportData.weeklyStats?.dailyStats?.forEach(day => {
        csvData.push([day.date, day.gatepasses || 0, 0, 0, 0])
      })
    }

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n')
    
    // Download
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vms_${type}_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
      </div>
    )
  }

  const overview = reportData.overview || {}
  const weeklyStats = reportData.weeklyStats || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Visitor management insights and statistics</p>
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
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleExport('visitors')}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Download size={18} />
              Export Visitors
            </button>
            <button
              onClick={() => handleExport('gatepasses')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={18} />
              Export Visitor Passes
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Visitors"
          value={overview.summary?.totalVisitors || 0}
          icon={Users}
          color="bg-teal-500"
          subtitle="All time"
        />
        <StatCard
          title="Today's Visitor Passes"
          value={overview.today?.gatepasses?.total || 0}
          icon={FileText}
          color="bg-blue-500"
          subtitle={`${overview.today?.gatepasses?.active || 0} active`}
        />
        <StatCard
          title="Pre-approved"
          value={overview.summary?.activePreApprovals || 0}
          icon={CheckCircle}
          color="bg-green-500"
          subtitle="Currently active"
        />
        <StatCard
          title="Blacklisted"
          value={overview.summary?.activeBlacklist || 0}
          icon={AlertTriangle}
          color="bg-red-500"
          subtitle="Active bans"
        />
      </div>

      {/* Weekly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-teal-600" />
              Weekly Visitor Trend
            </h2>
          </div>
          {weeklyStats.dailyStats?.length > 0 ? (
            <div className="space-y-4">
              {weeklyStats.dailyStats.map((day, index) => {
                const maxValue = Math.max(...weeklyStats.dailyStats.map(d => d.visitors || d.gatepasses || 0)) || 1
                const value = day.visitors || day.gatepasses || 0
                const percentage = (value / maxValue) * 100

                return (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-12 text-sm text-gray-500">{day.dayName}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 10)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{value}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No data available for this period</p>
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-800">{weeklyStats.totals?.gatepasses || weeklyStats.totalThisWeek || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Visitors</p>
              <p className="text-xl font-bold text-gray-800">{weeklyStats.totals?.visitors || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completion</p>
              <p className="text-xl font-bold text-teal-600">{weeklyStats.totals?.completionRate || 0}%</p>
            </div>
          </div>
        </div>

        {/* Purpose Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <PieChart size={20} className="text-blue-600" />
              Visit Purpose Breakdown
            </h2>
          </div>
          {overview.purposeBreakdown?.length > 0 ? (
            <div className="space-y-4">
              {overview.purposeBreakdown.map((item, index) => {
                const total = overview.purposeBreakdown.reduce((sum, i) => sum + i.count, 0) || 1
                const percentage = Math.round((item.count / total) * 100)
                const colors = [
                  'bg-blue-500',
                  'bg-teal-500',
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-pink-500',
                  'bg-indigo-500',
                  'bg-yellow-500',
                  'bg-gray-500',
                ]

                return (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-gray-600 truncate">{item.purpose?.replace('_', ' ')}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-16 text-sm text-gray-600 text-right">{item.count} ({percentage}%)</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No purpose data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Clock size={20} className="text-purple-600" />
          Today's Visitor Pass Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-800">{overview.today?.gatepasses?.total || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-700">{overview.today?.gatepasses?.scheduled || 0}</p>
            <p className="text-sm text-yellow-600 mt-1">Scheduled</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-700">{overview.today?.gatepasses?.active || 0}</p>
            <p className="text-sm text-green-600 mt-1">Active</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-700">{overview.today?.gatepasses?.completed || 0}</p>
            <p className="text-sm text-blue-600 mt-1">Completed</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-700">{overview.today?.gatepasses?.cancelled || 0}</p>
            <p className="text-sm text-red-600 mt-1">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Report Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExport('visitors')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-teal-100 rounded-lg">
              <Users size={20} className="text-teal-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">Visitor Report</p>
              <p className="text-sm text-gray-500">Export all visitor data</p>
            </div>
          </button>
          <button
            onClick={() => handleExport('gatepasses')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">Gatepass Report</p>
              <p className="text-sm text-gray-500">Export gatepass history</p>
            </div>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 size={20} className="text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">Print Dashboard</p>
              <p className="text-sm text-gray-500">Print current view</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default VMSReports
