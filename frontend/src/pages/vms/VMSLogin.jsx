import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { Eye, EyeOff, LogIn, Shield, Users } from 'lucide-react'

const VMSLogin = () => {
  const navigate = useNavigate()
  const { login, error: authError } = useVMSAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      // Redirect to VMS admin - smart redirect will handle role-based routing
      navigate('/vms/admin')
    } else {
      setError(result.error || 'Login failed')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Reliable Group Logo" 
            className="w-10 h-10 object-contain bg-white rounded-lg p-1"
          />
          <div>
            <h1 className="text-white font-bold text-xl">Reliable Group</h1>
            <p className="text-teal-200 text-xs">Visitor Management System</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Icon */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
              <p className="text-gray-500 mt-2">Sign in to access VMS</p>
            </div>

            {/* Error Message */}
            {(error || authError) && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error || authError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Login Info */}
            <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-sm text-teal-700 font-medium mb-2">
                📌 Use your Work Permit credentials
              </p>
              <p className="text-xs text-teal-600">
                Reception and Guard staff can log in using their existing Work Permit system credentials.
                All users have access to manage visitors and visitor passes.
              </p>
            </div>

            {/* Links */}
            <div className="mt-6 text-center">
              <Link
                to="/select-system"
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                ← Back to System Selector
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/10 rounded-lg p-4">
              <Users className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-xs text-teal-100">Visitor Tracking</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <Shield className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-xs text-teal-100">Security First</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <LogIn className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-xs text-teal-100">Quick Check-in</p>
            </div>
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

export default VMSLogin
