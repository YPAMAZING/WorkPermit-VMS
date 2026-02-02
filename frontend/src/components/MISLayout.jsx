import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useMISAuth } from '../context/MISAuthContext'
import { 
  BarChart3,
  LayoutDashboard,
  Gauge,
  Radio,
  TrendingUp,
  FileText,
  Settings,
  Users,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Bell,
  User
} from 'lucide-react'

const MISLayout = () => {
  const { user, logout, hasPermission } = useMISAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Navigation items
  const navItems = [
    {
      name: 'Dashboard',
      path: '/mis/dashboard',
      icon: LayoutDashboard,
      permission: 'mis.dashboard.view',
    },
    {
      name: 'Meter Readings',
      path: '/mis/readings',
      icon: Gauge,
      permission: 'mis.meters.view',
    },
    {
      name: 'Transmitter Data',
      path: '/mis/transmitter',
      icon: Radio,
      permission: 'mis.transmitter.view',
      comingSoon: true,
    },
    {
      name: 'Analytics',
      path: '/mis/analytics',
      icon: TrendingUp,
      permission: 'mis.analytics.view',
    },
    {
      name: 'Reports',
      path: '/mis/reports',
      icon: FileText,
      permission: 'mis.reports.view',
      comingSoon: true,
    },
    {
      name: 'Users',
      path: '/mis/users',
      icon: Users,
      permission: 'mis.users.view',
    },
    {
      name: 'Roles',
      path: '/mis/roles',
      icon: Shield,
      permission: 'mis.roles.view',
    },
    {
      name: 'Settings',
      path: '/mis/settings',
      icon: Settings,
      permission: 'mis.settings.view',
    },
  ]

  const handleLogout = async () => {
    await logout()
  }

  const NavItem = ({ item, mobile = false }) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path
    const canAccess = hasPermission(item.permission)
    
    if (!canAccess && !user?.isAdmin) return null
    
    if (item.comingSoon) {
      return (
        <div
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg
            text-gray-400 cursor-not-allowed
            ${mobile ? 'text-base' : 'text-sm'}
          `}
        >
          <Icon className="w-5 h-5" />
          {(sidebarOpen || mobile) && (
            <div className="flex items-center gap-2">
              <span>{item.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Soon</span>
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        to={item.path}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-400' 
            : 'text-gray-300 hover:bg-white/5 hover:text-white'
          }
          ${mobile ? 'text-base' : 'text-sm'}
        `}
      >
        <Icon className="w-5 h-5" />
        {(sidebarOpen || mobile) && <span>{item.name}</span>}
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gray-800 border-b border-gray-700 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">MIS</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-white relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user?.firstName?.[0] || 'U'}
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`
        lg:hidden fixed top-0 left-0 h-full w-72 bg-gray-800 z-50 transform transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">MIS</h1>
              <p className="text-gray-400 text-xs">Meter Information System</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} mobile />
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`
        hidden lg:flex fixed top-0 left-0 h-full flex-col bg-gray-800 border-r border-gray-700 z-40
        transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-20'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold">MIS</h1>
                <p className="text-gray-400 text-xs">Meter Information System</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors
              ${!sidebarOpen && 'justify-center'}
            `}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`
        lg:transition-all lg:duration-300
        ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
      `}>
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-gray-800 border-b border-gray-700 px-6 items-center justify-between">
          <div>
            <h2 className="text-white text-lg font-semibold">
              {navItems.find(item => location.pathname.startsWith(item.path))?.name || 'MIS'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-white relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.firstName?.[0] || 'U'}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-gray-400 text-xs">{user?.roleName || user?.role}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="p-3 border-b border-gray-700">
                      <p className="text-white font-medium">{user?.email}</p>
                      <p className="text-gray-400 text-sm">{user?.roleName || user?.role}</p>
                    </div>
                    <div className="p-2">
                      <NavLink
                        to="/mis/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile Settings</span>
                      </NavLink>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
        </header>

        {/* Page Content */}
        <main className="p-6 pt-20 lg:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MISLayout
