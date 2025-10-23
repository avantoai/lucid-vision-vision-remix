const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const visionService = require('../services/visionService');

router.get('/visions', authenticateUser, async (req, res) => {
  try {
    const visions = await visionService.getAllVisions(req.user.id);
    res.json({ success: true, visions });
  } catch (error) {
    console.error('Get visions error:', error);
    res.status(500).json({ error: 'Failed to fetch visions' });
  }
});

router.get('/visions/:visionId', authenticateUser, async (req, res) => {
  try {
    const vision = await visionService.getVision(req.params.visionId, req.user.id);
    res.json({ success: true, vision });
  } catch (error) {
    console.error('Get vision error:', error);
    res.status(500).json({ error: 'Failed to fetch vision' });
  }
});

router.post('/visions', authenticateUser, async (req, res) => {
  try {
    const vision = await visionService.createVision(req.user.id);
    res.json({ success: true, vision });
  } catch (error) {
    console.error('Create vision error:', error);
    res.status(500).json({ error: 'Failed to create vision' });
  }
});

router.post('/visions/:visionId/next-question', authenticateUser, async (req, res) => {
  try {
    const result = await visionService.generateNextQuestion(req.params.visionId, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Next question error:', error);
    res.status(500).json({ error: 'Failed to generate next question' });
  }
});

router.post('/visions/:visionId/response', authenticateUser, async (req, res) => {
  try {
    const { category, question, answer } = req.body;
    const result = await visionService.submitResponse(
      req.params.visionId,
      req.user.id,
      category,
      question,
      answer
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

router.post('/visions/:visionId/process', authenticateUser, async (req, res) => {
  try {
    const result = await visionService.processVisionSummary(req.params.visionId, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Process vision error:', error);
    res.status(500).json({ error: 'Failed to process vision' });
  }
});

router.delete('/visions/:visionId', authenticateUser, async (req, res) => {
  try {
    await visionService.deleteVision(req.params.visionId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete vision error:', error);
    res.status(500).json({ error: 'Failed to delete vision' });
  }
});

router.patch('/visions/:visionId/title', authenticateUser, async (req, res) => {
  try {
    const { title } = req.body;
    await visionService.updateVisionTitle(req.params.visionId, req.user.id, title);
    res.json({ success: true });
  } catch (error) {
    console.error('Update title error:', error);
    res.status(500).json({ error: 'Failed to update vision title' });
  }
});

module.exports = router;
