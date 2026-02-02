import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  ArrowRight,
  BarChart3,
  Gauge,
  Zap,
  Droplets,
  Thermometer
} from 'lucide-react'

/**
 * MIS-Only System Selector
 * This component is used for the Hostinger deployment where only MIS is available
 * Option C: Single card, future-proof design (can add more systems later)
 */
const MISOnlySelector = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hoveredCard, setHoveredCard] = useState(null)

  // MIS-only system (can be expanded in future)
  const systems = [
    {
      id: 'mis',
      title: 'MIS',
      subtitle: 'Meter Information System',
      description: 'Monitor and manage meter readings, consumption analytics, transmitter data, and generate comprehensive reports',
      icon: BarChart3,
      path: '/mis/dashboard',
      color: 'from-blue-500 to-indigo-600',
      hoverColor: 'from-blue-600 to-indigo-700',
      shadowColor: 'shadow-blue-500/30',
      features: [
        { icon: Gauge, text: 'Meter Readings & OCR' },
        { icon: Zap, text: 'Electricity Consumption' },
        { icon: Droplets, text: 'Water & Fuel Tracking' },
        { icon: Thermometer, text: 'Transmitter Data' },
        { icon: BarChart3, text: 'Analytics & Reports' },
      ],
      status: 'active',
    },
  ]

  const handleSystemSelect = (path) => {
    localStorage.setItem('selectedSystem', 'mis')
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Reliable Group | MEP</h1>
            <p className="text-blue-300 text-xs">Meter Information System</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Welcome Message */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Welcome, {user?.firstName || 'User'}!
            </h2>
            <p className="text-blue-200 text-lg">
              Access your Meter Information System
            </p>
          </div>

          {/* System Card - Centered */}
          <div className="flex justify-center">
            {systems.map((system) => {
              const Icon = system.icon
              const isHovered = hoveredCard === system.id

              return (
                <div
                  key={system.id}
                  onClick={() => handleSystemSelect(system.path)}
                  onMouseEnter={() => setHoveredCard(system.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`
                    relative rounded-2xl overflow-hidden w-full max-w-lg
                    transform transition-all duration-300 ease-out cursor-pointer
                    ${isHovered ? 'scale-105 -translate-y-2' : 'scale-100'}
                    ${system.shadowColor} ${isHovered ? 'shadow-2xl' : 'shadow-xl'}
                  `}
                >
                  {/* Card Background */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-br 
                    ${isHovered ? system.hoverColor : system.color}
                    transition-all duration-300
                  `} />

                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
                  <div className="absolute top-1/2 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-12" />

                  {/* Card Content */}
                  <div className="relative p-10">
                    {/* Status Badge */}
                    <div className="absolute top-6 right-6">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-400/20 text-green-300 border border-green-400/30">
                        Active
                      </span>
                    </div>

                    {/* Icon */}
                    <div className={`
                      w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm
                      flex items-center justify-center mb-6
                      transform transition-transform duration-300
                      ${isHovered ? 'scale-110 rotate-3' : ''}
                    `}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-3xl font-bold text-white mb-1">
                      {system.title}
                    </h3>
                    <p className="text-white/80 text-sm font-medium mb-3">
                      {system.subtitle}
                    </p>
                    <p className="text-white/70 text-sm mb-8 leading-relaxed">
                      {system.description}
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      {system.features.map((feature, idx) => {
                        const FeatureIcon = feature.icon
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                              <FeatureIcon className="w-4 h-4 text-white/80" />
                            </div>
                            <span className="text-white/80 text-sm">{feature.text}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Enter Button */}
                    <div className={`
                      flex items-center gap-2 text-white font-semibold text-lg
                      transform transition-all duration-300
                      ${isHovered ? 'translate-x-2' : ''}
                    `}>
                      <span>Enter MIS Dashboard</span>
                      <ArrowRight className={`
                        w-5 h-5 transition-transform duration-300
                        ${isHovered ? 'translate-x-1' : ''}
                      `} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* User Info */}
          <div className="mt-12 text-center">
            <p className="text-blue-300 text-sm">
              Logged in as <span className="text-white font-medium">{user?.email}</span>
              <span className="mx-2">•</span>
              <span className="text-blue-400">{user?.role?.replace('_', ' ') || 'User'}</span>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-blue-400/60 text-sm">
          © {new Date().getFullYear()} YP Security Services Pvt Ltd. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default MISOnlySelector
