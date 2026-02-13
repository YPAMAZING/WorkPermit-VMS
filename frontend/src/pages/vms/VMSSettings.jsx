import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { companySettingsApi } from '../../services/vmsApi'
import {
  Settings,
  Building,
  Bell,
  Shield,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Edit,
  QrCode,
} from 'lucide-react'

const VMSSettings = () => {
  const { isAdmin, user } = useVMSAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [newCompany, setNewCompany] = useState({
    name: '',
    displayName: '',
    contactEmail: '',
    contactPhone: '',
    requireGatepassApproval: true,
  })

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const response = await companySettingsApi.getApprovalSettings()
      setCompanies(response.data.companies || response.data || [])
    } catch (error) {
      console.error('Failed to fetch companies:', error)
      setMessage({ type: 'error', text: 'Failed to load company settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleApproval = async (companyId, currentValue) => {
    try {
      await companySettingsApi.toggleApproval(companyId, !currentValue)
      setCompanies(prev =>
        prev.map(c =>
          c.id === companyId ? { ...c, requireGatepassApproval: !currentValue } : c
        )
      )
      setMessage({ type: 'success', text: 'Approval setting updated successfully' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to toggle approval:', error)
      setMessage({ type: 'error', text: 'Failed to update approval setting' })
    }
  }

  const handleAddCompany = async (e) => {
    e.preventDefault()
    if (!newCompany.name.trim() || !newCompany.displayName.trim()) {
      setMessage({ type: 'error', text: 'Company name and display name are required' })
      return
    }

    setSaving(true)
    try {
      await companySettingsApi.create(newCompany)
      setMessage({ type: 'success', text: 'Company added successfully' })
      setShowAddCompany(false)
      setNewCompany({
        name: '',
        displayName: '',
        contactEmail: '',
        contactPhone: '',
        requireGatepassApproval: true,
      })
      fetchCompanies()
    } catch (error) {
      console.error('Failed to add company:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to add company' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return
    }

    try {
      await companySettingsApi.delete(companyId)
      setMessage({ type: 'success', text: 'Company deleted successfully' })
      fetchCompanies()
    } catch (error) {
      console.error('Failed to delete company:', error)
      setMessage({ type: 'error', text: 'Failed to delete company' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">VMS Settings</h1>
          <p className="text-gray-500 mt-1">Configure company settings and approval workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCompanies}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAddCompany(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus size={18} />
              Add Company
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      {/* Add Company Modal */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Company</h2>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
                  placeholder="e.g., ACME_CORP"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-xs text-gray-500 mt-1">Used for system identification</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCompany.displayName}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={newCompany.contactEmail}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="admin@company.com"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={newCompany.contactPhone}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requireApproval"
                  checked={newCompany.requireGatepassApproval}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, requireGatepassApproval: e.target.checked }))}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="requireApproval" className="text-sm text-gray-700">
                  Require approval for visitors
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddCompany(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Add Company
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Approval Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Shield size={20} className="text-teal-600" />
            Company Approval Settings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure which companies require visitor approval before entry
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Building size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No companies configured</p>
            <p className="text-sm text-gray-400 mt-1">Add a company to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {companies.map((company) => (
              <div key={company.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Building size={24} className="text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{company.displayName || company.name}</h3>
                      <p className="text-sm text-gray-500">{company.name}</p>
                      {company.contactEmail && (
                        <p className="text-xs text-gray-400">{company.contactEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Approval Toggle */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Require Approval</span>
                      <button
                        onClick={() => handleToggleApproval(company.id, company.requireGatepassApproval)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          company.requireGatepassApproval ? 'bg-teal-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            company.requireGatepassApproval ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      company.requireGatepassApproval
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {company.requireGatepassApproval ? 'Approval Required' : 'Auto-Approve'}
                    </span>

                    {/* Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Company"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                <div className="mt-3 ml-16 text-sm text-gray-500">
                  {company.requireGatepassApproval ? (
                    <p className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-500" />
                      Visitors must wait for company approval before entry
                    </p>
                  ) : (
                    <p className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      Visitors are automatically approved upon registration
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <QrCode size={20} className="text-blue-600" />
          How Visitor Registration Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
              <Shield size={18} />
              Approval Required
            </h3>
            <ol className="text-sm text-orange-700 space-y-2 list-decimal list-inside">
              <li>Visitor scans QR code at gate</li>
              <li>Fills registration form & selects company</li>
              <li>Request sent to company dashboard</li>
              <li>Company approves or rejects</li>
              <li>Visitor notified of decision</li>
              <li>If approved, visitor can enter</li>
            </ol>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle size={18} />
              Auto-Approve
            </h3>
            <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside">
              <li>Visitor scans QR code at gate</li>
              <li>Fills registration form & selects company</li>
              <li>Instantly approved</li>
              <li>Gatepass generated automatically</li>
              <li>Visitor can enter immediately</li>
              <li>Reception notified of entry</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Bell size={20} className="text-purple-600" />
          Notification Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Email Notifications</p>
              <p className="text-sm text-gray-500">Send email when visitor requests approval</p>
            </div>
            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">Coming Soon</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">SMS Notifications</p>
              <p className="text-sm text-gray-500">Send SMS to visitor when approved/rejected</p>
            </div>
            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">Coming Soon</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">WhatsApp Notifications</p>
              <p className="text-sm text-gray-500">Send WhatsApp message to visitor</p>
            </div>
            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VMSSettings
