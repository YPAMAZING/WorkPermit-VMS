// Auto Notification Permission Prompt Component
// Shows automatically after login for VMS users who haven't enabled notifications

import { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Smartphone } from 'lucide-react'
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  getSubscriptionStatus,
  getVapidPublicKey
} from '../services/pushNotification'

const PROMPT_DISMISSED_KEY = 'notification_prompt_dismissed'
const PROMPT_DISMISSED_UNTIL_KEY = 'notification_prompt_dismissed_until'

const NotificationPrompt = ({ token, onSubscribed }) => {
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    checkAndShowPrompt()
  }, [token])

  const checkAndShowPrompt = async () => {
    // Check if push is supported
    if (!isPushSupported()) {
      console.log('Push notifications not supported on this device')
      return
    }

    // Check if server has push configured (VAPID keys)
    const vapidKey = await getVapidPublicKey()
    if (!vapidKey) {
      console.log('Push notifications not configured on server')
      return
    }

    // Check if already subscribed
    const status = await getSubscriptionStatus()
    if (status.subscribed) {
      console.log('Already subscribed to push notifications')
      return
    }

    // Check permission status
    const permission = getNotificationPermission()
    if (permission === 'denied') {
      // User has denied - don't show prompt, they can enable from browser settings
      console.log('Notifications denied - user can enable from browser settings')
      return
    }

    // Check if user permanently dismissed
    const permanentlyDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY)
    if (permanentlyDismissed === 'true') {
      console.log('Prompt permanently dismissed')
      return
    }

    // Check if user dismissed the prompt recently (within 24 hours)
    const dismissedUntil = localStorage.getItem(PROMPT_DISMISSED_UNTIL_KEY)
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      console.log('Prompt dismissed until:', dismissedUntil)
      return
    }

    // Show the prompt
    setShowPrompt(true)
  }

  const handleEnable = async () => {
    setLoading(true)
    setError(null)

    try {
      // Request permission
      const permResult = await requestNotificationPermission()
      
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
      const subResult = await subscribeToPush(token)
      
      if (subResult.success) {
        setSuccess(true)
        localStorage.removeItem(PROMPT_DISMISSED_KEY)
        localStorage.removeItem(PROMPT_DISMISSED_UNTIL_KEY)
        
        // Hide prompt after showing success
        setTimeout(() => {
          setShowPrompt(false)
          if (onSubscribed) onSubscribed()
        }, 2000)
      } else {
        setError(subResult.error || 'Failed to enable notifications')
      }
    } catch (err) {
      console.error('Error enabling notifications:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    // Dismiss for 24 hours
    const dismissUntil = new Date()
    dismissUntil.setHours(dismissUntil.getHours() + 24)
    localStorage.setItem(PROMPT_DISMISSED_UNTIL_KEY, dismissUntil.toISOString())
    setShowPrompt(false)
  }

  const handleNeverShow = () => {
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

export default NotificationPrompt
