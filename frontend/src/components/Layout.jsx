import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { approvalsAPI } from '../services/api'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Shield,
  ChevronDown,
  Gauge,
  ShieldCheck,
  ArrowLeftRight,
  Home,
} from 'lucide-react'

const Layout = ({ systemType = 'workpermit' }) => {
  const { user, logout, isAdmin, hasPermission, canViewApprovals } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Check if user can view approvals (system roles or custom roles with permission)
  const userCanViewApprovals = canViewApprovals()

  useEffect(() => {
    if (userCanViewApprovals) {
      fetchPendingCount()
    }
  }, [userCanViewApprovals])

  const fetchPendingCount = async () => {
    try {
      const response = await approvalsAPI.getPendingCount()
      setPendingCount(response.data.count)
    } catch (error) {
      console.error('Error fetching pending count:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('selectedSystem')
    logout()
    navigate('/login')
  }

  const handleSwitchSystem = () => {
    localStorage.removeItem('selectedSystem')
    navigate('/select-system')
  }

  // Base path for current system
  const basePath = '/workpermit'

  const navItems = [
    {
      name: 'Dashboard',
      path: `${basePath}/dashboard`,
      icon: LayoutDashboard,
      permission: 'dashboard.view',
      showAlways: true, // Everyone can see dashboard
    },
    {
      name: 'Permits',
      path: `${basePath}/permits`,
      icon: FileText,
      permission: 'permits.view',
      showAlways: true, // Everyone can see permits (own or all based on permission)
    },
    {
      name: 'Approvals',
      path: `${basePath}/approvals`,
      icon: CheckSquare,
      permission: 'approvals.view',
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      name: 'Users',
      path: `${basePath}/users`,
      icon: Users,
      permission: 'users.view',
    },
    {
      name: 'Roles',
      path: `${basePath}/roles`,
      icon: ShieldCheck,
      permission: 'roles.view',
    },
    {
      name: 'Settings',
      path: `${basePath}/settings`,
      icon: Settings,
      permission: 'settings.view',
      showAlways: true, // Everyone can see settings
    },
  ]

  // Filter nav items based on permissions
  const filteredNavItems = navItems.filter((item) => {
    // Always show items marked as showAlways
    if (item.showAlways) return true
    // Admin sees everything
    if (isAdmin) return true
    // Check if user has the required permission
    return hasPermission(item.permission)
  })

  const getRoleBadge = (role) => {
    const badges = {
      ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' },
      FIREMAN: { bg: 'bg-green-100', text: 'text-green-700', label: 'Fireman' },
      SAFETY_OFFICER: { bg: 'bg-green-100', text: 'text-green-700', label: 'Fireman' }, // Backward compatibility
      REQUESTOR: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Requestor' },
    }
    // For custom roles, use roleName from user object or format the role name
    if (badges[role]) {
      return badges[role]
    }
    // Custom role - use user's roleName or format the role
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      label: user?.roleName || role?.replace(/_/g, ' ') || 'User'
    }
  }

  const roleBadge = getRoleBadge(user?.role)

  // Check if user can switch systems (non-Requestor)
  const canSwitchSystem = user?.role !== 'REQUESTOR'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-slate-800 text-white rounded-lg shadow-lg"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Collapsible Style (like VMS) */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-all duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarOpen ? 'w-64' : 'w-20'}
          bg-gradient-to-b from-slate-800 to-slate-900 text-white
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-slate-700">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
              <img 
                src="/logo.png" 
                alt="Reliable Group" 
                className="h-10 w-auto"
              />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white leading-tight">
                  {user?.companyName || 'Reliable Group'}
                </h1>
                <p className="text-xs text-slate-400">Management Systems</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-1 hover:bg-slate-700 rounded flex-shrink-0"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Switch System Button (VMS style - highlighted) */}
        {canSwitchSystem && sidebarOpen && (
          <div className="px-3 pt-4">
            <button
              onClick={handleSwitchSystem}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-purple-300 transition-all border border-purple-500/30"
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
                    ? 'bg-emerald-500/20 text-emerald-400 border-l-4 border-emerald-400'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }
                `}
              >
                <Icon size={20} />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom Section - Fixed */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent pt-4">
          {/* User section */}
          <div className="p-4 border-t border-slate-700 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full max-w-full truncate ${
                    user?.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                    (user?.role === 'FIREMAN' || user?.role === 'SAFETY_OFFICER') ? 'bg-emerald-500/20 text-emerald-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {roleBadge.label}
                  </span>
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
          {/* Copyright */}
          <div className="px-4 pb-3 text-center">
            <p className="text-xs text-slate-500">© 2025 YP SECURITY SERVICES PVT LTD</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
        {/* Top navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center gap-3">
              {/* Notifications */}
              {userCanViewApprovals && pendingCount > 0 && (
                <button
                  onClick={() => navigate(`${basePath}/approvals`)}
                  className="relative p-2 rounded-lg hover:bg-gray-100"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-4 h-4 text-xs font-semibold bg-red-500 text-white rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                </button>
              )}

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-[#1e3a6e] to-[#2a4a80] rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-white">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                      {/* User Info Header */}
                      <div className="px-4 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#1e3a6e] to-[#2a4a80] rounded-full flex items-center justify-center shadow-md">
                            {user?.profilePicture ? (
                              <img src={user.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-lg font-semibold text-white">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            <span className={`inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium rounded-full max-w-full truncate ${roleBadge.bg} ${roleBadge.text}`}>
                              {roleBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Menu Items */}
                      <div className="py-2">
                        {canSwitchSystem && (
                          <button
                            onClick={() => {
                              setUserMenuOpen(false)
                              handleSwitchSystem()
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors"
                          >
                            <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                            <span>Switch System</span>
                          </button>
                        )}
                        <NavLink
                          to={`${basePath}/settings`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          <span>Settings</span>
                        </NavLink>
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

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
