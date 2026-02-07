// Check-in Confirmation Page
// Shown after visitor submits their check-in request
import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { publicCheckInApi } from '../../services/vmsApi'
import { 
  CheckCircle, Clock, XCircle, AlertCircle, Loader2,
  QrCode, RefreshCw, Building2, User, Phone, Shield,
  ArrowLeft, Copy, Check
} from 'lucide-react'

const CheckInConfirmation = () => {
  const { requestNumber } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(!location.state)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState(location.state || null)
  
  // Status configurations
  const statusConfig = {
    PENDING: {
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      title: 'Request Submitted',
      subtitle: 'Waiting for approval',
      message: 'Your check-in request has been submitted successfully. Please wait for security to approve your entry.',
      instruction: 'Please wait near the reception area. You will be called once approved.',
    },
    APPROVED: {
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      title: 'Approved',
      subtitle: 'Ready for entry',
      message: 'Your visit has been approved! Please proceed to the security desk for entry.',
      instruction: 'Show this screen to the security guard to complete your check-in.',
    },
    CHECKED_IN: {
      icon: Shield,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'Checked In',
      subtitle: 'Currently inside premises',
      message: 'You have been checked in successfully.',
      instruction: 'Please remember to check out when leaving.',
    },
    REJECTED: {
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      title: 'Entry Denied',
      subtitle: 'Request rejected',
      message: 'Unfortunately, your check-in request could not be approved at this time.',
      instruction: 'Please contact the reception for more information.',
    },
    CHECKED_OUT: {
      icon: CheckCircle,
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      title: 'Checked Out',
      subtitle: 'Visit completed',
      message: 'Thank you for your visit. You have been checked out successfully.',
      instruction: 'Have a safe journey!',
    },
    EXPIRED: {
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      title: 'Request Expired',
      subtitle: 'Time limit exceeded',
      message: 'Your check-in request has expired. Please submit a new request.',
      instruction: 'Scan the QR code again to start a new check-in.',
    },
  }
  
  // Fetch status if not provided via state
  useEffect(() => {
    const fetchStatus = async () => {
      if (!requestNumber) return
      
      try {
        setLoading(true)
        const response = await publicCheckInApi.getStatus(requestNumber)
        setData({
          requestNumber: response.data.requestNumber,
          status: response.data.status,
          visitorName: response.data.visitorName,
          companyName: response.data.companyName,
          submittedAt: response.data.submittedAt,
          expiresAt: response.data.expiresAt,
          processedAt: response.data.processedAt,
          checkInAt: response.data.checkInAt,
          checkOutAt: response.data.checkOutAt,
        })
        setError(null)
      } catch (err) {
        console.error('Failed to fetch status:', err)
        setError(err.response?.data?.message || 'Failed to fetch request status')
      } finally {
        setLoading(false)
      }
    }
    
    if (!location.state) {
      fetchStatus()
    }
  }, [requestNumber, location.state])
  
  // Auto-refresh status every 10 seconds for pending requests
  useEffect(() => {
    if (data?.status !== 'PENDING' && data?.status !== 'APPROVED') return
    
    const interval = setInterval(async () => {
      try {
        const response = await publicCheckInApi.getStatus(requestNumber)
        setData(prev => ({
          ...prev,
          status: response.data.status,
          processedAt: response.data.processedAt,
          checkInAt: response.data.checkInAt,
        }))
      } catch (err) {
        console.error('Auto-refresh failed:', err)
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [data?.status, requestNumber])
  
  // Manual refresh
  const handleRefresh = async () => {
    if (!requestNumber) return
    
    setRefreshing(true)
    try {
      const response = await publicCheckInApi.getStatus(requestNumber)
      setData({
        requestNumber: response.data.requestNumber,
        status: response.data.status,
        visitorName: response.data.visitorName,
        companyName: response.data.companyName,
        submittedAt: response.data.submittedAt,
        expiresAt: response.data.expiresAt,
        processedAt: response.data.processedAt,
        checkInAt: response.data.checkInAt,
        checkOutAt: response.data.checkOutAt,
      })
    } catch (err) {
      console.error('Refresh failed:', err)
    } finally {
      setRefreshing(false)
    }
  }
  
  // Copy request number
  const handleCopy = () => {
    if (data?.requestNumber) {
      navigator.clipboard.writeText(data.requestNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  // Format date/time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading status...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-800">Request Not Found</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }
  
  const status = data?.status || 'PENDING'
  const config = statusConfig[status] || statusConfig.PENDING
  const StatusIcon = config.icon
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className={`py-6 px-4 text-center text-white ${
        status === 'APPROVED' || status === 'CHECKED_IN' 
          ? 'bg-green-600' 
          : status === 'REJECTED' 
            ? 'bg-red-600' 
            : 'bg-blue-600'
      }`}>
        <Building2 className="w-8 h-8 mx-auto mb-2" />
        <h1 className="text-lg font-bold">{data?.companyName || 'Visitor Management'}</h1>
        <p className="text-sm opacity-90">Check-in Status</p>
      </div>
      
      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Status Card */}
        <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl p-6 text-center`}>
          {/* Status Icon */}
          <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto`}>
            <StatusIcon className={`w-10 h-10 ${config.iconColor}`} />
          </div>
          
          {/* Status Title */}
          <h2 className="mt-4 text-2xl font-bold text-gray-800">{config.title}</h2>
          <p className={`text-sm ${config.iconColor} font-medium`}>{config.subtitle}</p>
          
          {/* Message */}
          <p className="mt-4 text-gray-600">{config.message}</p>
          
          {/* Instruction */}
          <div className="mt-4 p-3 bg-white/60 rounded-lg">
            <p className="text-sm text-gray-700 font-medium">{config.instruction}</p>
          </div>
        </div>
        
        {/* Request Details */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h3 className="font-semibold text-gray-800">Request Details</h3>
          
          {/* Request Number */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Request Number</p>
              <p className="font-mono font-bold text-gray-800">{data?.requestNumber}</p>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Copy"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          
          {/* Visitor Name */}
          {data?.visitorName && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Visitor</p>
                <p className="font-medium text-gray-800">{data.visitorName}</p>
              </div>
            </div>
          )}
          
          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDateTime(data?.submittedAt)}
              </p>
            </div>
            
            {data?.expiresAt && status === 'PENDING' && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Valid Until</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatDateTime(data.expiresAt)}
                </p>
              </div>
            )}
            
            {data?.checkInAt && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Check-in Time</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatDateTime(data.checkInAt)}
                </p>
              </div>
            )}
            
            {data?.checkOutAt && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Check-out Time</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatDateTime(data.checkOutAt)}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* QR Code Display (for approved/checked-in) */}
        {(status === 'APPROVED' || status === 'CHECKED_IN') && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-6 text-center">
            <QrCode className="w-32 h-32 mx-auto text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">Show this to security guard</p>
            <p className="mt-1 font-mono text-lg font-bold text-gray-800">
              {data?.requestNumber}
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {/* Refresh Button */}
          {(status === 'PENDING' || status === 'APPROVED') && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Refresh Status
                </>
              )}
            </button>
          )}
          
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
        
        {/* Auto-refresh indicator */}
        {(status === 'PENDING' || status === 'APPROVED') && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Status auto-refreshes every 10 seconds
          </p>
        )}
      </div>
      
      {/* Footer */}
      <div className="text-center py-4 text-xs text-gray-400">
        Powered by VMS - Visitor Management System
      </div>
    </div>
  )
}

export default CheckInConfirmation
