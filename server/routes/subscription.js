const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const subscriptionService = require('../services/subscriptionService');

router.get('/status', authenticateUser, async (req, res) => {
  try {
    const status = await subscriptionService.getSubscriptionStatus(req.user.id);
    res.json({ success: true, status });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

router.get('/quota', authenticateUser, async (req, res) => {
  try {
    const quota = await subscriptionService.getQuotaUsage(req.user.id);
    res.json({ success: true, quota });
  } catch (error) {
    console.error('Get quota error:', error);
    res.status(500).json({ error: 'Failed to fetch quota' });
  }
});

router.post('/upgrade', authenticateUser, async (req, res) => {
  try {
    const { tier } = req.body;
    await subscriptionService.upgradeTier(req.user.id, tier);
    res.json({ success: true });
  } catch (error) {
    console.error('Upgrade tier error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

module.exports = router;
