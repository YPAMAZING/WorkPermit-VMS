import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { permitsAPI, approvalsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Download,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Shield,
  Wrench,
  CheckCircle2,
  XCircle,
  Calendar,
  Building,
  Phone,
  Play,
  RotateCcw,
  RefreshCw,
  X,
  MessageSquare,
  User,
  Mail,
  CreditCard,
  Timer,
  Hash,
  History,
} from 'lucide-react'

// Work type configurations
const workTypeConfig = {
  'HOT_WORK': { label: 'HOT WORK PERMIT', color: 'orange', abbr: 'HWP', bg: 'from-orange-500 to-red-500' },
  'CONFINED_SPACE': { label: 'CONFINED SPACE PERMIT', color: 'purple', abbr: 'CSP', bg: 'from-purple-500 to-indigo-500' },
  'ELECTRICAL': { label: 'ELECTRICAL WORK PERMIT', color: 'yellow', abbr: 'EWP', bg: 'from-yellow-500 to-amber-500' },
  'WORKING_AT_HEIGHT': { label: 'WORK AT HEIGHT PERMIT', color: 'blue', abbr: 'WHP', bg: 'from-blue-500 to-cyan-500' },
  'EXCAVATION': { label: 'EXCAVATION PERMIT', color: 'amber', abbr: 'EXP', bg: 'from-amber-500 to-orange-500' },
  'LIFTING': { label: 'LIFTING PERMIT', color: 'teal', abbr: 'LP', bg: 'from-teal-500 to-emerald-500' },
  'CHEMICAL': { label: 'CHEMICAL HANDLING PERMIT', color: 'red', abbr: 'CHP', bg: 'from-red-500 to-pink-500' },
  'RADIATION': { label: 'RADIATION WORK PERMIT', color: 'lime', abbr: 'RWP', bg: 'from-lime-500 to-green-500' },
  'GENERAL': { label: 'GENERAL PERMIT', color: 'gray', abbr: 'GP', bg: 'from-gray-500 to-slate-500' },
  'COLD_WORK': { label: 'COLD WORK PERMIT', color: 'cyan', abbr: 'CWP', bg: 'from-cyan-500 to-blue-500' },
  'LOTO': { label: 'LOTO PERMIT', color: 'indigo', abbr: 'LOTO', bg: 'from-indigo-500 to-purple-500' },
  'VEHICLE': { label: 'VEHICLE WORK PERMIT', color: 'slate', abbr: 'VWP', bg: 'from-slate-500 to-gray-500' },
  'PRESSURE_TESTING': { label: 'HYDRO PRESSURE TESTING', color: 'sky', abbr: 'HPT', bg: 'from-sky-500 to-blue-500' },
  'ENERGIZE': { label: 'ENERGIZE PERMIT', color: 'emerald', abbr: 'EOMP', bg: 'from-emerald-500 to-teal-500' },
  'SWMS': { label: 'SAFE WORK METHOD STATEMENT', color: 'rose', abbr: 'SWMS', bg: 'from-rose-500 to-red-500' },
}

// Default measures for checklist
const defaultMeasures = [
  { id: 1, question: 'Instruction to Personnel regarding hazards involved and working procedure.', answer: null },
  { id: 2, question: 'Are Other Contractors working nearby notified?', answer: null },
  { id: 3, question: 'Is there any other work permit obtained?', answer: null },
  { id: 4, question: 'Are escape routes to be provided and kept clear?', answer: null },
  { id: 5, question: 'Is combustible material to be removed / covered from and nearby site (up to 5mtr min.)', answer: null },
  { id: 6, question: 'Is the area immediately below the work spot been cleared / removed of oil, grease & waste cotton etc...?', answer: null },
  { id: 7, question: 'Has gas connection been tested in case there is gas valve / gas line nearby?', answer: null },
  { id: 8, question: 'Is fire extinguisher been kept handy at site?', answer: null },
  { id: 9, question: 'Has tin sheet / fire retardant cloth/ sheet been placed to contain hot spatters of welding / gas cutting?', answer: null },
  { id: 10, question: 'Have all drain inlets been closed?', answer: null },
]

const statusConfig = {
  'PENDING': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', gradient: 'from-amber-400 to-orange-400' },
  'APPROVED': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', gradient: 'from-emerald-400 to-green-400' },
  'REJECTED': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', gradient: 'from-red-400 to-rose-400' },
  'CLOSED': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', gradient: 'from-gray-400 to-slate-400' },
  'EXTENDED': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', gradient: 'from-blue-400 to-cyan-400' },
  'REVOKED': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', gradient: 'from-red-400 to-rose-400' },
  'REAPPROVED': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', gradient: 'from-teal-400 to-emerald-400' },
  'PENDING_REMARKS': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', gradient: 'from-orange-400 to-amber-400' },
}

// ID Proof types mapping
const idProofTypes = {
  'aadhaar': 'Aadhaar Card',
  'AADHAAR': 'Aadhaar Card',
  'driving_license': 'Driving License',
  'DRIVING_LICENSE': 'Driving License',
}

const PermitDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    user, 
    canApprove, 
    canReapprovePermits,
    canExtendPermits, 
    canRevokePermits, 
    canClosePermits,
    canDeletePermits,
    canExportPermitPDF 
  } = useAuth()
  
  // Permission-based checks using the new helpers
  const userCanApprove = canApprove()
  const userCanReapprove = canReapprovePermits()
  const userCanExtend = canExtendPermits()
  const userCanRevoke = canRevokePermits()
  const userCanClose = canClosePermits()
  const userCanDelete = canDeletePermits()
  const userCanExportPDF = canExportPermitPDF()
  
  const [permit, setPermit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [measures, setMeasures] = useState([])
  const [actionHistory, setActionHistory] = useState([])
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [workflowAction, setWorkflowAction] = useState(null)
  const [workflowData, setWorkflowData] = useState({})
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchPermit()
    fetchActionHistory()
  }, [id])

  const fetchPermit = async () => {
    try {
      const response = await permitsAPI.getById(id)
      const permitData = response.data.permit
      setPermit(permitData)
      
      // Parse measures or use defaults (handle both string and array)
      let savedMeasures = []
      if (permitData.measures) {
        savedMeasures = typeof permitData.measures === 'string' 
          ? JSON.parse(permitData.measures) 
          : permitData.measures
      }
      setMeasures(savedMeasures.length > 0 ? savedMeasures : defaultMeasures)
    } catch (error) {
      console.error('Error fetching permit:', error)
      toast.error('Error fetching permit details')
      navigate('/workpermit/permits')
    } finally {
      setLoading(false)
    }
  }

  const fetchActionHistory = async () => {
    try {
      const response = await permitsAPI.getActionHistory(id)
      setActionHistory(response.data.actionHistory || [])
    } catch (error) {
      console.error('Error fetching action history:', error)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await permitsAPI.downloadPDF(id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${permit.permitNumber}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      toast.error('Error downloading PDF')
    }
  }

  const handleMeasureChange = async (measureId, answer) => {
    const updatedMeasures = measures.map(m => 
      m.id === measureId ? { ...m, answer } : m
    )
    setMeasures(updatedMeasures)

    try {
      await permitsAPI.updateMeasures(id, updatedMeasures)
    } catch (error) {
      toast.error('Error saving measure')
    }
  }

  const handleWorkflowAction = (action) => {
    setWorkflowAction(action)
    setWorkflowData({})
    setShowWorkflowModal(true)
  }

  const executeWorkflowAction = async () => {
    setActionLoading(true)
    try {
      switch (workflowAction) {
        case 'extend':
          await permitsAPI.extendPermit(id, workflowData)
          toast.success('Permit extended successfully')
          break
        case 'revoke':
          await permitsAPI.revokePermit(id, workflowData)
          toast.success('Permit revoked successfully')
          break
        case 'reapprove':
          await permitsAPI.reapprovePermit(id, workflowData)
          toast.success('Permit re-approved successfully')
          break
        case 'close':
          await permitsAPI.closePermit(id, workflowData)
          toast.success('Permit closed successfully')
          break
        default:
          break
      }
      setShowWorkflowModal(false)
      fetchPermit()
      fetchActionHistory()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!permit) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Permit not found</p>
      </div>
    )
  }

  const config = workTypeConfig[permit.workType] || workTypeConfig['GENERAL']
  const status = statusConfig[permit.status] || statusConfig['PENDING']
  
  // Handle both string and array formats (backend transforms to array, but handle string for safety)
  const parseField = (field) => {
    if (!field) return []
    if (Array.isArray(field)) return field
    try {
      return JSON.parse(field)
    } catch {
      return []
    }
  }
  
  const workers = parseField(permit.workers)
  const vendorDetails = typeof permit.vendorDetails === 'string' 
    ? JSON.parse(permit.vendorDetails || '{}') 
    : (permit.vendorDetails || {})
  const hazards = parseField(permit.hazards)
  const precautions = parseField(permit.precautions)
  const equipment = parseField(permit.equipment)

  // Section component
  const Section = ({ icon: Icon, title, color = "slate", children }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className={`flex items-center gap-3 px-5 py-3 bg-gradient-to-r ${config.bg} text-white`}>
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Top Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/workpermit/permits')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Permits</span>
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Permit Card Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
        {/* Company Branding Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Reliable Group Logo" 
              className="w-12 h-12 object-contain"
            />
            <div>
              <h2 className="text-white font-bold text-lg tracking-wide">RELIABLE GROUP | WORK PERMIT AND VMS</h2>
              <p className="text-slate-300 text-xs tracking-widest">CREATING LIFESTYLE</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Work Permit and VMS</p>
          </div>
        </div>
        
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${config.bg} p-6 text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-semibold backdrop-blur-sm">
                  {config.abbr}
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${status.bg} ${status.text}`}>
                  {permit.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-1">{config.label}</h1>
              <p className="text-white/80">{permit.companyName || permit.user?.department || 'Contractor'}</p>
            </div>
            
            {/* Company Branding with Logo */}
            <div className="w-28 h-24 bg-white rounded-xl flex flex-col items-center justify-center shadow-lg p-2">
              <img 
                src="/logo.png" 
                alt="Reliable Group Logo" 
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>
        </div>
        
        {/* Permit Info Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="font-mono text-sm font-semibold text-gray-700">{permit.permitNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Requested by <strong className="text-gray-800">{permit.user?.firstName} {permit.user?.lastName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {new Date(permit.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
        
        {/* Title & Description */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{permit.title}</h2>
          <p className="text-gray-600 leading-relaxed">{permit.description}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Location & Duration */}
        <div className="space-y-6">
          {/* Location */}
          <Section icon={MapPin} title="WORK LOCATION">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">{permit.location}</p>
                  <p className="text-sm text-gray-500">{permit.timezone || 'Local Timezone'}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Duration */}
          <Section icon={Clock} title="WORK DURATION">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-xs font-semibold text-green-600 uppercase mb-1">Start</p>
                <p className="text-sm font-bold text-green-800">
                  {new Date(permit.startDate).toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric'
                  })}
                </p>
                <p className="text-lg font-bold text-green-700">
                  {new Date(permit.startDate).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-xs font-semibold text-red-600 uppercase mb-1">End</p>
                <p className="text-sm font-bold text-red-800">
                  {new Date(permit.endDate).toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric'
                  })}
                </p>
                <p className="text-lg font-bold text-red-700">
                  {new Date(permit.endDate).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            {permit.isExtended && (
              <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">This permit has been extended</span>
                </div>
                {permit.extendedUntil && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-xs text-blue-600">Extended until:</span>
                    <span className="text-sm font-bold text-blue-800">
                      {new Date(permit.extendedUntil).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric'
                      })} at {new Date(permit.extendedUntil).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* Vendor & Contact */}
        <div className="space-y-6">
          {/* Vendor Details */}
          <Section icon={Building} title="VENDOR / CONTRACTOR">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Vendor Name</p>
                  <p className="font-semibold text-gray-900">{vendorDetails.vendorName || permit.contractorName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Phone</p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-700">{vendorDetails.vendorPhone || permit.contractorPhone || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Company</p>
                  <p className="text-gray-700">{vendorDetails.vendorCompany || permit.companyName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-700 text-sm truncate">{vendorDetails.vendorEmail || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Priority */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Priority Level</p>
                <p className="text-lg font-bold text-gray-900">{permit.priority}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
                permit.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                permit.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                permit.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {permit.priority}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workers Section */}
      <Section icon={Users} title="WORKERS">
        {workers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((worker, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-indigo-200">
                    {worker.idProofImage ? (
                      <img src={worker.idProofImage} alt={worker.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{worker.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">{idProofTypes[worker.idProofType] || worker.idProofType}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{worker.idProofNumber}</p>
                    {worker.phone && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">{worker.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Large ID Proof Image */}
                {worker.idProofImage && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">ID Proof Document:</p>
                    <a 
                      href={worker.idProofImage} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={worker.idProofImage} 
                        alt={`${worker.name}'s ID Proof`}
                        className="max-w-full h-auto max-h-80 border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        style={{ minHeight: '150px', objectFit: 'contain', backgroundColor: '#f9fafb' }}
                      />
                    </a>
                    <p className="text-xs text-gray-500 mt-1">Click image to open in full size</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No workers assigned yet</p>
          </div>
        )}
      </Section>

      {/* Hazards and Equipment */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Hazards */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">HAZARDS</span>
          </div>
          <div className="p-5">
            {hazards.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hazards.map((hazard, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200"
                  >
                    {hazard}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No hazards listed</p>
            )}
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
            <Wrench className="w-5 h-5" />
            <span className="font-semibold">PPE & EQUIPMENT</span>
          </div>
          <div className="p-5">
            {equipment.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {equipment.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No equipment listed</p>
            )}
          </div>
        </div>
      </div>

      {/* Approvals & Signatures */}
      <div className="mt-6">
        <Section icon={CheckCircle2} title="APPROVALS & SIGNATURES">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {permit.approvals?.map((approval, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 transition-all ${
                  approval.decision === 'APPROVED' ? 'border-emerald-300 bg-emerald-50' :
                  approval.decision === 'REJECTED' ? 'border-red-300 bg-red-50' :
                  'border-amber-300 bg-amber-50'
                }`}
              >
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Authorized Person
                </p>
                <p className="font-semibold text-gray-900">
                  {approval.approverName || 'Pending Approval'}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    approval.decision === 'APPROVED' ? 'bg-emerald-500 text-white' :
                    approval.decision === 'REJECTED' ? 'bg-red-500 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {approval.decision === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                    {approval.decision === 'REJECTED' && <XCircle className="w-3 h-3" />}
                    {approval.decision}
                  </span>
                </div>
                {approval.signature && (
                  <p className="mt-3 italic text-gray-600 font-serif text-lg">{approval.signature}</p>
                )}
                {approval.signedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(approval.signedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Authorized Person's Remarks - Shows approval/rejection comments */}
      <div className="mt-6">
        <Section icon={MessageSquare} title="AUTHORIZED PERSON'S REMARKS">
          {/* Show remarks from approvals (comments added during approval/rejection) */}
          {permit.approvals?.some(a => a.comment) ? (
            <div className="space-y-4">
              {permit.approvals?.filter(a => a.comment).map((approval, idx) => (
                <div key={idx} className={`rounded-xl p-5 border ${
                  approval.decision === 'APPROVED' ? 'bg-emerald-50 border-emerald-200' :
                  approval.decision === 'REJECTED' ? 'bg-red-50 border-red-200' :
                  'bg-purple-50 border-purple-200'
                }`}>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{approval.comment}</p>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{approval.approverName || 'Authorized Person'}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        approval.decision === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        approval.decision === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {approval.decision}
                      </span>
                    </div>
                    {approval.signedAt && (
                      <span className="text-sm text-gray-500">
                        {new Date(approval.signedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No remarks added yet</p>
            </div>
          )}

          {/* Auto-close info */}
          {permit.autoClosedAt && (
            <div className="mt-4 bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Auto-Closed</p>
                <p className="text-xs text-gray-500">{new Date(permit.autoClosedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Action History Trail */}
      {actionHistory.length > 0 && (
        <div className="mt-6">
          <Section icon={History} title="APPROVAL TRAIL">
            <div className="space-y-4">
              {/* Initial Approval from approvals */}
              {permit.approvals?.filter(a => a.decision === 'APPROVED').map((approval, idx) => (
                <div key={`approval-${idx}`} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">APPROVED</span>
                      <span className="text-sm text-gray-600">by {approval.approverName || 'Authorized Person'}</span>
                      <span className="text-xs text-gray-400">
                        {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString() : ''}
                      </span>
                    </div>
                    {approval.comment && (
                      <p className="mt-2 text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="font-medium">Comment:</span> {approval.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Action History (Revoke, Re-Approve, etc.) */}
              {actionHistory.map((action, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    action.action === 'REVOKED' ? 'bg-red-100' :
                    action.action === 'REAPPROVED' ? 'bg-teal-100' :
                    action.action === 'EXTENDED' ? 'bg-blue-100' :
                    action.action === 'CLOSED' ? 'bg-gray-100' :
                    'bg-amber-100'
                  }`}>
                    {action.action === 'REVOKED' && <RotateCcw className="w-5 h-5 text-red-600" />}
                    {action.action === 'REAPPROVED' && <RefreshCw className="w-5 h-5 text-teal-600" />}
                    {action.action === 'EXTENDED' && <Play className="w-5 h-5 text-blue-600" />}
                    {action.action === 'CLOSED' && <XCircle className="w-5 h-5 text-gray-600" />}
                    {!['REVOKED', 'REAPPROVED', 'EXTENDED', 'CLOSED'].includes(action.action) && <Clock className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        action.action === 'REVOKED' ? 'bg-red-100 text-red-700' :
                        action.action === 'REAPPROVED' ? 'bg-teal-100 text-teal-700' :
                        action.action === 'EXTENDED' ? 'bg-blue-100 text-blue-700' :
                        action.action === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {action.action}
                      </span>
                      <span className="text-sm text-gray-600">
                        by {action.performedByName || 'Unknown'}
                        {action.performedByRole && <span className="text-gray-400"> ({action.performedByRole})</span>}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(action.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {action.comment && (
                      <p className="mt-2 text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="font-medium">Comment:</span> {action.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Workflow Actions - Permission based */}
      {((userCanExtend || userCanRevoke) && ['APPROVED', 'EXTENDED', 'REAPPROVED'].includes(permit.status)) || 
       (userCanReapprove && permit.status === 'REVOKED') ? (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-700">Workflow Actions</span>
            </div>
            <div className="flex items-center gap-3">
              {userCanExtend && ['APPROVED', 'EXTENDED', 'REAPPROVED'].includes(permit.status) && (
                <button
                  onClick={() => handleWorkflowAction('extend')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-medium hover:bg-blue-100 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Extend Permit
                </button>
              )}
              {userCanRevoke && ['APPROVED', 'EXTENDED', 'REAPPROVED'].includes(permit.status) && (
                <button
                  onClick={() => handleWorkflowAction('revoke')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium hover:bg-red-100 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Revoke Permit
                </button>
              )}
              {userCanReapprove && permit.status === 'REVOKED' && (
                <button
                  onClick={() => handleWorkflowAction('reapprove')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-medium hover:bg-teal-100 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-Approve Permit
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      
      {/* Workflow Action Modal */}
      {showWorkflowModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
            <div className={`px-6 py-4 ${
              workflowAction === 'extend' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
              workflowAction === 'revoke' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
              workflowAction === 'reapprove' ? 'bg-gradient-to-r from-teal-500 to-emerald-500' :
              'bg-gradient-to-r from-gray-500 to-slate-500'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white capitalize">{workflowAction} Permit</h3>
                <button 
                  onClick={() => setShowWorkflowModal(false)} 
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {workflowAction === 'extend' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Extend Until *</label>
                    <input
                      type="datetime-local"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      onChange={(e) => setWorkflowData({ ...workflowData, extendedUntil: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Extension</label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 resize-none"
                      rows={3}
                      placeholder="Enter reason for extending this permit..."
                      onChange={(e) => setWorkflowData({ ...workflowData, reason: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {workflowAction === 'revoke' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reason/Comment for Revocation</label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-500 resize-none"
                    rows={4}
                    placeholder="Enter reason or comment for revoking this permit..."
                    onChange={(e) => setWorkflowData({ ...workflowData, reason: e.target.value, comment: e.target.value })}
                  />
                </div>
              )}

              {workflowAction === 'reapprove' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Comment for Re-Approval</label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 resize-none"
                      rows={3}
                      placeholder="Enter comment for re-approving this permit..."
                      onChange={(e) => setWorkflowData({ ...workflowData, comment: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Digital Signature (optional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500"
                      placeholder="Enter your signature..."
                      onChange={(e) => setWorkflowData({ ...workflowData, signature: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {workflowAction === 'close' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Closure Comments</label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-500 resize-none"
                    rows={3}
                    placeholder="Any comments for closure..."
                    onChange={(e) => setWorkflowData({ ...workflowData, comments: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowWorkflowModal(false)}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeWorkflowAction}
                  disabled={actionLoading}
                  className={`px-5 py-2.5 rounded-xl font-medium text-white transition-all ${
                    workflowAction === 'extend' ? 'bg-blue-600 hover:bg-blue-700' :
                    workflowAction === 'revoke' ? 'bg-red-600 hover:bg-red-700' :
                    workflowAction === 'reapprove' ? 'bg-teal-600 hover:bg-teal-700' :
                    'bg-gray-600 hover:bg-gray-700'
                  } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PermitDetail
