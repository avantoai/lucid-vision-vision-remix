const { supabase } = require('../config/supabase');
const meditationService = require('./meditationService');
const quotaService = require('./quotaService');

async function createGiftMeditation({ userId, duration, voiceId, background, responses }) {
  const canCreate = await quotaService.canCreateGiftMeditation(userId);
  if (!canCreate) {
    throw new Error('Weekly gift quota exceeded');
  }

  if (duration > 15) {
    throw new Error('Gift meditations are limited to 15 minutes');
  }

  const meditation = await meditationService.generateMeditation({
    userId,
    category: 'gift',
    duration,
    voiceId,
    background,
    responses,
    isGift: true
  });

  const { data: user } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single();

  const { data: gift, error } = await supabase
    .from('gifts')
    .insert({
      meditation_id: meditation.id,
      sender_id: userId,
      sender_name: user?.full_name || 'A Friend',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create gift: ' + error.message);
  }

  const shareUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/gift/${gift.id}`;

  return {
    ...gift,
    meditation,
    shareUrl
  };
}

async function getGift(giftId) {
  const { data: gift, error } = await supabase
    .from('gifts')
    .select(`
      *,
      meditations (*)
    `)
    .eq('id', giftId)
    .single();

  if (error || !gift) {
    throw new Error('Gift not found');
  }

  return gift;
}

async function saveGiftToLibrary(userId, giftId) {
  const { data: gift } = await supabase
    .from('gifts')
    .select('meditation_id, sender_name')
    .eq('id', giftId)
    .single();

  if (!gift) {
    throw new Error('Gift not found');
  }

  const { data: meditation } = await supabase
    .from('meditations')
    .select('*')
    .eq('id', gift.meditation_id)
    .single();

  const { data: newMeditation, error } = await supabase
    .from('meditations')
    .insert({
      user_id: userId,
      category: meditation.category,
      duration: meditation.duration,
      voice_id: meditation.voice_id,
      background: meditation.background,
      script: meditation.script,
      audio_url: meditation.audio_url,
      title_auto: meditation.title_auto,
      title: meditation.title,
      is_gift: true,
      received_from: gift.sender_name,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to save gift: ' + error.message);
  }

  return newMeditation;
}

module.exports = {
  createGiftMeditation,
  getGift,
  saveGiftToLibrary
};
