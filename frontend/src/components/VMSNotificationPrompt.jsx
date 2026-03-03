// Simple VMS Notification Setup
// Automatically requests browser notification permission for company users
// No fancy UI - just uses browser's native permission prompt

import { useEffect, useRef } from 'react'
import * as vmsPushService from '../services/vmsPushNotification'

const VMSNotificationPrompt = ({ token, companyId, onSubscribed }) => {
  const hasPrompted = useRef(false)

  useEffect(() => {
    // Only prompt once per session and only if user has a company
    if (!token || !companyId || hasPrompted.current) return
    
    hasPrompted.current = true
    setupNotifications()
  }, [token, companyId])

  const setupNotifications = async () => {
    // Check if push is supported
    if (!vmsPushService.isPushSupported()) {
      console.log('[VMS] Push notifications not supported')
      return
    }

    // Check if server has push configured
    const vapidKey = await vmsPushService.getVapidPublicKey()
    if (!vapidKey) {
      console.log('[VMS] Push not configured on server')
      return
    }

    // Check current permission status
    const permission = vmsPushService.getNotificationPermission()
    
    if (permission === 'granted') {
      // Already have permission - subscribe silently
      console.log('[VMS] Notification permission already granted - subscribing...')
      await subscribe()
      return
    }
    
    if (permission === 'denied') {
      // User has denied - respect their choice
      console.log('[VMS] Notifications denied by user')
      return
    }

    // Permission is 'default' - request permission using browser's native prompt
    console.log('[VMS] Requesting notification permission...')
    const result = await vmsPushService.requestNotificationPermission()
    
    if (result.success) {
      console.log('[VMS] Permission granted - subscribing...')
      await subscribe()
    } else {
      console.log('[VMS] Permission denied or dismissed')
    }
  }

  const subscribe = async () => {
    try {
      const result = await vmsPushService.subscribeToPush(token)
      if (result.success) {
        console.log('[VMS] ✅ Subscribed to push notifications for company:', companyId)
        if (onSubscribed) onSubscribed()
      } else {
        console.log('[VMS] Failed to subscribe:', result.error)
      }
    } catch (err) {
      console.error('[VMS] Error subscribing:', err)
    }
  }

  // This component doesn't render anything - browser handles the permission UI
  return null
}

export default VMSNotificationPrompt
