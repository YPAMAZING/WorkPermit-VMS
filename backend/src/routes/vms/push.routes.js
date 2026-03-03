// VMS Push Notification Routes
// Separate from Work Permit push routes - uses VMSUser table and VMSPushSubscription table
// Handles push subscription management for VMS users

const express = require('express');
const router = express.Router();
const { vmsAuth } = require('../../middleware/vms-auth');
// Use VMS-specific push service that uses VMSPushSubscription table
const vmsPushService = require('../../services/vms-push.service');

// Get VAPID public key (no auth required - same key for both systems)
router.get('/vapid-public-key', (req, res) => {
  const publicKey = vmsPushService.getVapidPublicKey();
  
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      message: 'Push notifications are not configured on the server'
    });
  }
  
  res.json({
    success: true,
    publicKey
  });
});

// Check if push is configured
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: vmsPushService.isPushConfigured()
  });
});

// Subscribe to push notifications (requires VMS auth)
// Uses VMSUser ID directly (no prefix needed - separate table)
router.post('/subscribe', vmsAuth, async (req, res) => {
  try {
    const { subscription, deviceInfo } = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }
    
    // Parse device info from user agent if not provided
    const parsedDeviceInfo = deviceInfo || {};
    if (req.headers['user-agent']) {
      parsedDeviceInfo.userAgent = req.headers['user-agent'];
      
      // Simple device type detection
      const ua = req.headers['user-agent'].toLowerCase();
      if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
        parsedDeviceInfo.deviceType = /ipad|tablet/.test(ua) ? 'tablet' : 'mobile';
      } else {
        parsedDeviceInfo.deviceType = 'desktop';
      }
      
      // Simple browser detection
      if (ua.includes('chrome')) parsedDeviceInfo.browser = 'Chrome';
      else if (ua.includes('firefox')) parsedDeviceInfo.browser = 'Firefox';
      else if (ua.includes('safari')) parsedDeviceInfo.browser = 'Safari';
      else if (ua.includes('edge')) parsedDeviceInfo.browser = 'Edge';
    }
    
    // Use the VMS User ID directly (stored in VMSPushSubscription table)
    const vmsUserId = req.user.userId;
    
    console.log(`📱 [VMS Push] Subscribe - User: ${req.user.email}, VMS User ID: ${vmsUserId}`);
    
    const savedSubscription = await vmsPushService.saveSubscription(
      vmsUserId,
      subscription,
      parsedDeviceInfo
    );
    
    if (savedSubscription) {
      res.json({
        success: true,
        message: 'Push subscription saved successfully',
        subscriptionId: savedSubscription.id
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save push subscription - push may not be configured'
      });
    }
  } catch (error) {
    console.error('❌ [VMS Push] Error subscribing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save push subscription'
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', vmsAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Subscription endpoint is required'
      });
    }
    
    await vmsPushService.removeSubscription(endpoint);
    
    res.json({
      success: true,
      message: 'Push subscription removed successfully'
    });
  } catch (error) {
    console.error('❌ [VMS Push] Error unsubscribing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription'
    });
  }
});

// Get user's subscriptions count
router.get('/my-subscriptions', vmsAuth, async (req, res) => {
  try {
    const vmsUserId = req.user.userId;
    const count = await vmsPushService.getSubscriptionCount(vmsUserId);
    const subscriptions = await vmsPushService.getSubscriptionsForUser(vmsUserId);
    
    res.json({
      success: true,
      count,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        deviceType: sub.deviceType || 'unknown',
        browser: sub.browser || 'unknown',
        createdAt: sub.createdAt,
        lastUsed: sub.lastUsed
      }))
    });
  } catch (error) {
    console.error('❌ [VMS Push] Error getting subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions'
    });
  }
});

// Remove a specific subscription by ID
router.delete('/subscription/:id', vmsAuth, async (req, res) => {
  try {
    const vmsUserId = req.user.userId;
    const subscriptionId = req.params.id;
    
    const success = await vmsPushService.deleteSubscriptionById(subscriptionId, vmsUserId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Subscription removed successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
  } catch (error) {
    console.error('❌ [VMS Push] Error removing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove subscription'
    });
  }
});

// Test push notification (for debugging - VMS admin only)
router.post('/test', vmsAuth, async (req, res) => {
  try {
    // Check if user is VMS admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only VMS admins can send test notifications'
      });
    }
    
    const vmsUserId = req.user.userId;
    const { title, body } = req.body;
    
    const result = await vmsPushService.sendPushToUser(vmsUserId, {
      title: title || '🔔 VMS Test Notification',
      body: body || 'This is a test push notification from Reliable Group VMS',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'vms-test-' + Date.now(),
      data: {
        url: '/vms/dashboard',
        type: 'VMS_TEST'
      }
    });
    
    res.json({
      success: true,
      message: `Test notification sent to ${result.sent} device(s)`,
      result
    });
  } catch (error) {
    console.error('❌ [VMS Push] Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

module.exports = router;
