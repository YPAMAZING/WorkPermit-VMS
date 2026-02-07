import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VisitorPass = () => {
  const { passId } = useParams();
  const navigate = useNavigate();
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPass();
  }, [passId]);

  const fetchPass = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/vms/pass/${passId}`);
      setPass(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching pass:', err);
      setError(err.response?.data?.message || 'Pass not found or expired');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'CHECKED_IN':
        return 'bg-green-500';
      case 'PENDING':
        return 'bg-yellow-500';
      case 'COMPLETED':
      case 'CHECKED_OUT':
        return 'bg-blue-500';
      case 'EXPIRED':
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'ACTIVE PASS';
      case 'APPROVED':
        return 'APPROVED - Awaiting Check-in';
      case 'PENDING':
        return 'PENDING APPROVAL';
      case 'CHECKED_IN':
        return 'CHECKED IN';
      case 'COMPLETED':
      case 'CHECKED_OUT':
        return 'VISIT COMPLETED';
      case 'EXPIRED':
        return 'PASS EXPIRED';
      case 'REJECTED':
        return 'REQUEST REJECTED';
      case 'CANCELLED':
        return 'PASS CANCELLED';
      default:
        return status;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your pass...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Pass Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/vms')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Go to VMS Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isValid = pass && ['ACTIVE', 'APPROVED', 'CHECKED_IN', 'PENDING'].includes(pass.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Pass Card */}
        <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden ${!isValid ? 'opacity-75' : ''}`}>
          {/* Header with Status */}
          <div className={`${getStatusColor(pass?.status)} px-6 py-4 text-white text-center`}>
            <div className="text-sm font-medium opacity-90 mb-1">
              {pass?.company?.displayName || pass?.company?.name || 'Visitor Pass'}
            </div>
            <div className="text-2xl font-bold tracking-wide">
              {getStatusText(pass?.status)}
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-6 bg-gray-50 border-b">
            <div className="bg-white p-4 rounded-2xl shadow-inner">
              {pass?.qrCode ? (
                <img 
                  src={pass.qrCode} 
                  alt="Pass QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">QR Not Available</span>
                </div>
              )}
            </div>
            <p className="text-center text-sm text-gray-500 mt-3">
              Show this QR to security for verification
            </p>
          </div>

          {/* Pass Details */}
          <div className="p-6 space-y-4">
            {/* Pass Number */}
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-xs text-blue-600 font-medium mb-1">PASS NUMBER</div>
              <div className="text-2xl font-bold text-blue-800 tracking-wider">
                {pass?.passNumber || pass?.requestNumber || 'N/A'}
              </div>
            </div>

            {/* Visitor Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">VISITOR NAME</div>
                <div className="font-semibold text-gray-800">{pass?.visitorName || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">PHONE</div>
                <div className="font-semibold text-gray-800">{pass?.visitorPhone || 'N/A'}</div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="border-t pt-4 space-y-3">
              {pass?.visitPurpose && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">PURPOSE OF VISIT</div>
                  <div className="font-medium text-gray-700">{pass?.visitPurpose}</div>
                </div>
              )}

              {pass?.hostName && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">HOST / MEETING WITH</div>
                  <div className="font-medium text-gray-700">{pass?.hostName}</div>
                  {pass?.department && (
                    <div className="text-sm text-gray-500">{pass.department}</div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">VALID DATE</div>
                  <div className="font-medium text-gray-700">{formatDate(pass?.validDate || pass?.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">VALID UNTIL</div>
                  <div className="font-medium text-gray-700">
                    {pass?.expiresAt ? formatTime(pass.expiresAt) : 'End of Day'}
                  </div>
                </div>
              </div>

              {pass?.checkInTime && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-600 mb-1">CHECKED IN AT</div>
                  <div className="font-medium text-green-700">
                    {formatDate(pass.checkInTime)} {formatTime(pass.checkInTime)}
                  </div>
                </div>
              )}

              {pass?.checkOutTime && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">CHECKED OUT AT</div>
                  <div className="font-medium text-blue-700">
                    {formatDate(pass.checkOutTime)} {formatTime(pass.checkOutTime)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Pass ID: {pass?.id?.slice(0, 8) || 'N/A'}</span>
              <span>Generated: {formatDate(pass?.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => window.print()}
            className="w-full bg-white text-gray-700 px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Pass
          </button>

          <button
            onClick={() => navigate('/vms')}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:bg-blue-600 transition-all"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white/80 rounded-xl p-4">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Instructions
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Show this pass QR code at the security desk</li>
            <li>• Keep your ID proof ready for verification</li>
            <li>• Follow all building security protocols</li>
            <li>• Check out before leaving the premises</li>
          </ul>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-md, .max-w-md * {
            visibility: visible;
          }
          .max-w-md {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default VisitorPass;
