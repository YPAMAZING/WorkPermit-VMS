// Push Notification Service using Web Push
// Sends push notifications to subscribed devices
// NOTE: Uses Prisma for database operations

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
    console.log('⚠️  VAPID keys not configured - push notifications disabled');
    console.log('   Generate keys with: npx web-push generate-vapid-keys');
    return false;
  }
  
  // Trim whitespace from keys
  publicKey = publicKey.trim();
  privateKey = privateKey.trim();
  
  // Remove any trailing "=" padding if present (URL-safe base64 doesn't use padding)
  publicKey = publicKey.replace(/=+$/, '');
  privateKey = privateKey.replace(/=+$/, '');
  
  // Basic length validation
  if (publicKey.length < 20 || privateKey.length < 20) {
    console.log('⚠️  VAPID keys appear too short - push notifications disabled');
    console.log('   Generate new keys with: npx web-push generate-vapid-keys');
    return false;
  }
  
  // More permissive format check (allows URL-safe base64 chars)
  const urlSafeBase64Regex = /^[A-Za-z0-9_\-]+$/;
  if (!urlSafeBase64Regex.test(publicKey) || !urlSafeBase64Regex.test(privateKey)) {
    console.log('⚠️  VAPID keys contain invalid characters - push notifications disabled');
    console.log('   Keys must contain only: A-Z, a-z, 0-9, underscore (_), and hyphen (-)');
    console.log('   Generate new keys with: npx web-push generate-vapid-keys');
    return false;
  }
  
  try {
    webpush.setVapidDetails(
      `mailto:${process.env.SMTP_USER || 'admin@reliablespaces.cloud'}`,
      publicKey,
      privateKey
    );
    console.log('✅ Web Push configured with VAPID keys');
    console.log(`   Public key length: ${publicKey.length} chars`);
    return true;
  } catch (error) {
    console.error('⚠️  Failed to configure web push:', error.message);
    console.log('   Push notifications disabled - generate new keys with: npx web-push generate-vapid-keys');
    return false;
  }
};

// Initialize on module load
pushConfigured = initializePush();

// Get VAPID public key for client
const getVapidPublicKey = () => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return null;
  // Return key without padding
  return key.trim().replace(/=+$/, '');
};

// Save push subscription for a user
const saveSubscription = async (userId, subscription, deviceInfo = {}) => {
  if (!isPushConfigured()) {
    console.log('⚠️  Push not configured - skipping save subscription');
    return null;
  }

  try {
    const db = getPrisma();
    const endpointHash = hashEndpoint(subscription.endpoint);
    
    // Check if subscription already exists
    const existingSubscription = await db.pushSubscription.findUnique({
      where: { endpointHash }
    });

    if (existingSubscription) {
      // Update existing subscription
      const updated = await db.pushSubscription.update({
        where: { endpointHash },
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: deviceInfo.userAgent || null,
          deviceType: deviceInfo.deviceType || 'unknown',
          browser: deviceInfo.browser || null,
          lastUsed: new Date(),
        }
      });
      console.log(`📱 Updated push subscription for user ${userId}`);
      return updated;
    }

    // Create new subscription
    const newSubscription = await db.pushSubscription.create({
      data: {
        userId,
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

    console.log(`📱 Saved new push subscription for user ${userId}`);
    return newSubscription;
  } catch (error) {
    console.error('❌ Error saving push subscription:', error.message);
    return null;
  }
};

// Remove push subscription
const removeSubscription = async (endpoint) => {
  if (!isPushConfigured()) return { count: 0 };

  try {
    const db = getPrisma();
    const endpointHash = hashEndpoint(endpoint);
    const result = await db.pushSubscription.deleteMany({
      where: { endpointHash }
    });
    if (result.count > 0) {
      console.log(`📱 Removed push subscription`);
    }
    return result;
  } catch (error) {
    console.error('❌ Error removing push subscription:', error.message);
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
    console.log(`✅ Push notification sent successfully`);
    
    // Update last used
    const db = getPrisma();
    const endpointHash = hashEndpoint(subscription.endpoint);
    await db.pushSubscription.update({
      where: { endpointHash },
      data: { lastUsed: new Date() }
    }).catch(() => {}); // Ignore errors on update
    
    return true;
  } catch (error) {
    console.error(`❌ Push notification failed:`, error.message);
    
    // If subscription is no longer valid, mark as inactive
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`📱 Subscription expired, marking as inactive`);
      const db = getPrisma();
      const endpointHash = hashEndpoint(subscription.endpoint);
      await db.pushSubscription.update({
        where: { endpointHash },
        data: { isActive: false }
      }).catch(() => {});
    }
    
    return false;
  }
};

// Send push notification to a user (all their devices)
const sendPushToUser = async (userId, payload) => {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  try {
    const db = getPrisma();
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        userId,
        isActive: true
      }
    });

    if (subscriptions.length === 0) {
      console.log(`📱 No active push subscriptions for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`📱 Sending push to ${subscriptions.length} device(s) for user ${userId}`);

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
    console.error('❌ Error sending push to user:', error.message);
    return { sent: 0, failed: 0 };
  }
};

// Send push notification to multiple users
const sendPushToUsers = async (userIds, payload) => {
  if (!isPushConfigured() || !userIds || userIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { sent: totalSent, failed: totalFailed };
};

// Send push notification to users by role
const sendPushToRole = async (roleName, payload) => {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  try {
    const db = getPrisma();
    
    // Get all active subscriptions for users with this role
    const subscriptions = await db.pushSubscription.findMany({
      where: { 
        isActive: true,
        user: {
          role: {
            name: roleName
          },
          isActive: true,
          isApproved: true
        }
      }
    });

    if (subscriptions.length === 0) {
      console.log(`📱 No active push subscriptions for role ${roleName}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`📱 Sending push to ${subscriptions.length} ${roleName} device(s)`);

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
    console.error('❌ Error sending push to role:', error.message);
    return { sent: 0, failed: 0 };
  }
};

// Send push to all active subscriptions (broadcast)
const sendPushToAll = async (payload) => {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  try {
    const db = getPrisma();
    const subscriptions = await db.pushSubscription.findMany({
      where: { isActive: true }
    });

    if (subscriptions.length === 0) {
      console.log(`📱 No active push subscriptions`);
      return { sent: 0, failed: 0 };
    }

    console.log(`📱 Broadcasting push to ${subscriptions.length} device(s)`);

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
    console.error('❌ Error broadcasting push:', error.message);
    return { sent: 0, failed: 0 };
  }
};

// Get user's subscriptions
const getSubscriptionsForUser = async (userId) => {
  if (!isPushConfigured()) {
    return [];
  }

  try {
    const db = getPrisma();
    return await db.pushSubscription.findMany({
      where: {
        userId,
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
    console.error('❌ Error getting subscriptions:', error.message);
    return [];
  }
};

// Get subscription count for a user
const getSubscriptionCount = async (userId) => {
  if (!isPushConfigured()) {
    return 0;
  }

  try {
    const db = getPrisma();
    return await db.pushSubscription.count({
      where: {
        userId,
        isActive: true
      }
    });
  } catch (error) {
    return 0;
  }
};

// Delete subscription by ID
const deleteSubscriptionById = async (subscriptionId, userId) => {
  if (!isPushConfigured()) {
    return false;
  }

  try {
    const db = getPrisma();
    await db.pushSubscription.delete({
      where: {
        id: subscriptionId,
        userId
      }
    });
    return true;
  } catch (error) {
    console.error('❌ Error deleting subscription:', error.message);
    return false;
  }
};

// ================================
// NOTIFICATION TEMPLATES
// ================================

// New permit created - notify firemen/approvers
const notifyNewPermit = async (permitData, approverUserIds) => {
  const payload = {
    title: '🔥 New Permit Request',
    body: `${permitData.title} - ${permitData.workType} at ${permitData.location}`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `permit-new-${permitData._id || permitData.id}`,
    data: {
      url: '/approvals',
      type: 'NEW_PERMIT',
      permitId: permitData._id || permitData.id
    },
    requireInteraction: true,
  };

  return await sendPushToUsers(approverUserIds, payload);
};

// Permit approved - notify requestor
const notifyPermitApproved = async (permitData, requestorUserId) => {
  const payload = {
    title: '✅ Permit Approved',
    body: `Your permit "${permitData.title}" has been approved!`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `permit-approved-${permitData._id || permitData.id}`,
    data: {
      url: `/permits/${permitData._id || permitData.id}`,
      type: 'PERMIT_APPROVED',
      permitId: permitData._id || permitData.id
    }
  };

  return await sendPushToUser(requestorUserId, payload);
};

// Permit rejected - notify requestor
const notifyPermitRejected = async (permitData, requestorUserId, reason) => {
  const payload = {
    title: '❌ Permit Not Approved',
    body: `Your permit "${permitData.title}" was not approved. ${reason ? `Reason: ${reason}` : ''}`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `permit-rejected-${permitData._id || permitData.id}`,
    data: {
      url: `/permits/${permitData._id || permitData.id}`,
      type: 'PERMIT_REJECTED',
      permitId: permitData._id || permitData.id
    }
  };

  return await sendPushToUser(requestorUserId, payload);
};

// New user registration - notify admins
const notifyNewRegistration = async (userData, adminUserIds) => {
  const payload = {
    title: '👤 New Account Request',
    body: `${userData.firstName} ${userData.lastName} wants to create an account`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `registration-${userData.email}`,
    data: {
      url: '/users?tab=pending',
      type: 'NEW_REGISTRATION'
    },
    requireInteraction: true,
  };

  return await sendPushToUsers(adminUserIds, payload);
};

// Account approved - notify user
const notifyAccountApproved = async (userId, userName) => {
  const payload = {
    title: '✅ Account Approved',
    body: `Welcome ${userName}! Your account has been approved.`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'account-approved',
    data: {
      url: '/dashboard',
      type: 'ACCOUNT_APPROVED'
    }
  };

  return await sendPushToUser(userId, payload);
};

// New visitor - notify company
const notifyNewVisitor = async (visitorData, companyUserIds) => {
  const payload = {
    title: '👥 New Visitor',
    body: `${visitorData.name} is requesting to visit`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `visitor-${visitorData._id || visitorData.id}`,
    data: {
      url: '/vms/visitors',
      type: 'NEW_VISITOR',
      visitorId: visitorData._id || visitorData.id
    },
    requireInteraction: true,
  };

  return await sendPushToUsers(companyUserIds, payload);
};

// Permit expiring soon - notify requestor
const notifyPermitExpiringSoon = async (permitData, requestorUserId, hoursLeft) => {
  const payload = {
    title: '⚠️ Permit Expiring Soon',
    body: `Your permit "${permitData.title}" will expire in ${hoursLeft} hours`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `permit-expiring-${permitData._id || permitData.id}`,
    data: {
      url: `/permits/${permitData._id || permitData.id}`,
      type: 'PERMIT_EXPIRING',
      permitId: permitData._id || permitData.id
    },
  };

  return await sendPushToUser(requestorUserId, payload);
};

// Generic notification
const sendNotification = async (userIds, title, body, url = '/', tag = 'notification') => {
  const payload = {
    title,
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag,
    data: { url }
  };

  if (Array.isArray(userIds)) {
    return await sendPushToUsers(userIds, payload);
  } else {
    return await sendPushToUser(userIds, payload);
  }
};

module.exports = {
  getVapidPublicKey,
  isPushConfigured,
  saveSubscription,
  removeSubscription,
  sendPushToUser,
  sendPushToUsers,
  sendPushToRole,
  sendPushToAll,
  getSubscriptionsForUser,
  getSubscriptionCount,
  deleteSubscriptionById,
  // Notification templates
  notifyNewPermit,
  notifyPermitApproved,
  notifyPermitRejected,
  notifyNewRegistration,
  notifyAccountApproved,
  notifyNewVisitor,
  notifyPermitExpiringSoon,
  sendNotification
};
