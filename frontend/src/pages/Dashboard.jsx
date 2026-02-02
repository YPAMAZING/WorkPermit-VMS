import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dashboardAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  AlertTriangle,
  Flame,
  Zap,
  ArrowUp,
  Box,
  Calendar,
  Plus,
} from 'lucide-react'
import { format } from 'date-fns'

const Dashboard = () => {
  const { user, canApprove, canViewUsers, canViewStatistics } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Permission-based checks for custom roles
  const userCanApprove = canApprove()
  const userCanViewUsers = canViewUsers()
  const userCanViewStats = canViewStatistics()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWorkTypeIcon = (type) => {
    const icons = {
      HOT_WORK: <Flame className="w-4 h-4" />,
      CONFINED_SPACE: <Box className="w-4 h-4" />,
      ELECTRICAL: <Zap className="w-4 h-4" />,
      WORKING_AT_HEIGHT: <ArrowUp className="w-4 h-4" />,
    }
    return icons[type] || <FileText className="w-4 h-4" />
  }

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Clock className="w-3 h-3" /> },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> },
    }
    return badges[status] || badges.PENDING
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Permits',
      value: stats?.stats?.totalPermits || 0,
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-primary-500',
      link: '/workpermit/permits',
    },
    {
      title: 'Pending',
      value: stats?.stats?.pendingPermits || 0,
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-amber-500',
      link: '/workpermit/permits?status=PENDING',
    },
    {
      title: 'Approved',
      value: stats?.stats?.approvedPermits || 0,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'bg-green-500',
      link: '/workpermit/permits?status=APPROVED',
    },
    {
      title: 'Rejected',
      value: stats?.stats?.rejectedPermits || 0,
      icon: <XCircle className="w-6 h-6" />,
      color: 'bg-red-500',
      link: '/workpermit/permits?status=REJECTED',
    },
  ]

  // Add pending approvals for users who can approve (Fireman, Admin, or custom roles with approval permission)
  if (userCanApprove) {
    statCards.push({
      title: 'Pending Approvals',
      value: stats?.stats?.pendingApprovals || 0,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'bg-orange-500',
      link: '/approvals?decision=PENDING',
    })
  }

  // Add total users for Admin or users with user view permission
  if (userCanViewUsers) {
    statCards.push({
      title: 'Total Users',
      value: stats?.stats?.totalUsers || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-purple-500',
      link: '/users',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            Here's an overview of your permit management system
          </p>
        </div>
        <Link to="/workpermit/permits/new" className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          New Permit
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="card p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`${stat.color} p-3 rounded-xl text-white`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Permits */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Permits</h2>
            <Link to="/workpermit/permits" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.recentPermits?.length > 0 ? (
              stats.recentPermits.map((permit) => {
                const statusBadge = getStatusBadge(permit.status)
                return (
                  <Link
                    key={permit.id}
                    to={`/permits/${permit.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${statusBadge.bg}`}>
                      {getWorkTypeIcon(permit.workType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{permit.title}</p>
                      <p className="text-sm text-gray-500">
                        {permit.user?.firstName} {permit.user?.lastName} · {permit.location}
                      </p>
                    </div>
                    <div className={`badge ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.icon}
                      <span className="ml-1">{permit.status}</span>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No permits yet</p>
                <Link to="/workpermit/permits/new" className="text-primary-600 hover:text-primary-700 text-sm">
                  Create your first permit
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Work Type Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Permit Types</h2>
          </div>
          <div className="p-4 space-y-3">
            {stats?.workTypeData?.length > 0 ? (
              stats.workTypeData.map((item, index) => {
                const total = stats?.stats?.totalPermits || 1
                const percentage = ((item.count / total) * 100).toFixed(0)
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.type}</span>
                      <span className="font-medium text-gray-900">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-center text-gray-500 py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Permits */}
      {stats?.upcomingPermits?.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Approved Permits</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Permit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requestor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Start Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.upcomingPermits.map((permit) => (
                  <tr key={permit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/permits/${permit.id}`} className="font-medium text-primary-600 hover:text-primary-700">
                        {permit.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{permit.location}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {permit.user?.firstName} {permit.user?.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(permit.startDate), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Rate */}
      {userCanApprove && (
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.stats?.approvalRate || 0}%
              </p>
              <p className="text-sm text-gray-500">Approval Rate</p>
            </div>
            <div className="flex-1 ml-8">
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.stats?.approvalRate || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
