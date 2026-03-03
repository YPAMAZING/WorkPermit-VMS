// Push Subscription Model
// Stores push notification subscriptions for users

const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    deviceType: String, // 'mobile', 'desktop', 'tablet'
    browser: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
pushSubscriptionSchema.index({ userId: 1, isActive: 1 });
pushSubscriptionSchema.index({ endpoint: 1 });

// Clean up old inactive subscriptions (older than 30 days)
pushSubscriptionSchema.statics.cleanupInactive = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await this.deleteMany({
    isActive: false,
    updatedAt: { $lt: thirtyDaysAgo }
  });
  console.log(`🧹 Cleaned up ${result.deletedCount} inactive push subscriptions`);
  return result;
};

// Get subscription count for a user
pushSubscriptionSchema.statics.getCountForUser = async function(userId) {
  return this.countDocuments({ userId, isActive: true });
};

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

module.exports = PushSubscription;
