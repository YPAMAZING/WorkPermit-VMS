import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { preapprovedApi } from '../../services/vmsApi'
import {
  UserCheck,
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Building,
  Calendar,
  FileText,
  Copy,
  MessageCircle,
  Hash,
  UserCheck as PersonIcon,
} from 'lucide-react'

const PreApprovalDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, hasPermission } = useVMSAuth()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)

  const canEdit = isAdmin || hasPermission('vms.preapproved.edit')
  const canDelete = isAdmin || hasPermission('vms.preapproved.delete')

  useEffect(() => {
    fetchEntry()
  }, [id])

  const fetchEntry = async () => {
    try {
      setLoading(true)
      const response = await preapprovedApi.getById(id)
      setEntry(response.data)
    } catch (error) {
      console.error('Failed to fetch entry:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this pre-approval?')) return
    try {
      await preapprovedApi.cancel(id, 'Cancelled by admin')
      fetchEntry()
    } catch (error) {
      console.error('Failed to cancel:', error)
      alert('Failed to cancel pre-approval')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this pre-approval? This cannot be undone.')) return
    try {
      await preapprovedApi.delete(id)
      navigate('/vms/admin/preapproved')
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete pre-approval')
    }
  }

  const handleShare = async (method) => {
    const text = `Pre-approved Visit Pass

Visitor: ${entry.visitorName}
Purpose: ${entry.purpose}
Valid From: ${formatDateTime(entry.validFrom)}
Valid Until: ${formatDateTime(entry.validUntil)}

Please show this at the reception desk upon arrival.`

    if (method === 'copy') {
      await navigator.clipboard.writeText(text)
      alert('Pass details copied to clipboard!')
    } else if (method === 'whatsapp') {
      const phone = entry.phone.replace(/\D/g, '')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
    } else if (method === 'share' && navigator.share) {
      navigator.share({ title: 'Pre-approved Pass', text })
    }
  }

  const statusColors = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    USED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle },
    EXPIRED: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <AlertTriangle size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Pre-approval not found</p>
        <button
          onClick={() => navigate('/vms/admin/preapproved')}
          className="mt-4 text-teal-600 hover:text-teal-700"
        >
          Back to list
        </button>
      </div>
    )
  }

  const statusStyle = statusColors[entry.status] || statusColors.ACTIVE
  const StatusIcon = statusStyle.icon
  const isExpired = new Date(entry.validUntil) < new Date()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vms/admin/preapproved')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Pre-approval Details</h1>
            <p className="text-gray-500 mt-1">View pre-approved visitor pass</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          <StatusIcon size={16} />
          {entry.status}
          {entry.status === 'ACTIVE' && isExpired && ' (Expired)'}
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Visitor Info */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-teal-600 font-bold text-xl">
                {entry.visitorName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'V'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">{entry.visitorName}</h2>
              {entry.companyFrom && (
                <p className="text-gray-500 flex items-center gap-2 mt-1">
                  <Building size={16} />
                  {entry.companyFrom}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3">
                <a
                  href={`tel:${entry.phone}`}
                  className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  <Phone size={14} />
                  {entry.phone}
                </a>
                {entry.email && (
                  <a
                    href={`mailto:${entry.email}`}
                    className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    <Mail size={14} />
                    {entry.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pass Number / Request ID */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-teal-600 uppercase font-semibold mb-1">Pass Number / Request ID</p>
              <p className="text-xl font-bold text-teal-800 font-mono tracking-wide">
                {entry.passNumber || entry.approvalCode || `RGDGTLGP ${new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${new Date(entry.createdAt).getFullYear()} - ${entry.id?.substring(0, 4).toUpperCase()}`}
              </p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Hash size={24} className="text-teal-600" />
            </div>
          </div>
        </div>

        {/* Visit Details */}
        <div className="p-6 border-b border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Purpose</p>
            <p className="text-gray-800 flex items-center gap-2">
              <FileText size={16} className="text-gray-400" />
              {entry.purpose}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Company to Visit</p>
            <p className="text-gray-800 flex items-center gap-2">
              <Building size={16} className="text-gray-400" />
              {entry.companyName || entry.companyId || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Person to Meet</p>
            <p className="text-gray-800 flex items-center gap-2">
              <PersonIcon size={16} className="text-gray-400" />
              {entry.personToMeet || '-'}
            </p>
          </div>
        </div>

        {/* Validity Period */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-teal-600" />
            Validity Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Valid From</p>
              <p className="text-gray-800 font-medium">{formatDateTime(entry.validFrom)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Valid Until</p>
              <p className="text-gray-800 font-medium">{formatDateTime(entry.validUntil)}</p>
            </div>
          </div>
        </div>

        {/* Remarks */}
        {entry.remarks && (
          <div className="p-6 border-b border-gray-100">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Remarks</p>
            <p className="text-gray-700 whitespace-pre-wrap">{entry.remarks}</p>
          </div>
        )}

        {/* Meta Info */}
        <div className="p-6 bg-gray-50 text-sm text-gray-500">
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="font-medium">Created:</span> {formatDateTime(entry.createdAt)}
            </div>
            {entry.usedAt && (
              <div>
                <span className="font-medium">Used:</span> {formatDateTime(entry.usedAt)}
              </div>
            )}
            {entry.sharedAt && (
              <div>
                <span className="font-medium">Shared via:</span> {entry.sharedVia} on {formatDateTime(entry.sharedAt)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {entry.status === 'ACTIVE' && (
            <>
              <button
                onClick={() => handleShare('copy')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Copy size={18} />
                Copy Details
              </button>
              <button
                onClick={() => handleShare('whatsapp')}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
              >
                <MessageCircle size={18} />
                Share via WhatsApp
              </button>
              {navigator.share && (
                <button
                  onClick={() => handleShare('share')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                >
                  <Share2 size={18} />
                  Share
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => navigate(`/vms/admin/preapproved/${id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                  Edit
                </button>
              )}
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors"
              >
                <XCircle size={18} />
                Cancel
              </button>
            </>
          )}
          {canDelete && ['CANCELLED', 'EXPIRED', 'USED'].includes(entry.status) && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PreApprovalDetail
