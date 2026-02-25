import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  ClipboardCheck, 
  ArrowRight,
  Shield,
  Users,
  FileText,
  UserCheck,
  QrCode,
  ShieldAlert,
  LogIn,
  MessageSquare,
  AlertTriangle,
  ClipboardList,
  CheckCircle2
} from 'lucide-react'

const SystemSelector = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [hoveredCard, setHoveredCard] = useState(null)
  
  // Check if VMS token exists (separate from main auth)
  const [hasVMSToken, setHasVMSToken] = useState(false)
  
  useEffect(() => {
    const vmsToken = localStorage.getItem('vms_token')
    setHasVMSToken(!!vmsToken)
  }, [])

  const systems = [
    {
      id: 'workpermit',
      title: 'Work Permit System',
      description: 'Manage work permits, approvals, safety measures, and compliance documentation',
      icon: ClipboardCheck,
      path: '/workpermit/dashboard',
      loginPath: '/login',
      color: 'from-orange-500 to-red-600',
      hoverColor: 'from-orange-600 to-red-700',
      shadowColor: 'shadow-orange-500/30',
      features: [
        { icon: FileText, text: 'Create & Manage Permits' },
        { icon: Shield, text: 'Safety Compliance' },
        { icon: Users, text: 'Worker Management' },
      ],
      status: 'active',
      requiresMainAuth: true, // Work Permit requires main auth
    },
    {
      id: 'vms',
      title: 'Visitor Management System',
      description: 'Visitor Management System for visitor passes, visitor tracking, and security',
      icon: UserCheck,
      path: '/vms',
      loginPath: '/vms/login',
      color: 'from-teal-500 to-cyan-600',
      hoverColor: 'from-teal-600 to-cyan-700',
      shadowColor: 'shadow-teal-500/30',
      features: [
        { icon: QrCode, text: 'QR Code Visitor Passes' },
        { icon: Users, text: 'Visitor Management' },
        { icon: ShieldAlert, text: 'Blacklist & Security' },
      ],
      status: 'active',
      requiresMainAuth: false, // VMS has its own auth system
    },
    {
      id: 'complaints',
      title: 'Complaint Management System',
      description: 'Track and manage complaints, grievances, escalations, and resolutions efficiently',
      icon: MessageSquare,
      path: '/complaints',
      loginPath: '/complaints/login',
      color: 'from-amber-500 to-orange-600',
      hoverColor: 'from-amber-600 to-orange-700',
      shadowColor: 'shadow-amber-500/30',
      features: [
        { icon: AlertTriangle, text: 'Register Complaints' },
        { icon: ClipboardList, text: 'Track & Escalate' },
        { icon: CheckCircle2, text: 'Resolution Management' },
      ],
      status: 'coming_soon',
      requiresMainAuth: true,
    },
  ]

  const handleSystemSelect = (system) => {
    // Store selected system in localStorage
    localStorage.setItem('selectedSystem', system.id)
    
    // For Work Permit - check if user is logged in with main auth
    if (system.id === 'workpermit') {
      if (user) {
        navigate(system.path)
      } else {
        navigate(system.loginPath)
      }
      return
    }
    
    // For VMS - always go to VMS landing page
    // The VMS system handles its own auth flow
    navigate(system.path)
  }
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-purple-300 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Determine display name
  const displayName = user?.firstName || 'User'
  const displayEmail = user?.email || ''
  const displayRole = user?.role?.replace('_', ' ') || ''
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Reliable Group Logo" 
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="text-white font-bold text-xl">Reliable Group</h1>
              <p className="text-purple-300 text-xs">Management Systems</p>
            </div>
          </div>
          
          {/* Login Button (shown when not logged in) */}
          {!isLoggedIn && (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <LogIn size={18} />
              <span>Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-6xl w-full">
          {/* Welcome Message */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {isLoggedIn ? `Welcome, ${displayName}!` : 'Welcome!'}
            </h2>
            <p className="text-purple-200 text-lg">
              Select a system to continue
            </p>
          </div>

          {/* System Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {systems.map((system) => {
              const Icon = system.icon
              const isHovered = hoveredCard === system.id
              const isComingSoon = system.status === 'coming_soon'
              
              // Check if user needs to login for this system
              const needsLogin = system.requiresMainAuth && !user

              return (
                <div
                  key={system.id}
                  onClick={() => !isComingSoon && handleSystemSelect(system)}
                  onMouseEnter={() => setHoveredCard(system.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`
                    relative rounded-2xl overflow-hidden
                    transform transition-all duration-300 ease-out
                    ${isComingSoon ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
                    ${isHovered && !isComingSoon ? 'scale-105 -translate-y-2' : 'scale-100'}
                    ${system.shadowColor} ${isHovered && !isComingSoon ? 'shadow-2xl' : 'shadow-xl'}
                  `}
                >
                  {/* Card Background */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-br 
                    ${isHovered && !isComingSoon ? system.hoverColor : system.color}
                    transition-all duration-300
                    ${isComingSoon ? 'grayscale-[30%]' : ''}
                  `} />

                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16" />

                  {/* Card Content */}
                  <div className="relative p-8">
                    {/* Status Badge */}
                    <div className="absolute top-6 right-6">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-semibold
                        ${system.status === 'active' 
                          ? 'bg-green-400/20 text-green-300 border border-green-400/30' 
                          : 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'}
                      `}>
                        {system.status === 'active' ? 'Active' : 'Coming Soon'}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className={`
                      w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm
                      flex items-center justify-center mb-6
                      transform transition-transform duration-300
                      ${isHovered && !isComingSoon ? 'scale-110 rotate-3' : ''}
                    `}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {system.title}
                    </h3>
                    <p className="text-white/70 text-sm mb-6 leading-relaxed">
                      {system.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                      {system.features.map((feature, idx) => {
                        const FeatureIcon = feature.icon
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <FeatureIcon className="w-4 h-4 text-white/80" />
                            </div>
                            <span className="text-white/80 text-sm">{feature.text}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Enter Button / Coming Soon */}
                    <div className={`
                      flex items-center gap-2 text-white font-semibold
                      transform transition-all duration-300
                      ${isHovered && !isComingSoon ? 'translate-x-2' : ''}
                    `}>
                      {isComingSoon ? (
                        <span className="text-white/60">Coming Soon</span>
                      ) : needsLogin ? (
                        <>
                          <LogIn className="w-5 h-5" />
                          <span>Login to Continue</span>
                        </>
                      ) : (
                        <>
                          <span>Enter System</span>
                          <ArrowRight className={`
                            w-5 h-5 transition-transform duration-300
                            ${isHovered ? 'translate-x-1' : ''}
                          `} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* User Info */}
          <div className="mt-12 text-center">
            {isLoggedIn ? (
              <p className="text-purple-300 text-sm">
                Logged in as <span className="text-white font-medium">{displayEmail}</span>
                {displayRole && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="text-purple-400">{displayRole}</span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-purple-300 text-sm">
                Not logged in • <button onClick={() => navigate('/login')} className="text-white hover:text-purple-200 underline">Login to Work Permit</button>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-purple-400/60 text-sm">
          © {new Date().getFullYear()} YP Security Services Pvt Ltd. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default SystemSelector
