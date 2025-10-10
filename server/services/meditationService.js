const { supabase, supabaseAdmin } = require('../config/supabase');
const aiService = require('./aiService');
const audioService = require('./audioService');
const quotaService = require('./quotaService');

async function generateMeditation({ userId, category, duration, voiceId, background, responses, isGift }) {
  const { data: user } = await supabase
    .from('users')
    .select('full_name, subscription_tier')
    .eq('id', userId)
    .single();

  const script = await aiService.generateScript({
    category,
    duration,
    background,
    responses,
    userName: user?.full_name || 'friend'
  });

  const audioUrl = await audioService.generateMeditationAudio({
    script,
    voiceId,
    background,
    duration
  });

  const title = await aiService.generateTitle(script, category);

  const { data: meditation, error } = await supabaseAdmin
    .from('meditations')
    .insert({
      user_id: userId,
      category,
      duration,
      voice_id: voiceId,
      background,
      script,
      audio_url: audioUrl,
      title_auto: title,
      title: title,
      is_gift: isGift || false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to save meditation: ' + error.message);
  }

  if (!isGift) {
    await quotaService.incrementPersonalCount(userId);
  } else {
    await quotaService.incrementGiftCount(userId);
  }

  return meditation;
}

async function getUserMeditations(userId, filter, category) {
  let query = supabase
    .from('meditations')
    .select('*')
    .or(`user_id.eq.${userId},received_from.not.is.null`)
    .order('created_at', { ascending: false });

  if (filter === 'gift') {
    query = query.not('received_from', 'is', null);
  } else if (filter === 'favorites') {
    query = query.eq('is_favorite', true);
  } else if (filter === 'downloaded') {
    query = query.eq('is_downloaded', true);
  } else if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch meditations: ' + error.message);
  }

  return data;
}

async function pinMeditation(userId, meditationId) {
  const { data: pinnedCount } = await supabase
    .from('meditations')
    .select('id')
    .eq('user_id', userId)
    .eq('is_pinned', true);

  if (pinnedCount && pinnedCount.length >= 3) {
    throw new Error('Maximum of 3 pinned meditations allowed');
  }

  const { error } = await supabase
    .from('meditations')
    .update({ is_pinned: true })
    .eq('id', meditationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to pin meditation: ' + error.message);
  }
}

async function toggleFavorite(userId, meditationId) {
  const { data: meditation } = await supabase
    .from('meditations')
    .select('is_favorite')
    .eq('id', meditationId)
    .eq('user_id', userId)
    .single();

  const { error } = await supabase
    .from('meditations')
    .update({ is_favorite: !meditation?.is_favorite })
    .eq('id', meditationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to toggle favorite: ' + error.message);
  }
}

async function updateTitle(userId, meditationId, title) {
  const { error } = await supabase
    .from('meditations')
    .update({ title })
    .eq('id', meditationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to update title: ' + error.message);
  }
}

module.exports = {
  generateMeditation,
  getUserMeditations,
  pinMeditation,
  toggleFavorite,
  updateTitle
};
