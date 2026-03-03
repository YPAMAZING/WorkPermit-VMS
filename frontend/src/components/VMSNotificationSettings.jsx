import { useState, useEffect } from 'react'
import { Bell, BellOff, Smartphone, Monitor, Tablet, Check, X, AlertTriangle, Send } from 'lucide-react'
import { useVMSAuth } from '../context/VMSAuthContext'
import * as pushNotificationService from '../services/pushNotification'
import toast from 'react-hot-toast'

const VMSNotificationSettings = () => {
  const { getToken, user, isAdmin } = useVMSAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [permission, setPermission] = useState('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setLoading(true)
    
    try {
      // Check if push is supported
      const supported = pushNotificationService.isPushSupported()
      setIsSupported(supported)
      
      if (!supported) {
        setLoading(false)
        return
      }
      
      // Check if server has VAPID configured (with timeout)
      let vapidKey = null
      try {
        vapidKey = await Promise.race([
          pushNotificationService.getVapidPublicKey(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ])
      } catch (e) {
        console.log('VAPID check failed or timed out:', e.message)
      }
      
      setIsConfigured(!!vapidKey)
      
      if (!vapidKey) {
        setLoading(false)
        return
      }
      
      // Get permission and subscription status
      const perm = pushNotificationService.getNotificationPermission()
      setPermission(perm)
      
      const status = await pushNotificationService.getSubscriptionStatus()
      setIsSubscribed(status.subscribed)
      
      // Get server subscriptions
      const token = getToken ? getToken() : null
      if (token) {
        const result = await pushNotificationService.getMySubscriptions(token)
        if (result.success) {
          setSubscriptions(result.subscriptions || [])
        }
      }
    } catch (error) {
      console.error('Error checking notification status:', error)
    }
    
    setLoading(false)
  }

  const handleEnableNotifications = async () => {
    setSubscribing(true)
    
    try {
      // Request permission first
      const permResult = await pushNotificationService.requestNotificationPermission()
      setPermission(permResult.permission)
      
      if (!permResult.success) {
        if (permResult.permission === 'denied') {
          toast.error('Notifications blocked. Please enable in browser settings.')
        } else {
          toast.error('Could not enable notifications')
        }
        setSubscribing(false)
        return
      }
      
      // Subscribe to push
      const token = getToken ? getToken() : null
      const subResult = await pushNotificationService.subscribeToPush(token)
      
      if (subResult.success) {
        setIsSubscribed(true)
        toast.success('🔔 Notifications enabled!')
        
        // Show a test notification
        await pushNotificationService.showLocalNotification(
          'Notifications Enabled!',
          { body: 'You will now receive VMS notifications' }
        )
        
        // Refresh subscriptions list
        await checkStatus()
      } else {
        toast.error(subResult.error || 'Failed to enable notifications')
      }
    } catch (error) {
      toast.error('Error enabling notifications')
      console.error(error)
    }
    
    setSubscribing(false)
  }

  const handleDisableNotifications = async () => {
    setSubscribing(true)
    
    try {
      const token = getToken ? getToken() : null
      const result = await pushNotificationService.unsubscribeFromPush(token)
      
      if (result.success) {
        setIsSubscribed(false)
        toast.success('Notifications disabled')
        await checkStatus()
      } else {
        toast.error('Failed to disable notifications')
      }
    } catch (error) {
      toast.error('Error disabling notifications')
      console.error(error)
    }
    
    setSubscribing(false)
  }

  const handleSendTestNotification = async () => {
    try {
      const token = getToken ? getToken() : null
      const result = await pushNotificationService.sendTestNotification(
        token,
        '🔔 VMS Test Notification',
        'This is a test push notification from VMS'
      )
      
      if (result.success) {
        toast.success(`Test notification sent to ${result.result?.sent || 0} device(s)`)
      } else {
        toast.error(result.message || 'Failed to send test notification')
      }
    } catch (error) {
      toast.error('Error sending test notification')
      console.error(error)
    }
  }

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />
      case 'tablet':
        return <Tablet className="w-5 h-5" />
      default:
        return <Monitor className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-amber-600 mb-3">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Push Notifications Not Supported</h3>
        </div>
        <p className="text-gray-600">
          Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge for the best experience.
        </p>
      </div>
    )
  }

  // Show section even if not configured, but with disabled state
  if (!isConfigured) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BellOff className="w-6 h-6 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
              <p className="text-sm text-gray-500">
                Receive instant alerts for visitor requests and approvals
              </p>
            </div>
          </div>
          
          <button
            disabled
            className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Enable</span>
          </button>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Not Yet Available</span>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            Push notifications are being configured. This feature will be available soon.
          </p>
        </div>

        {/* Info Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">You'll receive notifications for:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              New visitor check-in requests
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Visitor approvals and rejections
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Pre-approved visitor arrivals
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Security alerts
            </li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-6 h-6 text-green-600" />
          ) : (
            <BellOff className="w-6 h-6 text-gray-400" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive instant alerts for visitor requests and approvals
            </p>
          </div>
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
          disabled={subscribing || permission === 'denied'}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            isSubscribed
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          } ${subscribing || permission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {subscribing ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : isSubscribed ? (
            <>
              <BellOff className="w-4 h-4" />
              <span>Disable</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>Enable</span>
            </>
          )}
        </button>
      </div>

      {/* Permission Status */}
      {permission === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-700">
            <X className="w-5 h-5" />
            <span className="font-medium">Notifications Blocked</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            You've blocked notifications for this site. To enable them:
          </p>
          <ol className="text-sm text-red-600 mt-2 list-decimal list-inside space-y-1">
            <li>Click the lock/info icon in your browser's address bar</li>
            <li>Find "Notifications" in the permissions</li>
            <li>Change it from "Block" to "Allow"</li>
            <li>Refresh this page</li>
          </ol>
        </div>
      )}

      {/* Active Subscriptions */}
      {subscriptions.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Active Devices</h4>
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-500">
                    {getDeviceIcon(sub.deviceType)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {sub.deviceType || 'Unknown Device'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sub.browser || 'Unknown Browser'} • Last used {new Date(sub.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Notification (Admin Only) */}
      {isAdmin && isSubscribed && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSendTestNotification}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
          >
            <Send className="w-4 h-4" />
            Send Test Notification
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">You'll receive notifications for:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            New visitor check-in requests
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Visitor approvals and rejections
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Pre-approved visitor arrivals
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Security alerts
          </li>
        </ul>
      </div>
    </div>
  )
}

export default VMSNotificationSettings
