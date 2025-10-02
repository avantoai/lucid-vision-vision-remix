const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const giftService = require('../services/giftService');

router.post('/create', authenticateUser, async (req, res) => {
  try {
    const { duration, voiceId, background, responses } = req.body;
    const gift = await giftService.createGiftMeditation({
      userId: req.user.id,
      duration,
      voiceId,
      background,
      responses
    });

    res.json({ success: true, gift });
  } catch (error) {
    console.error('Create gift error:', error);
    res.status(500).json({ error: error.message || 'Failed to create gift meditation' });
  }
});

router.get('/:giftId', async (req, res) => {
  try {
    const gift = await giftService.getGift(req.params.giftId);
    res.json({ success: true, gift });
  } catch (error) {
    console.error('Get gift error:', error);
    res.status(500).json({ error: 'Gift not found' });
  }
});

router.post('/:giftId/save', authenticateUser, async (req, res) => {
  try {
    await giftService.saveGiftToLibrary(req.user.id, req.params.giftId);
    res.json({ success: true });
  } catch (error) {
    console.error('Save gift error:', error);
    res.status(500).json({ error: 'Failed to save gift' });
  }
});

module.exports = router;
