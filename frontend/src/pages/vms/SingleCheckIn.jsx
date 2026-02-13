import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SingleCheckIn = () => {
  const navigate = useNavigate();
  
  // State
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    companyId: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    visitorCompany: '',
    purpose: '',
    hostName: '',
    hostDepartment: '',
  });

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      // Try the new company-settings/dropdown API first, fall back to checkin/companies
      try {
        const response = await axios.get(`${API_URL}/vms/company-settings/dropdown`);
        setCompanies(response.data.companies || []);
      } catch {
        // Fallback to old endpoint
        const response = await axios.get(`${API_URL}/vms/checkin/companies`);
        setCompanies(response.data.companies || []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to load companies. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setFormData(prev => ({ ...prev, companyId: company.id }));
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep2 = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (formData.phone.length < 10) return 'Enter a valid phone number';
    return null;
  };

  const validateStep3 = () => {
    if (!formData.purpose.trim()) return 'Purpose of visit is required';
    return null;
  };

  const handleNext = () => {
    if (step === 2) {
      const error = validateStep2();
      if (error) {
        setError(error);
        return;
      }
    }
    if (step === 3) {
      const error = validateStep3();
      if (error) {
        setError(error);
        return;
      }
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    if (step === 2) {
      setSelectedCompany(null);
      setFormData(prev => ({ ...prev, companyId: '' }));
    }
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    const error = validateStep3();
    if (error) {
      setError(error);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await axios.post(`${API_URL}/vms/checkin/submit`, {
        companyCode: selectedCompany.code,
        ...formData
      });

      setSuccess(response.data);
      
      // Navigate to pass page after 2 seconds
      setTimeout(() => {
        navigate(`/vms/pass/${response.data.requestNumber}`);
      }, 2000);

    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Check-in Submitted!</h2>
          <p className="text-gray-600 mb-4">{success.message}</p>
          
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="text-sm text-blue-600 mb-1">Your Pass Number</div>
            <div className="text-2xl font-bold text-blue-800">{success.requestNumber}</div>
          </div>

          <p className="text-sm text-gray-500">Redirecting to your pass...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-800 text-center">Visitor Check-In</h1>
          <p className="text-sm text-gray-500 text-center">Please fill in your details</p>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                step >= s ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 rounded ${step > s ? 'bg-blue-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="text-center text-sm text-gray-600 mb-6">
          {step === 1 && 'Select Company'}
          {step === 2 && 'Personal Information'}
          {step === 3 && 'Visit Details'}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-lg mx-auto px-4 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          
          {/* Step 1: Select Company */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Company You're Visiting</h3>
              
              {companies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No companies available at this time.
                </div>
              ) : (
                <div className="space-y-3">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleCompanySelect(company)}
                      className="w-full p-4 border-2 rounded-xl text-left transition-all hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:border-blue-500"
                      style={{ borderColor: selectedCompany?.id === company.id ? company.primaryColor || '#3b82f6' : '#e5e7eb' }}
                    >
                      <div className="flex items-center gap-4">
                        {company.logo ? (
                          <img src={company.logo} alt={company.name} className="w-12 h-12 object-contain rounded-lg" />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: company.primaryColor || '#3b82f6' }}
                          >
                            {company.displayName?.charAt(0) || company.name?.charAt(0) || 'C'}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{company.displayName || company.name}</div>
                          {company.description && (
                            <div className="text-sm text-gray-500 truncate">{company.description}</div>
                          )}
                          {/* Show approval status */}
                          <div className={`text-xs mt-1 ${company.requireApproval ? 'text-orange-600' : 'text-green-600'}`}>
                            {company.requireApproval ? '⏳ Requires Approval' : '✓ Auto-Approve'}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Personal Information */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Company (Optional)</label>
                  <input
                    type="text"
                    name="visitorCompany"
                    value={formData.visitorCompany}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ABC Corporation"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Visit Details */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Visit Details</h3>
              
              {/* Selected Company Info */}
              {selectedCompany && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedCompany.primaryColor || '#3b82f6' }}
                  >
                    {selectedCompany.displayName?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{selectedCompany.displayName}</div>
                    <div className="text-sm text-gray-500">Visiting</div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Visit *</label>
                  <select
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select purpose</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Interview">Interview</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Service/Maintenance">Service/Maintenance</option>
                    <option value="Official Visit">Official Visit</option>
                    <option value="Personal Visit">Personal Visit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Person to Meet (Optional)</label>
                  <input
                    type="text"
                    name="hostName"
                    value={formData.hostName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Name of person you're meeting"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department (Optional)</label>
                  <select
                    name="hostDepartment"
                    value={formData.hostDepartment}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select department</option>
                    {selectedCompany?.departments?.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                    <option value="Reception">Reception</option>
                    <option value="Admin">Admin</option>
                    <option value="HR">HR</option>
                    <option value="IT">IT</option>
                    <option value="Finance">Finance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Terms */}
              {selectedCompany?.termsAndConditions && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">Terms & Conditions</h4>
                  <p className="text-xs text-yellow-700">{selectedCompany.termsAndConditions}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Check-In
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>After submitting, you'll receive a digital pass with QR code.</p>
          <p className="mt-1">Show this pass to security for verification.</p>
        </div>
      </div>
    </div>
  );
};

export default SingleCheckIn;
