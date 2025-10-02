const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const visionService = require('../services/visionService');

router.get('/categories', authenticateUser, async (req, res) => {
  try {
    const categories = await visionService.getUserCategories(req.user.id);
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/category/:category', authenticateUser, async (req, res) => {
  try {
    const visionData = await visionService.getCategoryVision(req.user.id, req.params.category);
    res.json({ success: true, vision: visionData });
  } catch (error) {
    console.error('Get category vision error:', error);
    res.status(500).json({ error: 'Failed to fetch category vision' });
  }
});

router.post('/update-statement', authenticateUser, async (req, res) => {
  try {
    const { category, statement } = req.body;
    await visionService.updateVisionStatement(req.user.id, category, statement);
    res.json({ success: true });
  } catch (error) {
    console.error('Update statement error:', error);
    res.status(500).json({ error: 'Failed to update vision statement' });
  }
});

router.post('/prompt-flow', authenticateUser, async (req, res) => {
  try {
    const { category, responses } = req.body;
    const result = await visionService.processPromptFlow(req.user.id, category, responses);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Prompt flow error:', error);
    res.status(500).json({ error: 'Failed to process prompt flow' });
  }
});

router.get('/next-prompt/:category', authenticateUser, async (req, res) => {
  try {
    const { responses } = req.query;
    const parsedResponses = responses ? JSON.parse(responses) : [];
    const nextPrompt = await visionService.generateNextPrompt(req.user.id, req.params.category, parsedResponses);
    res.json({ success: true, prompt: nextPrompt });
  } catch (error) {
    console.error('Next prompt error:', error);
    res.status(500).json({ error: 'Failed to generate next prompt' });
  }
});

module.exports = router;
