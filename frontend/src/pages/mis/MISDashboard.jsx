import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import {
  BarChart3,
  Camera,
  FileText,
  Zap,
  Droplets,
  Flame,
  Thermometer,
  Gauge,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  ArrowRight,
  RefreshCw,
  Download,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Simple meter config - minimal for fast rendering
const meterConfig = {
  electricity: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  water: { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
  gas: { icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
  temperature: { icon: Thermometer, color: 'text-red-600', bg: 'bg-red-50' },
  pressure: { icon: Gauge, color: 'text-purple-600', bg: 'bg-purple-50' },
  fuel: { icon: Gauge, color: 'text-pink-600', bg: 'bg-pink-50' },
}

const MISDashboard = () => {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/meters/analytics?period=30d`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error:', error)
      // Set empty data instead of fake data
      setAnalytics({
        stats: { totalReadings: 0, totalConsumption: 0, verifiedCount: 0, pendingVerification: 0 },
        byMeterType: {},
        chartData: [],
        alerts: [],
        recentReadings: []
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const stats = analytics?.stats || {}
  const verificationRate = stats.totalReadings > 0 
    ? Math.round((stats.verifiedCount / stats.totalReadings) * 100) 
    : 0
  const hasNoData = !stats.totalReadings

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-purple-200 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h1>
            <p className="text-purple-100 text-sm mt-1">Monitor and manage meter readings</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="bg-white/20 rounded-lg px-3 py-1 text-sm">
                {stats.totalReadings || 0} readings
              </span>
              <span className="bg-white/20 rounded-lg px-3 py-1 text-sm">
                {verificationRate}% verified
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/mis/readings"
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium"
            >
              <Camera className="w-4 h-4" />
              New Reading
            </Link>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {hasNoData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">No Meter Readings Yet</p>
              <p className="text-gray-600 text-sm">Go to Meter Readings to add data</p>
            </div>
            <Link to="/mis/readings" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium">
              Add Readings
            </Link>
          </div>
        </div>
      )}

      {/* Stats Cards - Simple design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} color="blue" value={stats.totalReadings || 0} label="Total Readings" />
        <StatCard icon={Activity} color="purple" value={(stats.totalConsumption || 0).toFixed(1)} label="Consumption" />
        <StatCard icon={CheckCircle} color="green" value={stats.verifiedCount || 0} label="Verified" />
        <StatCard icon={Clock} color="orange" value={stats.pendingVerification || 0} label="Pending" />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Readings by Type */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold">Readings by Type</h2>
            </div>
            <Link to="/mis/analytics" className="text-purple-600 text-sm flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            {Object.keys(analytics?.byMeterType || {}).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(analytics.byMeterType).map(([type, data]) => {
                  const config = meterConfig[type] || meterConfig.pressure
                  const Icon = config.icon
                  return (
                    <div key={type} className={`${config.bg} rounded-lg p-3`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className="font-medium capitalize text-sm">{type}</span>
                      </div>
                      <p className="text-xl font-bold">{data.count}</p>
                      <p className="text-xs text-gray-600">{(data.totalConsumption || 0).toFixed(1)} total</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No readings yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Verification */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold">Verification</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="flex justify-center mb-4">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="10"
                    strokeDasharray={`${verificationRate * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{verificationRate}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Verified</span>
                <span className="font-medium text-green-600">{stats.verifiedCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-orange-600">{stats.pendingVerification || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/mis/readings" className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100">
            <Camera className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-sm">Upload Reading</span>
          </Link>
          <Link to="/mis/analytics" className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-sm">Analytics</span>
          </Link>
          <Link to="/mis/export" className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100">
            <Download className="w-5 h-5 text-green-600" />
            <span className="font-medium text-sm">Export</span>
          </Link>
          <Link to="/mis/settings" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
            <Gauge className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-sm">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Simple stat card component
const StatCard = ({ icon: Icon, color, value, label }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
  }
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default MISDashboard
