// VMS Push Notification Service for Frontend
// Uses /api/vms/push/* endpoints (separate from Work Permit)
// Handles push subscription and notification permissions for VMS users

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const VMS_PUSH_URL = `${API_URL}/vms/push`;

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Get current notification permission status
export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return { success: false, permission: 'unsupported' };
  }
  
  try {
    const permission = await Notification.requestPermission();
    return { success: permission === 'granted', permission };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { success: false, permission: 'error', error: error.message };
  }
};

// Get VAPID public key from VMS server endpoint
export const getVapidPublicKey = async () => {
  try {
    const response = await fetch(`${VMS_PUSH_URL}/vapid-public-key`);
    const data = await response.json();
    
    if (data.success && data.publicKey) {
      return data.publicKey;
    }
    return null;
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    return null;
  }
};

// Convert VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  try {
    // Validate the key format first
    if (!base64String || typeof base64String !== 'string' || base64String.length < 10) {
      console.error('Invalid VAPID key format');
      return null;
    }
    
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('Error converting VAPID key:', error.message);
    return null;
  }
};

// Subscribe to push notifications (VMS endpoint)
export const subscribeToPush = async (token) => {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }
  
  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Already subscribed to push notifications');
      // Still send to server in case it's a new device
    } else {
      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        return { success: false, error: 'Push notifications not configured on server' };
      }
      
      // Convert key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      if (!applicationServerKey) {
        return { success: false, error: 'Invalid server configuration for push notifications' };
      }
      
      // Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      console.log('✅ Subscribed to push notifications');
    }
    
    // Send subscription to VMS server endpoint
    const response = await fetch(`${VMS_PUSH_URL}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ VMS Push subscription saved to server');
      return { success: true, subscription };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error('Error subscribing to VMS push:', error);
    return { success: false, error: error.message };
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (token) => {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return { success: true, message: 'Not subscribed' };
    }
    
    // Unsubscribe locally
    await subscription.unsubscribe();
    
    // Remove from VMS server
    const response = await fetch(`${VMS_PUSH_URL}/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });
    
    const data = await response.json();
    console.log('✅ Unsubscribed from VMS push notifications');
    
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from VMS push:', error);
    return { success: false, error: error.message };
  }
};

// Check current subscription status
export const getSubscriptionStatus = async () => {
  if (!isPushSupported()) {
    return { subscribed: false, supported: false };
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      subscribed: !!subscription,
      supported: true,
      permission: getNotificationPermission()
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { subscribed: false, supported: true, error: error.message };
  }
};

// Get user's subscriptions from VMS server
export const getMySubscriptions = async (token) => {
  try {
    const response = await fetch(`${VMS_PUSH_URL}/my-subscriptions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting VMS subscriptions:', error);
    return { success: false, error: error.message };
  }
};

// Remove a specific subscription
export const removeSubscription = async (token, subscriptionId) => {
  try {
    const response = await fetch(`${VMS_PUSH_URL}/subscription/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error removing VMS subscription:', error);
    return { success: false, error: error.message };
  }
};

// Send test notification (VMS admin only)
export const sendTestNotification = async (token, title, body) => {
  try {
    const response = await fetch(`${VMS_PUSH_URL}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, body })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending VMS test notification:', error);
    return { success: false, error: error.message };
  }
};

// Show local notification (for testing or offline use)
export const showLocalNotification = async (title, options = {}) => {
  if (!isPushSupported()) return false;
  
  const permission = getNotificationPermission();
  if (permission !== 'granted') return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options
    });
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};

export default {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscriptionStatus,
  getMySubscriptions,
  removeSubscription,
  sendTestNotification,
  showLocalNotification
};
