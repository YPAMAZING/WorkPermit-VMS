// Smart redirect component for VMS users based on their role
// - Admin: Visitors page (management-only, no operational dashboard)
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

  // Admin users go to Visitors page (management only, not operational)
  if (isAdmin) {
    return <Navigate to="/vms/admin/visitors" replace />
  }

  // Reception and Guard users go to main dashboard
  if (isReceptionist || isSecurityGuard) {
    return <Navigate to="/vms/admin/dashboard" replace />
  }

  // Company users go to company dashboard (approve/reject)
  // Check both isCompanyUser flag AND if user has companyId
  if (isCompanyUser || user?.companyId) {
    return <Navigate to="/vms/admin/company-dashboard" replace />
  }

  // Default fallback - visitors page
  return <Navigate to="/vms/admin/visitors" replace />
}

export default VMSDefaultRedirect
