import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { companySettingsApi } from '../../services/vmsApi'
import {
  Settings,
  Building,
  Building2,
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
  Edit2,
  QrCode,
  Search,
  Users,
  FileText,
  Phone,
  Mail,
  X,
  Database,
} from 'lucide-react'

const VMSSettings = () => {
  const { isAdmin, user } = useVMSAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [companies, setCompanies] = useState([])
  const [filteredCompanies, setFilteredCompanies] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activeTab, setActiveTab] = useState('companies')

  const [newCompany, setNewCompany] = useState({
    name: '',
    displayName: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    requireApproval: false,
  })

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    // Filter companies based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setFilteredCompanies(
        companies.filter(
          c =>
            c.name?.toLowerCase().includes(query) ||
            c.displayName?.toLowerCase().includes(query) ||
            c.contactEmail?.toLowerCase().includes(query)
        )
      )
    } else {
      setFilteredCompanies(companies)
    }
  }, [searchQuery, companies])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const response = await companySettingsApi.getApprovalSettings()
      const companyList = response.data.companies || response.data || []
      setCompanies(companyList)
      setFilteredCompanies(companyList)
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
          c.id === companyId 
            ? { 
                ...c, 
                requireApproval: !currentValue,
                autoApproveVisitors: currentValue,
                approvalStatus: !currentValue ? 'Requires Approval' : 'Auto-Approve'
              } 
            : c
        )
      )
      setMessage({ 
        type: 'success', 
        text: !currentValue 
          ? 'Approval enabled - visitors will need approval before entry' 
          : 'Approval disabled - visitors will be auto-approved'
      })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to toggle approval:', error)
      setMessage({ type: 'error', text: 'Failed to update approval setting' })
    }
  }

  const handleAddCompany = async (e) => {
    e.preventDefault()
    if (!newCompany.name.trim() || !newCompany.displayName.trim()) {
      setMessage({ type: 'error', text: 'Company code and display name are required' })
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
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        requireApproval: false,
      })
      fetchCompanies()
    } catch (error) {
      console.error('Failed to add company:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to add company' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCompany = async (e) => {
    e.preventDefault()
    if (!editingCompany) return

    setSaving(true)
    try {
      await companySettingsApi.update(editingCompany.id, editingCompany)
      setMessage({ type: 'success', text: 'Company updated successfully' })
      setEditingCompany(null)
      fetchCompanies()
    } catch (error) {
      console.error('Failed to update company:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update company' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCompany = async (companyId, companyName) => {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await companySettingsApi.delete(companyId)
      setMessage({ type: 'success', text: 'Company deleted successfully' })
      fetchCompanies()
    } catch (error) {
      console.error('Failed to delete company:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete company. It may have existing visitors.' })
    }
  }

  const handleSeedDefaults = async () => {
    if (!window.confirm('This will add all predefined companies to the system. Continue?')) {
      return
    }

    setSeeding(true)
    try {
      const response = await companySettingsApi.seedDefaults()
      const { results } = response.data
      setMessage({ 
        type: 'success', 
        text: `Successfully added ${results.created} companies (${results.existing} already existed)` 
      })
      fetchCompanies()
    } catch (error) {
      console.error('Failed to seed companies:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to seed companies' })
    } finally {
      setSeeding(false)
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
          <h1 className="text-2xl font-bold text-gray-800">Admin Settings</h1>
          <p className="text-gray-500 mt-1">Manage companies and configure approval workflows</p>
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
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {seeding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <Database size={18} />
                  Load Default Companies
                </>
              )}
            </button>
          )}
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
          <button 
            onClick={() => setMessage({ type: '', text: '' })}
            className="ml-auto"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('companies')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'companies'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 size={18} className="inline mr-2" />
            Company Management ({companies.length})
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'workflow'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <QrCode size={18} className="inline mr-2" />
            How It Works
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'notifications'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bell size={18} className="inline mr-2" />
            Notifications
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'companies' && (
        <>
          {/* Search & Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search companies by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Approval Required: {companies.filter(c => c.requireApproval).length}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  Auto-Approve: {companies.filter(c => !c.requireApproval).length}
                </span>
              </div>
            </div>
          </div>

          {/* Company List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Shield size={20} className="text-teal-600" />
                Company Approval Settings
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Toggle approval requirement for each company. When enabled, visitors need approval before entry.
              </p>
            </div>

            {filteredCompanies.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Building size={48} className="mx-auto mb-3 text-gray-300" />
                <p>{searchQuery ? 'No companies match your search' : 'No companies configured'}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchQuery ? 'Try a different search term' : 'Add a company or load default companies to get started'}
                </p>
                {!searchQuery && isAdmin && (
                  <button
                    onClick={handleSeedDefaults}
                    disabled={seeding}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {seeding ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Adding Companies...
                      </>
                    ) : (
                      <>
                        <Database size={18} />
                        Load 53 Default Companies
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredCompanies.map((company) => (
                  <div key={company.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          company.requireApproval ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <Building size={24} className={
                            company.requireApproval ? 'text-green-600' : 'text-red-600'
                          } />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">{company.displayName || company.name}</h3>
                          <p className="text-sm text-gray-500">{company.name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            {company.contactEmail && (
                              <span className="flex items-center gap-1">
                                <Mail size={12} />
                                {company.contactEmail}
                              </span>
                            )}
                            {company.contactPhone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {company.contactPhone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {company.totalVisitors || 0} visitors
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText size={12} />
                              {company.totalGatepasses || 0} gatepasses
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Approval Toggle */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 hidden md:inline">
                            {company.requireApproval ? 'Approval ON' : 'Auto-Approve'}
                          </span>
                          <button
                            onClick={() => handleToggleApproval(company.id, company.requireApproval)}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                              company.requireApproval ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            title={company.requireApproval 
                              ? 'Click to enable auto-approve' 
                              : 'Click to require approval'}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                                company.requireApproval ? 'translate-x-8' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium hidden lg:inline-block ${
                          company.requireApproval
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {company.requireApproval ? 'Approval Required' : 'Auto-Approve'}
                        </span>

                        {/* Actions */}
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingCompany(company)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Company"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(company.id, company.displayName)}
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
                    <div className="mt-3 ml-16 text-sm">
                      {company.requireApproval ? (
                        <p className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={14} />
                          Visitors must wait for company approval before entry
                        </p>
                      ) : (
                        <p className="flex items-center gap-2 text-red-600">
                          <AlertTriangle size={14} />
                          Visitors are automatically approved upon registration
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'workflow' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <QrCode size={20} className="text-blue-600" />
            How Visitor Registration Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <Shield size={18} />
                Approval Required (ON) - Secure
              </h3>
              <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside">
                <li>Visitor scans QR code at gate</li>
                <li>Fills registration form & selects company</li>
                <li>Request sent to company dashboard</li>
                <li>Company admin approves or rejects</li>
                <li>Visitor notified of decision</li>
                <li>If approved, visitor shows confirmation to guard</li>
                <li>Guard allows entry</li>
              </ol>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} />
                Auto-Approve (OFF) - Open Access
              </h3>
              <ol className="text-sm text-red-700 space-y-2 list-decimal list-inside">
                <li>Visitor scans QR code at gate</li>
                <li>Fills registration form & selects company</li>
                <li>Instantly approved</li>
                <li>Gatepass generated automatically</li>
                <li>Visitor shows gatepass to guard</li>
                <li>Guard allows entry immediately</li>
                <li>Reception notified of entry</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-2">Dashboards</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Reception/Guard Dashboard:</strong> Shows all visitors (pending, approved, checked-in/out)</li>
              <li><strong>Company Dashboard:</strong> Shows visitors for that company, allows approval/rejection</li>
              <li><strong>Admin Dashboard:</strong> Overview of all activities across all companies</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
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
      )}

      {/* Add Company Modal */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Add New Company</h2>
              <button
                onClick={() => setShowAddCompany(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany(prev => ({ 
                      ...prev, 
                      name: e.target.value.toUpperCase().replace(/\s/g, '_') 
                    }))}
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={newCompany.contactPerson}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={newCompany.address}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Company address"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="requireApproval"
                  checked={newCompany.requireApproval}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, requireApproval: e.target.checked }))}
                  className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="requireApproval" className="text-sm text-gray-700">
                  <span className="font-medium">Require approval for visitors</span>
                  <p className="text-gray-500 text-xs mt-1">
                    When enabled, visitors must be approved before entry. When disabled, visitors are auto-approved.
                  </p>
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

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Edit Company</h2>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Code
                  </label>
                  <input
                    type="text"
                    value={editingCompany.name}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCompany.displayName}
                    onChange={(e) => setEditingCompany(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editingCompany.contactEmail || ''}
                    onChange={(e) => setEditingCompany(prev => ({ ...prev, contactEmail: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editingCompany.contactPhone || ''}
                    onChange={(e) => setEditingCompany(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="editRequireApproval"
                  checked={editingCompany.requireApproval}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, requireApproval: e.target.checked }))}
                  className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="editRequireApproval" className="text-sm text-gray-700">
                  <span className="font-medium">Require approval for visitors</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
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
                      Update Company
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VMSSettings
