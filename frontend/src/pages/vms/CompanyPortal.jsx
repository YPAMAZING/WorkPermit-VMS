import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CompanyPortal = () => {
  const { portalId } = useParams();
  const navigate = useNavigate();
  
  const [company, setCompany] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, currentlyInside: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  useEffect(() => {
    fetchPortalData();
    const interval = setInterval(fetchVisitors, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [portalId, dateFilter, statusFilter]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSubscriptionError(false);

      const response = await axios.get(`${API_URL}/vms/portal/${portalId}`);
      
      if (response.data.subscriptionActive === false) {
        setSubscriptionError(true);
        setCompany(response.data.company);
        return;
      }

      setCompany(response.data.company);
      setVisitors(response.data.visitors || []);
      setStats(response.data.stats || { today: 0, week: 0, month: 0, currentlyInside: 0 });
    } catch (err) {
      console.error('Error fetching portal data:', err);
      if (err.response?.status === 403) {
        setSubscriptionError(true);
        setCompany(err.response?.data?.company);
      } else {
        setError(err.response?.data?.message || 'Portal not found or invalid');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitors = async () => {
    if (subscriptionError) return;
    
    try {
      const response = await axios.get(`${API_URL}/vms/portal/${portalId}/visitors`, {
        params: { date: dateFilter, status: statusFilter }
      });
      setVisitors(response.data.visitors || []);
      setStats(response.data.stats || stats);
    } catch (err) {
      console.error('Error fetching visitors:', err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      CHECKED_IN: 'bg-green-100 text-green-800',
      CHECKED_OUT: 'bg-gray-100 text-gray-800',
      REJECTED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredVisitors = visitors.filter(v => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.visitorName?.toLowerCase().includes(query) ||
      v.visitorPhone?.includes(query) ||
      v.passNumber?.toLowerCase().includes(query) ||
      v.hostName?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Portal Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please check your portal ID or contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  // Subscription Inactive Screen
  if (subscriptionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center">
          {company?.logo && (
            <img src={company.logo} alt={company.name} className="h-16 mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {company?.displayName || company?.name || 'Company Portal'}
          </h1>
          
          <div className="my-8">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              Portal Access Restricted
            </h2>
            
            <p className="text-gray-600 mb-6">
              Your company's visitor management portal subscription is currently inactive.
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-left">
              <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Contact Admin for More
              </h3>
              <p className="text-sm text-orange-700">
                Please contact the system administrator to activate your subscription and regain access to:
              </p>
              <ul className="text-sm text-orange-700 mt-2 space-y-1">
                <li>• View visitor check-ins in real-time</li>
                <li>• Track visitor history and statistics</li>
                <li>• Generate visitor reports</li>
                <li>• Manage pre-approved visitors</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <p className="text-sm text-gray-500 mb-4">
              For subscription inquiries, please contact:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:admin@reliablegroup.com"
                className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Admin
              </a>
              <a
                href="tel:+919876543210"
                className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Admin
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company?.logo && (
                <img src={company.logo} alt={company.name} className="h-10 object-contain" />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {company?.displayName || company?.name}
                </h1>
                <p className="text-sm text-gray-500">Visitor Management Portal</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Portal ID</div>
              <div className="font-mono text-sm font-medium text-blue-600">{portalId}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{stats.today}</div>
            <div className="text-sm text-gray-500">Today's Visitors</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-green-600">{stats.currentlyInside}</div>
            <div className="text-sm text-gray-500">Currently Inside</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-purple-600">{stats.week}</div>
            <div className="text-sm text-gray-500">This Week</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-orange-600">{stats.month}</div>
            <div className="text-sm text-gray-500">This Month</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, phone, pass number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchVisitors}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Visitors Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      No visitors found for the selected filters
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            {visitor.photo ? (
                              <img src={visitor.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <span className="text-blue-600 font-medium">
                                {visitor.visitorName?.charAt(0) || 'V'}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{visitor.visitorName}</div>
                            <div className="text-sm text-gray-500">{visitor.visitorPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{visitor.passNumber || visitor.requestNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {visitor.visitPurpose || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800">{visitor.hostName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{visitor.department}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(visitor.status)}`}>
                          {visitor.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {visitor.checkInTime ? formatDateTime(visitor.checkInTime) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {visitor.checkOutTime ? formatDateTime(visitor.checkOutTime) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedVisitor(visitor)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Auto-refreshing every 10 seconds • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </main>

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Visitor Details</h3>
                <button
                  onClick={() => setSelectedVisitor(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    {selectedVisitor.photo ? (
                      <img src={selectedVisitor.photo} alt="" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <span className="text-2xl text-blue-600 font-medium">
                        {selectedVisitor.visitorName?.charAt(0) || 'V'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">{selectedVisitor.visitorName}</h4>
                    <p className="text-gray-500">{selectedVisitor.visitorPhone}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedVisitor.status)}`}>
                      {selectedVisitor.status}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Pass Number</div>
                      <div className="font-mono font-medium">{selectedVisitor.passNumber || selectedVisitor.requestNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Email</div>
                      <div className="text-sm">{selectedVisitor.visitorEmail || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Purpose</div>
                      <div className="text-sm">{selectedVisitor.visitPurpose || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Host</div>
                      <div className="text-sm">{selectedVisitor.hostName || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Department</div>
                      <div className="text-sm">{selectedVisitor.department || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Company</div>
                      <div className="text-sm">{selectedVisitor.visitorCompany || 'N/A'}</div>
                    </div>
                  </div>

                  {selectedVisitor.checkInTime && (
                    <div className="pt-3 border-t">
                      <div className="text-xs text-gray-500">Check-in Time</div>
                      <div className="text-sm">{formatDateTime(selectedVisitor.checkInTime)}</div>
                    </div>
                  )}
                  {selectedVisitor.checkOutTime && (
                    <div>
                      <div className="text-xs text-gray-500">Check-out Time</div>
                      <div className="text-sm">{formatDateTime(selectedVisitor.checkOutTime)}</div>
                    </div>
                  )}
                  {selectedVisitor.validUntil && (
                    <div>
                      <div className="text-xs text-gray-500">Valid Until</div>
                      <div className="text-sm">{formatDateTime(selectedVisitor.validUntil)}</div>
                    </div>
                  )}
                </div>

                {selectedVisitor.idProof && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">ID Proof</div>
                    <img src={selectedVisitor.idProof} alt="ID Proof" className="max-w-full rounded-lg border" />
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedVisitor(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                {selectedVisitor.passNumber && (
                  <button
                    onClick={() => {
                      navigate(`/vms/pass/${selectedVisitor.passNumber}`);
                      setSelectedVisitor(null);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    View Pass
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyPortal;
