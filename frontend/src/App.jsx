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
const RoleManagement = lazy(() => import('./pages/RoleManagement'))
const SSOCallback = lazy(() => import('./pages/SSOCallback'))

// System Selector - Now only Work Permit + VMS
const SystemSelector = lazy(() => import('./pages/SystemSelector'))

// VMS pages - lazy loaded
const VMSLayout = lazy(() => import('./components/VMSLayout'))
const VMSLogin = lazy(() => import('./pages/vms/VMSLogin'))
const VMSDashboard = lazy(() => import('./pages/vms/VMSDashboard'))
const VMSVisitors = lazy(() => import('./pages/vms/VMSVisitors'))
const VMSGatepasses = lazy(() => import('./pages/vms/VMSGatepasses'))

// VMS Admin pages - lazy loaded
const PreApprovedList = lazy(() => import('./pages/vms/PreApprovedList'))
const NewPreApproval = lazy(() => import('./pages/vms/NewPreApproval'))
const PreApprovalDetail = lazy(() => import('./pages/vms/PreApprovalDetail'))
const BlacklistList = lazy(() => import('./pages/vms/BlacklistList'))
const AddToBlacklist = lazy(() => import('./pages/vms/AddToBlacklist'))
const VMSReports = lazy(() => import('./pages/vms/VMSReports'))
const VMSSettings = lazy(() => import('./pages/vms/VMSSettings'))
const CompanyDashboard = lazy(() => import('./pages/vms/CompanyDashboard'))
const VMSUserManagement = lazy(() => import('./pages/vms/VMSUserManagement'))

// VMS QR Check-in (NEW) - Public pages
const PublicCheckIn = lazy(() => import('./pages/vms/PublicCheckIn'))
const SingleCheckIn = lazy(() => import('./pages/vms/SingleCheckIn'))
const CheckInConfirmation = lazy(() => import('./pages/vms/CheckInConfirmation'))
const GuardDashboard = lazy(() => import('./pages/vms/GuardDashboard'))

// VMS Open Access (NEW) - No Login Required
const OpenDashboard = lazy(() => import('./pages/vms/OpenDashboard'))
const VisitorPass = lazy(() => import('./pages/vms/VisitorPass'))
const CompanyPortal = lazy(() => import('./pages/vms/CompanyPortal'))

// VMS Landing & New Pages (3 blocks system)
const VMSLanding = lazy(() => import('./pages/vms/VMSLanding'))
const VisitorRegister = lazy(() => import('./pages/vms/VisitorRegister'))
const PreApproval = lazy(() => import('./pages/vms/PreApproval'))

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

// System Selector Route - Now accessible without login
// Users can select system first, then login if needed
const SystemSelectorRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Requestors go directly to Work Permit (if logged in)
  if (user && user.role === 'REQUESTOR') {
    return <Navigate to="/workpermit/dashboard" replace />
  }

  // Allow access to system selector for everyone (logged in or not)
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

      {/* System Selector (for Admin, Fireman, etc.) - Now shows Work Permit + VMS */}
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
      {/* VMS SYSTEM ROUTES */}
      {/* ======================= */}
      
      {/* ===== VMS LANDING PAGE (Main Entry - 3 Blocks) ===== */}
      {/* VMS Home - Shows 3 blocks: Visitor QR, Staff Login, Pre-Approval */}
      <Route path="/vms" element={<VMSLanding />} />
      
      {/* Visitor Self-Registration (QR Scan Flow) */}
      <Route path="/vms/visitor-register" element={<VisitorRegister />} />
      
      {/* Pre-Approval Gatepass Generation with WhatsApp Share */}
      <Route path="/vms/pre-approval" element={<PreApproval />} />
      
      {/* ===== OPEN VMS ROUTES (No Auth Required) ===== */}
      {/* Open Dashboard - Shows all recent visitors without login */}
      <Route path="/vms/open-dashboard" element={<OpenDashboard />} />
      
      {/* Visitor Pass - Shows pass with QR code for guards to verify */}
      <Route path="/vms/pass/:passId" element={<VisitorPass />} />
      
      {/* Company Client Portal - Unique portal for each company */}
      <Route path="/vms/portal/:portalId" element={<CompanyPortal />} />
      
      {/* ===== PUBLIC VMS ROUTES (No Auth Required) ===== */}
      {/* Single QR Check-in - One QR, select company from dropdown */}
      <Route path="/vms/checkin" element={<SingleCheckIn />} />
      
      {/* Legacy: QR-based Self Check-in with company code in URL */}
      <Route path="/vms/checkin/:companyCode" element={<PublicCheckIn />} />
      
      {/* Check-in Confirmation - Shows status after submission */}
      <Route path="/vms/checkin/confirmation/:requestNumber" element={<CheckInConfirmation />} />
      
      {/* Status check by request number */}
      <Route path="/vms/status/:requestNumber" element={<CheckInConfirmation />} />
      
      {/* ===== VMS AUTH ROUTES ===== */}
      {/* VMS Login (separate auth system) */}
      <Route path="/vms/login" element={<VMSLogin />} />
      
      {/* ===== VMS PROTECTED ROUTES (Require Login) ===== */}
      <Route path="/vms/admin" element={<VMSLayout />}>
        <Route index element={<Navigate to="/vms/admin/dashboard" replace />} />
        <Route path="dashboard" element={<VMSDashboard />} />
        <Route path="visitors" element={<VMSVisitors />} />
        
        {/* Gatepasses - Note: Gatepasses are created via visitor registration flow */}
        <Route path="gatepasses" element={<VMSGatepasses />} />
        <Route path="gatepasses/:id" element={<div className="p-4">Gatepass Details - View visitor's gatepass</div>} />
        <Route path="gatepasses/scan" element={<GuardDashboard />} />
        
        {/* Guard/Reception Live Dashboard */}
        <Route path="guard" element={<GuardDashboard />} />
        <Route path="security" element={<GuardDashboard />} />
        <Route path="reception" element={<GuardDashboard />} />
        
        {/* Pre-approved Visitors */}
        <Route path="preapproved" element={<PreApprovedList />} />
        <Route path="preapproved/new" element={<NewPreApproval />} />
        <Route path="preapproved/:id" element={<PreApprovalDetail />} />
        <Route path="preapproved/:id/edit" element={<NewPreApproval />} />
        
        {/* Blacklist Management */}
        <Route path="blacklist" element={<BlacklistList />} />
        <Route path="blacklist/new" element={<AddToBlacklist />} />
        <Route path="blacklist/:id" element={<div className="p-4">Blacklist Entry Details</div>} />
        
        {/* Reports & Analytics */}
        <Route path="reports" element={<VMSReports />} />
        
        {/* Settings */}
        <Route path="settings" element={<VMSSettings />} />
        
        {/* User Management - For admins to create company users */}
        <Route path="users" element={<VMSUserManagement />} />
        
        {/* Company Dashboard - For company users to approve/reject visitors */}
        <Route path="company-dashboard" element={<CompanyDashboard />} />
        
        {/* Company Management (for multi-tenant) */}
        <Route path="companies" element={<VMSSettings />} />
        <Route path="company" element={<VMSSettings />} />
        <Route path="company/qr" element={<div className="p-4">Company QR Code - Coming Soon</div>} />
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

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/select-system" replace />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/select-system" replace />} />
    </Routes>
    </Suspense>
  )
}

export default App
