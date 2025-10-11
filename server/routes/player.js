const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');

router.get('/preview/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    let audioPath;
    if (type === 'voice') {
      audioPath = `previews/voices/${id}.mp3`;
    } else if (type === 'background') {
      audioPath = `previews/backgrounds/${id}.mp3`;
    } else {
      return res.status(400).json({ error: 'Invalid preview type' });
    }

    const { data, error } = await supabase.storage
      .from('audio-assets')
      .createSignedUrl(audioPath, 3600);

    if (error) {
      return res.status(404).json({ error: 'Preview not found' });
    }

    res.json({ success: true, url: data.signedUrl });
  } catch (error) {
    console.error('Get preview error:', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

router.get('/audio/:meditationId', async (req, res) => {
  try {
    console.log(`🎵 Fetching audio for meditation: ${req.params.meditationId}`);
    const authHeader = req.headers.authorization;
    const isAuthenticated = authHeader && authHeader.startsWith('Bearer ');

    let meditation;
    let user = null;

    if (isAuthenticated) {
      const token = authHeader.substring(7);
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser;
      console.log(`🔐 Authenticated user: ${user?.id}`);

      const { data, error } = await supabaseAdmin
        .from('meditations')
        .select('*')
        .eq('id', req.params.meditationId)
        .single();

      if (error || !data) {
        console.error('❌ Meditation not found:', error?.message);
        return res.status(404).json({ error: 'Meditation not found' });
      }

      meditation = data;
      console.log(`✅ Found meditation for user: ${meditation.user_id}`);

      if (meditation.user_id !== user.id && !meditation.received_from) {
        console.error('❌ Unauthorized access attempt');
        return res.status(403).json({ error: 'Unauthorized access' });
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from('meditations')
        .select('*')
        .eq('id', req.params.meditationId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Meditation not found' });
      }

      meditation = data;

      if (!meditation.is_gift) {
        return res.status(401).json({ error: 'Authentication required' });
      }
    }

    console.log(`🔊 Creating signed URL for audio_url: ${meditation.audio_url}`);
    console.log(`📦 Bucket: meditations, Path: ${meditation.audio_url}`);
    
    const { data: urlData, error: urlError } = await supabase.storage
      .from('meditations')
      .createSignedUrl(meditation.audio_url, 3600);

    if (urlError) {
      console.error('❌ Failed to create signed URL:', urlError);
      console.error('❌ Error details - status:', urlError.status, 'statusCode:', urlError.statusCode);
      console.error('❌ Full error object:', JSON.stringify(urlError, null, 2));
      
      // Try listing files to debug
      const { data: files } = await supabase.storage
        .from('meditations')
        .list();
      console.log('📂 Files in bucket root:', files?.map(f => f.name).join(', '));
      
      if (urlError.status === 400 || urlError.statusCode === '404') {
        return res.status(404).json({ 
          error: 'Audio file not found',
          details: `Looking for: ${meditation.audio_url}. This meditation was created during testing and the audio file is missing. Please create a new meditation.`
        });
      }
      return res.status(500).json({ error: 'Failed to generate audio URL' });
    }

    console.log(`✅ Signed URL created successfully`);
    res.json({ success: true, url: urlData.signedUrl });
  } catch (error) {
    console.error('Get audio error:', error);
    res.status(500).json({ error: 'Failed to get audio' });
  }
});

module.exports = router;
