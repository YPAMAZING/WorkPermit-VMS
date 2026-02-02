import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { permitsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Save,
  X,
  Plus,
  AlertTriangle,
  Shield,
  Wrench,
  Flame,
  Zap,
  ArrowUp,
  Box,
  FileText,
  Users,
  Building,
  Phone,
  CheckSquare,
  ClipboardCheck,
  MapPin,
  HardHat,
  User,
  Upload,
  Trash2,
  Image,
  Clock,
  Calendar,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

// Work type labels mapping
const workTypeLabels = {
  'HOT_WORK': 'Hot Work Permit',
  'CONFINED_SPACE': 'Confined Space Permit',
  'ELECTRICAL': 'Electrical Work Permit',
  'WORKING_AT_HEIGHT': 'Work Height Permit',
  'EXCAVATION': 'Excavation Work Permit',
  'LIFTING': 'Lifting Permit',
  'CHEMICAL': 'Chemical Handling Permit',
  'RADIATION': 'Radiation Work Permit',
  'GENERAL': 'General Permit',
  'COLD_WORK': 'Cold Work Permit',
  'LOTO': 'LOTO Permit',
  'VEHICLE': 'Vehicle Work Permit',
  'PRESSURE_TESTING': 'Hydro Pressure Testing',
  'ENERGIZE': 'Energize Permit',
  'SWMS': 'Safe Work Method Statement',
}

// Building locations
const buildingLocations = [
  { id: 'reliable_plaza', name: 'Reliable Plaza' },
  { id: 'liberty_tower', name: 'Liberty Tower' },
  { id: 'reliable_tech_park', name: 'Reliable Tech Park' },
  { id: 'empire_tower', name: 'Empire Tower' },
]

// Mandatory PPE items (must be checked)
const mandatoryPPE = [
  'Fire Extinguisher',
  'Safety Belts',
  'Safety Shoes',
  'Safety Helmets',
  'Electrical Isolation',
]

// Optional PPE items (can be checked/unchecked)
const optionalPPE = [
  'Gloves',
  'Ear Plugs',
  'Dust Masks',
  'Face Shields',
  'Locks & Tags',
  'Safety Goggles',
  'Area Barricading',
  'Reflective Jackets',
  'Warning Signages',
  'Flashback Arrestors',
  'Scaffolds & Ladders',
]

// ID Proof types
const idProofTypes = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other ID' },
]

const CreatePermit = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const preSelectedType = searchParams.get('type')

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEdit)
  const [workTypes, setWorkTypes] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    buildingLocation: '',
    exactLocation: '',
    location: '',
    workType: preSelectedType || '',
    startDate: '',
    startTime: '08:00',
    endDate: '',
    endTime: '18:00',
    priority: 'MEDIUM',
    hazards: [],
    precautions: [],
    equipment: [],
    contractorName: '',
    contractorPhone: '',
    companyName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  
  // Vendor Details
  const [vendorDetails, setVendorDetails] = useState({
    vendorName: '',
    vendorPhone: '',
    vendorCompany: '',
    vendorEmail: '',
  })
  
  // Workers List
  const [workers, setWorkers] = useState([])
  const [newWorker, setNewWorker] = useState({
    name: '',
    phone: '',
    idProofType: 'aadhaar',
    idProofNumber: '',
    idProofImage: null,
    idProofPreview: null,
  })
  
  // PPE State
  const [selectedPPE, setSelectedPPE] = useState(() => {
    const initial = {}
    mandatoryPPE.forEach(item => { initial[item] = false })
    optionalPPE.forEach(item => { initial[item] = false })
    return initial
  })
  const [otherPPE, setOtherPPE] = useState('')
  const [otherPPEList, setOtherPPEList] = useState([])
  
  const [newHazard, setNewHazard] = useState('')
  const [errors, setErrors] = useState({})
  const [declarationAgreed, setDeclarationAgreed] = useState(false)

  useEffect(() => {
    fetchWorkTypes()
    if (isEdit) {
      fetchPermit()
    }
  }, [id])

  // Ensure work type is set after workTypes are loaded (for pre-selected type from URL)
  useEffect(() => {
    if (preSelectedType && workTypes.length > 0 && !isEdit) {
      // Verify the preSelectedType exists in workTypes
      const validType = workTypes.find(t => t.value === preSelectedType)
      if (validType) {
        // Always set the formData.workType when we have a valid preSelectedType
        setFormData(prev => ({ ...prev, workType: preSelectedType }))
      }
    }
  }, [workTypes, preSelectedType, isEdit])

  const fetchWorkTypes = async () => {
    try {
      const response = await permitsAPI.getWorkTypes()
      setWorkTypes(response.data.workTypes)
    } catch (error) {
      console.error('Error fetching work types:', error)
    }
  }

  const fetchPermit = async () => {
    try {
      const response = await permitsAPI.getById(id)
      const permit = response.data.permit
      
      let buildingLocation = ''
      let exactLocation = permit.location || ''
      
      for (const building of buildingLocations) {
        if (permit.location?.includes(building.name)) {
          buildingLocation = building.id
          exactLocation = permit.location.replace(building.name, '').replace(' - ', '').trim()
          break
        }
      }
      
      // Parse date and time from ISO datetime
      const startDateTime = new Date(permit.startDate)
      const endDateTime = new Date(permit.endDate)
      
      setFormData({
        title: permit.title,
        description: permit.description,
        buildingLocation: buildingLocation,
        exactLocation: exactLocation,
        location: permit.location,
        workType: permit.workType,
        startDate: permit.startDate.split('T')[0],
        startTime: startDateTime.toTimeString().slice(0, 5) || '08:00',
        endDate: permit.endDate.split('T')[0],
        endTime: endDateTime.toTimeString().slice(0, 5) || '18:00',
        priority: permit.priority,
        hazards: permit.hazards || [],
        precautions: permit.precautions || [],
        equipment: permit.equipment || [],
        contractorName: permit.contractorName || '',
        contractorPhone: permit.contractorPhone || '',
        companyName: permit.companyName || '',
      })
      
      // Load vendor details if available
      if (permit.vendorDetails) {
        setVendorDetails(permit.vendorDetails)
      }
      
      // Load workers if available
      if (permit.workers && permit.workers.length > 0) {
        setWorkers(permit.workers)
      }
      
      // Parse equipment for PPE
      if (permit.equipment && permit.equipment.length > 0) {
        const newSelectedPPE = { ...selectedPPE }
        const others = []
        
        permit.equipment.forEach(item => {
          if (mandatoryPPE.includes(item) || optionalPPE.includes(item)) {
            newSelectedPPE[item] = true
          } else {
            others.push(item)
          }
        })
        
        setSelectedPPE(newSelectedPPE)
        setOtherPPEList(others)
      }
    } catch (error) {
      toast.error('Error fetching permit')
      navigate('/workpermit/permits')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (errors[name]) {
      setErrors({ ...errors, [name]: null })
    }
  }

  const handleVendorChange = (e) => {
    const { name, value } = e.target
    setVendorDetails({ ...vendorDetails, [name]: value })
    if (errors[name]) {
      setErrors({ ...errors, [name]: null })
    }
  }

  const handleNewWorkerChange = (e) => {
    const { name, value } = e.target
    setNewWorker({ ...newWorker, [name]: value })
  }

  const handleWorkerImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewWorker({
          ...newWorker,
          idProofImage: file,
          idProofPreview: reader.result,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const addWorker = () => {
    if (!newWorker.name.trim()) {
      toast.error('Worker name is required')
      return
    }
    if (!newWorker.idProofNumber.trim()) {
      toast.error('ID proof number is required')
      return
    }
    if (!newWorker.idProofPreview) {
      toast.error('ID proof document upload is mandatory')
      return
    }
    
    const workerToAdd = {
      id: Date.now(),
      name: newWorker.name.trim(),
      phone: newWorker.phone.trim(),
      idProofType: newWorker.idProofType,
      idProofNumber: newWorker.idProofNumber.trim(),
      idProofImage: newWorker.idProofPreview, // Store base64 for now
    }
    
    setWorkers([...workers, workerToAdd])
    setNewWorker({
      name: '',
      phone: '',
      idProofType: 'aadhaar',
      idProofNumber: '',
      idProofImage: null,
      idProofPreview: null,
    })
    toast.success('Worker added successfully')
  }

  const removeWorker = (workerId) => {
    setWorkers(workers.filter(w => w.id !== workerId))
    toast.success('Worker removed')
  }

  const handlePPEChange = (item) => {
    setSelectedPPE(prev => ({
      ...prev,
      [item]: !prev[item]
    }))
    if (errors.mandatoryPPE && mandatoryPPE.includes(item)) {
      setErrors(prev => ({ ...prev, mandatoryPPE: null }))
    }
  }

  const addOtherPPE = () => {
    if (otherPPE.trim() && !otherPPEList.includes(otherPPE.trim())) {
      setOtherPPEList([...otherPPEList, otherPPE.trim()])
      setOtherPPE('')
    }
  }

  const removeOtherPPE = (item) => {
    setOtherPPEList(otherPPEList.filter(p => p !== item))
  }

  const addItem = (type, value, setValue) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [type]: [...formData[type], value.trim()],
      })
      setValue('')
    }
  }

  const removeItem = (type, index) => {
    setFormData({
      ...formData,
      [type]: formData[type].filter((_, i) => i !== index),
    })
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.buildingLocation) newErrors.buildingLocation = 'Building location is required'
    if (!formData.exactLocation.trim()) newErrors.exactLocation = 'Exact working area is required'
    if (!formData.workType) newErrors.workType = 'Work type is required'
    if (!formData.startDate) newErrors.startDate = 'Start date is required'
    if (!formData.startTime) newErrors.startTime = 'Start time is required'
    if (!formData.endDate) newErrors.endDate = 'End date is required'
    if (!formData.endTime) newErrors.endTime = 'End time is required'
    
    // Validate end datetime is after start datetime
    if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
      if (endDateTime <= startDateTime) {
        newErrors.endDate = 'End date/time must be after start date/time'
      }
    }
    
    // Vendor validation
    if (!vendorDetails.vendorName.trim()) newErrors.vendorName = 'Vendor name is required'
    if (!vendorDetails.vendorPhone.trim()) newErrors.vendorPhone = 'Vendor phone is required'
    
    // Workers validation
    if (workers.length === 0) newErrors.workers = 'At least one worker is required'
    
    // Check if all mandatory PPE items are checked
    const uncheckedMandatory = mandatoryPPE.filter(item => !selectedPPE[item])
    if (uncheckedMandatory.length > 0) {
      newErrors.mandatoryPPE = `Please confirm all mandatory PPE items: ${uncheckedMandatory.join(', ')}`
    }
    
    // Declaration validation (only for new permits)
    if (!isEdit && !declarationAgreed) {
      newErrors.declaration = 'You must agree to the declaration & undertaking'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fill all required fields')
      return
    }
    
    if (!isEdit && !declarationAgreed) {
      toast.error('Please agree to the Declaration & Undertaking')
      return
    }

    const building = buildingLocations.find(b => b.id === formData.buildingLocation)
    const combinedLocation = `${building?.name || ''} - ${formData.exactLocation}`

    const allEquipment = [
      ...Object.entries(selectedPPE).filter(([_, selected]) => selected).map(([item]) => item),
      ...otherPPEList
    ]

    // Combine date and time into ISO datetime strings
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`).toISOString()
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`).toISOString()

    setLoading(true)
    try {
      const submitData = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
        location: combinedLocation,
        equipment: allEquipment,
        vendorDetails: vendorDetails,
        workers: workers,
        contractorName: vendorDetails.vendorName,
        contractorPhone: vendorDetails.vendorPhone,
        companyName: vendorDetails.vendorCompany,
      }

      if (isEdit) {
        await permitsAPI.update(id, submitData)
        toast.success('Permit updated successfully')
      } else {
        await permitsAPI.create(submitData)
        toast.success('Permit created successfully')
      }
      navigate('/workpermit/permits')
    } catch (error) {
      toast.error(error.response?.data?.message || `Error ${isEdit ? 'updating' : 'creating'} permit`)
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Section header component for consistent styling
  const SectionHeader = ({ icon: Icon, title, subtitle, color = "blue" }) => (
    <div className={`flex items-center gap-3 pb-4 mb-4 border-b border-gray-100`}>
      <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/workpermit/permits')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Permits</span>
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit Permit Request' : preSelectedType ? `New ${workTypeLabels[preSelectedType] || 'Permit'}` : 'New Permit Request'}
            </h1>
            <p className="text-gray-500 mt-2">
              {isEdit ? 'Update the permit details below' : 'Complete all required fields to submit your permit request'}
            </p>
          </div>
          
          {/* Progress indicator */}
          <div className="hidden md:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
            <div className={`w-2 h-2 rounded-full ${formData.title ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-2 h-2 rounded-full ${formData.workType ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-2 h-2 rounded-full ${vendorDetails.vendorName ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-2 h-2 rounded-full ${workers.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-2 h-2 rounded-full ${mandatoryPPE.every(p => selectedPPE[p]) ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <SectionHeader 
              icon={FileText} 
              title="Basic Information" 
              subtitle="Provide general details about the permit"
              color="blue"
            />
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permit Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                  placeholder="e.g., Hot Work Permit - Welding Operation on 3rd Floor"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.description ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none`}
                  placeholder="Provide a detailed description of the work to be performed, including scope, methods, and special requirements..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.description}
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="workType"
                    value={formData.workType}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.workType ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white`}
                  >
                    <option value="">Select work type...</option>
                    {workTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.workType && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {errors.workType}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'LOW', label: 'Low', color: 'gray' },
                      { value: 'MEDIUM', label: 'Medium', color: 'blue' },
                      { value: 'HIGH', label: 'High', color: 'orange' },
                      { value: 'CRITICAL', label: 'Critical', color: 'red' },
                    ].map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: priority.value })}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                          formData.priority === priority.value
                            ? priority.color === 'gray' ? 'bg-gray-600 text-white' :
                              priority.color === 'blue' ? 'bg-blue-600 text-white' :
                              priority.color === 'orange' ? 'bg-orange-500 text-white' :
                              'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <SectionHeader 
              icon={Calendar} 
              title="Work Schedule" 
              subtitle="Set the start and end date/time for the work"
              color="purple"
            />
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Start Date/Time */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-green-800">Start</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-green-700 mb-1.5">Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className={`w-full px-3 py-2.5 rounded-lg border ${errors.startDate ? 'border-red-300 bg-red-50' : 'border-green-200 bg-white'} focus:border-green-500 focus:ring-2 focus:ring-green-200`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-green-700 mb-1.5">Time *</label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className={`w-full px-3 py-2.5 rounded-lg border ${errors.startTime ? 'border-red-300 bg-red-50' : 'border-green-200 bg-white'} focus:border-green-500 focus:ring-2 focus:ring-green-200`}
                    />
                  </div>
                </div>
              </div>

              {/* End Date/Time */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border border-red-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-red-800">End</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-red-700 mb-1.5">Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className={`w-full px-3 py-2.5 rounded-lg border ${errors.endDate ? 'border-red-300 bg-red-50' : 'border-red-200 bg-white'} focus:border-red-500 focus:ring-2 focus:ring-red-200`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-red-700 mb-1.5">Time *</label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className={`w-full px-3 py-2.5 rounded-lg border ${errors.endTime ? 'border-red-300 bg-red-50' : 'border-red-200 bg-white'} focus:border-red-500 focus:ring-2 focus:ring-red-200`}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {(errors.startDate || errors.endDate) && (
              <p className="text-red-500 text-sm mt-4 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.startDate || errors.endDate}
              </p>
            )}
            
            <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <strong>Auto-Close Feature:</strong> The permit will automatically close at the specified end date and time. 
                Fireman can add remarks before or after closure for record keeping.
              </div>
            </div>
          </div>
        </div>

        {/* Work Location */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <SectionHeader 
              icon={MapPin} 
              title="Work Location" 
              subtitle="Specify where the work will be performed"
              color="green"
            />
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Building <span className="text-red-500">*</span>
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {buildingLocations.map((building) => (
                    <label
                      key={building.id}
                      className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.buildingLocation === building.id
                          ? 'border-green-500 bg-green-50 shadow-sm'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.buildingLocation === building.id 
                          ? 'border-green-500' 
                          : 'border-gray-300'
                      }`}>
                        {formData.buildingLocation === building.id && (
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className={`w-4 h-4 ${formData.buildingLocation === building.id ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className={`font-medium ${formData.buildingLocation === building.id ? 'text-green-700' : 'text-gray-700'}`}>
                          {building.name}
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="buildingLocation"
                        value={building.id}
                        checked={formData.buildingLocation === building.id}
                        onChange={handleChange}
                        className="hidden"
                      />
                    </label>
                  ))}
                </div>
                {errors.buildingLocation && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.buildingLocation}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exact Working Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="exactLocation"
                  value={formData.exactLocation}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.exactLocation ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all`}
                  placeholder="e.g., 3rd Floor, East Wing, Room 305"
                />
                {errors.exactLocation && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.exactLocation}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <SectionHeader 
              icon={Building} 
              title="Vendor / Contractor Details" 
              subtitle="Information about the contractor performing the work"
              color="purple"
            />
            
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor/Contractor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vendorName"
                  value={vendorDetails.vendorName}
                  onChange={handleVendorChange}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.vendorName ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all`}
                  placeholder="Enter contractor name"
                />
                {errors.vendorName && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.vendorName}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="vendorPhone"
                  value={vendorDetails.vendorPhone}
                  onChange={handleVendorChange}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.vendorPhone ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all`}
                  placeholder="Enter phone number"
                />
                {errors.vendorPhone && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.vendorPhone}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  name="vendorCompany"
                  value={vendorDetails.vendorCompany}
                  onChange={handleVendorChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder="Enter company name (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  name="vendorEmail"
                  value={vendorDetails.vendorEmail}
                  onChange={handleVendorChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  placeholder="Enter email (optional)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Workers Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <SectionHeader 
              icon={Users} 
              title="Workers Details" 
              subtitle="Add all workers involved in this permit"
              color="indigo"
            />
            
            {/* Add Worker Form */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200 mb-6">
              <h4 className="font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Worker
              </h4>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-indigo-700 mb-1.5">Worker Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={newWorker.name}
                    onChange={handleNewWorkerChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-indigo-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-indigo-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={newWorker.phone}
                    onChange={handleNewWorkerChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-indigo-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="Contact number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-indigo-700 mb-1.5">ID Proof Type *</label>
                  <select
                    name="idProofType"
                    value={newWorker.idProofType}
                    onChange={handleNewWorkerChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-indigo-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    {idProofTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-indigo-700 mb-1.5">ID Number *</label>
                  <input
                    type="text"
                    name="idProofNumber"
                    value={newWorker.idProofNumber}
                    onChange={handleNewWorkerChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-indigo-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="ID proof number"
                  />
                </div>
              </div>
              
              {/* ID Proof Image Upload - MANDATORY */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-indigo-700 mb-1.5">
                  Upload ID Proof Document <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-3 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    newWorker.idProofPreview 
                      ? 'border-green-400 bg-green-50 hover:border-green-500' 
                      : 'border-indigo-300 hover:border-indigo-400 hover:bg-indigo-100/50'
                  }`}>
                    <Upload className={`w-5 h-5 ${newWorker.idProofPreview ? 'text-green-500' : 'text-indigo-400'}`} />
                    <span className={`text-sm ${newWorker.idProofPreview ? 'text-green-600' : 'text-indigo-600'}`}>
                      {newWorker.idProofPreview ? 'ID Proof Uploaded ✓' : 'Click to upload ID image (Required)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleWorkerImageUpload}
                      className="hidden"
                    />
                  </label>
                  {newWorker.idProofPreview && (
                    <div className="relative w-20 h-20 border-2 border-green-400 rounded-xl overflow-hidden bg-white">
                      <img
                        src={newWorker.idProofPreview}
                        alt="ID Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewWorker({ ...newWorker, idProofImage: null, idProofPreview: null })}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-red-500 mt-2">* ID proof document upload is mandatory for each worker</p>
              </div>
              
              <button
                type="button"
                onClick={addWorker}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Worker
              </button>
            </div>
            
            {/* Workers List */}
            {workers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-700">Added Workers</h4>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    {workers.length} worker{workers.length > 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {workers.map((worker, index) => (
                    <div
                      key={worker.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-gray-200">
                        {worker.idProofImage ? (
                          <img
                            src={worker.idProofImage}
                            alt={worker.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                            <User className="w-6 h-6 text-indigo-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{worker.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                            {idProofTypes.find(t => t.value === worker.idProofType)?.label}
                          </span>
                          <span className="truncate">{worker.idProofNumber}</span>
                        </p>
                      </div>
                      
                      {worker.phone && (
                        <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500">
                          <Phone className="w-3.5 h-3.5" />
                          {worker.phone}
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => removeWorker(worker.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No workers added yet</p>
                <p className="text-sm">Use the form above to add workers</p>
              </div>
            )}
            
            {errors.workers && (
              <p className="text-red-500 text-sm mt-4 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.workers}
              </p>
            )}
          </div>
        </div>

        {/* Hazards */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <SectionHeader 
              icon={AlertTriangle} 
              title="Hazards Identified" 
              subtitle="List all potential hazards for this work"
              color="red"
            />
            
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={newHazard}
                onChange={(e) => setNewHazard(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                placeholder="e.g., Fire hazard, Electrical shock, Toxic fumes..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('hazards', newHazard, setNewHazard))}
              />
              <button
                type="button"
                onClick={() => addItem('hazards', newHazard, setNewHazard)}
                className="px-5 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {formData.hazards.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.hazards.map((hazard, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {hazard}
                    <button
                      type="button"
                      onClick={() => removeItem('hazards', index)}
                      className="hover:text-red-900 ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No hazards added - Add hazards above</p>
            )}
          </div>
        </div>

        {/* Safety Precautions / PPE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <SectionHeader 
              icon={Shield} 
              title="Safety Precautions - PPE & Tools" 
              subtitle="Select all required personal protective equipment"
              color="emerald"
            />
            
            {/* Mandatory PPE */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-amber-700">Mandatory PPE</span>
                <span className="text-xs text-amber-600">(All must be selected)</span>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mandatoryPPE.map((item) => (
                    <label
                      key={item}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedPPE[item]
                          ? 'bg-amber-100 border-2 border-amber-400'
                          : 'bg-white border-2 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${
                        selectedPPE[item] ? 'bg-amber-500 border-amber-500' : 'border-amber-300'
                      }`}>
                        {selectedPPE[item] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{item}</span>
                      <span className="text-red-500 text-xs">*</span>
                      <input
                        type="checkbox"
                        checked={selectedPPE[item]}
                        onChange={() => handlePPEChange(item)}
                        className="hidden"
                      />
                    </label>
                  ))}
                </div>
                {errors.mandatoryPPE && (
                  <p className="text-red-500 text-sm mt-3 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.mandatoryPPE}
                  </p>
                )}
              </div>
            </div>

            {/* Optional PPE */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Additional PPE (Optional)</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {optionalPPE.map((item) => (
                  <label
                    key={item}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedPPE[item]
                        ? 'bg-emerald-50 border-2 border-emerald-400'
                        : 'bg-gray-50 border-2 border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${
                      selectedPPE[item] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                    }`}>
                      {selectedPPE[item] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{item}</span>
                    <input
                      type="checkbox"
                      checked={selectedPPE[item]}
                      onChange={() => handlePPEChange(item)}
                      className="hidden"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Other PPE */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Other Equipment</p>
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={otherPPE}
                  onChange={(e) => setOtherPPE(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOtherPPE())}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                  placeholder="Enter other PPE or tool..."
                />
                <button
                  type="button"
                  onClick={addOtherPPE}
                  className="px-5 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {otherPPEList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {otherPPEList.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      {item}
                      <button
                        type="button"
                        onClick={() => removeOtherPPE(item)}
                        className="hover:text-purple-900 ml-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Declaration & Undertaking - Only for new permits */}
        {!isEdit && (
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Declaration & Undertaking</h3>
                  <p className="text-blue-100 text-sm">Please read carefully before submitting</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6">
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                <p className="font-semibold text-gray-900 mb-4">
                  I/We hereby solemnly declare and undertake that:
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                    <p>I/We have thoroughly read, comprehensively understood, and fully acknowledged all the safety requirements, protocols, procedures, and guidelines mentioned in this permit application.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                    <p>All the above requirements have been clearly explained and communicated to us by Reliable Group's authorized site team, fireman, and designated officials.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</span>
                    <p>I/We unconditionally agree to strictly comply with and faithfully abide by all the listed requirements, safety measures, emergency procedures, and standard operating procedures throughout the entire duration of this work permit.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">4</span>
                    <p className="text-gray-900">I/We understand and accept that the vendor/contractor/person requesting this work permit shall be held <strong className="text-red-600">solely and entirely responsible</strong> for any untoward incident, accident, injury, damage to property, equipment, machinery, or human life arising due to any unsafe act, negligence, violation of safety protocols, or non-compliance during this work/job/activity.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">5</span>
                    <p>I/We acknowledge that verifying and ensuring the validity of all workers' necessary licenses, certifications, competency certificates, training records, medical fitness certificates, and utility vehicle's compliance documents (including valid insurance, Pollution Under Control certificate, fitness certificate, registration, etc.) is <strong>solely our (clients'/tenants'/contractors') responsibility</strong>.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">6</span>
                    <p>I/We confirm that all workers deployed for this activity are adequately trained, possess required skills, are medically fit, and are equipped with all the required Personal Protective Equipment (PPE) as specified in this permit.</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">7</span>
                    <p>I/We agree to immediately report any unsafe conditions, near-miss incidents, accidents, or emergencies to the site safety team and follow all emergency evacuation procedures as directed.</p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-600 italic text-sm">
                    By checking the box below, I/We confirm that this declaration has been read, understood, and agreed upon by all parties involved in this work permit application. This constitutes a legally binding undertaking.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className={`flex items-center gap-4 p-5 rounded-xl cursor-pointer transition-all duration-300 ${
                  declarationAgreed 
                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-400 shadow-md' 
                    : errors.declaration 
                      ? 'bg-red-50 border-2 border-red-300' 
                      : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    declarationAgreed ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}>
                    {declarationAgreed && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-900 font-semibold text-base block">
                      I Agree to the Declaration & Undertaking <span className="text-red-500">*</span>
                    </span>
                    {declarationAgreed && (
                      <span className="text-emerald-600 text-sm flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Declaration accepted and acknowledged
                      </span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={declarationAgreed}
                    onChange={(e) => {
                      setDeclarationAgreed(e.target.checked)
                      if (errors.declaration) {
                        setErrors({ ...errors, declaration: null })
                      }
                    }}
                    className="hidden"
                  />
                </label>
                
                {errors.declaration && (
                  <p className="text-red-500 text-sm mt-3 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.declaration}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <button
            type="button"
            onClick={() => navigate('/workpermit/permits')}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
          
          <button 
            type="submit" 
            disabled={loading || (!isEdit && !declarationAgreed)} 
            className={`px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              loading || (!isEdit && !declarationAgreed)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEdit ? 'Update Permit' : 'Submit Permit Request'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePermit
