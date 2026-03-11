import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { preapprovedApi } from '../../services/vmsApi'
import useCompanyList from '../../hooks/useCompanyList'
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
  Shield,
  CheckCircle,
  Car,
} from 'lucide-react'

const NewPreApproval = () => {
  const navigate = useNavigate()
  const { id } = useParams()  // For edit mode
  const isEditMode = Boolean(id)
  const { user, isAdmin } = useVMSAuth()
  const [loading, setLoading] = useState(false)
  const [loadingEntry, setLoadingEntry] = useState(false)
  const [error, setError] = useState('')
  
  // Use the reusable hook for company list
  const { 
    companies, 
    loading: companiesLoading, 
    error: companiesError,
    getCompanyById 
  } = useCompanyList({ withApprovalStatus: true })
  
  // Check if user is a company user (has companyId and is not admin)
  const isCompanyUser = user?.companyId && !isAdmin
  
  const [formData, setFormData] = useState({
    visitorName: '',
    phone: '',
    email: '',
    companyFrom: '',
    // Auto-set companyId for company users
    companyId: user?.companyId || '',
    personToMeet: '',
    purpose: 'MEETING',
    vehicleNumber: '',
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    remarks: '',
  })

  const purposes = [
    { value: 'MEETING', label: 'Meeting' },
    { value: 'INTERVIEW', label: 'Interview' },
    { value: 'VENDOR_CLIENT', label: 'Vendor/Client Visit' },
    { value: 'OTHER', label: 'Other' },
  ]

  // Get selected company info
  const selectedCompany = formData.companyId ? getCompanyById(formData.companyId) : null

  // Load existing entry for edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchEntry = async () => {
        try {
          setLoadingEntry(true)
          const response = await preapprovedApi.getById(id)
          const entry = response.data
          setFormData({
            visitorName: entry.visitorName || '',
            phone: entry.phone || '',
            email: entry.email || '',
            companyFrom: entry.companyFrom || '',
            companyId: entry.companyId || user?.companyId || '',
            personToMeet: entry.personToMeet || '',
            purpose: entry.purpose || 'MEETING',
            vehicleNumber: entry.vehicleNumber || '',
            validFrom: entry.validFrom ? new Date(entry.validFrom).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
            validUntil: entry.validUntil ? new Date(entry.validUntil).toISOString().slice(0, 16) : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
            remarks: entry.remarks || '',
          })
        } catch (error) {
          console.error('Failed to load entry:', error)
          setError('Failed to load pre-approval for editing')
        } finally {
          setLoadingEntry(false)
        }
      }
      fetchEntry()
    }
  }, [id, isEditMode])

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
      if (isEditMode) {
        await preapprovedApi.update(id, {
          ...formData,
          phone: formData.phone.replace(/\D/g, ''),
        })
        navigate('/vms/admin/preapproved', { 
          state: { message: 'Pre-approval updated successfully!' } 
        })
      } else {
        await preapprovedApi.create({
          ...formData,
          phone: formData.phone.replace(/\D/g, ''),
          createdBy: user?.id,
        })
        navigate('/vms/admin/preapproved', { 
          state: { message: 'Pre-approval created successfully!' } 
        })
      }
    } catch (error) {
      console.error('Failed to save pre-approval:', error)
      setError(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} pre-approval`)
    } finally {
      setLoading(false)
    }
  }

  if (loadingEntry) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Pre-approval' : 'New Pre-approval'}</h1>
          <p className="text-gray-500 mt-1">{isEditMode ? 'Update pre-approved visitor pass' : 'Create a pre-approved visitor pass'}</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Number (Optional)
              </label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  placeholder="e.g., KA01AB1234"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
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
              {isCompanyUser ? (
                // Company users can only create pre-approvals for their own company
                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  {user?.companyName || getCompanyById(user?.companyId)?.displayName || 'Your Company'}
                </div>
              ) : (
                // Admin users can select any company
                <select
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  disabled={companiesLoading}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                >
                  {companiesLoading ? (
                    <option value="">Loading companies...</option>
                  ) : companiesError ? (
                    <option value="">Error loading companies</option>
                  ) : (
                    <>
                      <option value="">Select a company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.displayName || company.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              )}
              {/* Show approval status hint */}
              {selectedCompany && (
                <div className={`mt-2 text-sm flex items-center gap-2 ${
                  selectedCompany.requireApproval ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {selectedCompany.requireApproval ? (
                    <>
                      <Shield size={14} />
                      This company requires approval for visitors
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Visitors to this company are auto-approved
                    </>
                  )}
                </div>
              )}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Person to Meet (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="personToMeet"
                  value={formData.personToMeet}
                  onChange={handleChange}
                  placeholder="Name of person to meet"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
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

        {/* Data Privacy Consent */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-teal-600" />
            Declaration & Data Privacy Consent
          </h2>
          <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200 leading-relaxed mb-3">
            <p>
              I hereby confirm that the information submitted through this system is true and provided with proper authorization. I understand that the data collected will be used solely for visitor management, safety compliance, and access control purposes. The submitted information will be handled confidentially by the authorized organization and its designated system provider. I acknowledge that the data may be accessed only by authorized personnel or where required by law and will be securely retained for operational purposes and <strong>automatically deleted within 90 days (three months)</strong> unless required for statutory compliance. By proceeding, I voluntarily consent to the collection, processing, and temporary storage of this information in accordance with applicable laws, including the <strong>Digital Personal Data Protection Act, 2023 (India)</strong>.
            </p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-teal-300 bg-white transition-all">
            <input
              type="checkbox"
              checked={true}
              readOnly
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">
              ✔ I/We have read, understood, and agree to the above declaration and consent to the processing of the submitted information.
            </span>
          </label>
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
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save size={18} />
                {isEditMode ? 'Update Pre-approval' : 'Create Pre-approval'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewPreApproval
