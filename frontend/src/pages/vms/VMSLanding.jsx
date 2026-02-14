import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  QrCode, 
  LogIn, 
  FileCheck, 
  Users, 
  Shield, 
  Building2,
  Scan,
  ArrowRight
} from 'lucide-react'

const VMSLanding = () => {
  const navigate = useNavigate()
  const [hoveredCard, setHoveredCard] = useState(null)

  // Only 2 blocks: Visitor Login and Staff Login
  // Pre-Approval is accessible after staff login inside the admin panel
  const blocks = [
    {
      id: 'visitor-qr',
      title: 'Visitor Login',
      subtitle: 'Scan QR & Register',
      description: 'Visitors can scan QR code, enter their details, and generate a digital visitor pass instantly',
      icon: QrCode,
      path: '/vms/visitor-register',
      color: 'from-cyan-500 to-teal-600',
      hoverColor: 'from-cyan-600 to-teal-700',
      shadowColor: 'shadow-cyan-500/30',
      features: [
        { icon: Scan, text: 'Scan QR Code' },
        { icon: Users, text: 'Enter Details' },
        { icon: FileCheck, text: 'Get Visitor Pass' },
      ],
    },
    {
      id: 'login',
      title: 'Staff Login',
      subtitle: 'Company & Reception',
      description: 'Company staff can view their visitors. Reception can manage all visitors and entries',
      icon: LogIn,
      path: '/vms/login',
      color: 'from-pink-500 to-rose-600',
      hoverColor: 'from-pink-600 to-rose-700',
      shadowColor: 'shadow-pink-500/30',
      features: [
        { icon: Building2, text: 'Company Access' },
        { icon: Users, text: 'Reception Desk' },
        { icon: Shield, text: 'Role-Based View' },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Reliable Group Logo" 
              className="w-12 h-12 object-contain bg-white rounded-lg p-1"
            />
            <div>
              <h1 className="text-white font-bold text-xl">Reliable Group | WP and VMS</h1>
              <p className="text-teal-300 text-xs">Visitor Management System</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/select-system')}
            className="text-teal-300 hover:text-white text-sm flex items-center gap-2 transition-colors"
          >
            ← Back to Systems
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-6xl w-full">
          {/* Welcome Message */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Visitor Management System
            </h2>
            <p className="text-teal-200 text-lg">
              Select an option to continue
            </p>
          </div>

          {/* Two Blocks */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {blocks.map((block) => {
              const Icon = block.icon
              const isHovered = hoveredCard === block.id

              return (
                <div
                  key={block.id}
                  onClick={() => navigate(block.path)}
                  onMouseEnter={() => setHoveredCard(block.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`
                    relative overflow-hidden rounded-2xl cursor-pointer
                    transform transition-all duration-300
                    ${isHovered ? 'scale-105 -translate-y-2' : 'scale-100'}
                    ${isHovered ? block.shadowColor : ''}
                    ${isHovered ? 'shadow-2xl' : 'shadow-lg'}
                  `}
                >
                  {/* Background Gradient */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-br transition-all duration-300
                    ${isHovered ? block.hoverColor : block.color}
                  `} />

                  {/* Content */}
                  <div className="relative p-6">
                    {/* Icon */}
                    <div className={`
                      w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                      bg-white/20 backdrop-blur-sm
                      ${isHovered ? 'scale-110' : 'scale-100'}
                      transition-transform duration-300
                    `}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-1">
                      {block.title}
                    </h3>
                    <p className="text-white/80 text-sm font-medium mb-3">
                      {block.subtitle}
                    </p>
                    <p className="text-white/70 text-sm mb-6 min-h-[60px]">
                      {block.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-2 mb-6">
                      {block.features.map((feature, idx) => {
                        const FeatureIcon = feature.icon
                        return (
                          <div key={idx} className="flex items-center gap-2 text-white/90">
                            <FeatureIcon className="w-4 h-4" />
                            <span className="text-sm">{feature.text}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Action Button */}
                    <div className={`
                      flex items-center justify-center gap-2 
                      bg-white/20 hover:bg-white/30 
                      rounded-xl py-3 px-4 
                      text-white font-semibold
                      transition-all duration-300
                      ${isHovered ? 'bg-white/30' : ''}
                    `}>
                      <span>Continue</span>
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

          {/* Quick Info */}
          <div className="mt-12 text-center">
            <p className="text-teal-300/60 text-sm">
              For assistance, contact reception or security desk
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-teal-200/60 text-sm">
          © {new Date().getFullYear()} Reliable Group. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default VMSLanding
