// VMS Push Notification Service
// Separate from Work Permit push service - uses VMSPushSubscription table
// Sends push notifications to VMS users

const webpush = require('web-push');
const crypto = require('crypto');

// Lazy load Prisma to avoid circular dependencies
let prisma = null;
const getPrisma = () => {
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
};

// Generate SHA256 hash of endpoint for unique lookups
const hashEndpoint = (endpoint) => {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
};

// Track if push is properly configured
let pushConfigured = false;

// Check if VAPID keys are configured and valid
const isPushConfigured = () => {
  return pushConfigured;
};

// Configure web-push only if VAPID keys are present and valid
const initializePush = () => {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    console.log('⚠️  [VMS Push] VAPID keys not configured - push notifications disabled');
    return false;
  }
  
  // Trim whitespace from keys
  publicKey = publicKey.trim();
  privateKey = privateKey.trim();
  
  // Remove any trailing "=" padding if present
  publicKey = publicKey.replace(/=+$/, '');
  privateKey = privateKey.replace(/=+$/, '');
  
  // Basic length validation
  if (publicKey.length < 20 || privateKey.length < 20) {
    console.log('⚠️  [VMS Push] VAPID keys appear too short');
    return false;
  }
  
  try {
    webpush.setVapidDetails(
      `mailto:${process.env.SMTP_USER || 'admin@reliablespaces.cloud'}`,
      publicKey,
      privateKey
    );
    console.log('✅ [VMS Push] Web Push configured');
    return true;
  } catch (error) {
    console.error('⚠️  [VMS Push] Failed to configure:', error.message);
    return false;
  }
};

// Initialize on module load
pushConfigured = initializePush();

// Get VAPID public key for client
const getVapidPublicKey = () => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return null;
  return key.trim().replace(/=+$/, '');
};

// Save VMS push subscription for a user
const saveSubscription = async (vmsUserId, subscription, deviceInfo = {}) => {
  if (!isPushConfigured()) {
    console.log('⚠️  [VMS Push] Not configured - skipping save subscription');
    return null;
  }

  try {
    const db = getPrisma();
    const endpointHash = hashEndpoint(subscription.endpoint);
    
    console.log(`📱 [VMS Push] Saving subscription for VMS user: ${vmsUserId}`);
    
    // Check if subscription already exists
    const existingSubscription = await db.vMSPushSubscription.findUnique({
      where: { endpointHash }
    });

    if (existingSubscription) {
      // Update existing subscription
      const updated = await db.vMSPushSubscription.update({
        where: { endpointHash },
        data: {
          vmsUserId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: deviceInfo.userAgent || null,
          deviceType: deviceInfo.deviceType || 'unknown',
          browser: deviceInfo.browser || null,
          lastUsed: new Date(),
        }
      });
      console.log(`📱 [VMS Push] Updated subscription for VMS user ${vmsUserId}`);
      return updated;
    }

    // Create new subscription
    const newSubscription = await db.vMSPushSubscription.create({
      data: {
        vmsUserId,
        endpoint: subscription.endpoint,
        endpointHash,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: deviceInfo.userAgent || null,
        deviceType: deviceInfo.deviceType || 'unknown',
        browser: deviceInfo.browser || null,
        isActive: true,
      }
    });

    console.log(`📱 [VMS Push] Saved new subscription for VMS user ${vmsUserId}`);
    return newSubscription;
  } catch (error) {
    console.error('❌ [VMS Push] Error saving subscription:', error.message);
    return null;
  }
};

// Remove VMS push subscription
const removeSubscription = async (endpoint) => {
  if (!isPushConfigured()) return { count: 0 };

  try {
    const db = getPrisma();
    const endpointHash = hashEndpoint(endpoint);
    const result = await db.vMSPushSubscription.deleteMany({
      where: { endpointHash }
    });
    if (result.count > 0) {
      console.log(`📱 [VMS Push] Removed subscription`);
    }
    return result;
  } catch (error) {
    console.error('❌ [VMS Push] Error removing subscription:', error.message);
    return { count: 0 };
  }
};

// Send push notification to a single subscription
const sendPushToSubscription = async (subscription, payload) => {
  if (!isPushConfigured()) {
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    console.log(`✅ [VMS Push] Notification sent successfully`);
    
    // Update last used
    const db = getPrisma();
    const endpointHash = hashEndpoint(subscription.endpoint);
    await db.vMSPushSubscription.update({
      where: { endpointHash },
      data: { lastUsed: new Date() }
    }).catch(() => {});
    
    return true;
  } catch (error) {
    console.error(`❌ [VMS Push] Notification failed:`, error.message);
    
    // If subscription is no longer valid, mark as inactive
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`📱 [VMS Push] Subscription expired, marking as inactive`);
      const db = getPrisma();
      const endpointHash = hashEndpoint(subscription.endpoint);
      await db.vMSPushSubscription.update({
        where: { endpointHash },
        data: { isActive: false }
      }).catch(() => {});
    }
    
    return false;
  }
};

// Send push notification to a VMS user (all their devices)
const sendPushToUser = async (vmsUserId, payload) => {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  try {
    const db = getPrisma();
    const subscriptions = await db.vMSPushSubscription.findMany({
      where: {
        vmsUserId,
        isActive: true
      }
    });

    if (subscriptions.length === 0) {
      console.log(`📱 [VMS Push] No active subscriptions for VMS user ${vmsUserId}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`📱 [VMS Push] Sending to ${subscriptions.length} device(s) for VMS user ${vmsUserId}`);

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      const success = await sendPushToSubscription(subscription, payload);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error('❌ [VMS Push] Error sending to user:', error.message);
    return { sent: 0, failed: 0 };
  }
};

// Send push notification to multiple VMS users
const sendPushToUsers = async (vmsUserIds, payload) => {
  if (!isPushConfigured() || !vmsUserIds || vmsUserIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const vmsUserId of vmsUserIds) {
    const result = await sendPushToUser(vmsUserId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { sent: totalSent, failed: totalFailed };
};

// Get VMS user's subscriptions
const getSubscriptionsForUser = async (vmsUserId) => {
  if (!isPushConfigured()) {
    return [];
  }

  try {
    const db = getPrisma();
    return await db.vMSPushSubscription.findMany({
      where: {
        vmsUserId,
        isActive: true
      },
      select: {
        id: true,
        deviceType: true,
        browser: true,
        createdAt: true,
        lastUsed: true,
      }
    });
  } catch (error) {
    console.error('❌ [VMS Push] Error getting subscriptions:', error.message);
    return [];
  }
};

// Get subscription count for a VMS user
const getSubscriptionCount = async (vmsUserId) => {
  if (!isPushConfigured()) {
    return 0;
  }

  try {
    const db = getPrisma();
    return await db.vMSPushSubscription.count({
      where: {
        vmsUserId,
        isActive: true
      }
    });
  } catch (error) {
    return 0;
  }
};

// Delete subscription by ID
const deleteSubscriptionById = async (subscriptionId, vmsUserId) => {
  if (!isPushConfigured()) {
    return false;
  }

  try {
    const db = getPrisma();
    await db.vMSPushSubscription.delete({
      where: {
        id: subscriptionId,
        vmsUserId
      }
    });
    return true;
  } catch (error) {
    console.error('❌ [VMS Push] Error deleting subscription:', error.message);
    return false;
  }
};

// ================================
// VMS NOTIFICATION TEMPLATES
// ================================

// New visitor - notify company users
const notifyNewVisitor = async (visitorData, vmsUserIds) => {
  const payload = {
    title: '👥 New Visitor',
    body: `${visitorData.name} is requesting to visit`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `vms-visitor-${visitorData.id}`,
    data: {
      url: '/vms/admin/guard',
      type: 'NEW_VISITOR',
      visitorId: visitorData.id
    },
    requireInteraction: true,
  };

  return await sendPushToUsers(vmsUserIds, payload);
};

// Visitor approved - notify visitor (if they have app)
const notifyVisitorApproved = async (visitorData, vmsUserId) => {
  const payload = {
    title: '✅ Visit Approved',
    body: `Your visit to ${visitorData.companyName} has been approved`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `vms-approved-${visitorData.id}`,
    data: {
      url: '/vms/visitor/status',
      type: 'VISIT_APPROVED',
      visitorId: visitorData.id
    }
  };

  return await sendPushToUser(vmsUserId, payload);
};

// Visitor rejected
const notifyVisitorRejected = async (visitorData, vmsUserId, reason) => {
  const payload = {
    title: '❌ Visit Not Approved',
    body: `Your visit was not approved. ${reason ? `Reason: ${reason}` : ''}`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `vms-rejected-${visitorData.id}`,
    data: {
      url: '/vms/visitor/status',
      type: 'VISIT_REJECTED',
      visitorId: visitorData.id
    }
  };

  return await sendPushToUser(vmsUserId, payload);
};

// Pre-approved visitor arrived
const notifyPreApprovedArrival = async (visitorData, vmsUserIds) => {
  const payload = {
    title: '🎫 Pre-Approved Visitor Arrived',
    body: `${visitorData.name} has checked in with pre-approval`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `vms-preapproved-${visitorData.id}`,
    data: {
      url: '/vms/admin/guard',
      type: 'PREAPPROVED_ARRIVAL',
      visitorId: visitorData.id
    }
  };

  return await sendPushToUsers(vmsUserIds, payload);
};

// Generic VMS notification
const sendNotification = async (vmsUserIds, title, body, url = '/vms/dashboard', tag = 'vms-notification') => {
  const payload = {
    title,
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag,
    data: { url }
  };

  if (Array.isArray(vmsUserIds)) {
    return await sendPushToUsers(vmsUserIds, payload);
  } else {
    return await sendPushToUser(vmsUserIds, payload);
  }
};

module.exports = {
  getVapidPublicKey,
  isPushConfigured,
  saveSubscription,
  removeSubscription,
  sendPushToUser,
  sendPushToUsers,
  getSubscriptionsForUser,
  getSubscriptionCount,
  deleteSubscriptionById,
  // VMS notification templates
  notifyNewVisitor,
  notifyVisitorApproved,
  notifyVisitorRejected,
  notifyPreApprovedArrival,
  sendNotification
};
