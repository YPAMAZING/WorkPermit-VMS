import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Flame, 
  Box, 
  Zap, 
  ArrowUpFromLine, 
  Shovel, 
  Weight,
  FlaskConical,
  Radiation,
  Wrench,
  FileText,
  Thermometer,
  Lock,
  Truck,
  Wind,
  Droplets,
  Shield,
  X,
  Info
} from 'lucide-react'

// Safetymint-style permit types with abbreviations - Sorted Alphabetically by name
const permitTypes = [
  { 
    id: 'CHEMICAL', 
    abbr: 'CHP', 
    name: 'Chemical Handling Permit',
    description: 'Handling hazardous chemicals',
    icon: FlaskConical, 
    color: 'red',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
    borderColor: 'border-red-200',
    hoverColor: 'hover:border-red-400 hover:bg-red-50'
  },
  { 
    id: 'COLD_WORK', 
    abbr: 'CWP', 
    name: 'Cold Work Permit',
    description: 'Non-sparking maintenance work',
    icon: Thermometer, 
    color: 'cyan',
    bgColor: 'bg-cyan-50',
    iconColor: 'text-cyan-500',
    borderColor: 'border-cyan-200',
    hoverColor: 'hover:border-cyan-400 hover:bg-cyan-50'
  },
  { 
    id: 'CONFINED_SPACE', 
    abbr: 'CSP', 
    name: 'Confined Space Permit',
    description: 'Entry into tanks, vessels, pits',
    icon: Box, 
    color: 'purple',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-500',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:border-purple-400 hover:bg-purple-50'
  },
  { 
    id: 'ELECTRICAL', 
    abbr: 'EWP', 
    name: 'Electrical Work Permit',
    description: 'Electrical maintenance and installation',
    icon: Zap, 
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    hoverColor: 'hover:border-yellow-400 hover:bg-yellow-50'
  },
  { 
    id: 'ENERGIZE', 
    abbr: 'EOMP', 
    name: 'Energize Permit',
    description: 'Energizing equipment',
    icon: Zap, 
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    borderColor: 'border-emerald-200',
    hoverColor: 'hover:border-emerald-400 hover:bg-emerald-50'
  },
  { 
    id: 'EXCAVATION', 
    abbr: 'EXP', 
    name: 'Excavation Work Permit',
    description: 'Digging, trenching operations',
    icon: Shovel, 
    color: 'amber',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    hoverColor: 'hover:border-amber-400 hover:bg-amber-50'
  },
  { 
    id: 'GENERAL', 
    abbr: 'GP', 
    name: 'General Permit',
    description: 'General work activities',
    icon: FileText, 
    color: 'gray',
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    hoverColor: 'hover:border-gray-400 hover:bg-gray-100'
  },
  { 
    id: 'HOT_WORK', 
    abbr: 'HWP', 
    name: 'Hot Work Permit',
    description: 'Welding, cutting, grinding operations',
    icon: Flame, 
    color: 'orange',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-500',
    borderColor: 'border-orange-200',
    hoverColor: 'hover:border-orange-400 hover:bg-orange-50'
  },
  { 
    id: 'PRESSURE_TESTING', 
    abbr: 'HPT', 
    name: 'Hydro Pressure Testing',
    description: 'Pressure testing operations',
    icon: Droplets, 
    color: 'sky',
    bgColor: 'bg-sky-50',
    iconColor: 'text-sky-500',
    borderColor: 'border-sky-200',
    hoverColor: 'hover:border-sky-400 hover:bg-sky-50'
  },
  { 
    id: 'LIFTING', 
    abbr: 'LP', 
    name: 'Lifting Permit',
    description: 'Crane and lifting operations',
    icon: Weight, 
    color: 'teal',
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-500',
    borderColor: 'border-teal-200',
    hoverColor: 'hover:border-teal-400 hover:bg-teal-50'
  },
  { 
    id: 'LOTO', 
    abbr: 'LOTO', 
    name: 'LOTO Permit',
    description: 'Lockout/Tagout procedures',
    icon: Lock, 
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    borderColor: 'border-indigo-200',
    hoverColor: 'hover:border-indigo-400 hover:bg-indigo-50'
  },
  { 
    id: 'RADIATION', 
    abbr: 'RWP', 
    name: 'Radiation Work Permit',
    description: 'Work with radioactive materials',
    icon: Radiation, 
    color: 'lime',
    bgColor: 'bg-lime-50',
    iconColor: 'text-lime-600',
    borderColor: 'border-lime-200',
    hoverColor: 'hover:border-lime-400 hover:bg-lime-50'
  },
  { 
    id: 'SWMS', 
    abbr: 'SWMS', 
    name: 'Safe Work Method Statement',
    description: 'High-risk construction work',
    icon: Shield, 
    color: 'rose',
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-500',
    borderColor: 'border-rose-200',
    hoverColor: 'hover:border-rose-400 hover:bg-rose-50'
  },
  { 
    id: 'VEHICLE', 
    abbr: 'VWP', 
    name: 'Vehicle Work Permit',
    description: 'Mobile equipment operations',
    icon: Truck, 
    color: 'slate',
    bgColor: 'bg-slate-50',
    iconColor: 'text-slate-500',
    borderColor: 'border-slate-200',
    hoverColor: 'hover:border-slate-400 hover:bg-slate-50'
  },
  { 
    id: 'WORKING_AT_HEIGHT', 
    abbr: 'WHP', 
    name: 'Work Height Permit',
    description: 'Work above 2 meters height',
    icon: ArrowUpFromLine, 
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:border-blue-400 hover:bg-blue-50'
  },
]

const SelectPermitType = () => {
  const navigate = useNavigate()
  const [showBanner, setShowBanner] = useState(true)
  const [selectedType, setSelectedType] = useState(null)

  const handleSelectType = (type) => {
    setSelectedType(type.id)
    // Navigate to create permit with pre-selected type (use full path to preserve query params)
    navigate(`/workpermit/permits/create?type=${type.id}`)
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Work Permit Request</h1>
      </div>

      {/* Info Banner */}
      {showBanner && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-blue-800 text-sm">
              We have created permit templates for you to get started. If you are an Administrator, 
              you can edit any of these or create a new permit template from{' '}
              <span className="font-semibold">Settings → Permit Templates</span>.
            </p>
          </div>
          <button 
            onClick={() => setShowBanner(false)}
            className="text-blue-400 hover:text-blue-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Choose Permit Type */}
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-700">Choose permit type to continue</h2>
      </div>

      {/* Permit Type Grid - Safetymint Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {permitTypes.map((type) => {
          const IconComponent = type.icon
          return (
            <button
              key={type.id}
              onClick={() => handleSelectType(type)}
              className={`
                group relative bg-white border-2 ${type.borderColor} rounded-xl p-5
                transition-all duration-200 ${type.hoverColor}
                hover:shadow-lg hover:-translate-y-0.5
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                text-left
              `}
            >
              {/* Icon */}
              <div className={`w-12 h-12 ${type.bgColor} rounded-xl flex items-center justify-center mb-3`}>
                <IconComponent className={`w-6 h-6 ${type.iconColor}`} />
              </div>
              
              {/* Abbreviation */}
              <h3 className="text-xl font-bold text-gray-900 mb-1">{type.abbr}</h3>
              
              {/* Full Name */}
              <p className="text-sm text-gray-500 uppercase tracking-wide">{type.name}</p>
              
              {/* Hover description */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl">
                <p className="text-xs text-gray-600">{type.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Quick Access Legend */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Permit Type Color Legend</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { color: 'bg-orange-500', label: 'Hot Work' },
            { color: 'bg-purple-500', label: 'Confined Space' },
            { color: 'bg-yellow-500', label: 'Electrical' },
            { color: 'bg-blue-500', label: 'Height Work' },
            { color: 'bg-red-500', label: 'Chemical' },
            { color: 'bg-teal-500', label: 'Lifting' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SelectPermitType
