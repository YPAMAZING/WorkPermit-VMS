// VMS Auto Notification Permission Prompt Component
// Uses /api/vms/push/* endpoints (separate from Work Permit)
// Automatically enables notifications for VMS users after login
// If browser permission is needed, shows a prompt
// Users can disable notifications from browser settings

import { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Smartphone } from 'lucide-react'
// Use VMS-specific push service
import * as vmsPushService from '../services/vmsPushNotification'

const PROMPT_DISMISSED_KEY = 'vms_notification_prompt_dismissed'
const AUTO_ENABLED_KEY = 'vms_notifications_auto_enabled'

const VMSNotificationPrompt = ({ token, onSubscribed }) => {
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      autoEnableNotifications()
    }
  }, [token])

  const autoEnableNotifications = async () => {
    // Check if push is supported
    if (!vmsPushService.isPushSupported()) {
      console.log('Push notifications not supported on this device')
      return
    }

    // Check if server has push configured (VAPID keys)
    let vapidKey = null
    try {
      vapidKey = await vmsPushService.getVapidPublicKey()
    } catch (e) {
      console.log('Could not check VAPID key:', e.message)
      return
    }
    
    if (!vapidKey) {
      console.log('Push notifications not configured on server')
      return
    }

    // Check if already subscribed
    const status = await vmsPushService.getSubscriptionStatus()
    if (status.subscribed) {
      console.log('Already subscribed to VMS push notifications')
      return
    }

    // Check permission status
    const permission = vmsPushService.getNotificationPermission()
    
    if (permission === 'granted') {
      // Permission already granted - auto subscribe silently
      console.log('Permission already granted - auto-subscribing to VMS push...')
      await silentSubscribe()
      return
    }
    
    if (permission === 'denied') {
      // User has denied - don't bother them, they can enable from browser settings
      console.log('Notifications denied - user can enable from browser settings')
      return
    }

    // Permission is 'default' - need to ask user
    // Check if user permanently dismissed
    const permanentlyDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY)
    if (permanentlyDismissed === 'true') {
      console.log('VMS notification prompt permanently dismissed by user')
      return
    }

    // Show the prompt to ask for permission
    setShowPrompt(true)
  }

  const silentSubscribe = async () => {
    try {
      const subResult = await vmsPushService.subscribeToPush(token)
      if (subResult.success) {
        console.log('✅ Auto-subscribed to VMS push notifications')
        localStorage.setItem(AUTO_ENABLED_KEY, 'true')
        if (onSubscribed) onSubscribed()
      } else {
        console.log('Failed to auto-subscribe to VMS push:', subResult.error)
      }
    } catch (err) {
      console.error('Error auto-subscribing to VMS push:', err)
    }
  }

  const handleEnable = async () => {
    setLoading(true)
    setError(null)

    try {
      // Request permission
      const permResult = await vmsPushService.requestNotificationPermission()
      
      if (!permResult.success) {
        if (permResult.permission === 'denied') {
          setError('Notifications blocked. You can enable them from browser settings.')
          // Don't show prompt again since user explicitly denied
          localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
        } else {
          setError('Could not enable notifications. Please try again.')
        }
        setLoading(false)
        return
      }

      // Subscribe to push
      const subResult = await vmsPushService.subscribeToPush(token)
      
      if (subResult.success) {
        setSuccess(true)
        localStorage.removeItem(PROMPT_DISMISSED_KEY)
        localStorage.setItem(AUTO_ENABLED_KEY, 'true')
        
        // Hide prompt after showing success
        setTimeout(() => {
          setShowPrompt(false)
          if (onSubscribed) onSubscribed()
        }, 2000)
      } else {
        setError(subResult.error || 'Failed to enable notifications')
      }
    } catch (err) {
      console.error('Error enabling VMS notifications:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    // User clicks "Later" - don't ask again for this session
    // But will ask again next login
    setShowPrompt(false)
  }

  const handleNeverShow = () => {
    // User explicitly doesn't want notifications
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Enable Notifications</h3>
                <p className="text-teal-100 text-sm">Stay updated on visitors</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {success ? (
            <div className="flex items-center gap-3 text-green-600">
              <div className="bg-green-100 p-2 rounded-full">
                <Check size={24} />
              </div>
              <div>
                <p className="font-medium">Notifications Enabled!</p>
                <p className="text-sm text-gray-500">You'll receive updates about visitors</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-4">
                Get instant notifications when:
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                  New visitor arrives at your company
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                  Visitor is waiting for approval
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                  Pre-approved pass is used
                </li>
              </ul>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Enabling...</span>
                    </>
                  ) : (
                    <>
                      <Bell size={18} />
                      <span>Enable</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Later
                </button>
              </div>

              <button
                onClick={handleNeverShow}
                className="w-full mt-2 text-gray-400 hover:text-gray-600 text-xs py-1"
              >
                Don't ask again
              </button>
            </>
          )}
        </div>

        {/* Add to Home Screen Tip */}
        {!success && (
          <div className="bg-gray-50 p-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Smartphone size={14} />
              <span>Tip: Add this app to your home screen for best experience</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default VMSNotificationPrompt
