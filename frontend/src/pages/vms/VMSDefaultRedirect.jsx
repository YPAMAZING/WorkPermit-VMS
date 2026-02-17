// Smart redirect component for VMS users based on their role
// - Admin: Dashboard (full admin dashboard)
// - Company User: Company Dashboard (approve/reject visitors)
// - Reception/Guard: Dashboard (visitor check-in dashboard)

import { Navigate } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'

const VMSDefaultRedirect = () => {
  const { user, loading, isAdmin, isCompanyUser, isReceptionist, isSecurityGuard } = useVMSAuth()

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-500 text-sm">Loading VMS...</p>
        </div>
      </div>
    )
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/vms/login" replace />
  }

  // Admin users go to main dashboard
  if (isAdmin) {
    return <Navigate to="/vms/admin/dashboard" replace />
  }

  // Company users go to company dashboard (approve/reject)
  if (isCompanyUser) {
    return <Navigate to="/vms/admin/company-dashboard" replace />
  }

  // Reception and Guard users go to main dashboard
  if (isReceptionist || isSecurityGuard) {
    return <Navigate to="/vms/admin/dashboard" replace />
  }

  // Default fallback - main dashboard
  return <Navigate to="/vms/admin/dashboard" replace />
}

export default VMSDefaultRedirect
