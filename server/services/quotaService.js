const { supabase } = require('../config/supabase');

function getWeekStart() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

async function getQuotaRecord(userId) {
  const weekStart = getWeekStart();

  const { data, error } = await supabase
    .from('quota_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error('Failed to fetch quota: ' + error.message);
  }

  if (!data) {
    const { data: newQuota, error: insertError } = await supabase
      .from('quota_tracking')
      .insert({
        user_id: userId,
        week_start: weekStart,
        personal_count: 0,
        gift_count: 0
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to create quota record: ' + insertError.message);
    }

    return newQuota;
  }

  return data;
}

async function getSubscriptionTier(userId) {
  const { data } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  return data?.subscription_tier || 'basic';
}

async function canCreatePersonalMeditation(userId) {
  const tier = await getSubscriptionTier(userId);
  
  if (tier === 'advanced') {
    return true;
  }

  const quota = await getQuotaRecord(userId);
  return quota.personal_count < 3;
}

async function canCreateGiftMeditation(userId) {
  const tier = await getSubscriptionTier(userId);
  
  if (tier === 'advanced') {
    return true;
  }

  const quota = await getQuotaRecord(userId);
  return quota.gift_count < 3;
}

async function incrementPersonalCount(userId) {
  const weekStart = getWeekStart();
  const quota = await getQuotaRecord(userId);
  
  const { error } = await supabase
    .from('quota_tracking')
    .update({ personal_count: quota.personal_count + 1 })
    .eq('user_id', userId)
    .eq('week_start', weekStart);

  if (error) {
    throw new Error('Failed to update quota: ' + error.message);
  }
}

async function incrementGiftCount(userId) {
  const weekStart = getWeekStart();
  const quota = await getQuotaRecord(userId);
  
  const { error } = await supabase
    .from('quota_tracking')
    .update({ gift_count: quota.gift_count + 1 })
    .eq('user_id', userId)
    .eq('week_start', weekStart);

  if (error) {
    throw new Error('Failed to update quota: ' + error.message);
  }
}

module.exports = {
  getQuotaRecord,
  canCreatePersonalMeditation,
  canCreateGiftMeditation,
  incrementPersonalCount,
  incrementGiftCount
};
