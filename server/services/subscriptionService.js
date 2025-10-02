const { supabase } = require('../config/supabase');
const quotaService = require('./quotaService');

async function getSubscriptionStatus(userId) {
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier, trial_ends_at')
    .eq('id', userId)
    .single();

  const tier = user?.subscription_tier || 'basic';
  const trialEndsAt = user?.trial_ends_at;
  const isInTrial = trialEndsAt && new Date(trialEndsAt) > new Date();

  return {
    tier,
    isInTrial,
    trialEndsAt,
    features: getFeaturesByTier(tier)
  };
}

async function getQuotaUsage(userId) {
  const quota = await quotaService.getQuotaRecord(userId);
  const tier = await quotaService.getSubscriptionTier(userId);

  const limits = tier === 'advanced' 
    ? { personal: 'unlimited', gift: 'unlimited' }
    : { personal: 3, gift: 3 };

  return {
    personal: {
      used: quota.personal_count,
      limit: limits.personal
    },
    gift: {
      used: quota.gift_count,
      limit: limits.gift
    },
    weekStart: quota.week_start
  };
}

async function upgradeTier(userId, tier) {
  const { error } = await supabase
    .from('users')
    .update({ subscription_tier: tier })
    .eq('id', userId);

  if (error) {
    throw new Error('Failed to upgrade subscription: ' + error.message);
  }
}

function getFeaturesByTier(tier) {
  if (tier === 'advanced') {
    return {
      personalQuota: 'unlimited',
      giftQuota: 'unlimited',
      maxDuration: 60,
      backgroundPlayback: true,
      offline: true,
      voices: 5
    };
  }

  return {
    personalQuota: 3,
    giftQuota: 3,
    maxDuration: 15,
    backgroundPlayback: false,
    offline: false,
    voices: 3
  };
}

module.exports = {
  getSubscriptionStatus,
  getQuotaUsage,
  upgradeTier,
  getFeaturesByTier
};
