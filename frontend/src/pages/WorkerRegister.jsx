import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import {
  Shield,
  User,
  Phone,
  Building,
  Briefcase,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'

const WorkerRegister = () => {
  const { permitId } = useParams()
  const [permit, setPermit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [contractor, setContractor] = useState({
    name: '',
    phone: '',
    company: '',
  })
  
  const [workers, setWorkers] = useState([
    { name: '', phone: '', trade: '', badgeNumber: '' }
  ])

  useEffect(() => {
    fetchPermitInfo()
  }, [permitId])

  const fetchPermitInfo = async () => {
    try {
      const response = await axios.get(`/api/permits/${permitId}/public`)
      setPermit(response.data.permit)
    } catch (error) {
      toast.error('Invalid or expired permit link')
    } finally {
      setLoading(false)
    }
  }

  const handleContractorChange = (e) => {
    setContractor({ ...contractor, [e.target.name]: e.target.value })
  }

  const handleWorkerChange = (index, e) => {
    const updated = [...workers]
    updated[index][e.target.name] = e.target.value
    setWorkers(updated)
  }

  const addWorker = () => {
    setWorkers([...workers, { name: '', phone: '', trade: '', badgeNumber: '' }])
  }

  const removeWorker = (index) => {
    if (workers.length > 1) {
      setWorkers(workers.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!contractor.name || !contractor.phone) {
      toast.error('Please fill in contractor details')
      return
    }

    const validWorkers = workers.filter(w => w.name.trim())
    if (validWorkers.length === 0) {
      toast.error('Please add at least one worker')
      return
    }

    setSubmitting(true)
    try {
      await axios.post(`/api/permits/${permitId}/workers`, {
        contractor,
        workers: validWorkers,
      })
      setSuccess(true)
      toast.success('Workers registered successfully!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!permit) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Permit Link</h1>
          <p className="text-gray-500">This permit registration link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
          <p className="text-gray-500 mb-4">
            Workers have been registered for permit <strong>{permit.permitNumber}</strong>
          </p>
          <p className="text-sm text-gray-400">You can close this page now.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 py-8 px-4">
      <Toaster position="top-center" />
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Worker Registration</h1>
          <p className="text-slate-400 mt-2">Register workers for this work permit</p>
        </div>

        {/* Permit Info Card */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Permit Number</p>
              <p className="text-white font-mono">{permit.permitNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase">Status</p>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                permit.status === 'APPROVED' ? 'bg-emerald-500 text-white' :
                permit.status === 'PENDING' ? 'bg-amber-500 text-white' :
                'bg-gray-500 text-white'
              }`}>
                {permit.status}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white font-medium">{permit.title}</p>
            <p className="text-sm text-slate-400">{permit.location}</p>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contractor Details */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-slate-600" />
              Contractor Details
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contractor Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={contractor.name}
                    onChange={handleContractorChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter name"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={contractor.phone}
                    onChange={handleContractorChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter phone"
                    required
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="company"
                    value={contractor.company}
                    onChange={handleContractorChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Company name (optional)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Workers List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                Workers ({workers.length})
              </h2>
              <button
                type="button"
                onClick={addWorker}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Worker
              </button>
            </div>

            <div className="space-y-4">
              {workers.map((worker, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg relative">
                  {workers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWorker(index)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <p className="text-xs font-medium text-gray-500 mb-3">Worker #{index + 1}</p>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={worker.name}
                        onChange={(e) => handleWorkerChange(index, e)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        placeholder="Worker name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={worker.phone}
                        onChange={(e) => handleWorkerChange(index, e)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        placeholder="Phone number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Trade/Skill</label>
                      <input
                        type="text"
                        name="trade"
                        value={worker.trade}
                        onChange={(e) => handleWorkerChange(index, e)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., Welder, Electrician"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Badge Number</label>
                      <input
                        type="text"
                        name="badgeNumber"
                        value={worker.badgeNumber}
                        onChange={(e) => handleWorkerChange(index, e)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        placeholder="ID/Badge number"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Register Workers
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          Powered by MIS - Work Permit Management System
        </p>
      </div>
    </div>
  )
}

export default WorkerRegister
