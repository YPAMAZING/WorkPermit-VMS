import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import axios from 'axios'
import {
  Camera,
  Upload,
  Zap,
  Droplets,
  Flame,
  Radio,
  Thermometer,
  Gauge,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  FileSpreadsheet,
  Image,
  X,
  Check,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { extractMeterReading, preprocessImage, setOCRProgressCallback, getDefaultUnit } from '../utils/ocr'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Meter type icons mapping
const meterIcons = {
  electricity: Zap,
  water: Droplets,
  gas: Flame,
  transmitter: Radio,
  temperature: Thermometer,
  pressure: Gauge,
  fuel: Gauge,
  flow: TrendingUp,
  voltage: Zap,
  current: Zap,
  power: Zap,
  frequency: Radio,
  humidity: Droplets,
  custom: Gauge,
}

const MeterReadings = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [readings, setReadings] = useState([])
  const [meterTypes, setMeterTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [addingDemo, setAddingDemo] = useState(false)
  const [filters, setFilters] = useState({
    meterType: '',
    search: '',
    startDate: '',
    endDate: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    fetchMeterTypes()
    fetchReadings()
  }, [filters, pagination.page])

  const fetchMeterTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/meters/types`)
      setMeterTypes(response.data)
    } catch (error) {
      console.error('Error fetching meter types:', error)
    }
  }

  const fetchReadings = async () => {
    try {
      setLoading(true)
      setFetchError(null)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.meterType && { meterType: filters.meterType }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      })

      const response = await axios.get(`${API_URL}/meters?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setReadings(response.data.readings || [])
      setPagination(prev => ({ 
        ...prev, 
        ...response.data.pagination,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }))
    } catch (error) {
      console.error('Error fetching readings:', error)
      // Don't show toast for empty data - handle gracefully
      if (error.response?.status === 404 || error.response?.status === 500) {
        setFetchError('Could not load readings. Please try again later.')
      }
      setReadings([])
      setPagination(prev => ({ ...prev, total: 0, pages: 0 }))
    } finally {
      setLoading(false)
    }
  }

  const goToAnalytics = () => {
    navigate('/mis/analytics')
  }

  // Add demo readings for testing
  const addDemoReadings = async () => {
    try {
      setAddingDemo(true)
      const token = localStorage.getItem('token')
      
      const demoReadings = [
        { meterType: 'electricity', meterName: 'Main Building Meter', meterSerial: 'ELEC-001', location: 'Building A - Ground Floor', readingValue: 12450.5, unit: 'kWh', notes: 'Monthly reading' },
        { meterType: 'electricity', meterName: 'Office Block Meter', meterSerial: 'ELEC-002', location: 'Building B - Floor 1', readingValue: 8920.3, unit: 'kWh', notes: 'Weekly check' },
        { meterType: 'water', meterName: 'Main Water Supply', meterSerial: 'WTR-001', location: 'Building A - Basement', readingValue: 3250.8, unit: 'm³', notes: 'Water consumption' },
        { meterType: 'water', meterName: 'Garden Irrigation', meterSerial: 'WTR-002', location: 'Outdoor Area', readingValue: 520.4, unit: 'm³', notes: 'Irrigation system' },
        { meterType: 'gas', meterName: 'Kitchen Gas Meter', meterSerial: 'GAS-001', location: 'Building A - Kitchen', readingValue: 1850.2, unit: 'm³', notes: 'Kitchen usage' },
        { meterType: 'temperature', meterName: 'Server Room Temp', meterSerial: 'TEMP-001', location: 'Building B - Server Room', readingValue: 22.5, unit: '°C', notes: 'Temperature monitoring' },
        { meterType: 'pressure', meterName: 'Boiler Pressure', meterSerial: 'PRES-001', location: 'Building A - Boiler Room', readingValue: 2.4, unit: 'bar', notes: 'Boiler system' },
        { meterType: 'fuel', meterName: 'Generator Fuel', meterSerial: 'FUEL-001', location: 'Warehouse - Generator', readingValue: 450.0, unit: 'L', notes: 'Backup generator' },
      ]

      let successCount = 0
      for (const reading of demoReadings) {
        try {
          await axios.post(`${API_URL}/meters`, reading, {
            headers: { Authorization: `Bearer ${token}` }
          })
          successCount++
        } catch (err) {
          console.error('Failed to add reading:', err)
        }
      }

      toast.success(`Added ${successCount} demo readings!`)
      fetchReadings()
    } catch (error) {
      toast.error('Error adding demo readings')
      console.error('Error:', error)
    } finally {
      setAddingDemo(false)
    }
  }

  const handleExport = async (format = 'csv') => {
    setShowExportMenu(false)
    
    if (readings.length === 0) {
      toast.error('No data to export')
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      const exportFormat = format === 'xlsx' ? 'csv' : format
      const params = new URLSearchParams({
        format: exportFormat,
        ...(filters.meterType && { meterType: filters.meterType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      })

      const response = await axios.get(`${API_URL}/meters/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: format === 'json' ? 'json' : 'blob',
      })

      const filename = `meter_readings_${new Date().toISOString().split('T')[0]}`

      if (format === 'xlsx') {
        // Add BOM for Excel compatibility
        const BOM = '\uFEFF'
        const csvText = await response.data.text()
        const blob = new Blob([BOM + csvText], { type: 'application/vnd.ms-excel;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.xlsx`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('Excel file exported successfully!')
      } else if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('CSV exported successfully!')
      } else {
        // JSON export
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.json`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('JSON exported successfully!')
      }
    } catch (error) {
      toast.error('Error exporting data')
      console.error('Error:', error)
    }
  }

  const deleteReading = async (id) => {
    if (!confirm('Are you sure you want to delete this reading? This action cannot be undone.')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/meters/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Reading deleted successfully')
      fetchReadings()
    } catch (error) {
      toast.error('Error deleting reading')
      console.error('Error:', error)
    }
  }

  const deleteAllReadings = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${pagination.total} readings? This action cannot be undone.`)) return
    if (!confirm('This will permanently delete all meter readings. Type OK to confirm.')) return

    try {
      const token = localStorage.getItem('token')
      let deleted = 0
      
      // Delete all readings one by one (since there's no bulk delete endpoint)
      toast.loading('Deleting readings...', { id: 'delete-all' })
      
      for (const reading of readings) {
        try {
          await axios.delete(`${API_URL}/meters/${reading.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          deleted++
        } catch (err) {
          console.error('Failed to delete:', reading.id)
        }
      }
      
      toast.dismiss('delete-all')
      toast.success(`Deleted ${deleted} readings`)
      fetchReadings()
    } catch (error) {
      toast.dismiss('delete-all')
      toast.error('Error deleting readings')
      console.error('Error:', error)
    }
  }

  const getIcon = (type) => {
    const Icon = meterIcons[type] || Gauge
    return Icon
  }

  const getStatusBadge = (reading) => {
    if (reading.isVerified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Verified
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    )
  }

  const getConsumptionBadge = (consumption) => {
    if (consumption === null || consumption === undefined) return null

    if (consumption > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600">
          <TrendingUp className="w-3 h-3" />
          +{consumption.toFixed(2)}
        </span>
      )
    } else if (consumption < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <TrendingDown className="w-3 h-3" />
          {consumption.toFixed(2)}
        </span>
      )
    }
    return <span className="text-xs text-gray-500">No change</span>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meter Readings</h1>
          <p className="text-gray-500 mt-1">Upload and manage meter/transmitter readings with AI OCR</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goToAnalytics}
            className="btn btn-outline flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {showExportMenu && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Export Data</p>
                  </div>
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Export as Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    Export as JSON
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            New Reading
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search meters..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10"
              />
            </div>
            <select
              value={filters.meterType}
              onChange={(e) => setFilters({ ...filters, meterType: e.target.value })}
              className="input"
            >
              <option value="">All Meter Types</option>
              {meterTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Gauge className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Readings</p>
                <p className="text-xl font-bold text-gray-900">{pagination.total}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Verified</p>
                <p className="text-xl font-bold text-gray-900">
                  {readings.filter(r => r.isVerified).length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold text-gray-900">
                  {readings.filter(r => !r.isVerified).length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Image className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">With OCR</p>
                <p className="text-xl font-bold text-gray-900">
                  {readings.filter(r => r.ocrRawText).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Readings Table */}
      <div className="card">
        {/* Table Header with Actions */}
        {readings.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{readings.length}</span> of <span className="font-medium">{pagination.total}</span> readings
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={addDemoReadings}
                disabled={addingDemo}
                className="btn btn-outline btn-sm flex items-center gap-1.5"
              >
                {addingDemo ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add Demo Data
              </button>
              <button
                onClick={deleteAllReadings}
                className="btn btn-outline btn-sm flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reading</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumption</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
                      <p className="text-gray-500">Loading meter readings...</p>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <AlertTriangle className="w-12 h-12 text-yellow-500" />
                      <p className="text-gray-700 font-medium">{fetchError}</p>
                      <button 
                        onClick={() => fetchReadings()} 
                        className="btn btn-outline btn-sm flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : readings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Gauge className="w-16 h-16 text-gray-300" />
                      <div>
                        <p className="text-gray-700 font-medium text-lg">No Meter Readings Found</p>
                        <p className="text-gray-500 text-sm">Start by uploading your first meter reading or add demo data</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <button 
                          onClick={() => setShowUploadModal(true)} 
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Upload First Reading
                        </button>
                        <button 
                          onClick={addDemoReadings}
                          disabled={addingDemo}
                          className="btn btn-outline flex items-center gap-2"
                        >
                          {addingDemo ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Adding Demo Data...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Add Demo Readings
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                readings.map((reading) => {
                  const Icon = getIcon(reading.meterType)
                  return (
                    <tr key={reading.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{reading.meterName}</p>
                            <p className="text-xs text-gray-500">{reading.meterSerial || reading.meterType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{reading.location}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-gray-900">
                          {reading.readingValue.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">{reading.unit}</span>
                      </td>
                      <td className="px-4 py-3">{getConsumptionBadge(reading.consumption)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(reading.readingDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(reading)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {reading.imageUrl && (
                            <a
                              href={reading.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-gray-100"
                              title="View Image"
                            >
                              <Image className="w-4 h-4 text-gray-500" />
                            </a>
                          )}
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => deleteReading(reading.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn btn-outline btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="btn btn-outline btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <MeterUploadModal
          meterTypes={meterTypes}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
            fetchReadings()
          }}
        />
      )}
    </div>
  )
}

// Upload Modal Component with OCR
const MeterUploadModal = ({ meterTypes, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    meterType: '',
    meterName: '',
    meterSerial: '',
    location: '',
    readingValue: '',
    unit: '',
    notes: '',
    readingDate: new Date().toISOString().split('T')[0],
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrResult, setOcrResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [useCamera, setUseCamera] = useState(false)

  // Set up OCR progress callback
  useEffect(() => {
    setOCRProgressCallback(setOcrProgress)
    return () => setOCRProgressCallback(null)
  }, [])

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))

    // Process OCR
    await processOCR(file)
  }

  const processOCR = async (file) => {
    setOcrProcessing(true)
    setOcrProgress(0)
    setOcrResult(null)

    try {
      // Preprocess image for better OCR results
      toast.loading('Processing image with AI OCR...', { id: 'ocr' })
      
      const processedImage = await preprocessImage(file)
      
      // Run Tesseract.js OCR
      const result = await extractMeterReading(processedImage)
      
      toast.dismiss('ocr')

      if (result.extractedValue !== null) {
        setOcrResult({
          rawText: result.rawText,
          extractedValue: result.extractedValue,
          confidence: result.confidence,
          unit: result.unit || getDefaultUnit(formData.meterType),
          allMatches: result.allMatches,
        })

        // Auto-fill the form
        setFormData(prev => ({
          ...prev,
          readingValue: result.extractedValue.toString(),
          unit: result.unit || getDefaultUnit(formData.meterType) || prev.unit,
        }))

        toast.success(`OCR completed! Reading: ${result.extractedValue} ${result.unit || ''} (${Math.round(result.confidence * 100)}% confidence)`)
      } else {
        toast.error('Could not extract reading from image. Please enter manually.')
        setOcrResult({
          rawText: result.rawText,
          extractedValue: null,
          confidence: result.confidence,
          unit: '',
          allMatches: [],
        })
      }
    } catch (error) {
      console.error('OCR Error:', error)
      toast.dismiss('ocr')
      toast.error('OCR processing failed. Please enter reading manually.')
    } finally {
      setOcrProcessing(false)
      setOcrProgress(0)
    }
  }

  const handleMeterTypeChange = (e) => {
    const type = meterTypes.find(t => t.value === e.target.value)
    setFormData(prev => ({
      ...prev,
      meterType: e.target.value,
      unit: type?.unit || prev.unit,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')

      // Upload image first if exists
      let imageUrl = null
      if (imageFile) {
        // In production, upload to cloud storage (S3, Cloudinary, etc.)
        // For now, we'll skip actual upload
        imageUrl = imagePreview // Placeholder
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/meters`,
        {
          ...formData,
          imageUrl,
          ocrRawText: ocrResult?.rawText,
          ocrConfidence: ocrResult?.confidence,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success('Meter reading saved successfully!')
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving reading')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">New Meter Reading</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Upload Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Upload Meter Photo (AI OCR Auto-fill)
            </h3>

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Meter"
                  className="w-full max-h-64 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                    setOcrResult(null)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                {ocrProcessing && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg">
                    <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                    <p className="text-white text-sm font-medium">Processing OCR...</p>
                    <div className="w-48 h-2 bg-white/30 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                    <p className="text-white/70 text-xs mt-1">{ocrProgress}%</p>
                  </div>
                )}
                {ocrResult && !ocrProcessing && (
                  <div className={`mt-3 p-3 rounded-lg border ${ocrResult.extractedValue !== null ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    {ocrResult.extractedValue !== null ? (
                      <>
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          <span>Extracted Reading:</span>
                          <span className="font-mono font-bold text-lg">{ocrResult.extractedValue} {ocrResult.unit}</span>
                          <span className="text-xs text-green-600 ml-auto">
                            {Math.round(ocrResult.confidence * 100)}% confidence
                          </span>
                        </p>
                        {ocrResult.rawText && (
                          <p className="text-xs text-green-600 mt-1 truncate">
                            Raw text: "{ocrResult.rawText.substring(0, 100)}..."
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-yellow-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Could not extract numeric reading. Please enter manually.
                        {ocrResult.rawText && (
                          <span className="text-xs ml-2">Found: "{ocrResult.rawText.substring(0, 50)}..."</span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-4">
                <label className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Upload Photo</span>
                  <span className="text-xs text-gray-400">JPG, PNG up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
                <label className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 transition-colors">
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Take Photo</span>
                  <span className="text-xs text-gray-400">Use device camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Meter Type *</label>
              <select
                value={formData.meterType}
                onChange={handleMeterTypeChange}
                className="input"
                required
              >
                <option value="">Select Type</option>
                {meterTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Meter Name *</label>
              <input
                type="text"
                value={formData.meterName}
                onChange={(e) => setFormData({ ...formData, meterName: e.target.value })}
                className="input"
                placeholder="e.g., Main Building Meter"
                required
              />
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input
                type="text"
                value={formData.meterSerial}
                onChange={(e) => setFormData({ ...formData, meterSerial: e.target.value })}
                className="input"
                placeholder="e.g., MTR-12345"
              />
            </div>
            <div>
              <label className="label">Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="input"
                placeholder="e.g., Building A, Floor 2"
                required
              />
            </div>
            <div>
              <label className="label">Reading Value *</label>
              <input
                type="number"
                step="0.01"
                value={formData.readingValue}
                onChange={(e) => setFormData({ ...formData, readingValue: e.target.value })}
                className="input font-mono"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label">Unit *</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input"
                placeholder="e.g., kWh, m³"
                required
              />
            </div>
            <div>
              <label className="label">Reading Date</label>
              <input
                type="date"
                value={formData.readingDate}
                onChange={(e) => setFormData({ ...formData, readingDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Save Reading
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}



export default MeterReadings
