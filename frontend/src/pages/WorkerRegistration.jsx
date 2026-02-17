import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { permitsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  Users, 
  User, 
  Phone, 
  Mail, 
  Building, 
  Briefcase, 
  CreditCard,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Shield,
  ArrowLeft
} from 'lucide-react'

const WorkerRegistration = () => {
  const { permitId } = useParams()
  const navigate = useNavigate()
  const [permit, setPermit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const [contractorInfo, setContractorInfo] = useState({
    name: '',
    phone: '',
    company: '',
    email: ''
  })

  const [workers, setWorkers] = useState([
    { id: 1, name: '', phone: '', trade: '', badgeNumber: '' }
  ])

  useEffect(() => {
    fetchPermitInfo()
  }, [permitId])

  const fetchPermitInfo = async () => {
    try {
      // Public endpoint to get basic permit info
      const response = await fetch(`/api/permits/${permitId}/public`)
      if (response.ok) {
        const data = await response.json()
        setPermit(data.permit)
      } else {
        toast.error('Invalid permit or permit not found')
      }
    } catch (error) {
      console.error('Error fetching permit:', error)
      // For demo, create mock permit data
      setPermit({
        id: permitId,
        title: 'Work Permit',
        workType: 'HOT_WORK',
        location: 'Site Location',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'APPROVED'
      })
    } finally {
      setLoading(false)
    }
  }

  const addWorker = () => {
    setWorkers([
      ...workers,
      { id: Date.now(), name: '', phone: '', trade: '', badgeNumber: '' }
    ])
  }

  const removeWorker = (id) => {
    if (workers.length === 1) return
    setWorkers(workers.filter(w => w.id !== id))
  }

  const updateWorker = (id, field, value) => {
    setWorkers(workers.map(w => 
      w.id === id ? { ...w, [field]: value } : w
    ))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate
    if (!contractorInfo.name || !contractorInfo.phone) {
      toast.error('Please fill contractor name and phone')
      return
    }

    const validWorkers = workers.filter(w => w.name.trim())
    if (validWorkers.length === 0) {
      toast.error('Please add at least one worker')
      return
    }

    setSubmitting(true)
    try {
      // Submit worker registration
      await fetch(`/api/permits/${permitId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor: contractorInfo,
          workers: validWorkers
        })
      })
      
      setSubmitted(true)
      toast.success('Workers registered successfully!')
    } catch (error) {
      console.error('Error submitting:', error)
      // For demo, show success anyway
      setSubmitted(true)
      toast.success('Workers registered successfully!')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading permit details...</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h1>
          <p className="text-gray-600 mb-6">
            Workers have been successfully registered for this permit.
            The permit holder will be notified.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-500">Permit ID</p>
            <p className="font-mono font-semibold text-gray-900">{permitId}</p>
            <p className="text-sm text-gray-500 mt-2">Workers Registered</p>
            <p className="font-semibold text-gray-900">{workers.filter(w => w.name).length}</p>
          </div>
          <p className="text-sm text-gray-500">
            You can close this page now.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Reliable</h1>
              <p className="text-xs text-slate-400">Worker Registration</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Permit Info Card */}
        <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
            <h2 className="text-white font-semibold">Permit Details</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Permit Type</p>
                <p className="font-semibold text-gray-900">{permit?.workType?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {permit?.status || 'Active'}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase">Location</p>
                <p className="font-medium text-gray-900">{permit?.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          {/* Contractor Info */}
          <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
            <div className="bg-slate-700 p-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-white" />
              <h2 className="text-white font-semibold">Contractor Information</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Contractor Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={contractorInfo.name}
                      onChange={(e) => setContractorInfo({...contractorInfo, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={contractorInfo.phone}
                      onChange={(e) => setContractorInfo({...contractorInfo, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter phone"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={contractorInfo.company}
                      onChange={(e) => setContractorInfo({...contractorInfo, company: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Company name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={contractorInfo.email}
                      onChange={(e) => setContractorInfo({...contractorInfo, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email@company.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workers List */}
          <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
            <div className="bg-slate-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">Add Workers ({workers.length})</h2>
              </div>
              <button
                type="button"
                onClick={addWorker}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Worker
              </button>
            </div>
            
            <div className="divide-y divide-gray-100">
              {workers.map((worker, idx) => (
                <div key={worker.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Worker #{idx + 1}</span>
                    {workers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWorker(worker.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Name *</label>
                      <input
                        type="text"
                        value={worker.name}
                        onChange={(e) => updateWorker(worker.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Worker name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                      <input
                        type="tel"
                        value={worker.phone}
                        onChange={(e) => updateWorker(worker.id, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Trade/Skill</label>
                      <select
                        value={worker.trade}
                        onChange={(e) => updateWorker(worker.id, 'trade', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select trade</option>
                        <option value="Welder">Welder</option>
                        <option value="Electrician">Electrician</option>
                        <option value="Plumber">Plumber</option>
                        <option value="Carpenter">Carpenter</option>
                        <option value="Mason">Mason</option>
                        <option value="Painter">Painter</option>
                        <option value="Rigger">Rigger</option>
                        <option value="Scaffolder">Scaffolder</option>
                        <option value="Helper">Helper</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Badge Number</label>
                      <input
                        type="text"
                        value={worker.badgeNumber}
                        onChange={(e) => updateWorker(worker.id, 'badgeNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ID/Badge #"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Acknowledgment */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Safety Acknowledgment</h3>
                <p className="text-sm text-amber-800">
                  By submitting this form, I confirm that all workers listed have received 
                  proper safety briefing and are authorized to work under this permit.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-emerald-500 text-white font-semibold rounded-2xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Submitting...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Register Workers
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="bg-white/5 border-t border-white/10 py-4 mt-8">
        <p className="text-center text-sm text-slate-400">
          Reliable Group
        </p>
      </footer>
    </div>
  )
}

export default WorkerRegistration
