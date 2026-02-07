import { useState } from 'react'
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
  ShieldAlert
} from 'lucide-react'

const SystemSelector = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hoveredCard, setHoveredCard] = useState(null)

  const systems = [
    {
      id: 'workpermit',
      title: 'Work Permit System',
      description: 'Manage work permits, approvals, safety measures, and compliance documentation',
      icon: ClipboardCheck,
      path: '/workpermit/dashboard',
      color: 'from-orange-500 to-red-600',
      hoverColor: 'from-orange-600 to-red-700',
      shadowColor: 'shadow-orange-500/30',
      features: [
        { icon: FileText, text: 'Create & Manage Permits' },
        { icon: Shield, text: 'Safety Compliance' },
        { icon: Users, text: 'Worker Management' },
      ],
      status: 'active',
    },
    {
      id: 'vms',
      title: 'VMS (Gatepass)',
      description: 'Visitor Management System for gatepasses, visitor tracking, and security',
      icon: UserCheck,
      path: '/vms/login',
      color: 'from-teal-500 to-cyan-600',
      hoverColor: 'from-teal-600 to-cyan-700',
      shadowColor: 'shadow-teal-500/30',
      features: [
        { icon: QrCode, text: 'QR Code Gatepasses' },
        { icon: Users, text: 'Visitor Management' },
        { icon: ShieldAlert, text: 'Blacklist & Security' },
      ],
      status: 'active',
    },
  ]

  const handleSystemSelect = (path) => {
    // Store selected system in localStorage
    const system = path.includes('workpermit') ? 'workpermit' : path.includes('vms') ? 'vms' : 'workpermit'
    localStorage.setItem('selectedSystem', system)
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Reliable Group | MEP</h1>
            <p className="text-purple-300 text-xs">Management Systems</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-5xl w-full">
          {/* Welcome Message */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Welcome, {user?.firstName || 'User'}!
            </h2>
            <p className="text-purple-200 text-lg">
              Select a system to continue
            </p>
          </div>

          {/* System Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {systems.map((system) => {
              const Icon = system.icon
              const isHovered = hoveredCard === system.id
              const isComingSoon = system.status === 'coming_soon'

              return (
                <div
                  key={system.id}
                  onClick={() => !isComingSoon && handleSystemSelect(system.path)}
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
            <p className="text-purple-300 text-sm">
              Logged in as <span className="text-white font-medium">{user?.email}</span>
              <span className="mx-2">•</span>
              <span className="text-purple-400">{user?.role?.replace('_', ' ') || 'User'}</span>
            </p>
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
