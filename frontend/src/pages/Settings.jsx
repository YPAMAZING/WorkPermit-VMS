import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  User,
  Mail,
  Building,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Save,
  Camera,
  Phone,
  Edit3,
  X,
  Check,
  Loader2,
  KeyRound,
  Send,
  RefreshCw,
} from 'lucide-react'

const Settings = () => {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const fileInputRef = useRef(null)
  
  // Password change states
  const [passwordStep, setPasswordStep] = useState('request') // 'request', 'verify'
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [maskedInfo, setMaskedInfo] = useState({ email: '', phone: '' })
  const [devOtp, setDevOtp] = useState('')
  const otpInputRefs = useRef([])
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    department: user?.department || '',
    profilePicture: user?.profilePicture || '',
  })
  
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  })
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const getRoleBadge = (role) => {
    const badges = {
      ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Administrator' },
      FIREMAN: { bg: 'bg-green-100', text: 'text-green-700', label: 'Fireman' },
      SAFETY_OFFICER: { bg: 'bg-green-100', text: 'text-green-700', label: 'Fireman' }, // Backward compatibility
      REQUESTOR: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Requestor' },
      SITE_ENGINEER: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Site Engineer' },
    }
    return badges[role] || badges.REQUESTOR
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await authAPI.updateProfile(profileData)
      toast.success('Profile updated successfully')
      updateUser(response.data.user)
      setEditMode(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB')
      return
    }

    setUploadingPicture(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result
        setProfileData(prev => ({ ...prev, profilePicture: base64 }))
        
        // Auto-save profile picture
        try {
          const response = await authAPI.updateProfile({ profilePicture: base64 })
          toast.success('Profile picture updated')
          updateUser(response.data.user)
        } catch (error) {
          toast.error('Error uploading picture')
        }
        setUploadingPicture(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error('Error processing image')
      setUploadingPicture(false)
    }
  }

  // Send OTP for password change
  const handleSendOTP = async () => {
    setOtpSending(true)
    
    try {
      const response = await authAPI.sendPasswordOTP()
      setMaskedInfo({
        email: response.data.email || '',
        phone: response.data.phone || '',
      })
      setPasswordStep('verify')
      setResendTimer(60) // 60 seconds cooldown
      toast.success('OTP sent to your email and phone')
      
      // Show OTP in development mode
      if (response.data.otp) {
        setDevOtp(response.data.otp)
        toast.success(`DEV MODE - OTP: ${response.data.otp}`, { duration: 10000 })
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending OTP')
    } finally {
      setOtpSending(false)
    }
  }

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedValue = value.slice(0, 6).split('')
      const newOtp = [...otp]
      pastedValue.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char
        }
      })
      setOtp(newOtp)
      
      // Focus last filled input or last input
      const focusIndex = Math.min(index + pastedValue.length, 5)
      otpInputRefs.current[focusIndex]?.focus()
    } else {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)
      
      // Auto-focus next input
      if (value && index < 5) {
        otpInputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  // Change password with OTP
  const handlePasswordChange = async (e) => {
    e.preventDefault()

    const otpValue = otp.join('')
    if (otpValue.length !== 6) {
      toast.error('Please enter the 6-digit OTP')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)
    try {
      await authAPI.changePassword({
        otp: otpValue,
        newPassword: passwordData.newPassword,
      })
      toast.success('Password changed successfully')
      
      // Reset all states
      setPasswordStep('request')
      setPasswordData({ newPassword: '', confirmPassword: '' })
      setOtp(['', '', '', '', '', ''])
      setDevOtp('')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error changing password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const cancelPasswordChange = () => {
    setPasswordStep('request')
    setPasswordData({ newPassword: '', confirmPassword: '' })
    setOtp(['', '', '', '', '', ''])
    setDevOtp('')
  }

  const cancelEdit = () => {
    setProfileData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      department: user?.department || '',
      profilePicture: user?.profilePicture || '',
    })
    setEditMode(false)
  }

  const roleBadge = getRoleBadge(user?.role)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Information */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 text-sm text-[#1e3a6e] hover:text-[#162d57] font-medium"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleProfileUpdate}>
            <div className="flex items-start gap-6">
              {/* Profile Picture */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  {profileData.profilePicture ? (
                    <img 
                      src={profileData.profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePictureChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer"
                >
                  {uploadingPicture ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>

              {/* Profile Fields */}
              <div className="flex-1 space-y-4">
                {editMode ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] outline-none"
                          placeholder="+91 XXXXX XXXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={profileData.department}
                          onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] outline-none"
                          placeholder="e.g., Engineering"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1e3a6e] text-white rounded-lg hover:bg-[#162d57] transition-colors disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium text-gray-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email Address</p>
                        <p className="font-medium text-gray-900">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium text-gray-900">
                          {user?.phone || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Role</p>
                        <span className={`inline-flex items-center px-2.5 py-1 text-sm font-medium rounded-full ${roleBadge.bg} ${roleBadge.text}`}>
                          {roleBadge.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Department</p>
                        <p className="font-medium text-gray-900">
                          {user?.department || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password with OTP */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>
          {passwordStep === 'verify' && (
            <button
              onClick={cancelPasswordChange}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
        <div className="card-body">
          {passwordStep === 'request' ? (
            // Step 1: Request OTP
            <div className="max-w-md">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">OTP Verification Required</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      For security, we'll send a one-time password to your registered email and phone number before you can change your password.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>OTP will be sent to your email: <strong>{user?.email}</strong></span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>OTP will also be sent to your phone: <strong>{user?.phone}</strong></span>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleSendOTP}
                disabled={otpSending}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#1e3a6e] text-white rounded-lg hover:bg-[#162d57] transition-colors disabled:opacity-50"
              >
                {otpSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send OTP
                  </>
                )}
              </button>
            </div>
          ) : (
            // Step 2: Verify OTP and change password
            <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
              {/* OTP Info */}
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900">OTP Sent Successfully</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Check your email {maskedInfo.email && `(${maskedInfo.email})`}
                      {maskedInfo.phone && ` and phone (${maskedInfo.phone})`} for the 6-digit OTP.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Dev OTP display */}
              {devOtp && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>DEV MODE:</strong> Your OTP is <span className="font-mono text-lg">{devOtp}</span>
                  </p>
                </div>
              )}
              
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enter 6-digit OTP
                </label>
                <div className="flex gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] outline-none"
                    />
                  ))}
                </div>
                
                {/* Resend OTP */}
                <div className="mt-3 flex items-center gap-2">
                  {resendTimer > 0 ? (
                    <span className="text-sm text-gray-500">
                      Resend OTP in {resendTimer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={otpSending}
                      className="text-sm text-[#1e3a6e] hover:text-[#162d57] font-medium flex items-center gap-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
              
              {/* New Password */}
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input pr-11"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {/* Confirm Password */}
              <div>
                <label className="label">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input pr-11"
                    required
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button type="submit" disabled={passwordLoading} className="btn btn-primary w-full">
                {passwordLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Changing Password...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    Change Password
                  </span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
        </div>
        <div className="card-body">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Application</p>
              <p className="font-medium text-gray-900">Reliable Group MEP - Work Permit System</p>
              <p className="text-xs text-gray-400 mt-1">© YP SECURITY SERVICES PVT LTD</p>
            </div>
            <div>
              <p className="text-gray-500">Version</p>
              <p className="font-medium text-gray-900">1.0.0</p>
            </div>
            <div>
              <p className="text-gray-500">Environment</p>
              <p className="font-medium text-gray-900">Production</p>
            </div>
            <div>
              <p className="text-gray-500">Support</p>
              <a href="mailto:support@ypsecurity.com" className="font-medium text-primary-600 hover:text-primary-700">
                support@ypsecurity.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
