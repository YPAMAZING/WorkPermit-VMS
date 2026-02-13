/**
 * useCompanyList Hook
 * 
 * A reusable hook for fetching and managing company list across the application.
 * Use this hook wherever company selection is required (forms, dropdowns, etc.)
 * 
 * Features:
 * - Fetches companies from the API
 * - Caches company list to avoid redundant API calls
 * - Provides loading and error states
 * - Supports filtering active companies only
 * - Includes approval status for each company
 */

import { useState, useEffect, useCallback } from 'react'
import { companySettingsApi } from '../services/vmsApi'

// Simple in-memory cache
let companyCache = null
let cacheTimestamp = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useCompanyList = (options = {}) => {
  const {
    activeOnly = true,      // Only return active companies
    withApprovalStatus = false, // Include approval settings
    forceRefresh = false,   // Force API call even if cached
  } = options

  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache
      const now = Date.now()
      if (!forceRefresh && companyCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        let result = companyCache
        if (activeOnly) {
          result = result.filter(c => c.isActive !== false)
        }
        setCompanies(result)
        setLoading(false)
        return
      }

      // Fetch from API
      const response = withApprovalStatus
        ? await companySettingsApi.getApprovalSettings()
        : await companySettingsApi.getAll()

      const companyList = response.data.companies || response.data || []
      
      // Update cache
      companyCache = companyList
      cacheTimestamp = Date.now()

      // Apply filters
      let result = companyList
      if (activeOnly) {
        result = result.filter(c => c.isActive !== false)
      }

      setCompanies(result)
    } catch (err) {
      console.error('Error fetching companies:', err)
      setError(err.response?.data?.message || 'Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }, [activeOnly, withApprovalStatus, forceRefresh])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Get a single company by ID
  const getCompanyById = useCallback((id) => {
    return companies.find(c => c.id === id)
  }, [companies])

  // Get a single company by name
  const getCompanyByName = useCallback((name) => {
    return companies.find(c => 
      c.name?.toLowerCase() === name?.toLowerCase() ||
      c.displayName?.toLowerCase() === name?.toLowerCase()
    )
  }, [companies])

  // Get companies that require approval
  const companiesRequiringApproval = companies.filter(c => c.requireApproval)
  
  // Get companies with auto-approve
  const autoApproveCompanies = companies.filter(c => !c.requireApproval)

  // Refresh function to force re-fetch
  const refresh = useCallback(() => {
    companyCache = null
    cacheTimestamp = null
    fetchCompanies()
  }, [fetchCompanies])

  // Clear cache (useful when companies are updated)
  const clearCache = useCallback(() => {
    companyCache = null
    cacheTimestamp = null
  }, [])

  return {
    companies,
    loading,
    error,
    refresh,
    clearCache,
    getCompanyById,
    getCompanyByName,
    companiesRequiringApproval,
    autoApproveCompanies,
    totalCount: companies.length,
    approvalRequiredCount: companiesRequiringApproval.length,
    autoApproveCount: autoApproveCompanies.length,
  }
}

export default useCompanyList
