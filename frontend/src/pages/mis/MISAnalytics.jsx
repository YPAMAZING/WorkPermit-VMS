import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Zap,
  Droplets,
  Flame,
  Radio,
  Thermometer,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Camera,
  ChevronDown,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Simple meter config
const meterConfig = {
  electricity: { icon: Zap, color: '#eab308', label: 'Electricity' },
  water: { icon: Droplets, color: '#3b82f6', label: 'Water' },
  gas: { icon: Flame, color: '#f97316', label: 'Gas' },
  transmitter: { icon: Radio, color: '#22c55e', label: 'Transmitter' },
  temperature: { icon: Thermometer, color: '#ef4444', label: 'Temperature' },
  pressure: { icon: Gauge, color: '#8b5cf6', label: 'Pressure' },
  fuel: { icon: Gauge, color: '#ec4899', label: 'Fuel' },
  flow: { icon: Activity, color: '#06b6d4', label: 'Flow' },
}

const MISAnalytics = () => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const [meterType, setMeterType] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [period, meterType])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({ period })
      if (meterType) params.append('meterType', meterType)

      const response = await axios.get(`${API_URL}/meters/analytics?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error:', error)
      setAnalytics({
        stats: { totalReadings: 0, totalConsumption: 0, avgConsumption: 0, verifiedCount: 0, pendingVerification: 0 },
        byMeterType: {},
        chartData: [],
        alerts: [],
        recentReadings: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    setShowExportMenu(false)
    if (!analytics?.stats?.totalReadings) {
      toast.error('No data to export')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({ format: format === 'xlsx' ? 'csv' : format })
      if (meterType) params.append('meterType', meterType)

      const response = await axios.get(`${API_URL}/meters/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: format === 'json' ? 'json' : 'blob',
      })

      const filename = `analytics_${period}_${new Date().toISOString().split('T')[0]}`
      
      if (format === 'xlsx') {
        const BOM = '\uFEFF'
        const csvText = await response.data.text()
        const blob = new Blob([BOM + csvText], { type: 'application/vnd.ms-excel' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.xlsx`
        a.click()
        toast.success('Excel exported!')
      } else if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.csv`
        a.click()
        toast.success('CSV exported!')
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.json`
        a.click()
        toast.success('JSON exported!')
      }
    } catch (error) {
      toast.error('Export failed')
    }
  }

  const stats = analytics?.stats || {}
  const hasNoData = !stats.totalReadings
  const verificationRate = stats.totalReadings > 0 ? ((stats.verifiedCount / stats.totalReadings) * 100).toFixed(1) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // Empty State
  if (hasNoData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">Analytics & Reports</h1>
                <p className="text-blue-100 text-sm">Real-time insights and consumption analytics</p>
              </div>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm"
            >
              <option value="7d" className="text-gray-900">Last 7 Days</option>
              <option value="30d" className="text-gray-900">Last 30 Days</option>
              <option value="90d" className="text-gray-900">Last 90 Days</option>
              <option value="1y" className="text-gray-900">Last Year</option>
            </select>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-500 mb-6">Start uploading meter readings to see analytics</p>
          <div className="flex justify-center gap-3">
            <Link to="/mis/readings" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium">
              Upload First Reading
            </Link>
            <button onClick={fetchAnalytics} className="px-6 py-2 border border-gray-200 rounded-lg font-medium">
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Analytics & Reports</h1>
              <p className="text-blue-100 text-sm">Real-time insights and consumption analytics</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm"
            >
              <option value="7d" className="text-gray-900">Last 7 Days</option>
              <option value="30d" className="text-gray-900">Last 30 Days</option>
              <option value="90d" className="text-gray-900">Last 90 Days</option>
              <option value="1y" className="text-gray-900">Last Year</option>
            </select>
            <select
              value={meterType}
              onChange={(e) => setMeterType(e.target.value)}
              className="px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm"
            >
              <option value="" className="text-gray-900">All Types</option>
              {Object.entries(meterConfig).map(([key, config]) => (
                <option key={key} value={key} className="text-gray-900">{config.label}</option>
              ))}
            </select>
            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-4 h-4" />
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button onClick={() => handleExport('xlsx')} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50">
                      <FileText className="w-4 h-4 text-green-600" /> Excel (.xlsx)
                    </button>
                    <button onClick={() => handleExport('csv')} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50">
                      <FileText className="w-4 h-4 text-blue-600" /> CSV
                    </button>
                    <button onClick={() => handleExport('json')} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50">
                      <FileText className="w-4 h-4 text-purple-600" /> JSON
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={fetchAnalytics} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalReadings}</p>
              <p className="text-sm text-gray-500">Total Readings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{(stats.totalConsumption || 0).toFixed(1)}</p>
              <p className="text-sm text-gray-500">Total Consumption</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.verifiedCount}</p>
              <p className="text-sm text-gray-500">Verified</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingVerification}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Consumption by Type */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Consumption by Type</h2>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(analytics?.byMeterType || {}).map(([type, data]) => {
              const config = meterConfig[type] || meterConfig.pressure
              const Icon = config.icon
              const maxConsumption = Math.max(...Object.values(analytics.byMeterType).map(d => d.totalConsumption || 0))
              const percentage = maxConsumption > 0 ? ((data.totalConsumption || 0) / maxConsumption) * 100 : 0
              
              return (
                <div key={type} className="flex items-center gap-3">
                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{type}</span>
                      <span className="text-gray-500">{(data.totalConsumption || 0).toFixed(1)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: config.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
            {Object.keys(analytics?.byMeterType || {}).length === 0 && (
              <p className="text-center text-gray-500 py-4">No data</p>
            )}
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Verification Status</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="12"
                    strokeDasharray={`${verificationRate * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{verificationRate}%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600">{stats.verifiedCount}</p>
                <p className="text-sm text-gray-600">Verified</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-orange-600">{stats.pendingVerification}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {analytics?.alerts && analytics.alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h2 className="font-semibold text-gray-900">Consumption Alerts</h2>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {analytics.alerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${alert.type === 'HIGH_CONSUMPTION' ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="flex items-center gap-3">
                  {alert.type === 'HIGH_CONSUMPTION' ? (
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{alert.meterName}</p>
                    <p className="text-sm text-gray-500">{alert.location}</p>
                  </div>
                </div>
                <span className={`font-mono font-medium ${alert.type === 'HIGH_CONSUMPTION' ? 'text-red-600' : 'text-green-600'}`}>
                  {alert.consumption > 0 ? '+' : ''}{(alert.consumption || 0).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Detailed Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Readings</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Consumption</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Avg/Reading</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(analytics?.byMeterType || {}).map(([type, data]) => {
                const config = meterConfig[type] || meterConfig.pressure
                const Icon = config.icon
                const share = stats.totalConsumption > 0 ? ((data.totalConsumption / stats.totalConsumption) * 100).toFixed(1) : 0
                const avg = data.count > 0 ? (data.totalConsumption / data.count).toFixed(2) : 0
                
                return (
                  <tr key={type} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                        <span className="font-medium capitalize">{type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{data.count}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{(data.totalConsumption || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{avg}</td>
                    <td className="px-4 py-3 text-right font-medium">{share}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right font-mono">{stats.totalReadings}</td>
                <td className="px-4 py-3 text-right font-mono text-purple-600">{(stats.totalConsumption || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono">{(stats.avgConsumption || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MISAnalytics
