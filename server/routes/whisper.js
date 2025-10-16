const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateUser } = require('../middleware/auth');
const whisperService = require('../services/whisperService');

const upload = multer({
  dest: 'temp/audio/',
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log(`📎 Received file: ${file.originalname}, MIME type: ${file.mimetype}`);
    
    if (file.mimetype && file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      console.error(`❌ Rejected file with MIME type: ${file.mimetype}`);
      cb(new Error(`Invalid audio format: ${file.mimetype}`));
    }
  }
});

router.post('/transcribe', authenticateUser, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const transcript = await whisperService.transcribeAudio(req.file.path);

    res.json({ success: true, transcript });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
  }
});

module.exports = router;
