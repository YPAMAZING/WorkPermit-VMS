import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useVMSAuth } from '../context/VMSAuthContext'
import LoadingSpinner from './LoadingSpinner'
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCheck,
  ShieldAlert,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  QrCode,
  Building2,
  UserCog,
} from 'lucide-react'

const VMSLayout = () => {
  const { user, loading, logout, hasPermission, isAdmin } = useVMSAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-500 text-sm">Loading VMS...</p>
        </div>
      </div>
    )
  }

  // Redirect to system selector if not logged in (NOT to /login)
  if (!user) {
    // Store the current path so we can redirect back after login
    const currentPath = location.pathname + location.search
    return <Navigate to="/select-system" state={{ from: currentPath, system: 'vms' }} replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/select-system')
  }

  const navItems = [
    {
      name: 'Dashboard',
      path: '/vms/admin/dashboard',
      icon: LayoutDashboard,
      permission: 'vms.dashboard.view',
    },
    {
      name: 'Company Dashboard',
      path: '/vms/admin/company-dashboard',
      icon: Building2,
      permission: 'vms.visitors.approve',
      description: 'Approve/Reject visitors for your company',
    },
    {
      name: 'Visitors',
      path: '/vms/admin/visitors',
      icon: Users,
      permission: 'vms.visitors.view',
    },
    {
      name: 'Gatepasses',
      path: '/vms/admin/gatepasses',
      icon: FileText,
      permission: 'vms.gatepasses.view',
    },
    {
      name: 'Pre-approved',
      path: '/vms/admin/preapproved',
      icon: UserCheck,
      permission: 'vms.preapproved.view',
    },
    {
      name: 'Blacklist',
      path: '/vms/admin/blacklist',
      icon: ShieldAlert,
      permission: 'vms.blacklist.view',
    },
    {
      name: 'Reports',
      path: '/vms/admin/reports',
      icon: BarChart3,
      permission: 'vms.reports.view',
    },
    {
      name: 'User Management',
      path: '/vms/admin/users',
      icon: UserCog,
      permission: 'vms.users.manage',
      adminOnly: true,
    },
    {
      name: 'Settings',
      path: '/vms/admin/settings',
      icon: Settings,
      permission: 'vms.settings.view',
      adminOnly: true,
    },
  ]

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    return isAdmin || hasPermission(item.permission)
  })

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-teal-600 text-white rounded-lg shadow-lg"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-transform duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarOpen ? 'w-64' : 'w-20'}
          bg-gradient-to-b from-teal-700 to-teal-900 text-white
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-teal-600">
          <div className="flex items-center gap-3 overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Reliable Group Logo" 
              className="w-10 h-10 object-contain bg-white rounded-lg p-1 flex-shrink-0"
            />
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-bold text-sm leading-tight">
                  Work Permit
                </h1>
                <h1 className="font-bold text-sm leading-tight">
                  and VMS
                </h1>
                <p className="text-xs text-teal-200 truncate">Visitor Management System</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-1 hover:bg-teal-600 rounded flex-shrink-0"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-3 mb-1 rounded-lg transition-all
                  ${isActive
                    ? 'bg-white text-teal-700 shadow-lg'
                    : 'text-teal-100 hover:bg-teal-600'
                  }
                `}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Quick Actions */}
        {sidebarOpen && (
          <div className="absolute bottom-24 left-0 right-0 px-4">
            <button
              onClick={() => navigate('/vms/admin/guard')}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white py-3 px-4 rounded-lg transition-colors"
            >
              <QrCode size={20} />
              <span>Scan QR</span>
            </button>
          </div>
        )}

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-teal-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-teal-200 truncate">{user?.roleName}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Search */}
            <div className="flex-1 max-w-lg hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search visitors, gatepasses..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Back to System Selector */}
              <button
                onClick={() => navigate('/select-system')}
                className="hidden md:block px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                Switch System
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-teal-700 font-semibold text-sm">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-medium text-gray-800">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                      <p className="text-xs text-teal-600 mt-1">{user?.roleName}</p>
                    </div>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        navigate('/vms/profile')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Profile Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}

export default VMSLayout
