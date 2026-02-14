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
  Building2,
  UserCog,
  Home,
  ArrowLeftRight,
} from 'lucide-react'

const VMSLayout = () => {
  const { user, loading, logout, hasPermission, isAdmin } = useVMSAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  const handleSwitchSystem = () => {
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
      name: 'Visitor Pass',
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

  const getRoleBadge = (role) => {
    const badges = {
      VMS_ADMIN: { bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'VMS Admin' },
      ADMIN: { bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Admin' },
      COMPANY_USER: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Company User' },
      RECEPTION: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Reception' },
      SECURITY_GUARD: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Security Guard' },
    }
    return badges[role] || { bg: 'bg-gray-500/20', text: 'text-gray-300', label: user?.roleName || 'User' }
  }

  const roleBadge = getRoleBadge(user?.role)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Matching Work Permit Dark Style */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-slate-800 to-slate-900 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
          <div className="bg-white rounded-lg p-1.5">
            <img 
              src="/logo.png" 
              alt="Reliable Group" 
              className="h-10 w-auto"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight">
              Reliable Group
            </h1>
            <p className="text-xs text-slate-400">Visitor Management System</p>
          </div>
          <button
            className="lg:hidden p-1 rounded-lg hover:bg-slate-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Switch System Button */}
        <div className="px-4 pt-4">
          <button
            onClick={handleSwitchSystem}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 text-purple-300 hover:from-purple-600/30 hover:to-indigo-600/30 transition-all"
          >
            <Home className="w-5 h-5" />
            <span className="flex-1 text-left font-medium text-sm">Switch System</span>
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-teal-500/20 text-teal-400 border-l-4 border-teal-400' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 font-medium">{item.name}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900/50">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full max-w-full truncate ${roleBadge.bg} ${roleBadge.text}`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>
          </div>
          {/* Copyright */}
          <div className="px-4 pb-3 text-center">
            <p className="text-xs text-slate-500">© 2025 YP SECURITY SERVICES PVT LTD</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-lg hidden md:block ml-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search visitors, visitor passes..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                    <span className="text-sm font-semibold text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      {/* User Info Header */}
                      <div className="px-4 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-lg font-semibold text-white">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            <span className={`inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                              user?.role === 'VMS_ADMIN' || user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                              user?.role === 'RECEPTION' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {user?.roleName || user?.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false)
                            handleSwitchSystem()
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors"
                        >
                          <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                          <span>Switch System</span>
                        </button>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false)
                            navigate('/vms/profile')
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          <span>Profile Settings</span>
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
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
    </div>
  )
}

export default VMSLayout
