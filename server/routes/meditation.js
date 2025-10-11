const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const meditationService = require('../services/meditationService');
const quotaService = require('../services/quotaService');

router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { category, duration, voiceId, background, responses, isGift } = req.body;

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

module.exports = router;
