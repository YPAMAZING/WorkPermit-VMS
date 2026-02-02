import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Download,
  FileSpreadsheet,
  FileJson,
  Calendar,
  Filter,
  Check,
  Zap,
  Droplets,
  Flame,
  Radio,
  Thermometer,
  Gauge,
  Loader2,
  FileText,
  BarChart3,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const meterTypes = [
  { value: 'electricity', label: 'Electricity', icon: Zap, color: 'yellow' },
  { value: 'water', label: 'Water', icon: Droplets, color: 'blue' },
  { value: 'gas', label: 'Gas', icon: Flame, color: 'orange' },
  { value: 'transmitter', label: 'Transmitter', icon: Radio, color: 'green' },
  { value: 'temperature', label: 'Temperature', icon: Thermometer, color: 'red' },
  { value: 'pressure', label: 'Pressure', icon: Gauge, color: 'purple' },
]

const MISExport = () => {
  const [exportFormat, setExportFormat] = useState('csv')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [exporting, setExporting] = useState(false)

  const handleTypeToggle = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const token = localStorage.getItem('token')
      
      const params = new URLSearchParams({ format: exportFormat })
      if (selectedTypes.length === 1) {
        params.append('meterType', selectedTypes[0])
      }
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)

      const response = await axios.get(`${API_URL}/meters/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: exportFormat === 'csv' ? 'blob' : 'json',
      })

      const dateStr = new Date().toISOString().split('T')[0]
      const typeStr = selectedTypes.length === 1 ? `_${selectedTypes[0]}` : ''
      
      if (exportFormat === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meter_readings${typeStr}_${dateStr}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('CSV exported successfully!')
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meter_readings${typeStr}_${dateStr}.json`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('JSON exported successfully! Ready for Power BI import.')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Error exporting data')
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setSelectedTypes([])
    setDateRange({ startDate: '', endDate: '' })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
        <p className="text-gray-500 mt-2">
          Export meter readings to CSV or JSON format for Excel, Power BI, or other tools
        </p>
      </div>

      {/* Export Format Selection */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Format</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setExportFormat('csv')}
            className={`p-6 rounded-xl border-2 transition-all ${
              exportFormat === 'csv'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                exportFormat === 'csv' ? 'bg-purple-500' : 'bg-gray-100'
              }`}>
                <FileSpreadsheet className={`w-7 h-7 ${exportFormat === 'csv' ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">CSV Format</h3>
                <p className="text-sm text-gray-500">For Excel, Google Sheets</p>
              </div>
              {exportFormat === 'csv' && (
                <Check className="w-5 h-5 text-purple-500 ml-auto" />
              )}
            </div>
          </button>

          <button
            onClick={() => setExportFormat('json')}
            className={`p-6 rounded-xl border-2 transition-all ${
              exportFormat === 'json'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                exportFormat === 'json' ? 'bg-blue-500' : 'bg-gray-100'
              }`}>
                <FileJson className={`w-7 h-7 ${exportFormat === 'json' ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">JSON Format</h3>
                <p className="text-sm text-gray-500">For Power BI, APIs</p>
              </div>
              {exportFormat === 'json' && (
                <Check className="w-5 h-5 text-blue-500 ml-auto" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Meter Type Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Filter by Meter Type</h2>
          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Clear selection
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Select specific meter types to export, or leave empty to export all
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {meterTypes.map((type) => {
            const Icon = type.icon
            const isSelected = selectedTypes.includes(type.value)
            
            return (
              <button
                key={type.value}
                onClick={() => handleTypeToggle(type.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? `border-${type.color}-500 bg-${type.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? `bg-${type.color}-500` : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                  {type.label}
                </span>
                {isSelected && (
                  <Check className={`w-4 h-4 text-${type.color}-500 ml-auto`} />
                )}
              </button>
            )
          })}
        </div>

        {selectedTypes.length > 0 && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">
              <strong>{selectedTypes.length}</strong> meter type{selectedTypes.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Date Range</h2>
          {(dateRange.startDate || dateRange.endDate) && (
            <button
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Clear dates
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Optionally filter by date range, or leave empty to export all readings
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export Summary & Button */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Export Summary</h2>
        
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between py-2 border-b border-white/20">
            <span className="text-purple-100">Format</span>
            <span className="font-medium">{exportFormat.toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/20">
            <span className="text-purple-100">Meter Types</span>
            <span className="font-medium">
              {selectedTypes.length > 0 ? selectedTypes.join(', ') : 'All Types'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/20">
            <span className="text-purple-100">Date Range</span>
            <span className="font-medium">
              {dateRange.startDate || dateRange.endDate 
                ? `${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}`
                : 'All Time'
              }
            </span>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-3 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export {exportFormat.toUpperCase()} File
            </>
          )}
        </button>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">
          Need help with the exported data?
        </h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li className="flex items-start gap-2">
            <FileSpreadsheet className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>CSV:</strong> Open directly in Excel or Google Sheets for analysis</span>
          </li>
          <li className="flex items-start gap-2">
            <BarChart3 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>Power BI:</strong> Use "Get Data" → "JSON" to import the exported file</span>
          </li>
          <li className="flex items-start gap-2">
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>Columns:</strong> Date, Meter Type, Name, Serial, Location, Reading, Unit, Consumption, Verified</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default MISExport
