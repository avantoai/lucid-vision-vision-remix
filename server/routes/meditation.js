const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const meditationService = require('../services/meditationService');
const quotaService = require('../services/quotaService');
const { supabaseAdmin } = require('../config/supabase');

router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { category, duration, voiceId, background, responses, visionId, isGift } = req.body;

    if (!isGift) {
      const canCreate = await quotaService.canCreatePersonalMeditation(req.user.id);
      if (!canCreate) {
        return res.status(403).json({ error: 'Weekly meditation quota exceeded', upgradeRequired: true });
      }
    } else {
      const canCreate = await quotaService.canCreateGiftMeditation(req.user.id);
      if (!canCreate) {
        return res.status(403).json({ error: 'Weekly gift quota exceeded', upgradeRequired: true });
      }
    }

    const meditation = await meditationService.createMeditationPlaceholder({
      userId: req.user.id,
      category,
      duration,
      voiceId,
      background,
      visionId,
      isGift
    });

    meditationService.completeMeditationGeneration({
      meditationId: meditation.id,
      userId: req.user.id,
      category,
      duration,
      voiceId,
      background,
      responses,
      visionId,
      isGift
    }).catch(error => {
      console.error('Background generation error:', error);
    });

    res.json({ success: true, meditation });
  } catch (error) {
    console.error('Generate meditation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate meditation' });
  }
});

router.get('/list', authenticateUser, async (req, res) => {
  try {
    const { filter, category } = req.query;
    const meditations = await meditationService.getUserMeditations(req.user.id, filter, category);
    res.json({ success: true, meditations });
  } catch (error) {
    console.error('List meditations error:', error);
    res.status(500).json({ error: 'Failed to fetch meditations' });
  }
});

router.post('/pin/:meditationId', authenticateUser, async (req, res) => {
  try {
    await meditationService.pinMeditation(req.user.id, req.params.meditationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Pin meditation error:', error);
    res.status(500).json({ error: error.message || 'Failed to pin meditation' });
  }
});

router.post('/favorite/:meditationId', authenticateUser, async (req, res) => {
  try {
    await meditationService.toggleFavorite(req.user.id, req.params.meditationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Favorite meditation error:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

router.put('/:meditationId/title', authenticateUser, async (req, res) => {
  try {
    const { title } = req.body;
    await meditationService.updateTitle(req.user.id, req.params.meditationId, title);
    res.json({ success: true });
  } catch (error) {
    console.error('Update title error:', error);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

router.delete('/:meditationId', authenticateUser, async (req, res) => {
  try {
    await meditationService.deleteMeditation(req.user.id, req.params.meditationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete meditation error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete meditation' });
  }
});

// Voice preview endpoint
router.get('/voice-preview/:previewId', authenticateUser, async (req, res) => {
  try {
    const { previewId } = req.params;
    const filePath = `voice-previews/${previewId}.mp3`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('meditations')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Error fetching voice preview:', error);
      return res.status(404).json({ error: 'Voice preview not found' });
    }
    
    res.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Voice preview error:', error);
    res.status(500).json({ error: 'Failed to load voice preview' });
  }
});

// Background preview endpoint
router.get('/background-preview/:fileName', authenticateUser, async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = `background-previews/${fileName}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('meditations')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Error fetching background preview:', error);
      return res.status(404).json({ error: 'Background preview not found' });
    }
    
    res.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Background preview error:', error);
    res.status(500).json({ error: 'Failed to load background preview' });
  }
});

module.exports = router;
