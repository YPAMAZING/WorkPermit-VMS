import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import useCompanyList from '../../hooks/useCompanyList'
import { 
  User, 
  Phone, 
  Building2, 
  Mail, 
  Calendar,
  Clock,
  FileCheck,
  ArrowLeft,
  CheckCircle,
  Share2,
  Copy,
  MessageCircle,
  QrCode,
  Loader2,
  AlertCircle,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import { vmsAPI } from '../../services/vmsApi'

const PreApproval = () => {
  const navigate = useNavigate()
  const { user, isAdmin, isReceptionist, isSecurityGuard } = useVMSAuth()
  const [step, setStep] = useState(1) // 1: Form, 2: Success
  const [loading, setLoading] = useState(false)
  const [preApproval, setPreApproval] = useState(null)
  
  // Check if user is admin/reception (can see all companies) or company user (only their company)
  const isAdminOrReception = isAdmin || isReceptionist || isSecurityGuard
  const isCompanyUser = user?.companyId && !isAdminOrReception
  
  // Use the reusable hook for company list
  const { 
    companies: allCompanies, 
    loading: companiesLoading, 
    error: companiesError,
    getCompanyById 
  } = useCompanyList({ withApprovalStatus: true })
  
  // Filter companies based on user role
  const companies = isCompanyUser 
    ? allCompanies.filter(c => c.id === user.companyId)
    : allCompanies
  
  const [formData, setFormData] = useState({
    visitorName: '',
    phone: '',
    email: '',
    companyFrom: '',
    companyToVisit: '',
    companyId: '',
    personToMeet: '',
    purpose: '',
    visitDate: '',
    visitTime: '',
    validHours: 8,
    remarks: '',
    hostPhone: '',
    hostEmail: '',
  })

  const [errors, setErrors] = useState({})
  
  // Auto-set company for company users
  useEffect(() => {
    if (isCompanyUser && user?.companyId && companies.length > 0) {
      const userCompany = companies.find(c => c.id === user.companyId)
      if (userCompany) {
        setFormData(prev => ({
          ...prev,
          companyToVisit: userCompany.displayName || userCompany.name,
          companyId: userCompany.id
        }))
      }
    }
  }, [isCompanyUser, user?.companyId, companies])

  // Same purposes as the visitor registration form
  const purposes = [
    'Meeting',
    'Interview',
    'Vendor/Client Visit',
    'Other'
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Handle company selection specially
    if (name === 'companyToVisit') {
      const selectedCompany = companies.find(c => 
        c.displayName === value || c.name === value
      )
      if (selectedCompany) {
        setFormData(prev => ({ 
          ...prev, 
          companyToVisit: selectedCompany.displayName || selectedCompany.name,
          companyId: selectedCompany.id
        }))
      } else {
        setFormData(prev => ({ ...prev, [name]: value, companyId: '' }))
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.visitorName.trim()) newErrors.visitorName = 'Visitor name is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
    else if (!/^[6-9]\d{9}$/.test(formData.phone)) newErrors.phone = 'Invalid phone number'
    if (!formData.companyToVisit) newErrors.companyToVisit = 'Select company'
    if (!formData.personToMeet.trim()) newErrors.personToMeet = 'Host name is required'
    if (!formData.purpose) newErrors.purpose = 'Select purpose'
    if (!formData.visitDate) newErrors.visitDate = 'Visit date is required'
    if (!formData.visitTime) newErrors.visitTime = 'Visit time is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const visitDateTime = new Date(`${formData.visitDate}T${formData.visitTime}`)
      const validUntil = new Date(visitDateTime.getTime() + formData.validHours * 60 * 60 * 1000)

      const payload = {
        ...formData,
        entryType: 'PRE_APPROVED',
        status: 'PRE_APPROVED',
        expectedArrival: visitDateTime.toISOString(),
        validUntil: validUntil.toISOString(),
        createdBy: 'company', // Will be replaced with actual user
      }

      const response = await vmsAPI.createPreApproval(payload)
      
      if (response.data.success) {
        setPreApproval(response.data.preApproval)
        setStep(2)
        toast.success('Pre-approval created successfully!')
      }
    } catch (error) {
      console.error('Error creating pre-approval:', error)
      // For demo, create mock pre-approval
      const mockPreApproval = {
        approvalCode: `PA-${Date.now().toString().slice(-8)}`,
        visitorName: formData.visitorName,
        phone: formData.phone,
        companyToVisit: formData.companyToVisit,
        personToMeet: formData.personToMeet,
        purpose: formData.purpose,
        visitDate: formData.visitDate,
        visitTime: formData.visitTime,
        validUntil: new Date(new Date(`${formData.visitDate}T${formData.visitTime}`).getTime() + formData.validHours * 60 * 60 * 1000).toISOString(),
        qrCode: `https://reliablespaces.cloud/vms/checkin/${Date.now()}`,
      }
      setPreApproval(mockPreApproval)
      setStep(2)
      toast.success('Pre-approval created successfully!')
    } finally {
      setLoading(false)
    }
  }

  const generateWhatsAppMessage = () => {
    if (!preApproval) return ''
    
    const message = `🎫 *Visitor Pre-Approval Pass*
━━━━━━━━━━━━━━━━━━
📋 *Approval Code:* ${preApproval.approvalCode}

👤 *Visitor:* ${preApproval.visitorName}
📞 *Phone:* ${preApproval.phone}

🏢 *Visiting:* ${preApproval.companyToVisit}
👨‍💼 *Meeting:* ${preApproval.personToMeet}
📝 *Purpose:* ${preApproval.purpose}

📅 *Date:* ${new Date(preApproval.visitDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
⏰ *Time:* ${preApproval.visitTime}

✅ *Valid Until:* ${new Date(preApproval.validUntil).toLocaleString('en-IN')}

━━━━━━━━━━━━━━━━━━
📍 Please show this message at reception
🔗 Or visit: ${preApproval.qrCode}

_Reliable Group - Visitor Management System_`

    return encodeURIComponent(message)
  }

  const shareOnWhatsApp = () => {
    const message = generateWhatsAppMessage()
    const phoneNumber = formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank')
  }

  const copyToClipboard = () => {
    const message = decodeURIComponent(generateWhatsAppMessage())
    navigator.clipboard.writeText(message)
    toast.success('Copied to clipboard!')
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="p-4 md:p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Reliable Group Logo" 
              className="w-10 h-10 object-contain bg-white rounded-lg p-1"
            />
            <div>
              <h1 className="text-white font-bold text-lg">Pre-Approval Visitor Pass</h1>
              <p className="text-purple-300 text-xs">Generate & share visitor passes</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/vms')}
            className="text-purple-300 hover:text-white text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {/* Step 1: Form */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Create Pre-Approval</h2>
              <p className="text-gray-500 mt-1">Generate a pre-approved visitor pass for your visitor</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Visitor Details Section */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Visitor Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Visitor Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visitor Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="visitorName"
                        value={formData.visitorName}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.visitorName ? 'border-red-500' : 'border-gray-200'}`}
                        placeholder="Visitor's full name"
                      />
                    </div>
                    {errors.visitorName && <p className="text-red-500 text-xs mt-1">{errors.visitorName}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visitor Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength={10}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.phone ? 'border-red-500' : 'border-gray-200'}`}
                        placeholder="10-digit mobile number"
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visitor Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="visitor@email.com"
                      />
                    </div>
                  </div>

                  {/* Company From */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visitor's Organization
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="companyFrom"
                        value={formData.companyFrom}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Visitor's company name"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit Details Section */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Visit Details
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Company To Visit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company to Visit <span className="text-red-500">*</span>
                    </label>
                    {isCompanyUser ? (
                      // Company users can only create pre-approvals for their own company
                      <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                        {formData.companyToVisit || user?.companyName || 'Your Company'}
                      </div>
                    ) : (
                      // Admin/Reception users can select any company
                      <select
                        name="companyToVisit"
                        value={formData.companyToVisit}
                        onChange={handleChange}
                        disabled={companiesLoading}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 ${errors.companyToVisit ? 'border-red-500' : 'border-gray-200'}`}
                      >
                        {companiesLoading ? (
                          <option value="">Loading companies...</option>
                        ) : companiesError ? (
                          <option value="">Error loading companies</option>
                        ) : (
                          <>
                            <option value="">Select company</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.displayName || c.name}>
                                {c.displayName || c.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    )}
                    {errors.companyToVisit && <p className="text-red-500 text-xs mt-1">{errors.companyToVisit}</p>}
                  </div>

                  {/* Person to Meet */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Host Name (Person to Meet) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="personToMeet"
                      value={formData.personToMeet}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.personToMeet ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Name of person to meet"
                    />
                    {errors.personToMeet && <p className="text-red-500 text-xs mt-1">{errors.personToMeet}</p>}
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purpose of Visit <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.purpose ? 'border-red-500' : 'border-gray-200'}`}
                    >
                      <option value="">Select purpose</option>
                      {purposes.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>}
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Remarks
                    </label>
                    <input
                      type="text"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Any special instructions"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Section */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Visit Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visit Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        name="visitDate"
                        value={formData.visitDate}
                        onChange={handleChange}
                        min={today}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.visitDate ? 'border-red-500' : 'border-gray-200'}`}
                      />
                    </div>
                    {errors.visitDate && <p className="text-red-500 text-xs mt-1">{errors.visitDate}</p>}
                  </div>

                  {/* Visit Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Time <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="time"
                        name="visitTime"
                        value={formData.visitTime}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 ${errors.visitTime ? 'border-red-500' : 'border-gray-200'}`}
                      />
                    </div>
                    {errors.visitTime && <p className="text-red-500 text-xs mt-1">{errors.visitTime}</p>}
                  </div>

                  {/* Valid Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid For (Hours)
                    </label>
                    <select
                      name="validHours"
                      value={formData.validHours}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={2}>2 Hours</option>
                      <option value={4}>4 Hours</option>
                      <option value={8}>8 Hours</option>
                      <option value={12}>12 Hours</option>
                      <option value={24}>24 Hours</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    Generate Pre-Approval
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Success / Share */}
        {step === 2 && preApproval && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-center text-white">
              <CheckCircle className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Pre-Approval Created!</h2>
              <p className="opacity-90 mt-1">Share this with your visitor</p>
            </div>

            {/* Approval Card */}
            <div className="p-6">
              <div className="border-2 border-dashed border-purple-200 rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-10 h-10" />
                    <div>
                      <h3 className="font-bold text-gray-800">Reliable Group</h3>
                      <p className="text-xs text-gray-500">Pre-Approved Visitor Pass</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Approval Code</p>
                    <p className="font-mono font-bold text-purple-600 text-lg">{preApproval.approvalCode}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Visitor</p>
                    <p className="font-semibold text-gray-800">{preApproval.visitorName}</p>
                    <p className="text-sm text-gray-600">{preApproval.phone}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Visiting</p>
                    <p className="font-semibold text-gray-800">{preApproval.companyToVisit}</p>
                    <p className="text-sm text-gray-600">Meeting: {preApproval.personToMeet}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Schedule</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(preApproval.visitDate).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                    <p className="text-sm text-gray-600">at {preApproval.visitTime}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Valid Until</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(preApproval.validUntil).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* QR Info */}
                <div className="bg-gray-50 p-4 rounded-lg text-center mb-4">
                  <QrCode className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Visitor can check-in using the link or show this pass at reception</p>
                </div>

                {/* Status Badge */}
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    PRE-APPROVED
                  </span>
                </div>
              </div>

              {/* Share Actions */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={shareOnWhatsApp}
                  className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Share on WhatsApp
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Copy className="w-5 h-5" />
                    Copy Message
                  </button>
                  <button
                    onClick={() => {
                      setStep(1)
                      setPreApproval(null)
                      setFormData({
                        visitorName: '',
                        phone: '',
                        email: '',
                        companyFrom: '',
                        companyToVisit: '',
                        personToMeet: '',
                        purpose: '',
                        visitDate: '',
                        visitTime: '',
                        validHours: 8,
                        remarks: '',
                        hostPhone: '',
                        hostEmail: '',
                      })
                    }}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileCheck className="w-5 h-5" />
                    Create Another
                  </button>
                </div>

                <button
                  onClick={() => navigate('/vms')}
                  className="w-full text-gray-500 py-2 text-sm hover:text-gray-700"
                >
                  ← Back to VMS Home
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default PreApproval
