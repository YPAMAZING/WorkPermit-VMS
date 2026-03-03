// Push Notification Service using Web Push
// Sends push notifications to subscribed devices

const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscription.model');

// VAPID keys - these should be stored in environment variables
// Generate once using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLc-k4EXAMPLE_KEY_REPLACE_THIS_WITH_REAL_KEY_FROM_GENERATION';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'EXAMPLE_PRIVATE_KEY_REPLACE_THIS';

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.SMTP_USER || 'admin@reliablespaces.cloud'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push configured with VAPID keys');
} else {
  console.log('⚠️  VAPID keys not configured - push notifications will not work');
  console.log('   Generate keys with: npx web-push generate-vapid-keys');
}

// Get VAPID public key for client
const getVapidPublicKey = () => {
  return process.env.VAPID_PUBLIC_KEY || null;
};

// Check if push notifications are configured
const isPushConfigured = () => {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
};

// Save push subscription for a user
const saveSubscription = async (userId, subscription, deviceInfo = {}) => {
  try {
    // Check if subscription already exists
    const existingSubscription = await PushSubscription.findOne({
      endpoint: subscription.endpoint
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.userId = userId;
      existingSubscription.keys = subscription.keys;
      existingSubscription.deviceInfo = deviceInfo;
      existingSubscription.lastUsed = new Date();
      await existingSubscription.save();
      console.log(`📱 Updated push subscription for user ${userId}`);
      return existingSubscription;
    }

    // Create new subscription
    const newSubscription = new PushSubscription({
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      deviceInfo,
      isActive: true
    });

    await newSubscription.save();
    console.log(`📱 Saved new push subscription for user ${userId}`);
    return newSubscription;
  } catch (error) {
    console.error('❌ Error saving push subscription:', error.message);
    throw error;
  }
};

// Remove push subscription
const removeSubscription = async (endpoint) => {
  try {
    const result = await PushSubscription.deleteOne({ endpoint });
    if (result.deletedCount > 0) {
      console.log(`📱 Removed push subscription`);
    }
    return result;
  } catch (error) {
    console.error('❌ Error removing push subscription:', error.message);
    throw error;
  }
};

// Send push notification to a single subscription
const sendPushToSubscription = async (subscription, payload) => {
  if (!isPushConfigured()) {
    console.log('⚠️  Push not configured - skipping');
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: subscription.keys
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    console.log(`✅ Push notification sent successfully`);
    
    // Update last used
    await PushSubscription.updateOne(
      { endpoint: subscription.endpoint },
      { lastUsed: new Date() }
    );
    
    return true;
  } catch (error) {
    console.error(`❌ Push notification failed:`, error.message);
    
    // If subscription is no longer valid, mark as inactive
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`📱 Subscription expired, marking as inactive`);
      await PushSubscription.updateOne(
        { endpoint: subscription.endpoint },
        { isActive: false }
      );
    }
    
    return false;
  }
};

// Send push notification to a user (all their devices)
const sendPushToUser = async (userId, payload) => {
  if (!isPushConfigured()) {
    console.log('⚠️  Push not configured - skipping notification to user');
    return { sent: 0, failed: 0 };
  }

  try {
    const subscriptions = await PushSubscription.find({
      userId,
      isActive: true
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
  if (!isPushConfigured()) {
    console.log('⚠️  Push not configured - skipping');
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
const sendPushToRole = async (role, payload) => {
  if (!isPushConfigured()) {
    console.log('⚠️  Push not configured - skipping');
    return { sent: 0, failed: 0 };
  }

  try {
    // Get all active subscriptions for users with this role
    const subscriptions = await PushSubscription.find({ isActive: true })
      .populate('userId', 'role');

    const filteredSubscriptions = subscriptions.filter(
      sub => sub.userId && sub.userId.role === role
    );

    if (filteredSubscriptions.length === 0) {
      console.log(`📱 No active push subscriptions for role ${role}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`📱 Sending push to ${filteredSubscriptions.length} ${role} device(s)`);

    let sent = 0;
    let failed = 0;

    for (const subscription of filteredSubscriptions) {
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
    console.log('⚠️  Push not configured - skipping broadcast');
    return { sent: 0, failed: 0 };
  }

  try {
    const subscriptions = await PushSubscription.find({ isActive: true });

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
    tag: `permit-new-${permitData._id}`,
    data: {
      url: '/approvals',
      type: 'NEW_PERMIT',
      permitId: permitData._id
    },
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Review' },
      { action: 'dismiss', title: 'Later' }
    ]
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
    tag: `permit-approved-${permitData._id}`,
    data: {
      url: `/permits/${permitData._id}`,
      type: 'PERMIT_APPROVED',
      permitId: permitData._id
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
    tag: `permit-rejected-${permitData._id}`,
    data: {
      url: `/permits/${permitData._id}`,
      type: 'PERMIT_REJECTED',
      permitId: permitData._id
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
    actions: [
      { action: 'review', title: 'Review' }
    ]
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
    tag: `visitor-${visitorData._id}`,
    data: {
      url: '/vms/visitors',
      type: 'NEW_VISITOR',
      visitorId: visitorData._id
    },
    requireInteraction: true,
    actions: [
      { action: 'approve', title: 'Approve' },
      { action: 'view', title: 'View Details' }
    ]
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
    tag: `permit-expiring-${permitData._id}`,
    data: {
      url: `/permits/${permitData._id}`,
      type: 'PERMIT_EXPIRING',
      permitId: permitData._id
    },
    actions: [
      { action: 'extend', title: 'Extend' },
      { action: 'view', title: 'View' }
    ]
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
