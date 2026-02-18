import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import {
  FileText,
  Search,
  Plus,
  Eye,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  User,
  Phone,
  Building,
  Briefcase,
  X,
  Save,
  Share2,
  Download,
  Trash2,
  Construction,
} from 'lucide-react'

const VMSGatepasses = () => {
  const { canCreateGatepasses, canEditGatepasses, isAdmin } = useVMSAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // New employee pass form
  const [newPass, setNewPass] = useState({
    employeeName: '',
    phone: '',
    email: '',
    department: '',
    designation: '',
    joiningDate: '',
    validUntil: '',
    photo: null,
  })

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewPass(prev => ({ ...prev, photo: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreatePass = async (e) => {
    e.preventDefault()
    if (!newPass.employeeName || !newPass.phone || !newPass.department || !newPass.validUntil) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    // TODO: Implement backend API for employee passes
    setMessage({ type: 'error', text: 'Employee Pass feature is coming soon. Backend implementation required.' })
  }

  // Calculate default valid until (2 months from today)
  const getDefaultValidUntil = () => {
    const date = new Date()
    date.setMonth(date.getMonth() + 2)
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employee Pass</h1>
          <p className="text-gray-500 mt-1">Create temporary passes for new employees (before ID card issuance)</p>
        </div>
        {(canCreateGatepasses || isAdmin) && (
          <button
            onClick={() => {
              setNewPass(prev => ({ ...prev, validUntil: getDefaultValidUntil() }))
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus size={18} />
            Create Employee Pass
          </button>
        )}
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Briefcase size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-800">New Employee Pass</h3>
            <p className="text-sm text-blue-600 mt-1">
              Create temporary passes for new joiners who haven't received their ID cards yet. 
              Passes are valid for up to 2 months and can be shared via WhatsApp. 
              Employees can show this pass at the entry gate until their official ID is issued.
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon / Empty State */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Construction size={40} className="text-orange-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Employee Pass Feature Coming Soon</h3>
          <p className="text-gray-500 max-w-md mb-6">
            This feature is under development. Employee passes will allow you to create temporary entry passes 
            for new employees who haven't received their official ID cards yet.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 max-w-md">
            <h4 className="font-medium text-gray-700 mb-2">Planned Features:</h4>
            <ul className="text-sm text-gray-500 text-left space-y-1">
              <li>• Create temporary passes for new employees</li>
              <li>• Set validity period (up to 2 months)</li>
              <li>• Share passes via WhatsApp</li>
              <li>• QR code for quick verification at entry gate</li>
              <li>• Track pass usage and expiry</li>
            </ul>
          </div>
          {(canCreateGatepasses || isAdmin) && (
            <button
              onClick={() => {
                setNewPass(prev => ({ ...prev, validUntil: getDefaultValidUntil() }))
                setShowCreateModal(true)
              }}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus size={18} />
              Try Create Employee Pass
            </button>
          )}
        </div>
      </div>

      {/* Create Employee Pass Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Create Employee Pass</h2>
                <p className="text-sm text-gray-500">Temporary pass for new joiners</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Feature Not Ready Notice */}
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertTriangle size={18} />
                <span className="text-sm font-medium">Backend implementation required</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                This form is ready but the backend API needs to be implemented to save employee passes.
              </p>
            </div>
            
            <form onSubmit={handleCreatePass} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {newPass.photo ? (
                      <img src={newPass.photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 bg-teal-600 text-white rounded-full cursor-pointer hover:bg-teal-700">
                    <Plus size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={14} className="inline mr-1" />
                  Employee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPass.employeeName}
                  onChange={(e) => setNewPass(prev => ({ ...prev, employeeName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone size={14} className="inline mr-1" />
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newPass.phone}
                    onChange={(e) => setNewPass(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newPass.email}
                    onChange={(e) => setNewPass(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="email@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building size={14} className="inline mr-1" />
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPass.department}
                    onChange={(e) => setNewPass(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., IT, HR, Sales"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Briefcase size={14} className="inline mr-1" />
                    Designation
                  </label>
                  <input
                    type="text"
                    value={newPass.designation}
                    onChange={(e) => setNewPass(prev => ({ ...prev, designation: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., Software Engineer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={newPass.joiningDate}
                    onChange={(e) => setNewPass(prev => ({ ...prev, joiningDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock size={14} className="inline mr-1" />
                    Valid Until <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newPass.validUntil}
                    onChange={(e) => setNewPass(prev => ({ ...prev, validUntil: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Default: 2 months from today</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Create Pass
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

export default VMSGatepasses
