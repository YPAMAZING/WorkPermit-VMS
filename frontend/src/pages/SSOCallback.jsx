import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import { Shield, Loader2, CheckCircle, XCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * SSO Callback Page
 * 
 * Handles SSO authentication from external MIS system
 * 
 * Usage:
 * 1. External MIS generates SSO token via POST /api/sso/generate
 * 2. Redirects user to /auth/sso/callback?token=xxx
 * 3. This page verifies token and logs user in
 */
const SSOCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser, setToken } = useAuth()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const redirect = searchParams.get('redirect') || '/dashboard'

    if (!token) {
      setStatus('error')
      setError('No SSO token provided')
      return
    }

    verifySSOToken(token, redirect)
  }, [searchParams])

  const verifySSOToken = async (ssoToken, redirect) => {
    try {
      setStatus('verifying')

      const response = await axios.get(`${API_URL}/sso/verify?token=${ssoToken}`)

      if (response.data.token && response.data.user) {
        // Store JWT token
        localStorage.setItem('token', response.data.token)
        
        // Update auth context
        setToken(response.data.token)
        setUser(response.data.user)

        setStatus('success')

        // Redirect after short delay
        setTimeout(() => {
          navigate(redirect, { replace: true })
        }, 1500)
      } else {
        throw new Error('Invalid response from SSO verification')
      }
    } catch (err) {
      console.error('SSO verification error:', err)
      setStatus('error')
      setError(err.response?.data?.message || err.message || 'SSO verification failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-400 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Shield className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Reliable Group | Work Permit and VMS</h1>
          <p className="text-primary-200 mt-2">Single Sign-On</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying SSO Token</h2>
              <p className="text-gray-500">Please wait while we authenticate your session...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Successful!</h2>
              <p className="text-gray-500">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary"
              >
                Go to Login
              </button>
            </>
          )}
        </div>

        <p className="text-center text-primary-200 text-sm mt-6">
          © 2025 YP SECURITY SERVICES PVT LTD. All Rights Reserved.
        </p>
      </div>
    </div>
  )
}

export default SSOCallback
