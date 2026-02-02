import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { approvalsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  User,
  Building,
  AlertTriangle,
  Shield,
  FileText,
  Flame,
  Zap,
  ArrowUp,
  Box,
  MessageSquare,
} from 'lucide-react'
import { format } from 'date-fns'

const ApprovalDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, isSafetyOfficer, hasPermission } = useAuth()
  const [approval, setApproval] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [decisionModal, setDecisionModal] = useState({ open: false, type: null })
  const [comment, setComment] = useState('')
  
  // Check if user can approve/reject permits
  const canApprovePermits = isAdmin || isSafetyOfficer || hasPermission('approvals.approve')

  useEffect(() => {
    fetchApproval()
  }, [id])

  const fetchApproval = async () => {
    try {
      const response = await approvalsAPI.getById(id)
      setApproval(response.data.approval)
    } catch (error) {
      toast.error('Error fetching approval details')
      navigate('/approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async () => {
    if (!decisionModal.type) return

    setSubmitting(true)
    try {
      await approvalsAPI.updateDecision(id, {
        decision: decisionModal.type,
        comment: comment.trim(),
      })
      toast.success(`Permit ${decisionModal.type.toLowerCase()} successfully`)
      navigate('/approvals')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing decision')
    } finally {
      setSubmitting(false)
      setDecisionModal({ open: false, type: null })
    }
  }

  const getDecisionBadge = (decision) => {
    const badges = {
      PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Clock className="w-4 h-4" /> },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-4 h-4" /> },
    }
    return badges[decision] || badges.PENDING
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      LOW: { bg: 'bg-gray-100', text: 'text-gray-700' },
      MEDIUM: { bg: 'bg-blue-100', text: 'text-blue-700' },
      HIGH: { bg: 'bg-orange-100', text: 'text-orange-700' },
      CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
    }
    return badges[priority] || badges.MEDIUM
  }

  const getWorkTypeInfo = (type) => {
    const types = {
      HOT_WORK: { label: 'Hot Work', icon: <Flame className="w-5 h-5" />, color: 'text-red-500' },
      CONFINED_SPACE: { label: 'Confined Space Entry', icon: <Box className="w-5 h-5" />, color: 'text-orange-500' },
      ELECTRICAL: { label: 'Electrical Work', icon: <Zap className="w-5 h-5" />, color: 'text-yellow-500' },
      WORKING_AT_HEIGHT: { label: 'Working at Height', icon: <ArrowUp className="w-5 h-5" />, color: 'text-blue-500' },
      EXCAVATION: { label: 'Excavation', icon: <FileText className="w-5 h-5" />, color: 'text-purple-500' },
      LIFTING: { label: 'Lifting Operations', icon: <FileText className="w-5 h-5" />, color: 'text-cyan-500' },
      CHEMICAL: { label: 'Chemical Handling', icon: <FileText className="w-5 h-5" />, color: 'text-emerald-500' },
      RADIATION: { label: 'Radiation Work', icon: <FileText className="w-5 h-5" />, color: 'text-amber-500' },
      GENERAL: { label: 'General Work', icon: <FileText className="w-5 h-5" />, color: 'text-gray-500' },
    }
    return types[type] || types.GENERAL
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!approval) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg text-gray-500">Approval not found</p>
        <Link to="/approvals" className="btn btn-primary mt-4">
          Back to Approvals
        </Link>
      </div>
    )
  }

  const permit = approval.permit
  const decisionBadge = getDecisionBadge(approval.decision)
  const priorityBadge = getPriorityBadge(permit?.priority)
  const workTypeInfo = getWorkTypeInfo(permit?.workType)
  const isPending = approval.decision === 'PENDING'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/approvals')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Approvals
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{permit?.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className={`badge ${decisionBadge.bg} ${decisionBadge.text}`}>
              {decisionBadge.icon}
              <span className="ml-1">{approval.decision}</span>
            </span>
            <span className={`badge ${priorityBadge.bg} ${priorityBadge.text}`}>
              {permit?.priority} Priority
            </span>
            <div className={`flex items-center gap-1 ${workTypeInfo.color}`}>
              {workTypeInfo.icon}
              <span className="text-sm font-medium">{workTypeInfo.label}</span>
            </div>
          </div>
        </div>
        {/* Only show Approve/Reject buttons if user has approvals.approve permission */}
        {isPending && canApprovePermits && (
          <div className="flex gap-2">
            <button
              onClick={() => setDecisionModal({ open: true, type: 'REJECTED' })}
              className="btn btn-danger"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </button>
            <button
              onClick={() => setDecisionModal({ open: true, type: 'APPROVED' })}
              className="btn btn-success"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Work Description</h2>
            </div>
            <div className="card-body">
              <p className="text-gray-600 whitespace-pre-wrap">{permit?.description}</p>
            </div>
          </div>

          {/* Hazards & Precautions */}
          <div className="grid md:grid-cols-2 gap-6">
            {permit?.hazards?.length > 0 && (
              <div className="card">
                <div className="card-header flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Hazards Identified</h2>
                </div>
                <div className="card-body">
                  <ul className="space-y-2">
                    {permit.hazards.map((hazard, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 mt-2 bg-red-500 rounded-full" />
                        <span className="text-gray-600">{hazard}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {permit?.precautions?.length > 0 && (
              <div className="card">
                <div className="card-header flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Safety Precautions</h2>
                </div>
                <div className="card-body">
                  <ul className="space-y-2">
                    {permit.precautions.map((precaution, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                        <span className="text-gray-600">{precaution}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Equipment */}
          {permit?.equipment?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Required Equipment</h2>
              </div>
              <div className="card-body">
                <div className="flex flex-wrap gap-2">
                  {permit.equipment.map((item, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Workers & ID Documents */}
          {permit?.workers?.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">Workers & ID Documents</h2>
              </div>
              <div className="card-body">
                <div className="space-y-6">
                  {permit.workers.map((worker, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{index + 1}. {worker.name}</h4>
                          <p className="text-sm text-gray-500">{worker.phone}</p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">{worker.idProofType?.replace('_', ' ').toUpperCase() || 'ID'}:</span> {worker.idProofNumber}
                          </p>
                        </div>
                      </div>
                      {worker.idProofImage && (
                        <div className="mt-3">
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
                              className="max-w-full h-auto max-h-96 border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                              style={{ minHeight: '200px', objectFit: 'contain', backgroundColor: '#f9fafb' }}
                            />
                          </a>
                          <p className="text-xs text-gray-500 mt-1">Click image to open in full size</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Previous Decision (if already processed) */}
          {!isPending && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Decision Details</h2>
              </div>
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${
                    approval.decision === 'APPROVED' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {approval.decision === 'APPROVED' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {approval.decision} by {approval.approverName || 'Fireman'}
                    </p>
                    {approval.approvedAt && (
                      <p className="text-sm text-gray-500">
                        {format(new Date(approval.approvedAt), 'MMMM dd, yyyy at hh:mm a')}
                      </p>
                    )}
                    {approval.comment && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Comment:</p>
                        <p className="text-sm text-gray-600">{approval.comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Permit Details</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{permit?.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Work Period</p>
                  <p className="font-medium text-gray-900">
                    {permit?.startDate && format(new Date(permit.startDate), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    to {permit?.endDate && format(new Date(permit.endDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="font-medium text-gray-900">
                    {permit?.createdAt && format(new Date(permit.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Requestor */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Requestor</h2>
            </div>
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-white">
                    {permit?.user?.firstName?.[0]}{permit?.user?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {permit?.user?.firstName} {permit?.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{permit?.user?.email}</p>
                </div>
              </div>
              {permit?.user?.department && (
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                  <Building className="w-4 h-4" />
                  {permit.user.department}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions for Pending - Only show if user can approve */}
          {isPending && canApprovePermits && (
            <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <div className="card-body text-center">
                <h3 className="font-semibold text-primary-900 mb-2">Action Required</h3>
                <p className="text-sm text-primary-700 mb-4">
                  Review the permit details and make a decision
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDecisionModal({ open: true, type: 'REJECTED' })}
                    className="btn btn-danger flex-1"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setDecisionModal({ open: true, type: 'APPROVED' })}
                    className="btn btn-success flex-1"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* View Only Notice - Show if user can only view but not approve */}
          {isPending && !canApprovePermits && (
            <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <div className="card-body text-center">
                <h3 className="font-semibold text-gray-700 mb-2">View Only</h3>
                <p className="text-sm text-gray-500">
                  You can view this approval but don't have permission to approve or reject permits.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {decisionModal.open && (
        <div className="modal-overlay" onClick={() => setDecisionModal({ open: false, type: null })}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                decisionModal.type === 'APPROVED' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {decisionModal.type === 'APPROVED' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {decisionModal.type === 'APPROVED' ? 'Approve Permit' : 'Reject Permit'}
              </h3>
              <p className="text-gray-500 text-center mb-4">
                {decisionModal.type === 'APPROVED'
                  ? 'Are you sure you want to approve this permit request?'
                  : 'Are you sure you want to reject this permit request?'}
              </p>
              
              <div className="mb-4">
                <label className="label flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  Comment {decisionModal.type === 'REJECTED' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder={
                    decisionModal.type === 'APPROVED'
                      ? 'Add any notes or conditions (optional)'
                      : 'Please provide a reason for rejection'
                  }
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDecisionModal({ open: false, type: null })
                    setComment('')
                  }}
                  className="btn btn-secondary flex-1"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecision}
                  disabled={submitting || (decisionModal.type === 'REJECTED' && !comment.trim())}
                  className={`btn flex-1 ${
                    decisionModal.type === 'APPROVED' ? 'btn-success' : 'btn-danger'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Confirm ${decisionModal.type === 'APPROVED' ? 'Approval' : 'Rejection'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApprovalDetail
