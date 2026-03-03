// Push Notification Routes
// Handles push subscription management

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const pushService = require('../services/push.service');
const PushSubscription = require('../models/pushSubscription.model');

// Get VAPID public key (no auth required)
router.get('/vapid-public-key', (req, res) => {
  const publicKey = pushService.getVapidPublicKey();
  
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
    configured: pushService.isPushConfigured()
  });
});

// Subscribe to push notifications (requires auth)
router.post('/subscribe', auth, async (req, res) => {
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
    
    const savedSubscription = await pushService.saveSubscription(
      req.user._id || req.user.id,
      subscription,
      parsedDeviceInfo
    );
    
    res.json({
      success: true,
      message: 'Push subscription saved successfully',
      subscriptionId: savedSubscription._id
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save push subscription'
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Subscription endpoint is required'
      });
    }
    
    await pushService.removeSubscription(endpoint);
    
    res.json({
      success: true,
      message: 'Push subscription removed successfully'
    });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription'
    });
  }
});

// Get user's subscriptions count
router.get('/my-subscriptions', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const count = await PushSubscription.getCountForUser(userId);
    const subscriptions = await PushSubscription.find({ 
      userId, 
      isActive: true 
    }).select('deviceInfo createdAt lastUsed');
    
    res.json({
      success: true,
      count,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        deviceType: sub.deviceInfo?.deviceType || 'unknown',
        browser: sub.deviceInfo?.browser || 'unknown',
        createdAt: sub.createdAt,
        lastUsed: sub.lastUsed
      }))
    });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions'
    });
  }
});

// Remove a specific subscription by ID
router.delete('/subscription/:id', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const subscriptionId = req.params.id;
    
    const subscription = await PushSubscription.findOne({
      _id: subscriptionId,
      userId
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    await subscription.deleteOne();
    
    res.json({
      success: true,
      message: 'Subscription removed successfully'
    });
  } catch (error) {
    console.error('Error removing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove subscription'
    });
  }
});

// Test push notification (for debugging - admin only)
router.post('/test', auth, async (req, res) => {
  try {
    // Check if user is admin
    const userRole = req.user.role || req.user.roleId?.name;
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can send test notifications'
      });
    }
    
    const userId = req.user._id || req.user.id;
    const { title, body } = req.body;
    
    const result = await pushService.sendPushToUser(userId, {
      title: title || '🔔 Test Notification',
      body: body || 'This is a test push notification from Reliable Group Digital System',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'test-' + Date.now(),
      data: {
        url: '/dashboard',
        type: 'TEST'
      }
    });
    
    res.json({
      success: true,
      message: `Test notification sent to ${result.sent} device(s)`,
      result
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

module.exports = router;
