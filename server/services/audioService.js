const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const VOICE_SETTINGS = {
  stability: 0.7,
  similarity_boost: 0.8
};

async function generateSpeech(text, voiceId) {
  if (!ELEVENLABS_API_KEY) {
    console.warn('ElevenLabs API key not set, using mock audio');
    return null;
  }

  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: VOICE_SETTINGS
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error.response?.data || error.message);
    throw new Error('Failed to generate speech');
  }
}

async function mixAudioWithBackground(voiceBuffer, backgroundType, duration) {
  const tempDir = path.join(__dirname, '../../temp');
  await fs.mkdir(tempDir, { recursive: true });

  const voicePath = path.join(tempDir, `voice-${Date.now()}.mp3`);
  const outputPath = path.join(tempDir, `mixed-${Date.now()}.mp3`);

  await fs.writeFile(voicePath, voiceBuffer);

  const backgroundPath = path.join(__dirname, `../assets/backgrounds/${backgroundType}.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(voicePath)
      .input(backgroundPath)
      .complexFilter([
        '[1:a]volume=0.35[bg]',
        '[0:a][bg]amix=inputs=2:duration=longest'
      ])
      .duration(duration * 60)
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .on('end', async () => {
        const mixedBuffer = await fs.readFile(outputPath);
        await fs.unlink(voicePath);
        await fs.unlink(outputPath);
        resolve(mixedBuffer);
      })
      .on('error', (error) => {
        console.error('FFmpeg error:', error);
        reject(new Error('Audio mixing failed'));
      })
      .save(outputPath);
  });
}

async function generateMeditationAudio({ script, voiceId, background, duration }) {
  const scriptWithoutPauses = script.replace(/\[pause\]/gi, '... ');
  
  const voiceBuffer = await generateSpeech(scriptWithoutPauses, voiceId);
  
  if (!voiceBuffer) {
    return 'mock-audio-url';
  }

  const mixedBuffer = await mixAudioWithBackground(voiceBuffer, background, duration);

  const fileName = `meditation-${Date.now()}.mp3`;
  const { data, error } = await supabaseAdmin.storage
    .from('meditations')
    .upload(fileName, mixedBuffer, {
      contentType: 'audio/mpeg',
      cacheControl: '3600'
    });

  if (error) {
    throw new Error('Failed to upload audio: ' + error.message);
  }

  return fileName;
}

module.exports = {
  generateSpeech,
  mixAudioWithBackground,
  generateMeditationAudio
};
