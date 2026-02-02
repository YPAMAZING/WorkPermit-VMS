import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import misApi from '../services/misApi'

const MISAuthContext = createContext()

export const useMISAuth = () => {
  const context = useContext(MISAuthContext)
  if (!context) {
    throw new Error('useMISAuth must be used within a MISAuthProvider')
  }
  return context
}

export const MISAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('mis_token'))
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Fetch user data on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await misApi.auth.me()
          setUser(userData)
        } catch (error) {
          console.error('MIS Auth init error:', error)
          // Clear invalid token
          localStorage.removeItem('mis_token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [token])

  // Login
  const login = useCallback(async (email, password) => {
    try {
      const response = await misApi.auth.login(email, password)
      const { token: newToken, user: userData } = response
      
      localStorage.setItem('mis_token', newToken)
      setToken(newToken)
      setUser(userData)
      
      return { success: true }
    } catch (error) {
      console.error('MIS Login error:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    try {
      if (token) {
        await misApi.auth.logout()
      }
    } catch (error) {
      console.error('MIS Logout error:', error)
    } finally {
      localStorage.removeItem('mis_token')
      setToken(null)
      setUser(null)
      navigate('/mis/login')
    }
  }, [token, navigate])

  // Check if user has permission
  const hasPermission = useCallback((permission) => {
    if (!user) return false
    if (user.isAdmin) return true
    return user.permissions?.includes(permission) || false
  }, [user])

  // Check if user has any of the specified roles
  const hasRole = useCallback((...roles) => {
    if (!user) return false
    if (user.isAdmin) return true
    return roles.includes(user.role)
  }, [user])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    hasPermission,
    hasRole,
  }

  return (
    <MISAuthContext.Provider value={value}>
      {children}
    </MISAuthContext.Provider>
  )
}

export default MISAuthContext
