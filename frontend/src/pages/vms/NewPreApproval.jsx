import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { preapprovedApi, companySettingsApi } from '../../services/vmsApi'
import {
  UserCheck,
  ArrowLeft,
  Save,
  User,
  Phone,
  Mail,
  Building,
  Calendar,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react'

const NewPreApproval = () => {
  const navigate = useNavigate()
  const { user } = useVMSAuth()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState([])
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    visitorName: '',
    phone: '',
    email: '',
    companyFrom: '',
    companyId: '',
    purpose: 'MEETING',
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    remarks: '',
  })

  const purposes = [
    { value: 'MEETING', label: 'Meeting' },
    { value: 'INTERVIEW', label: 'Interview' },
    { value: 'DELIVERY', label: 'Delivery' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'CONTRACTOR', label: 'Contractor Work' },
    { value: 'EVENT', label: 'Event' },
    { value: 'PERSONAL', label: 'Personal Visit' },
    { value: 'OTHER', label: 'Other' },
  ]

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const response = await companySettingsApi.getAll()
      setCompanies(response.data.companies || response.data || [])
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.visitorName.trim()) {
      setError('Visitor name is required')
      return false
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required')
      return false
    }
    if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number')
      return false
    }
    if (!formData.companyId) {
      setError('Please select a company')
      return false
    }
    if (!formData.purpose) {
      setError('Please select a purpose')
      return false
    }
    if (new Date(formData.validFrom) >= new Date(formData.validUntil)) {
      setError('Valid until must be after valid from')
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
      await preapprovedApi.create({
        ...formData,
        phone: formData.phone.replace(/\D/g, ''),
        createdBy: user?.id,
      })
      navigate('/vms/admin/preapproved', { 
        state: { message: 'Pre-approval created successfully!' } 
      })
    } catch (error) {
      console.error('Failed to create pre-approval:', error)
      setError(error.response?.data?.message || 'Failed to create pre-approval')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/vms/admin/preapproved')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">New Pre-approval</h1>
          <p className="text-gray-500 mt-1">Create a pre-approved visitor pass</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Visitor Information */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={20} className="text-teal-600" />
            Visitor Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visitor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="visitorName"
                value={formData.visitorName}
                onChange={handleChange}
                placeholder="Enter visitor's full name"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="visitor@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visitor's Company (Optional)
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="companyFrom"
                  value={formData.companyFrom}
                  onChange={handleChange}
                  placeholder="Company they represent"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visit Details */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-teal-600" />
            Visit Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company to Visit <span className="text-red-500">*</span>
              </label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select a company</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.displayName || company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose of Visit <span className="text-red-500">*</span>
              </label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {purposes.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Validity Period */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-teal-600" />
            Validity Period
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid From <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="datetime-local"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="datetime-local"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks (Optional)
          </label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={3}
            placeholder="Any additional notes about this pre-approval..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/vms/admin/preapproved')}
            className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Save size={18} />
                Create Pre-approval
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewPreApproval
