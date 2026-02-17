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
  Shield,
} from 'lucide-react'

const VMSLayout = () => {
  const { user, loading, logout, hasPermission, isAdmin, isCompanyUser, isReceptionist, isSecurityGuard } = useVMSAuth()
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

  const handleSwitchSystem = () => {
    navigate('/select-system')
  }

  // Check if user is a company/reception/guard user (non-admin)
  const isLimitedUser = isCompanyUser || isReceptionist || isSecurityGuard

  const navItems = [
    {
      name: 'Dashboard',
      path: '/vms/admin/dashboard',
      icon: LayoutDashboard,
      permission: 'vms.dashboard.view',
      showFor: ['reception', 'guard'], // Show for reception & guard (admin sees via adminOnly false)
      description: 'Main dashboard overview',
    },
    {
      name: 'Company Dashboard',
      path: '/vms/admin/company-dashboard',
      icon: Building2,
      permission: 'vms.visitors.approve',
      showFor: ['company'], // Only show for company users (and admin)
      description: 'Approve/Reject visitors for your company',
    },
    {
      name: 'Visitor Check-In',
      path: '/vms/admin/guard',
      icon: Shield,
      permission: 'vms.checkin.view',
      showFor: ['company', 'reception', 'guard'], // Show for company, reception, guard (and admin)
      description: 'Live feed for check-in management',
    },
    {
      name: 'Visitors',
      path: '/vms/admin/visitors',
      icon: Users,
      permission: 'vms.visitors.view',
      adminOnly: true,
    },
    {
      name: 'Visitor Pass',
      path: '/vms/admin/gatepasses',
      icon: FileText,
      permission: 'vms.gatepasses.view',
      adminOnly: true,
    },
    {
      name: 'Pre-approved',
      path: '/vms/admin/preapproved',
      icon: UserCheck,
      permission: 'vms.preapproved.view',
      adminOnly: true,
    },
    {
      name: 'Blacklist',
      path: '/vms/admin/blacklist',
      icon: ShieldAlert,
      permission: 'vms.blacklist.view',
      adminOnly: true,
    },
    {
      name: 'Reports',
      path: '/vms/admin/reports',
      icon: BarChart3,
      permission: 'vms.reports.view',
      adminOnly: true,
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
    // Admin sees everything
    if (isAdmin) return true
    
    // Admin-only items hidden from non-admins
    if (item.adminOnly) return false
    
    // Check showFor restrictions
    if (item.showFor) {
      const canShow = (
        (item.showFor.includes('company') && isCompanyUser) ||
        (item.showFor.includes('reception') && isReceptionist) ||
        (item.showFor.includes('guard') && isSecurityGuard)
      )
      return canShow
    }
    
    // Default: check permission
    return hasPermission(item.permission)
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
                  WP and VMS
                </h1>
                <p className="text-xs text-teal-200 truncate">Visitor Management</p>
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

        {/* Switch System Button */}
        {sidebarOpen && (
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
        )}

        {/* Navigation - scrollable area */}
        <nav className="mt-4 px-3 pb-36 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
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

        {/* Bottom Section - Fixed */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-teal-900 to-transparent pt-4">
          {/* User Info */}
          <div className="p-4 border-t border-teal-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-teal-200 truncate">{user?.roleName || user?.role}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Search */}
            <div className="flex-1 max-w-lg hidden md:block ml-12 lg:ml-0">
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
            <div className="flex items-center gap-4 ml-auto">
              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1"
                >
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                      <div className="p-4 border-b border-gray-100">
                        <p className="font-medium text-gray-800">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                        <span className="inline-block mt-2 px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">
                          {user?.roleName || user?.role}
                        </span>
                      </div>
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false)
                            handleSwitchSystem()
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <ArrowLeftRight size={16} className="text-gray-400" />
                          Switch System
                        </button>
                        {/* Only show Settings for admin users */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false)
                              navigate('/vms/admin/settings')
                            }}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                          >
                            <Settings size={16} className="text-gray-400" />
                            Settings
                          </button>
                        )}
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut size={16} />
                          Logout
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
