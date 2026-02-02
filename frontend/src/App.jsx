import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuth } from './context/AuthContext'
import LoadingSpinner from './components/LoadingSpinner'

// Lazy load all page components for better performance
const Layout = lazy(() => import('./components/Layout'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Permits = lazy(() => import('./pages/Permits'))
const PermitDetail = lazy(() => import('./pages/PermitDetail'))
const CreatePermit = lazy(() => import('./pages/CreatePermit'))
const SelectPermitType = lazy(() => import('./pages/SelectPermitType'))
const Approvals = lazy(() => import('./pages/Approvals'))
const ApprovalDetail = lazy(() => import('./pages/ApprovalDetail'))
const Users = lazy(() => import('./pages/Users'))
const Settings = lazy(() => import('./pages/Settings'))
const WorkerRegister = lazy(() => import('./pages/WorkerRegister'))
const MeterReadings = lazy(() => import('./pages/MeterReadings'))
const RoleManagement = lazy(() => import('./pages/RoleManagement'))
const SSOCallback = lazy(() => import('./pages/SSOCallback'))

// MIS pages - lazy loaded
const SystemSelector = lazy(() => import('./pages/SystemSelector'))
const MISOnlySelector = lazy(() => import('./pages/MISOnlySelector'))
const MISLayout = lazy(() => import('./components/MISLayout'))
const MISDashboard = lazy(() => import('./pages/mis/MISDashboard'))
const MISAnalytics = lazy(() => import('./pages/mis/MISAnalytics'))
const MISExport = lazy(() => import('./pages/mis/MISExport'))
const MISSettings = lazy(() => import('./pages/mis/MISSettings'))
const MISLogin = lazy(() => import('./pages/mis/MISLogin'))

// VMS pages - lazy loaded
const VMSLayout = lazy(() => import('./components/VMSLayout'))
const VMSLogin = lazy(() => import('./pages/vms/VMSLogin'))
const VMSDashboard = lazy(() => import('./pages/vms/VMSDashboard'))
const VMSVisitors = lazy(() => import('./pages/vms/VMSVisitors'))
const VMSGatepasses = lazy(() => import('./pages/vms/VMSGatepasses'))

// Page loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
)

// Legacy redirect components to preserve IDs
const LegacyPermitRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/workpermit/permits/${id}`} replace />
}

const LegacyPermitEditRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/workpermit/permits/${id}/edit`} replace />
}

const LegacyApprovalRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/workpermit/approvals/${id}`} replace />
}

// Protected route wrapper with role and permission support
const ProtectedRoute = ({ children, roles, permission }) => {
  const { user, loading, hasPermission, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Admin can access everything
  if (isAdmin) {
    return children
  }

  // Check role-based access (for backward compatibility)
  if (roles && roles.length > 0) {
    if (roles.includes(user.role)) {
      return children
    }
    // Also check if user has the related permission
    // This allows custom roles with appropriate permissions to access the route
    if (permission && hasPermission(permission)) {
      return children
    }
    return <Navigate to="/select-system" replace />
  }

  // Check permission-based access
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/select-system" replace />
  }

  return children
}

// Public route wrapper (redirects if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user) {
    // Requestors go directly to Work Permit dashboard
    if (user.role === 'REQUESTOR') {
      return <Navigate to="/workpermit/dashboard" replace />
    }
    // Other roles see the system selector
    return <Navigate to="/select-system" replace />
  }

  return children
}

// System Selector Route (only for non-Requestor roles)
const SystemSelectorRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Requestors go directly to Work Permit
  if (user.role === 'REQUESTOR') {
    return <Navigate to="/workpermit/dashboard" replace />
  }

  return children
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      
      {/* Public worker registration route (QR code access) */}
      <Route path="/worker-register/:permitId" element={<WorkerRegister />} />
      
      {/* SSO Callback route */}
      <Route path="/auth/sso/callback" element={<SSOCallback />} />

      {/* System Selector (for Admin, Fireman, Site Engineer) */}
      <Route
        path="/select-system"
        element={
          <SystemSelectorRoute>
            <SystemSelector />
          </SystemSelectorRoute>
        }
      />

      {/* ======================= */}
      {/* WORK PERMIT SYSTEM ROUTES */}
      {/* ======================= */}
      <Route
        path="/workpermit"
        element={
          <ProtectedRoute>
            <Layout systemType="workpermit" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/workpermit/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="permits" element={<Permits />} />
        <Route path="permits/new" element={<SelectPermitType />} />
        <Route path="permits/create" element={<CreatePermit />} />
        <Route path="permits/:id" element={<PermitDetail />} />
        <Route path="permits/:id/edit" element={<CreatePermit />} />
        
        {/* Users with approval permission (Fireman, Admin, or custom roles with approvals.view) */}
        <Route
          path="approvals"
          element={
            <ProtectedRoute roles={['FIREMAN', 'SAFETY_OFFICER', 'ADMIN']} permission="approvals.view">
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route
          path="approvals/:id"
          element={
            <ProtectedRoute roles={['FIREMAN', 'SAFETY_OFFICER', 'ADMIN']} permission="approvals.view">
              <ApprovalDetail />
            </ProtectedRoute>
          }
        />

        {/* Users with user management permission (Admin or custom roles with users.view) */}
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['ADMIN']} permission="users.view">
              <Users />
            </ProtectedRoute>
          }
        />
        {/* Roles management (Admin or custom roles with roles.view) */}
        <Route
          path="roles"
          element={
            <ProtectedRoute roles={['ADMIN']} permission="roles.view">
              <RoleManagement />
            </ProtectedRoute>
          }
        />

        <Route path="settings" element={<Settings />} />
      </Route>

      {/* ======================= */}
      {/* MIS SYSTEM ROUTES */}
      {/* ======================= */}
      <Route
        path="/mis"
        element={
          <ProtectedRoute roles={['ADMIN', 'MIS_ADMIN', 'MIS_VERIFIER', 'MIS_VIEWER', 'FIREMAN', 'SAFETY_OFFICER', 'SITE_ENGINEER']}>
            <MISLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/mis/dashboard" replace />} />
        <Route path="dashboard" element={<MISDashboard />} />
        <Route path="readings" element={<MeterReadings />} />
        <Route path="analytics" element={<MISAnalytics />} />
        <Route path="export" element={<MISExport />} />
        {/* MIS Settings & User Access - Admin and MIS_ADMIN only */}
        <Route
          path="settings"
          element={
            <ProtectedRoute roles={['ADMIN', 'MIS_ADMIN']} permission="mis.settings">
              <MISSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['ADMIN', 'MIS_ADMIN']} permission="mis.settings">
              <MISSettings initialTab="users" />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute roles={['ADMIN', 'MIS_ADMIN']} permission="mis.settings">
              <MISSettings initialTab="roles" />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ======================= */}
      {/* VMS SYSTEM ROUTES */}
      {/* ======================= */}
      {/* VMS Login (separate auth system) */}
      <Route path="/vms/login" element={<VMSLogin />} />
      
      {/* VMS Protected Routes */}
      <Route path="/vms" element={<VMSLayout />}>
        <Route index element={<Navigate to="/vms/dashboard" replace />} />
        <Route path="dashboard" element={<VMSDashboard />} />
        <Route path="visitors" element={<VMSVisitors />} />
        <Route path="gatepasses" element={<VMSGatepasses />} />
        <Route path="preapproved" element={<div className="p-4">Pre-approved Visitors - Coming Soon</div>} />
        <Route path="blacklist" element={<div className="p-4">Blacklist - Coming Soon</div>} />
        <Route path="reports" element={<div className="p-4">Reports - Coming Soon</div>} />
        <Route path="settings" element={<div className="p-4">Settings - Coming Soon</div>} />
      </Route>

      {/* Legacy routes - redirect to new structure */}
      <Route path="/dashboard" element={<Navigate to="/workpermit/dashboard" replace />} />
      <Route path="/permits" element={<Navigate to="/workpermit/permits" replace />} />
      <Route path="/permits/new" element={<Navigate to="/workpermit/permits/new" replace />} />
      <Route path="/permits/create" element={<Navigate to="/workpermit/permits/create" replace />} />
      <Route path="/permits/:id" element={<LegacyPermitRedirect />} />
      <Route path="/permits/:id/edit" element={<LegacyPermitEditRedirect />} />
      <Route path="/approvals" element={<Navigate to="/workpermit/approvals" replace />} />
      <Route path="/approvals/:id" element={<LegacyApprovalRedirect />} />
      <Route path="/users" element={<Navigate to="/workpermit/users" replace />} />
      <Route path="/roles" element={<Navigate to="/workpermit/roles" replace />} />
      <Route path="/settings" element={<Navigate to="/workpermit/settings" replace />} />
      <Route path="/meters" element={<Navigate to="/mis/dashboard" replace />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/select-system" replace />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/select-system" replace />} />
    </Routes>
    </Suspense>
  )
}

export default App
