import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight
} from 'lucide-react'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Load saved credentials on mount
  useEffect(() => {
    setMounted(true)
    const savedCredentials = localStorage.getItem('savedLogin')
    if (savedCredentials) {
      try {
        const { email, password } = JSON.parse(savedCredentials)
        setFormData({ email: email || '', password: password || '' })
        setRememberMe(true)
      } catch (e) {
        localStorage.removeItem('savedLogin')
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(formData.email, formData.password)
      
      // Save or remove credentials based on checkbox
      if (rememberMe) {
        localStorage.setItem('savedLogin', JSON.stringify({
          email: formData.email,
          password: formData.password,
        }))
      } else {
        localStorage.removeItem('savedLogin')
      }
      
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[#1e3a6e] via-[#1e3a6e] to-[#0f2444]">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Content */}
        <div className={`relative z-10 flex flex-col justify-center items-center w-full px-10 xl:px-16 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
          {/* Logo */}
          <div className="mb-8">
            <div className="bg-white rounded-3xl p-8 inline-block shadow-2xl">
              <img 
                src="/logo.png" 
                alt="Reliable Group Logo" 
                className="h-44 w-auto"
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Reliable Work Permit and VMS
            </h2>
          </div>

          {/* Copyright */}
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-blue-200 text-xs">
              © 2025 YP SECURITY SERVICES PVT LTD
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-4 sm:p-6 bg-gray-50">
        <div className={`w-full max-w-md transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-block bg-white rounded-xl p-3 shadow-lg mb-3">
              <img 
                src="/logo.png" 
                alt="Reliable Group Logo" 
                className="h-16 w-auto"
              />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Reliable Work Permit and VMS</h2>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-gray-500 text-sm">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#1e3a6e] transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#1e3a6e] focus:ring-2 focus:ring-[#1e3a6e]/20 transition-all duration-200 outline-none text-sm"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#1e3a6e] transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#1e3a6e] focus:ring-2 focus:ring-[#1e3a6e]/20 transition-all duration-200 outline-none text-sm"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:border-[#1e3a6e] peer-checked:bg-[#1e3a6e] transition-all duration-200 flex items-center justify-center group-hover:border-[#1e3a6e]/50">
                      <svg
                        className={`w-3 h-3 text-white transition-opacity duration-200 ${rememberMe ? 'opacity-100' : 'opacity-0'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#1e3a6e] to-[#2a4a80] hover:from-[#162d57] hover:to-[#1e3a6e] text-white font-semibold rounded-xl shadow-lg shadow-[#1e3a6e]/25 hover:shadow-xl hover:shadow-[#1e3a6e]/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-sm"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-[#1e3a6e] font-semibold hover:text-[#162d57] transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Copyright - Mobile */}
          <p className="text-center text-gray-400 text-xs mt-4 lg:hidden">
            © 2025 YP SECURITY SERVICES PVT LTD
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
