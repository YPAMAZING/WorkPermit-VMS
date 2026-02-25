import { useState, useEffect } from 'react'
import { useVMSAuth } from '../../context/VMSAuthContext'
import { dashboardApi, visitorsApi, gatepassesApi } from '../../services/vmsApi'
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  PieChart,
  X,
  Search,
  Phone,
  Building,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
} from 'lucide-react'

const VMSReports = () => {
  const { isAdmin } = useVMSAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })
  const [reportData, setReportData] = useState({
    overview: null,
    weeklyStats: null,
    visitorStats: null,
    gatepassStats: null,
  })
  
  // All Visitors Modal State
  const [showVisitorsModal, setShowVisitorsModal] = useState(false)
  const [allVisitors, setAllVisitors] = useState([])
  const [visitorsLoading, setVisitorsLoading] = useState(false)
  const [visitorSearch, setVisitorSearch] = useState('')
  const [visitorPagination, setVisitorPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [selectedVisitor, setSelectedVisitor] = useState(null)

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const [overview, weeklyStats, gatepassStats] = await Promise.all([
        dashboardApi.getOverview().catch(() => ({ data: {} })),
        dashboardApi.getWeeklyStats().catch(() => ({ data: {} })),
        gatepassesApi.getStats('month').catch(() => ({ data: {} })),
      ])

      setReportData({
        overview: overview.data,
        weeklyStats: weeklyStats.data,
        gatepassStats: gatepassStats.data,
      })
    } catch (error) {
      console.error('Failed to fetch report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchReportData()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  // Fetch all visitors for the modal
  const fetchAllVisitors = async (page = 1, search = '') => {
    try {
      setVisitorsLoading(true)
      const response = await visitorsApi.getAll({
        page,
        limit: 20,
        search: search || undefined,
      })
      console.log('All Visitors Response:', response.data)
      setAllVisitors(response.data.visitors || [])
      setVisitorPagination({
        page: response.data.pagination?.page || 1,
        limit: response.data.pagination?.limit || 20,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0,
      })
    } catch (error) {
      console.error('Failed to fetch all visitors:', error)
    } finally {
      setVisitorsLoading(false)
    }
  }

  // Open visitors modal
  const handleShowAllVisitors = () => {
    setShowVisitorsModal(true)
    setVisitorSearch('')
    setVisitorPagination({ page: 1, limit: 20, total: 0, totalPages: 0 })
    fetchAllVisitors(1, '')
  }

  // Search visitors with debounce
  useEffect(() => {
    if (showVisitorsModal) {
      const debounce = setTimeout(() => {
        fetchAllVisitors(1, visitorSearch)
      }, 500)
      return () => clearTimeout(debounce)
    }
  }, [visitorSearch])

  const handleExport = (type) => {
    // Generate CSV data
    const csvData = []
    
    if (type === 'visitors') {
      csvData.push(['Date', 'Total Visitors', 'New Visitors', 'Checked In', 'Checked Out'])
      reportData.weeklyStats?.dailyStats?.forEach(day => {
        csvData.push([day.date, day.visitors || 0, day.visitors || 0, 0, 0])
      })
    } else if (type === 'gatepasses') {
      csvData.push(['Date', 'Total', 'Active', 'Completed', 'Cancelled'])
      reportData.weeklyStats?.dailyStats?.forEach(day => {
        csvData.push([day.date, day.gatepasses || 0, 0, 0, 0])
      })
    }

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n')
    
    // Download
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vms_${type}_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Export all visitors to proper CSV format
  const handleExportCSV = async () => {
    try {
      const response = await visitorsApi.getAll({ 
        page: 1, 
        limit: 5000,
        startDate: dateRange.from,
        endDate: dateRange.to
      })
      const visitors = response.data.visitors || []
      
      if (visitors.length === 0) {
        alert('No visitors found in the selected date range')
        return
      }
      
      const formatDate = (date) => {
        if (!date) return ''
        return new Date(date).toLocaleString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        })
      }
      
      // Escape CSV field - handle commas, quotes, and newlines
      const escapeCSV = (field) => {
        if (field === null || field === undefined) return ''
        const str = String(field)
        // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }
      
      // CSV Headers - clean data only, no base64 images
      const headers = [
        'S.No',
        'Name',
        'Phone',
        'Email',
        'Company From',
        'Company To Visit',
        'Person To Meet',
        'Purpose',
        'Vehicle Number',
        'ID Proof Type',
        'ID Proof Number',
        'No. of Visitors',
        'Status',
        'Check-in Time',
        'Pass Number',
        'Created At',
        'Has Photo',
        'Has ID Document'
      ]
      
      // CSV Rows - replace base64 with Yes/No indicators
      const rows = visitors.map((v, index) => [
        index + 1,
        escapeCSV(v.visitorName || ''),
        escapeCSV(v.phone || ''),
        escapeCSV(v.email || ''),
        escapeCSV(v.companyFrom || ''),
        escapeCSV(v.companyToVisit || ''),
        escapeCSV(v.personToMeet || ''),
        escapeCSV(v.purpose || ''),
        escapeCSV(v.vehicleNumber || ''),
        escapeCSV(v.idProofType || ''),
        escapeCSV(v.idProofNumber || ''),
        v.numberOfVisitors || 1,
        escapeCSV(v.status || ''),
        escapeCSV(formatDate(v.checkInTime)),
        escapeCSV(v.gatepass?.gatepassNumber || v.requestNumber || ''),
        escapeCSV(formatDate(v.createdAt)),
        v.photo ? 'Yes' : 'No',
        v.idDocumentImage ? 'Yes' : 'No'
      ])
      
      // Build CSV content with BOM for Excel
      const BOM = '\uFEFF'
      const csvContent = BOM + headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n')
      
      // Download as CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `visitors_report_${dateRange.from}_to_${dateRange.to}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export visitors:', error)
      alert('Failed to export visitors. Please try again.')
    }
  }

  // Export visitors with images (HTML format that displays photos)
  const handleExportWithImages = async () => {
    try {
      const response = await visitorsApi.getAll({ 
        page: 1, 
        limit: 500,
        startDate: dateRange.from,
        endDate: dateRange.to
      })
      const visitors = response.data.visitors || []
      
      if (visitors.length === 0) {
        alert('No visitors found in the selected date range')
        return
      }
      
      const formatDate = (date) => {
        if (!date) return '-'
        return new Date(date).toLocaleString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        })
      }
      
      // Create HTML with embedded images
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Visitors Report - ${dateRange.from} to ${dateRange.to}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #0d9488; }
    .header h1 { color: #0d9488; font-size: 28px; margin-bottom: 10px; }
    .header p { color: #666; font-size: 14px; }
    .stats { display: flex; justify-content: center; gap: 30px; margin-bottom: 30px; }
    .stat-box { background: #f0fdfa; padding: 15px 25px; border-radius: 8px; text-align: center; }
    .stat-box .number { font-size: 24px; font-weight: bold; color: #0d9488; }
    .stat-box .label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #0d9488; color: white; padding: 12px 8px; font-size: 12px; text-align: left; white-space: nowrap; }
    td { padding: 10px 8px; border-bottom: 1px solid #e5e5e5; font-size: 12px; vertical-align: middle; }
    tr:hover { background: #f9fafb; }
    .photo-cell { width: 70px; }
    .photo-img { width: 50px; height: 50px; object-fit: cover; border-radius: 50%; border: 2px solid #0d9488; }
    .doc-cell { width: 120px; }
    .doc-img { width: 100px; height: 70px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; }
    .no-img { color: #ccc; font-size: 11px; font-style: italic; }
    .status { padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .status-approved, .status-checked_in { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef9c3; color: #854d0e; }
    .status-rejected, .status-cancelled { background: #fee2e2; color: #991b1b; }
    .status-checked_out, .status-completed { background: #dbeafe; color: #1e40af; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 11px; }
    @media print { 
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Visitors Report</h1>
      <p>Date Range: ${dateRange.from} to ${dateRange.to}</p>
    </div>
    <div class="stats">
      <div class="stat-box">
        <div class="number">${visitors.length}</div>
        <div class="label">Total Visitors</div>
      </div>
      <div class="stat-box">
        <div class="number">${visitors.filter(v => v.status === 'CHECKED_IN' || v.status === 'APPROVED').length}</div>
        <div class="label">Active / Checked In</div>
      </div>
      <div class="stat-box">
        <div class="number">${visitors.filter(v => v.photo).length}</div>
        <div class="label">With Photo</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th class="photo-cell">Photo</th>
          <th>Name</th>
          <th>Phone</th>
          <th>Company From</th>
          <th>Company To Visit</th>
          <th>Person To Meet</th>
          <th>Purpose</th>
          <th>Vehicle</th>
          <th>ID Proof</th>
          <th>Status</th>
          <th>Check-in</th>
          <th>Pass No.</th>
          <th class="doc-cell">ID Document</th>
        </tr>
      </thead>
      <tbody>
        ${visitors.map((v, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="photo-cell">${v.photo ? `<img src="${v.photo}" class="photo-img" alt="Photo" onerror="this.style.display='none'" />` : '<span class="no-img">No photo</span>'}</td>
            <td><strong>${v.visitorName || '-'}</strong></td>
            <td>${v.phone || '-'}</td>
            <td>${v.companyFrom || '-'}</td>
            <td>${v.companyToVisit || '-'}</td>
            <td>${v.personToMeet || '-'}</td>
            <td>${v.purpose || '-'}</td>
            <td>${v.vehicleNumber || '-'}</td>
            <td>${v.idProofType || '-'}${v.idProofNumber ? ': ' + v.idProofNumber : ''}</td>
            <td><span class="status status-${(v.status || '').toLowerCase()}">${v.status || '-'}</span></td>
            <td>${formatDate(v.checkInTime)}</td>
            <td>${v.gatepass?.gatepassNumber || v.requestNumber || '-'}</td>
            <td class="doc-cell">${v.idDocumentImage ? `<img src="${v.idDocumentImage}" class="doc-img" alt="ID Doc" onerror="this.style.display='none'" />` : '<span class="no-img">No document</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="footer">
      <p>Generated on ${new Date().toLocaleString('en-IN')} | Reliable Group Digital System VMS</p>
      <p style="margin-top: 5px;">💡 Tip: Use Ctrl+P to print this report or save as PDF</p>
    </div>
  </div>
</body>
</html>
      `
      
      // Open in new window for viewing/printing
      const newWindow = window.open('', '_blank')
      newWindow.document.write(htmlContent)
      newWindow.document.close()
    } catch (error) {
      console.error('Failed to export visitors with images:', error)
      alert('Failed to export visitors. Please try again.')
    }
  }

  // Export visitors to PDF (opens print dialog for saving as PDF)
  const handleExportPDF = async () => {
    try {
      const response = await visitorsApi.getAll({ 
        page: 1, 
        limit: 200,
        startDate: dateRange.from,
        endDate: dateRange.to
      })
      const visitors = response.data.visitors || []
      
      if (visitors.length === 0) {
        alert('No visitors found in the selected date range')
        return
      }

      const formatDate = (date) => {
        if (!date) return '-'
        return new Date(date).toLocaleString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        })
      }

      // Create printable PDF content with visitor cards
      const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Visitors Report - ${dateRange.from} to ${dateRange.to}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: white; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #0d9488; }
    .header h1 { color: #0d9488; font-size: 24px; margin-bottom: 8px; }
    .header p { color: #666; font-size: 14px; }
    .visitor-card { 
      border: 1px solid #e5e7eb; 
      border-radius: 12px; 
      padding: 20px; 
      margin-bottom: 20px; 
      page-break-inside: avoid;
      background: #fafafa;
    }
    .visitor-header { 
      display: flex; 
      align-items: center; 
      gap: 15px; 
      margin-bottom: 15px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .visitor-photo { 
      width: 70px; 
      height: 70px; 
      border-radius: 50%; 
      object-fit: cover;
      border: 3px solid #0d9488;
    }
    .visitor-photo-placeholder {
      width: 70px; 
      height: 70px; 
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 28px;
      border: 3px solid #d1d5db;
    }
    .visitor-name { font-size: 18px; font-weight: bold; color: #1f2937; }
    .visitor-status { 
      display: inline-block;
      padding: 4px 12px; 
      border-radius: 12px; 
      font-size: 11px; 
      font-weight: 600;
      margin-top: 5px;
      text-transform: uppercase;
    }
    .status-approved, .status-checked_in { background: #dcfce7; color: #166534; }
    .status-checked_out, .status-completed { background: #dbeafe; color: #1e40af; }
    .status-pending { background: #fef9c3; color: #854d0e; }
    .status-rejected, .status-cancelled { background: #fee2e2; color: #991b1b; }
    .details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .detail-item { padding: 10px; background: white; border-radius: 6px; border: 1px solid #f3f4f6; }
    .detail-label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
    .detail-value { font-size: 13px; color: #1f2937; font-weight: 500; margin-top: 3px; }
    .id-section { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
    .id-section h4 { font-size: 12px; color: #6b7280; margin-bottom: 10px; font-weight: 600; }
    .id-image { max-width: 200px; max-height: 130px; border-radius: 6px; border: 1px solid #d1d5db; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    @media print {
      body { padding: 10px; }
      .visitor-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Visitors Report</h1>
    <p>Date Range: ${dateRange.from} to ${dateRange.to} | Total Visitors: ${visitors.length}</p>
  </div>
  
  ${visitors.map((v, i) => `
    <div class="visitor-card">
      <div class="visitor-header">
        ${v.photo 
          ? '<img src="' + v.photo + '" class="visitor-photo" alt="Photo" onerror="this.outerHTML=\'<div class=visitor-photo-placeholder>👤</div>\'" />'
          : '<div class="visitor-photo-placeholder">👤</div>'
        }
        <div>
          <div class="visitor-name">${i + 1}. ${v.visitorName || 'N/A'}</div>
          <span class="visitor-status status-${(v.status || '').toLowerCase()}">${v.status || 'N/A'}</span>
        </div>
      </div>
      
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Phone</div>
          <div class="detail-value">${v.phone || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Email</div>
          <div class="detail-value">${v.email || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Company From</div>
          <div class="detail-value">${v.companyFrom || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Company To Visit</div>
          <div class="detail-value">${v.companyToVisit || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Person To Meet</div>
          <div class="detail-value">${v.personToMeet || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Purpose</div>
          <div class="detail-value">${v.purpose || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Vehicle Number</div>
          <div class="detail-value">${v.vehicleNumber || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Check-in Time</div>
          <div class="detail-value">${formatDate(v.checkInTime)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">ID Proof</div>
          <div class="detail-value">${v.idProofType || '-'}${v.idProofNumber ? ': ' + v.idProofNumber : ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Pass Number</div>
          <div class="detail-value">${v.gatepass?.gatepassNumber || v.requestNumber || '-'}</div>
        </div>
      </div>
      
      ${v.idDocumentImage ? '<div class="id-section"><h4>📄 ID Document</h4><img src="' + v.idDocumentImage + '" class="id-image" alt="ID Document" onerror="this.style.display=\'none\'" /></div>' : ''}
    </div>
  `).join('')}
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')} | Reliable Group Digital System VMS</p>
  </div>
</body>
</html>
      `

      // Open print dialog (user can save as PDF)
      const printWindow = window.open('', '_blank')
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 500)
      
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  // Clickable StatCard component
  const StatCard = ({ title, value, icon: Icon, color, subtitle, onClick }) => (
    <div 
      className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-200 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {onClick && <p className="text-xs text-teal-600 mt-2">Click to view details</p>}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  )

  // Status color helper
  const getStatusColor = (status) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'CHECKED_IN': 'bg-blue-100 text-blue-800',
      'CHECKED_OUT': 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
      </div>
    )
  }

  const overview = reportData.overview || {}
  const weeklyStats = reportData.weeklyStats || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Visitor management insights and statistics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Download size={18} />
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileText size={18} />
              Export PDF
            </button>
            <button
              onClick={handleExportWithImages}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Eye size={18} />
              View with Images
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Visitors"
          value={overview.summary?.totalVisitors || 0}
          icon={Users}
          color="bg-teal-500"
          subtitle="All time"
          onClick={handleShowAllVisitors}
        />
        <StatCard
          title="Today's Visitors"
          value={overview.today?.gatepasses?.total || 0}
          icon={FileText}
          color="bg-blue-500"
          subtitle={`${overview.today?.gatepasses?.active || 0} active`}
        />
        <StatCard
          title="Pre-approved"
          value={overview.summary?.activePreApprovals || 0}
          icon={CheckCircle}
          color="bg-green-500"
          subtitle="Currently active"
        />
        <StatCard
          title="Blacklisted"
          value={overview.summary?.activeBlacklist || 0}
          icon={AlertTriangle}
          color="bg-red-500"
          subtitle="Active bans"
        />
      </div>

      {/* Weekly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-teal-600" />
              Weekly Visitor Trend
            </h2>
          </div>
          {weeklyStats.dailyStats?.length > 0 ? (
            <div className="space-y-4">
              {weeklyStats.dailyStats.map((day, index) => {
                const maxValue = Math.max(...weeklyStats.dailyStats.map(d => d.visitors || d.gatepasses || 0)) || 1
                const value = day.visitors || day.gatepasses || 0
                const percentage = (value / maxValue) * 100

                return (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-12 text-sm text-gray-500">{day.dayName}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 10)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{value}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No data available for this period</p>
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-800">{weeklyStats.totals?.gatepasses || weeklyStats.totalThisWeek || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Visitors</p>
              <p className="text-xl font-bold text-gray-800">{weeklyStats.totals?.visitors || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completion</p>
              <p className="text-xl font-bold text-teal-600">{weeklyStats.totals?.completionRate || 0}%</p>
            </div>
          </div>
        </div>

        {/* Purpose Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <PieChart size={20} className="text-blue-600" />
              Visit Purpose Breakdown
            </h2>
          </div>
          {overview.purposeBreakdown?.length > 0 ? (
            <div className="space-y-4">
              {overview.purposeBreakdown.map((item, index) => {
                const total = overview.purposeBreakdown.reduce((sum, i) => sum + i.count, 0) || 1
                const percentage = Math.round((item.count / total) * 100)
                const colors = [
                  'bg-blue-500',
                  'bg-teal-500',
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-pink-500',
                  'bg-indigo-500',
                  'bg-yellow-500',
                  'bg-gray-500',
                ]

                return (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-gray-600 truncate">{item.purpose?.replace('_', ' ')}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-16 text-sm text-gray-600 text-right">{item.count} ({percentage}%)</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No purpose data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Clock size={20} className="text-purple-600" />
          Today's Visitors Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-800">{overview.today?.gatepasses?.total || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-700">{overview.today?.gatepasses?.scheduled || 0}</p>
            <p className="text-sm text-yellow-600 mt-1">Scheduled</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-700">{overview.today?.gatepasses?.active || 0}</p>
            <p className="text-sm text-green-600 mt-1">Active</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-700">{overview.today?.gatepasses?.completed || 0}</p>
            <p className="text-sm text-blue-600 mt-1">Completed</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-700">{overview.today?.gatepasses?.cancelled || 0}</p>
            <p className="text-sm text-red-600 mt-1">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Report Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-teal-100 rounded-lg">
              <Download size={20} className="text-teal-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">Export CSV</p>
              <p className="text-sm text-gray-500">Clean data export</p>
            </div>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText size={20} className="text-red-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">Export PDF</p>
              <p className="text-sm text-gray-500">With photos & docs</p>
            </div>
          </button>
          <button
            onClick={handleExportWithImages}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye size={20} className="text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">View with Images</p>
              <p className="text-sm text-gray-500">Table with photos</p>
            </div>
          </button>
          <button
            onClick={handleShowAllVisitors}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">View All Visitors</p>
              <p className="text-sm text-gray-500">Browse visitor list</p>
            </div>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 size={20} className="text-gray-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">Print Dashboard</p>
              <p className="text-sm text-gray-500">Print current view</p>
            </div>
          </button>
        </div>
      </div>

      {/* All Visitors Modal */}
      {showVisitorsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users size={24} className="text-teal-600" />
                  All Visitors
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {allVisitors.length} of {visitorPagination.total} visitors
                  {visitorPagination.total === 0 && ' (Check backend logs for debug info)'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Download size={18} />
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    setShowVisitorsModal(false)
                    setSelectedVisitor(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, phone, company..."
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Visitors List */}
            <div className="flex-1 overflow-auto p-4">
              {visitorsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
                </div>
              ) : allVisitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Users size={48} className="mb-3 text-gray-300" />
                  <p>No visitors found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Visitor</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Contact</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Company</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Purpose</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allVisitors.map((visitor) => (
                        <tr key={visitor.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                {visitor.photo ? (
                                  <img src={visitor.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User size={20} className="text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{visitor.visitorName}</p>
                                <p className="text-xs text-gray-500">{visitor.requestNumber || visitor.id?.slice(0, 8)?.toUpperCase()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone size={14} />
                              {visitor.phone}
                            </div>
                            {visitor.email && (
                              <p className="text-xs text-gray-400">{visitor.email}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-800">{visitor.companyToVisit}</p>
                            {visitor.companyFrom && (
                              <p className="text-xs text-gray-400">From: {visitor.companyFrom}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">{visitor.purpose}</p>
                            {visitor.personToMeet && (
                              <p className="text-xs text-gray-400">Meeting: {visitor.personToMeet}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(visitor.status)}`}>
                              {visitor.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">
                              {visitor.createdAt ? new Date(visitor.createdAt).toLocaleDateString() : '-'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {visitor.createdAt ? new Date(visitor.createdAt).toLocaleTimeString() : ''}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedVisitor(visitor)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} className="text-gray-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {visitorPagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {((visitorPagination.page - 1) * visitorPagination.limit) + 1} to{' '}
                  {Math.min(visitorPagination.page * visitorPagination.limit, visitorPagination.total)} of{' '}
                  {visitorPagination.total} visitors
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newPage = visitorPagination.page - 1
                      setVisitorPagination(prev => ({ ...prev, page: newPage }))
                      fetchAllVisitors(newPage, visitorSearch)
                    }}
                    disabled={visitorPagination.page === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {visitorPagination.page} of {visitorPagination.totalPages}
                  </span>
                  <button
                    onClick={() => {
                      const newPage = visitorPagination.page + 1
                      setVisitorPagination(prev => ({ ...prev, page: newPage }))
                      fetchAllVisitors(newPage, visitorSearch)
                    }}
                    disabled={visitorPagination.page === visitorPagination.totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Visitor Details</h2>
              <button
                onClick={() => setSelectedVisitor(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Visitor Info */}
            <div className="p-6 space-y-6">
              {/* Photo and Basic Info */}
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {selectedVisitor.photo ? (
                    <img src={selectedVisitor.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{selectedVisitor.visitorName}</h3>
                  <p className="text-gray-500">{selectedVisitor.phone}</p>
                  {selectedVisitor.email && (
                    <p className="text-gray-400 text-sm">{selectedVisitor.email}</p>
                  )}
                  <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${getStatusColor(selectedVisitor.status)}`}>
                    {selectedVisitor.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Company From</p>
                  <p className="text-gray-800 font-medium">{selectedVisitor.companyFrom || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Company To Visit</p>
                  <p className="text-gray-800 font-medium">{selectedVisitor.companyToVisit || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Person To Meet</p>
                  <p className="text-gray-800 font-medium">{selectedVisitor.personToMeet || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Purpose</p>
                  <p className="text-gray-800 font-medium">{selectedVisitor.purpose || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">ID Type</p>
                  <p className="text-gray-800 font-medium">{selectedVisitor.idProofType || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">ID Number</p>
                  <p className="text-gray-800 font-medium">{selectedVisitor.idProofNumber || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Vehicle Number</p>
                  <p className="text-gray-800 font-medium">{selectedVisitor.vehicleNumber || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase">Number of Visitors</p>
                  <p className="text-gray-800 font-medium">{selectedVisitor.numberOfVisitors || 1}</p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Timestamps</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Check-in Time</p>
                    <p className="text-gray-800">
                      {selectedVisitor.checkInTime 
                        ? new Date(selectedVisitor.checkInTime).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Check-out Time</p>
                    <p className="text-gray-800">
                      {selectedVisitor.checkOutTime 
                        ? new Date(selectedVisitor.checkOutTime).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created At</p>
                    <p className="text-gray-800">
                      {selectedVisitor.createdAt 
                        ? new Date(selectedVisitor.createdAt).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Entry Type</p>
                    <p className="text-gray-800">{selectedVisitor.entryType?.replace('_', ' ') || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Gatepass Info */}
              {selectedVisitor.gatepass && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">Gatepass Information</h4>
                  <div className="bg-teal-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-teal-600">Pass Number</p>
                        <p className="text-teal-800 font-bold">{selectedVisitor.gatepass.gatepassNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-teal-600">Status</p>
                        <p className="text-teal-800 font-medium">{selectedVisitor.gatepass.status}</p>
                      </div>
                      <div>
                        <p className="text-xs text-teal-600">Valid From</p>
                        <p className="text-teal-800">
                          {new Date(selectedVisitor.gatepass.validFrom).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-teal-600">Valid Until</p>
                        <p className="text-teal-800">
                          {new Date(selectedVisitor.gatepass.validUntil).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedVisitor(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VMSReports
