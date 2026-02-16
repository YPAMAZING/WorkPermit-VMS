import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Phone, 
  Building2, 
  Mail, 
  Camera, 
  FileCheck,
  ArrowLeft,
  CheckCircle,
  Users,
  Clock,
  Calendar,
  BadgeCheck,
  Loader2,
  AlertCircle,
  Image,
  RefreshCw,
  X,
  Shield
} from 'lucide-react'
import toast from 'react-hot-toast'
import { vmsAPI, companySettingsApi } from '../../services/vmsApi'

const VisitorRegister = () => {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const idDocVideoRef = useRef(null)
  const idDocCanvasRef = useRef(null)

  const idDocInputRef = useRef(null)
  const [step, setStep] = useState(1) // 1: Form, 2: Photo, 3: Success
  const [loading, setLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [idDocumentImage, setIdDocumentImage] = useState(null)
  const [gatepass, setGatepass] = useState(null)
  
  // ID Document camera modal state
  const [showIdDocCamera, setShowIdDocCamera] = useState(false)
  const [idDocCameraActive, setIdDocCameraActive] = useState(false)
  
  // Company list from API
  const [companies, setCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  
  // Company settings for approval-based flow
  const [companySettings, setCompanySettings] = useState(null)
  const [loadingCompanySettings, setLoadingCompanySettings] = useState(false)
  
  const [formData, setFormData] = useState({
    visitorName: '',
    phone: '',
    email: '',
    companyFrom: '',
    companyToVisit: '',
    companyId: '', // Store company ID for API
    personToMeet: '',
    purpose: '',
    idProofType: 'aadhaar',
    idProofNumber: '',
    vehicleNumber: '',
    numberOfVisitors: 1,
  })

  const [errors, setErrors] = useState({})

  // Fetch companies from API on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setCompaniesLoading(true)
        const response = await companySettingsApi.getDropdown()
        const companyList = response.data.companies || []
        setCompanies(companyList)
      } catch (error) {
        console.error('Failed to fetch companies:', error)
        // Fallback to empty list - user can still type "Other"
        setCompanies([])
        toast.error('Failed to load companies')
      } finally {
        setCompaniesLoading(false)
      }
    }
    fetchCompanies()
  }, [])

  const purposes = [
    'Meeting',
    'Interview',
    'Vendor/Client Visit',
    'Other'
  ]

  const idProofTypes = [
    { value: 'aadhaar', label: 'Aadhaar Card' },
    { value: 'driving_license', label: 'Driving License' },
  ]

  const handleChange = async (e) => {
    const { name, value } = e.target
    
    // Handle company selection specially
    if (name === 'companyToVisit') {
      // Find the selected company from the list
      const selectedCompany = companies.find(c => 
        c.displayName === value || c.name === value || c.id === value
      )
      
      if (selectedCompany) {
        setFormData(prev => ({ 
          ...prev, 
          companyToVisit: selectedCompany.displayName || selectedCompany.name,
          companyId: selectedCompany.id
        }))
        // Set company settings directly from the company data
        setCompanySettings({
          requireApproval: selectedCompany.requireApproval,
          autoApproveVisitors: !selectedCompany.requireApproval
        })
      } else {
        // "Other" or manual entry
        setFormData(prev => ({ ...prev, [name]: value, companyId: '' }))
        setCompanySettings({
          requireApproval: false,  // Default: approval OFF (auto-approve)
          autoApproveVisitors: true
        })
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
    
    if (!formData.visitorName.trim()) newErrors.visitorName = 'Name is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
    else if (!/^[6-9]\d{9}$/.test(formData.phone)) newErrors.phone = 'Invalid phone number'
    if (!formData.companyToVisit) newErrors.companyToVisit = 'Select company to visit'
    // Person to meet is now optional
    if (!formData.purpose) newErrors.purpose = 'Select purpose'
    if (!formData.idProofNumber.trim()) newErrors.idProofNumber = 'ID proof number is required'
    if (!idDocumentImage) newErrors.idDocument = 'ID document image is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitForm = (e) => {
    e.preventDefault()
    if (validateForm()) {
      setStep(2)
      startCamera()
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('Unable to access camera. Please allow camera permission.')
      // Allow skip photo if camera not available
      setCapturedPhoto('no-photo')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      setCameraActive(false)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      // Flip the image horizontally to mirror it correctly
      context.translate(canvasRef.current.width, 0)
      context.scale(-1, 1)
      context.drawImage(videoRef.current, 0, 0)
      const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8)
      setCapturedPhoto(photoData)
      stopCamera()
    }
  }



  const handleUploadIdDocument = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Document size should be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setIdDocumentImage(reader.result)
        setErrors(prev => ({ ...prev, idDocument: '' }))
        toast.success('ID document uploaded!')
      }
      reader.readAsDataURL(file)
    }
  }

  // ID Document Camera Functions
  const startIdDocCamera = async () => {
    setShowIdDocCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      })
      if (idDocVideoRef.current) {
        idDocVideoRef.current.srcObject = stream
        setIdDocCameraActive(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('Unable to access camera. Please allow camera permission or use Upload option.')
      setShowIdDocCamera(false)
    }
  }

  const stopIdDocCamera = () => {
    if (idDocVideoRef.current && idDocVideoRef.current.srcObject) {
      idDocVideoRef.current.srcObject.getTracks().forEach(track => track.stop())
      setIdDocCameraActive(false)
    }
    setShowIdDocCamera(false)
  }

  const captureIdDocument = () => {
    if (idDocVideoRef.current && idDocCanvasRef.current) {
      const context = idDocCanvasRef.current.getContext('2d')
      idDocCanvasRef.current.width = idDocVideoRef.current.videoWidth
      idDocCanvasRef.current.height = idDocVideoRef.current.videoHeight
      // Flip the image horizontally to correct mirror effect
      context.translate(idDocCanvasRef.current.width, 0)
      context.scale(-1, 1)
      context.drawImage(idDocVideoRef.current, 0, 0)
      const photoData = idDocCanvasRef.current.toDataURL('image/jpeg', 0.9)
      setIdDocumentImage(photoData)
      setErrors(prev => ({ ...prev, idDocument: '' }))
      stopIdDocCamera()
      toast.success('ID document captured!')
    }
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
    startCamera()
  }

  const handleGenerateGatepass = async () => {
    setLoading(true)
    try {
      // Check if company requires approval (default is OFF/auto-approve)
      const requiresApproval = companySettings?.requireApproval === true
      
      const payload = {
        ...formData,
        photo: capturedPhoto,
        idDocumentImage: idDocumentImage,
        entryType: 'WALK_IN',
        // If approval required, status is PENDING; otherwise, CHECKED_IN
        status: requiresApproval ? 'PENDING_APPROVAL' : 'CHECKED_IN',
        checkInTime: new Date().toISOString(),
        requiresApproval: requiresApproval,
      }

      // Call API to create visitor record
      const response = await vmsAPI.createVisitor(payload)
      
      if (response.data.success) {
        if (requiresApproval && !response.data.gatepass) {
          // Approval required - show pending screen
          setGatepass({
            status: 'PENDING_APPROVAL',
            requestNumber: response.data.requestNumber || `REQ-${Date.now().toString().slice(-8)}`,
            visitorName: formData.visitorName,
            phone: formData.phone,
            companyToVisit: formData.companyToVisit,
            personToMeet: formData.personToMeet,
            purpose: formData.purpose,
            submittedAt: new Date().toISOString(),
            photo: capturedPhoto,
          })
          setStep(3)
          toast.success('Request submitted! Please wait for approval.')
        } else {
          setGatepass(response.data.gatepass)
          setStep(3)
          toast.success('Visitor pass generated successfully!')
        }
      }
    } catch (error) {
      console.error('Error generating visitor pass:', error)
      
      // Show the actual error to user - don't use mock data
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit request. Please try again.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Photo is mandatory - removed skip option

  useEffect(() => {
    return () => {
      stopCamera()
      stopIdDocCamera()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900">
      {/* ID Document Camera Modal */}
      {showIdDocCamera && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50">
            <div className="text-white">
              <h3 className="font-bold text-lg">Capture ID Document</h3>
              <p className="text-sm text-gray-300">Position your ID card within the frame</p>
            </div>
            <button
              onClick={stopIdDocCamera}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Camera View */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden">
              <video
                ref={idDocVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!idDocCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
              )}
              {/* Guide Frame */}
              <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-lg pointer-events-none">
                <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
              </div>
            </div>
            <canvas ref={idDocCanvasRef} className="hidden" />
          </div>
          
          {/* Capture Button */}
          <div className="p-6 bg-black/50">
            <button
              onClick={captureIdDocument}
              disabled={!idDocCameraActive}
              className="w-full max-w-md mx-auto block bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <Camera className="w-6 h-6" />
              Capture Document
            </button>
          </div>
        </div>
      )}

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
              <h1 className="text-white font-bold text-lg">Visitor Registration</h1>
              <p className="text-teal-300 text-xs">Generate your visitor pass</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/vms')}
            className="text-teal-300 hover:text-white text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-center gap-4">
          {[
            { num: 1, label: 'Details' },
            { num: 2, label: 'Photo' },
            { num: 3, label: 'Visitor Pass' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step >= s.num ? 'bg-teal-500 text-white' : 'bg-white/20 text-white/50'}
              `}>
                {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              <span className={`ml-2 text-sm ${step >= s.num ? 'text-white' : 'text-white/50'}`}>
                {s.label}
              </span>
              {idx < 2 && (
                <div className={`w-12 h-0.5 mx-3 ${step > s.num ? 'bg-teal-500' : 'bg-white/20'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {/* Step 1: Form */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Visitor Details</h2>
              <p className="text-gray-500 mt-1">Please fill in your information</p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Visitor Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="visitorName"
                      value={formData.visitorName}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.visitorName ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.visitorName && <p className="text-red-500 text-xs mt-1">{errors.visitorName}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength={10}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.phone ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Company From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Company/Organization
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="companyFrom"
                      value={formData.companyFrom}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Your company name"
                    />
                  </div>
                </div>

                {/* Company To Visit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company to Visit <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="companyToVisit"
                    value={formData.companyToVisit}
                    onChange={handleChange}
                    disabled={companiesLoading}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 ${errors.companyToVisit ? 'border-red-500' : 'border-gray-200'}`}
                  >
                    {companiesLoading ? (
                      <option value="">Loading companies...</option>
                    ) : (
                      <>
                        <option value="">Select company</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.displayName || c.name}>
                            {c.displayName || c.name}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                  {errors.companyToVisit && <p className="text-red-500 text-xs mt-1">{errors.companyToVisit}</p>}
                  
                  {/* Show approval status */}
                  {formData.companyToVisit && companySettings && (
                    <div className={`mt-2 text-sm flex items-center gap-2 ${
                      companySettings.requireApproval ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {companySettings.requireApproval ? (
                        <>
                          <Shield size={14} />
                          Approval required - you will wait for company approval
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Auto-approve - you will get a visitor pass immediately
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Person to Meet - Optional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Person to Meet <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="personToMeet"
                    value={formData.personToMeet}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Name of person to meet"
                  />
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.purpose ? 'border-red-500' : 'border-gray-200'}`}
                  >
                    <option value="">Select purpose</option>
                    {purposes.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>}
                </div>

                {/* ID Proof Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Proof Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="idProofType"
                    value={formData.idProofType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    {idProofTypes.map(id => (
                      <option key={id.value} value={id.value}>{id.label}</option>
                    ))}
                  </select>
                </div>

                {/* ID Proof Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Proof Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="idProofNumber"
                    value={formData.idProofNumber}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.idProofNumber ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Enter ID number"
                  />
                  {errors.idProofNumber && <p className="text-red-500 text-xs mt-1">{errors.idProofNumber}</p>}
                </div>

                {/* Upload ID Document Image - COMPULSORY */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-teal-600" />
                      Capture or Upload Document Image <span className="text-red-500">*</span>
                    </span>
                  </label>
                  
                  {/* Hidden inputs for capture and upload */}
                  <input
                    type="file"
                    ref={idDocInputRef}
                    onChange={handleUploadIdDocument}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  <input
                    type="file"
                    id="idDocUploadInput"
                    onChange={handleUploadIdDocument}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <div className={`w-full border-2 border-dashed rounded-xl p-5 transition-all duration-200 ${
                    errors.idDocument 
                      ? 'border-red-400 bg-red-50' 
                      : idDocumentImage 
                        ? 'border-green-400 bg-green-50'
                        : 'border-teal-300 bg-teal-50'
                  }`}>
                    {idDocumentImage ? (
                      <div className="flex items-center gap-4">
                        <img 
                          src={idDocumentImage} 
                          alt="ID Document" 
                          className="w-28 h-20 object-cover rounded-lg border-2 border-green-400 shadow-sm"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-green-600 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Document Uploaded Successfully
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={startIdDocCamera}
                              className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              Recapture
                            </button>
                            <button
                              type="button"
                              onClick={() => document.getElementById('idDocUploadInput')?.click()}
                              className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 flex items-center gap-1"
                            >
                              <Image className="w-3 h-3" />
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <p className={`text-sm font-medium ${errors.idDocument ? 'text-red-600' : 'text-gray-700'}`}>
                          Aadhaar Card, PAN Card, Driving License, Voter ID, Passport
                        </p>
                        <div className="flex gap-3 w-full max-w-md">
                          {/* Capture Button - Opens Real Camera */}
                          <button
                            type="button"
                            onClick={startIdDocCamera}
                            className={`flex-1 py-4 rounded-xl font-semibold flex flex-col items-center gap-2 transition-all ${
                              errors.idDocument 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300' 
                                : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md hover:shadow-lg'
                            }`}
                          >
                            <Camera className="w-7 h-7" />
                            <span>Capture</span>
                          </button>
                          
                          {/* Upload Button - Opens File Picker */}
                          <button
                            type="button"
                            onClick={() => document.getElementById('idDocUploadInput')?.click()}
                            className={`flex-1 py-4 rounded-xl font-semibold flex flex-col items-center gap-2 transition-all ${
                              errors.idDocument 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300' 
                                : 'bg-gray-600 text-white hover:bg-gray-700 shadow-md hover:shadow-lg'
                            }`}
                          >
                            <Image className="w-7 h-7" />
                            <span>Upload</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.idDocument && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {errors.idDocument}
                    </p>
                  )}
                </div>

                {/* Vehicle Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number (if any)
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., MH01AB1234"
                  />
                </div>

                {/* Number of Visitors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Visitors
                  </label>
                  <input
                    type="number"
                    name="numberOfVisitors"
                    value={formData.numberOfVisitors}
                    onChange={handleChange}
                    min={1}
                    max={10}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 mt-6"
              >
                Continue to Photo
                <Camera className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Photo */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Take Your Photo</h2>
              <p className="text-gray-500 mt-1">This will appear on your visitor pass</p>
            </div>

            <div className="max-w-md mx-auto">
              {!capturedPhoto ? (
                <>
                  <div className="relative aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  
                  <button
                    onClick={capturePhoto}
                    disabled={!cameraActive}
                    className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
                  >
                    <Camera className="w-6 h-6" />
                    Capture Photo
                  </button>
                  <p className="text-center text-sm text-gray-500 mt-2">Position your face in the camera and click capture</p>
                </>
              ) : (
                <>
                  <div className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden mb-4">
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={retakePhoto}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Retake
                    </button>
                    <button
                      onClick={handleGenerateGatepass}
                      disabled={loading}
                      className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-5 h-5" />
                          Generate Visitor Pass
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Success / Visitor Pass or Pending Approval */}
        {step === 3 && gatepass && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Conditional Header based on status */}
            {gatepass.status === 'PENDING_APPROVAL' ? (
              // PENDING APPROVAL HEADER
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center text-white">
                <Clock className="w-16 h-16 mx-auto mb-3" />
                <h2 className="text-2xl font-bold">Request Submitted!</h2>
                <p className="opacity-90 mt-1">Your request is pending approval</p>
              </div>
            ) : (
              // VISITOR PASS GENERATED HEADER
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center text-white">
                <CheckCircle className="w-16 h-16 mx-auto mb-3" />
                <h2 className="text-2xl font-bold">Visitor Pass Generated!</h2>
                <p className="opacity-90 mt-1">Please show this to security</p>
              </div>
            )}

            {/* Card Content */}
            <div className="p-6">
              {gatepass.status === 'PENDING_APPROVAL' ? (
                // PENDING APPROVAL CONTENT
                <div className="border-2 border-dashed border-amber-200 rounded-xl p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <img src="/logo.png" alt="Logo" className="w-10 h-10" />
                      <div>
                        <h3 className="font-bold text-gray-800">Reliable Group</h3>
                        <p className="text-xs text-gray-500">Visitor Request</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Request No.</p>
                      <p className="font-mono font-bold text-amber-600">{gatepass.requestNumber}</p>
                    </div>
                  </div>

                  {/* Photo & Details */}
                  <div className="flex gap-4 mb-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {gatepass.photo && gatepass.photo !== 'no-photo' ? (
                        <img src={gatepass.photo} alt="Visitor" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-800">{gatepass.visitorName}</h4>
                      <p className="text-sm text-gray-600">{gatepass.phone}</p>
                      <div className="mt-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        PENDING APPROVAL
                      </div>
                    </div>
                  </div>

                  {/* Visit Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Visiting</p>
                      <p className="font-medium text-gray-800">{gatepass.companyToVisit}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Meeting</p>
                      <p className="font-medium text-gray-800">{gatepass.personToMeet || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Purpose</p>
                      <p className="font-medium text-gray-800">{gatepass.purpose}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Submitted At</p>
                      <p className="font-medium text-gray-800">
                        {new Date(gatepass.submittedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Waiting for Approval Notice */}
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Waiting for Approval</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Your request has been submitted to {gatepass.companyToVisit}. 
                          Please wait for their approval. You will be notified once approved.
                        </p>
                        <p className="text-xs text-amber-600 mt-2">
                          Note: Please keep this request number for reference.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // VISITOR PASS CONTENT (Direct Entry - like Vodafone)
                <div className="border-2 border-dashed border-teal-200 rounded-xl p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <img src="/logo.png" alt="Logo" className="w-10 h-10" />
                      <div>
                        <h3 className="font-bold text-gray-800">Reliable Group</h3>
                        <p className="text-xs text-gray-500">Visitor Pass</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Pass No.</p>
                      <p className="font-mono font-bold text-teal-600">{gatepass.gatepassNumber}</p>
                    </div>
                  </div>

                  {/* Photo & Details */}
                  <div className="flex gap-4 mb-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {gatepass.photo && gatepass.photo !== 'no-photo' ? (
                        <img src={gatepass.photo} alt="Visitor" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-800">{gatepass.visitorName}</h4>
                      <p className="text-sm text-gray-600">{gatepass.phone}</p>
                      <div className="mt-2 inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium">
                        <BadgeCheck className="w-3 h-3" />
                        CHECKED IN
                      </div>
                    </div>
                  </div>

                  {/* Visit Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Visiting</p>
                      <p className="font-medium text-gray-800">{gatepass.companyToVisit}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Meeting</p>
                      <p className="font-medium text-gray-800">{gatepass.personToMeet || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Purpose</p>
                      <p className="font-medium text-gray-800">{gatepass.purpose}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Check-in Time</p>
                      <p className="font-medium text-gray-800">
                        {new Date(gatepass.checkInTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Valid Until */}
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-xs text-amber-700">Valid Until</p>
                      <p className="font-medium text-amber-800">
                        {new Date(gatepass.validUntil).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => navigate('/vms')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                >
                  Print / Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default VisitorRegister
