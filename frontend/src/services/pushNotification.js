// Push Notification Service for Frontend
// Handles push subscription and notification permissions

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

// Get VAPID public key from server
export const getVapidPublicKey = async () => {
  try {
    const response = await fetch(`${API_URL}/push/vapid-public-key`);
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
};

// Subscribe to push notifications
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
      
      // Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      console.log('✅ Subscribed to push notifications');
    }
    
    // Send subscription to server
    const response = await fetch(`${API_URL}/push/subscribe`, {
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
      console.log('✅ Push subscription saved to server');
      return { success: true, subscription };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error('Error subscribing to push:', error);
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
    
    // Remove from server
    const response = await fetch(`${API_URL}/push/unsubscribe`, {
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
    console.log('✅ Unsubscribed from push notifications');
    
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
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

// Get user's subscriptions from server
export const getMySubscriptions = async (token) => {
  try {
    const response = await fetch(`${API_URL}/push/my-subscriptions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    return { success: false, error: error.message };
  }
};

// Send test notification (admin only)
export const sendTestNotification = async (token, title, body) => {
  try {
    const response = await fetch(`${API_URL}/push/test`, {
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
    console.error('Error sending test notification:', error);
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
  subscribeToPush,
  unsubscribeFromPush,
  getSubscriptionStatus,
  getMySubscriptions,
  sendTestNotification,
  showLocalNotification
};
