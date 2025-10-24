const { supabase, supabaseAdmin } = require('../config/supabase');
const aiService = require('./aiService');
const audioService = require('./audioService');
const quotaService = require('./quotaService');

// Voice ID to name mapping
const VOICE_NAMES = {
  'HzVnxqtdk9eqrcwfxD57': 'Jen',
  'AeRdCCKzvd23BpJoofzx': 'Nathaniel',
  'RxDql9IVj8LjC1obxK7z': 'Nora',
  'ItH39nl7BrnB34569EL1': 'Ella',
  '1TmWQEtqNZdO4bVt9Xo1': 'Grant'
};

function getVoiceName(voiceId) {
  return VOICE_NAMES[voiceId] || 'Unknown';
}

function stripBreakTags(script) {
  return script.replace(/<break\s+time=['"][\d.]+s['"]\s*\/>/g, '');
}

async function createMeditationPlaceholder({ userId, category, duration, voiceId, background, visionId, isGift }) {
  console.log(`🎨 Creating meditation placeholder for user: ${userId}`);
  
  const { data: meditation, error } = await supabaseAdmin
    .from('meditations')
    .insert({
      user_id: userId,
      vision_id: visionId || null,
      category,
      duration,
      voice_id: voiceId,
      voice_name: getVoiceName(voiceId),
      background,
      script: '',
      audio_url: '',
      title_auto: 'Generating...',
      title: 'Generating...',
      status: 'generating',
      is_gift: isGift || false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create meditation placeholder: ' + error.message);
  }

  console.log(`✅ Created meditation placeholder: ${meditation.id}`);
  return meditation;
}

async function completeMeditationGeneration({ meditationId, userId, category, duration, meditationType, voiceId, background, responses, visionId, isGift }) {
  console.log(`🎵 Starting background generation for meditation: ${meditationId}`);
  console.log(`   Category: ${category}, Duration: ${duration}min, Type: ${meditationType || 'default'}, Voice: ${voiceId}, Background: ${background}`);
  
  try {
    console.log(`⏳ [${meditationId}] Step 1/5: Fetching user info...`);
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();
    console.log(`✓ [${meditationId}] User: ${user?.full_name || 'friend'}`);

    let finalResponses = responses;
    if (visionId) {
      console.log(`⏳ [${meditationId}] Fetching vision responses from vision: ${visionId}...`);
      const { data: visionResponses } = await supabaseAdmin
        .from('vision_responses')
        .select('question, answer, category')
        .eq('vision_id', visionId)
        .order('created_at', { ascending: true });
      
      if (visionResponses && visionResponses.length > 0) {
        finalResponses = visionResponses;
        console.log(`✓ [${meditationId}] Loaded ${visionResponses.length} responses from vision`);
      }
    }

    console.log(`⏳ [${meditationId}] Step 2/5: Generating AI script (110 WPM, ~${duration * 110} words)...`);
    
    // Fetch all visions for enrichment
    const { data: visions } = await supabaseAdmin
      .from('visions')
      .select('categories, summary, tagline')
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    const visionStatements = visions?.map(v => ({
      category: v.categories?.[0] || 'general',
      summary: v.summary,
      tagline: v.tagline
    })) || [];
    
    const scriptStart = Date.now();
    const script = await aiService.generateScript({
      category,
      duration,
      meditationType,
      background,
      responses: finalResponses,
      userName: user?.full_name || 'friend',
      visionStatements
    });
    console.log(`✓ [${meditationId}] Script generated in ${((Date.now() - scriptStart) / 1000).toFixed(1)}s (${script.length} chars)`);

    console.log(`⏳ [${meditationId}] Step 3/5: Converting to speech (ElevenLabs) and mixing audio (FFmpeg)...`);
    const audioStart = Date.now();
    const { fileName: audioUrl, ttsAudioDuration } = await audioService.generateMeditationAudio({
      script,
      voiceId,
      background,
      duration
    });
    console.log(`✓ [${meditationId}] Audio generated in ${((Date.now() - audioStart) / 1000).toFixed(1)}s`);

    console.log(`⏳ [${meditationId}] Step 4/5: Generating title...`);
    const title = await aiService.generateTitle(script, category, finalResponses);
    console.log(`✓ [${meditationId}] Title: "${title}"`);

    console.log(`⏳ [${meditationId}] Step 5/5: Saving to database...`);
    const cleanScript = stripBreakTags(script);
    
    // Calculate word count (remove break tags and count words)
    const scriptWithoutBreaks = script.replace(/<break[^>]*>/g, '');
    const wordCount = scriptWithoutBreaks.trim().split(/\s+/).length;
    console.log(`✓ [${meditationId}] Script word count: ${wordCount} words`);
    
    const { error } = await supabaseAdmin
      .from('meditations')
      .update({
        script: cleanScript,
        audio_url: audioUrl,
        title_auto: title,
        title: title,
        voice_name: getVoiceName(voiceId),
        tts_audio_duration_seconds: ttsAudioDuration,
        script_word_count: wordCount,
        status: 'completed'
      })
      .eq('id', meditationId);

    if (error) {
      throw new Error('Failed to update meditation: ' + error.message);
    }

    if (!isGift) {
      await quotaService.incrementPersonalCount(userId);
    } else {
      await quotaService.incrementGiftCount(userId);
    }

    console.log(`✅ Completed meditation generation: ${meditationId}`);
  } catch (error) {
    console.error(`❌ Failed to generate meditation ${meditationId}:`, error);
    console.error(`   Error details:`, error.message);
    console.error(`   Stack:`, error.stack);
    
    await supabaseAdmin
      .from('meditations')
      .update({ status: 'failed' })
      .eq('id', meditationId);
  }
}

async function generateMeditation({ userId, category, duration, voiceId, background, responses, isGift }) {
  const { data: user } = await supabase
    .from('users')
    .select('full_name, subscription_tier')
    .eq('id', userId)
    .single();

  // Fetch all active vision statements for enrichment
  const { data: visionStatements } = await supabaseAdmin
    .from('vision_statements')
    .select('category, statement, tagline, summary')
    .eq('user_id', userId)
    .eq('is_active', true);

  const script = await aiService.generateScript({
    category,
    duration,
    background,
    responses,
    userName: user?.full_name || 'friend',
    visionStatements: visionStatements || []
  });

  const { fileName: audioUrl, ttsAudioDuration } = await audioService.generateMeditationAudio({
    script,
    voiceId,
    background,
    duration
  });

  const title = await aiService.generateTitle(script, category, responses);
  const cleanScript = stripBreakTags(script);

  const { data: meditation, error } = await supabaseAdmin
    .from('meditations')
    .insert({
      user_id: userId,
      category,
      duration,
      voice_id: voiceId,
      voice_name: getVoiceName(voiceId),
      background,
      script: cleanScript,
      audio_url: audioUrl,
      title_auto: title,
      title: title,
      tts_audio_duration_seconds: ttsAudioDuration,
      status: 'completed',
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
  console.log(`📚 Fetching meditations for user: ${userId}, filter: ${filter || 'all'}, category: ${category || 'none'}`);
  
  let query = supabaseAdmin
    .from('meditations')
    .select('*')
    .eq('user_id', userId)
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
    console.error('❌ Failed to fetch meditations:', error.message);
    throw new Error('Failed to fetch meditations: ' + error.message);
  }

  // Sort pinned meditations to the top when showing 'all' (no filter)
  let sortedData = data || [];
  if (!filter && !category) {
    sortedData = sortedData.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  console.log(`✅ Found ${sortedData.length} meditations for user ${userId}`);
  return sortedData;
}

async function pinMeditation(userId, meditationId) {
  // First get the current pin state
  const { data: meditation } = await supabaseAdmin
    .from('meditations')
    .select('is_pinned')
    .eq('id', meditationId)
    .eq('user_id', userId)
    .single();

  // If unpinning, just do it
  if (meditation?.is_pinned) {
    const { error } = await supabaseAdmin
      .from('meditations')
      .update({ is_pinned: false })
      .eq('id', meditationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to unpin meditation: ' + error.message);
    }
    return;
  }

  // If pinning, check the limit
  const { data: pinnedCount } = await supabaseAdmin
    .from('meditations')
    .select('id')
    .eq('user_id', userId)
    .eq('is_pinned', true);

  if (pinnedCount && pinnedCount.length >= 3) {
    throw new Error('Maximum of 3 pinned meditations allowed');
  }

  const { error } = await supabaseAdmin
    .from('meditations')
    .update({ is_pinned: true })
    .eq('id', meditationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to pin meditation: ' + error.message);
  }
}

async function toggleFavorite(userId, meditationId) {
  const { data: meditation } = await supabaseAdmin
    .from('meditations')
    .select('is_favorite')
    .eq('id', meditationId)
    .eq('user_id', userId)
    .single();

  const { error } = await supabaseAdmin
    .from('meditations')
    .update({ is_favorite: !meditation?.is_favorite })
    .eq('id', meditationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to toggle favorite: ' + error.message);
  }
}

async function updateTitle(userId, meditationId, title) {
  const { error } = await supabaseAdmin
    .from('meditations')
    .update({ title })
    .eq('id', meditationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to update title: ' + error.message);
  }
}

async function deleteMeditation(userId, meditationId) {
  // First, get the meditation to extract the audio file name
  const { data: meditation, error: fetchError } = await supabaseAdmin
    .from('meditations')
    .select('audio_url')
    .eq('id', meditationId)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw new Error('Meditation not found or unauthorized');
  }

  // Extract the filename from the audio URL if it exists
  if (meditation.audio_url) {
    try {
      // Parse the filename from the Supabase storage URL
      // URL format: https://...supabase.co/storage/v1/object/public/meditations/meditation-XXXXX.mp3
      const urlParts = meditation.audio_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (fileName) {
        console.log(`🗑️ Deleting audio file from storage: ${fileName}`);
        const { error: storageError } = await supabaseAdmin.storage
          .from('meditations')
          .remove([fileName]);
        
        if (storageError) {
          console.error('Failed to delete audio file:', storageError);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log(`✅ Audio file deleted: ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Error parsing/deleting audio file:', error);
      // Continue with database deletion even if storage deletion fails
    }
  }

  // Delete the meditation record from the database
  const { error: deleteError } = await supabaseAdmin
    .from('meditations')
    .delete()
    .eq('id', meditationId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error('Failed to delete meditation: ' + deleteError.message);
  }

  console.log(`✅ Meditation deleted: ${meditationId}`);
}

module.exports = {
  generateMeditation,
  createMeditationPlaceholder,
  completeMeditationGeneration,
  getUserMeditations,
  pinMeditation,
  toggleFavorite,
  updateTitle,
  deleteMeditation
};
