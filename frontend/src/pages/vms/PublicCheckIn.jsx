// Public QR Check-in Form - Mobile Friendly
// This page is accessed when visitor scans company QR code
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { publicCheckInApi } from '../../services/vmsApi'
import { 
  Building2, User, Phone, Mail, Briefcase, Car, Package,
  Camera, Upload, AlertCircle, CheckCircle, Loader2, 
  Shield, ArrowRight, Info, Clock, CreditCard, X
} from 'lucide-react'

const PublicCheckIn = () => {
  const { companyCode } = useParams()
  const navigate = useNavigate()
  const photoInputRef = useRef(null)
  const idInputRef = useRef(null)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [company, setCompany] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(1) // 1: Personal, 2: Visit Details, 3: Documents
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState(null) // 'photo' or 'id'
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    visitorCompany: '',
    designation: '',
    idProofType: 'AADHAAR',
    idProofNumber: '',
    idProofImage: null,
    photo: null,
    purpose: '',
    purposeDetails: '',
    hostName: '',
    hostDepartment: '',
    hostPhone: '',
    hostEmail: '',
    hasVehicle: false,
    vehicleNumber: '',
    vehicleType: '',
    itemsCarried: [],
    agreeTerms: false,
  })
  
  const [errors, setErrors] = useState({})
  
  // Purpose options
  const purposeOptions = [
    { value: 'MEETING', label: 'Meeting' },
    { value: 'INTERVIEW', label: 'Interview' },
    { value: 'DELIVERY', label: 'Delivery' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'CONTRACTOR', label: 'Contractor Work' },
    { value: 'VENDOR', label: 'Vendor Visit' },
    { value: 'PERSONAL', label: 'Personal Visit' },
    { value: 'OTHER', label: 'Other' },
  ]
  
  // ID Proof options
  const idProofOptions = [
    { value: 'AADHAAR', label: 'Aadhaar Card' },
    { value: 'DRIVING_LICENSE', label: 'Driving License' },
  ]
  
  // Fetch company info
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await publicCheckInApi.getCompanyByCode(companyCode)
        setCompany(response.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch company:', err)
        setError(err.response?.data?.message || 'Invalid or inactive company code')
      } finally {
        setLoading(false)
      }
    }
    
    if (companyCode) {
      fetchCompany()
    }
  }, [companyCode])
  
  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }
  
  // Handle file upload (photo or ID)
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, [type]: 'Please select an image file' }))
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [type]: 'Image size should be less than 5MB' }))
      return
    }
    
    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        [type]: reader.result
      }))
      setErrors(prev => ({ ...prev, [type]: null }))
    }
    reader.readAsDataURL(file)
  }
  
  // Handle camera capture
  const handleCameraCapture = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: cameraMode === 'photo' ? 'user' : 'environment' } 
    })
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setFormData(prev => ({
      ...prev,
      [cameraMode === 'photo' ? 'photo' : 'idProofImage']: dataUrl
    }))
    
    stream.getTracks().forEach(track => track.stop())
    setShowCamera(false)
    setCameraMode(null)
  }
  
  // Validate step
  const validateStep = (stepNumber) => {
    const newErrors = {}
    
    if (stepNumber === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
      else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ''))) {
        newErrors.phone = 'Please enter a valid 10-digit phone number'
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    }
    
    if (stepNumber === 2) {
      if (!formData.purpose) newErrors.purpose = 'Please select purpose of visit'
      if (!formData.hostName.trim()) newErrors.hostName = 'Host name is required'
      if (formData.hasVehicle && !formData.vehicleNumber.trim()) {
        newErrors.vehicleNumber = 'Vehicle number is required'
      }
    }
    
    if (stepNumber === 3) {
      if (company?.requirePhoto && !formData.photo) {
        newErrors.photo = 'Photo is required'
      }
      if (company?.requireIdProof) {
        if (!formData.idProofNumber.trim()) {
          newErrors.idProofNumber = 'ID proof number is required'
        }
        if (!formData.idProofImage) {
          newErrors.idProofImage = 'ID proof image is required'
        }
      }
      if (!formData.agreeTerms) {
        newErrors.agreeTerms = 'You must agree to the terms'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // Handle next step
  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1)
    }
  }
  
  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep(3)) return
    
    setSubmitting(true)
    try {
      const response = await publicCheckInApi.submitRequest({
        companyCode,
        ...formData
      })
      
      // Navigate to confirmation page
      navigate(`/vms/checkin/confirmation/${response.data.requestNumber}`, {
        state: {
          requestNumber: response.data.requestNumber,
          status: response.data.status,
          message: response.data.message,
          companyName: response.data.companyName,
          expiresAt: response.data.expiresAt,
          visitorName: `${formData.firstName} ${formData.lastName}`,
        }
      })
    } catch (err) {
      console.error('Submit error:', err)
      setError(err.response?.data?.message || 'Failed to submit request. Please try again.')
      setSubmitting(false)
    }
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error && !company) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-800">Invalid Link</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <p className="mt-4 text-sm text-gray-500">
            Please scan a valid company QR code or contact the reception.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div 
        className="py-6 px-4 text-center text-white"
        style={{ backgroundColor: company?.primaryColor || '#2563eb' }}
      >
        {company?.logo ? (
          <img src={company.logo} alt={company.name} className="h-12 mx-auto mb-2" />
        ) : (
          <Building2 className="w-10 h-10 mx-auto mb-2" />
        )}
        <h1 className="text-xl font-bold">
          {company?.displayName || company?.name}
        </h1>
        <p className="text-sm opacity-90">Visitor Check-In</p>
      </div>
      
      {/* Welcome Message */}
      {company?.welcomeMessage && step === 1 && (
        <div className="mx-4 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">{company.welcomeMessage}</p>
        </div>
      )}
      
      {/* Progress Steps */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 sm:w-24 h-1 mx-1 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between max-w-md mx-auto mt-2 text-xs text-gray-500">
          <span>Personal</span>
          <span>Visit Details</span>
          <span>Documents</span>
        </div>
      </div>
      
      {/* Error Banner */}
      {error && company && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 pb-8 max-w-md mx-auto">
        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Personal Information
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="9876543210"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Company / Organization
                </label>
                <input
                  type="text"
                  name="visitorCompany"
                  value={formData.visitorCompany}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your designation"
                />
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Step 2: Visit Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Visit Details
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Visit *
                </label>
                <select
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.purpose ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select purpose</option>
                  {purposeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.purpose && (
                  <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>
                )}
              </div>
              
              {formData.purpose === 'OTHER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Please specify
                  </label>
                  <input
                    type="text"
                    name="purposeDetails"
                    value={formData.purposeDetails}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe purpose"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Whom to Meet (Host Name) *
                </label>
                <input
                  type="text"
                  name="hostName"
                  value={formData.hostName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.hostName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Person you're visiting"
                />
                {errors.hostName && (
                  <p className="text-xs text-red-500 mt-1">{errors.hostName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                {company?.departments?.length > 0 ? (
                  <select
                    name="hostDepartment"
                    value={formData.hostDepartment}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select department</option>
                    {company.departments.map(dept => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name} {dept.floor ? `(Floor ${dept.floor})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="hostDepartment"
                    value={formData.hostDepartment}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Department name"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host Phone (Optional)
                </label>
                <input
                  type="tel"
                  name="hostPhone"
                  value={formData.hostPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Host's phone number"
                />
              </div>
            </div>
            
            {/* Vehicle Information */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                Vehicle Information
              </h2>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="hasVehicle"
                  checked={formData.hasVehicle}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">I have a vehicle</span>
              </label>
              
              {formData.hasVehicle && (
                <div className="space-y-3 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.vehicleNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="MH 01 AB 1234"
                    />
                    {errors.vehicleNumber && (
                      <p className="text-xs text-red-500 mt-1">{errors.vehicleNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type
                    </label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="CAR">Car</option>
                      <option value="BIKE">Bike</option>
                      <option value="SCOOTER">Scooter</option>
                      <option value="AUTO">Auto</option>
                      <option value="TRUCK">Truck</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Documents & Submit */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Photo Upload */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Your Photo {company?.requirePhoto && <span className="text-red-500">*</span>}
              </h2>
              
              {formData.photo ? (
                <div className="text-center">
                  <img 
                    src={formData.photo} 
                    alt="Visitor" 
                    className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, photo: null }))}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove & retake
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-600">Upload Photo</span>
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => handleFileUpload(e, 'photo')}
                    className="hidden"
                  />
                </div>
              )}
              {errors.photo && (
                <p className="text-xs text-red-500">{errors.photo}</p>
              )}
            </div>
            
            {/* ID Proof Upload */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                ID Proof {company?.requireIdProof && <span className="text-red-500">*</span>}
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Type
                </label>
                <select
                  name="idProofType"
                  value={formData.idProofType}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {idProofOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number {company?.requireIdProof && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  name="idProofNumber"
                  value={formData.idProofNumber}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.idProofNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter ID number"
                />
                {errors.idProofNumber && (
                  <p className="text-xs text-red-500 mt-1">{errors.idProofNumber}</p>
                )}
              </div>
              
              {formData.idProofImage ? (
                <div className="text-center">
                  <img 
                    src={formData.idProofImage} 
                    alt="ID Proof" 
                    className="w-full max-w-xs mx-auto rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, idProofImage: null }))}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove & retake
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => idInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-600">Upload ID Proof Image</span>
                  </button>
                  <input
                    ref={idInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileUpload(e, 'idProofImage')}
                    className="hidden"
                  />
                </div>
              )}
              {errors.idProofImage && (
                <p className="text-xs text-red-500">{errors.idProofImage}</p>
              )}
            </div>
            
            {/* Terms & Conditions */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className={`mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                    errors.agreeTerms ? 'border-red-500' : ''
                  }`}
                />
                <span className="text-sm text-gray-600">
                  I agree to the visitor terms and conditions. I understand that my visit will be recorded and my information may be used for security purposes.
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="text-xs text-red-500">{errors.agreeTerms}</p>
              )}
              
              {company?.termsAndConditions && (
                <details className="text-sm text-gray-500">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                    View full terms
                  </summary>
                  <p className="mt-2 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {company.termsAndConditions}
                  </p>
                </details>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
      
      {/* Footer */}
      <div className="text-center py-4 text-xs text-gray-400">
        Powered by VMS - Visitor Management System
      </div>
    </div>
  )
}

export default PublicCheckIn
