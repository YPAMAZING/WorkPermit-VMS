import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { blacklistApi, visitorsApi } from '../../services/vmsApi'
import {
  ShieldAlert,
  ArrowLeft,
  Save,
  User,
  Phone,
  FileText,
  AlertCircle,
  Search,
  UserX,
} from 'lucide-react'

const AddToBlacklist = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useVMSAuth()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [foundVisitor, setFoundVisitor] = useState(null)
  
  const [formData, setFormData] = useState({
    visitorName: '',
    phone: '',
    idType: '',
    idNumber: '',
    reason: 'MISCONDUCT',
    description: '',
    isPermanent: true,
    expiresAt: '',
  })

  const reasons = [
    { value: 'MISCONDUCT', label: 'Misconduct' },
    { value: 'THEFT', label: 'Theft' },
    { value: 'VIOLENCE', label: 'Violence / Threats' },
    { value: 'FRAUD', label: 'Fraud' },
    { value: 'TRESPASSING', label: 'Trespassing' },
    { value: 'HARASSMENT', label: 'Harassment' },
    { value: 'POLICY_VIOLATION', label: 'Policy Violation' },
    { value: 'SECURITY_THREAT', label: 'Security Threat' },
    { value: 'OTHER', label: 'Other' },
  ]

  const idTypes = [
    { value: 'AADHAR', label: 'Aadhaar Card' },
    { value: 'DRIVING_LICENSE', label: 'Driving License' },
  ]

  // Pre-fill from URL params (when coming from visitor page)
  useEffect(() => {
    const visitorId = searchParams.get('visitorId')
    const phone = searchParams.get('phone')
    const name = searchParams.get('name')

    if (phone) {
      setFormData(prev => ({ ...prev, phone, visitorName: name || '' }))
    }
    if (visitorId) {
      fetchVisitor(visitorId)
    }
  }, [searchParams])

  const fetchVisitor = async (visitorId) => {
    try {
      const response = await visitorsApi.getById(visitorId)
      const visitor = response.data
      setFoundVisitor(visitor)
      setFormData(prev => ({
        ...prev,
        visitorName: visitor.visitorName || `${visitor.firstName} ${visitor.lastName}`,
        phone: visitor.phone,
        idType: visitor.idProofType || '',
        idNumber: visitor.idProofNumber || '',
      }))
    } catch (error) {
      console.error('Failed to fetch visitor:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchPhone || searchPhone.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    setSearchLoading(true)
    setError('')
    
    try {
      // Check if already blacklisted
      const checkResponse = await blacklistApi.check({ phone: searchPhone })
      if (checkResponse.data.isBlacklisted) {
        setError('This person is already blacklisted')
        setSearchLoading(false)
        return
      }

      // Search for visitor
      const response = await visitorsApi.searchByPhone(searchPhone)
      if (response.data.visitor) {
        const visitor = response.data.visitor
        setFoundVisitor(visitor)
        setFormData(prev => ({
          ...prev,
          visitorName: visitor.visitorName || `${visitor.firstName} ${visitor.lastName}`,
          phone: visitor.phone,
          idType: visitor.idProofType || '',
          idNumber: visitor.idProofNumber || '',
        }))
      } else {
        setFoundVisitor(null)
        setFormData(prev => ({ ...prev, phone: searchPhone }))
      }
    } catch (error) {
      console.error('Search failed:', error)
      setFormData(prev => ({ ...prev, phone: searchPhone }))
    } finally {
      setSearchLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.visitorName.trim()) {
      setError('Name is required')
      return false
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required')
      return false
    }
    if (!formData.reason) {
      setError('Please select a reason')
      return false
    }
    if (!formData.description.trim()) {
      setError('Please provide a description of the incident')
      return false
    }
    if (!formData.isPermanent && !formData.expiresAt) {
      setError('Please set an expiration date for temporary blacklist')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      await blacklistApi.add({
        ...formData,
        phone: formData.phone.replace(/\D/g, ''),
        addedBy: user?.id,
        visitorId: foundVisitor?.id,
      })
      navigate('/vms/admin/blacklist', { 
        state: { message: 'Added to blacklist successfully!' } 
      })
    } catch (error) {
      console.error('Failed to add to blacklist:', error)
      setError(error.response?.data?.message || 'Failed to add to blacklist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/vms/admin/blacklist')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Add to Blacklist</h1>
          <p className="text-gray-500 mt-1">Block a visitor from entering the premises</p>
        </div>
      </div>

      {/* Search Existing Visitor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Search size={20} className="text-teal-600" />
          Search Existing Visitor
        </h2>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="tel"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Enter phone number to search"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchLoading}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {foundVisitor && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <User size={24} className="text-teal-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">{foundVisitor.visitorName}</p>
                <p className="text-sm text-gray-500">{foundVisitor.phone}</p>
                {foundVisitor.companyFrom && (
                  <p className="text-sm text-gray-500">{foundVisitor.companyFrom}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Person Information */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <UserX size={20} className="text-red-600" />
            Person Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="visitorName"
                value={formData.visitorName}
                onChange={handleChange}
                placeholder="Enter full name"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit phone number"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Type (Optional)
              </label>
              <select
                name="idType"
                value={formData.idType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select ID type</option>
                {idTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Number (Optional)
              </label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                placeholder="Enter ID number"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-600" />
            Blacklist Reason
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason Category <span className="text-red-500">*</span>
              </label>
              <select
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {reasons.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPermanent"
                  checked={formData.isPermanent}
                  onChange={handleChange}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Permanent ban</span>
              </label>
              {!formData.isPermanent && (
                <input
                  type="date"
                  name="expiresAt"
                  value={formData.expiresAt}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Provide detailed description of the incident or reason for blacklisting..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Warning */}
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span>
              <strong>Warning:</strong> Adding someone to the blacklist will prevent them from 
              registering as a visitor or being pre-approved. Make sure this action is justified 
              and documented properly.
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/vms/admin/blacklist')}
            className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Adding...
              </>
            ) : (
              <>
                <ShieldAlert size={18} />
                Add to Blacklist
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddToBlacklist
