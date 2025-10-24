const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const VOICE_SETTINGS = {
  stability: 0.7,
  similarity_boost: 0.8,
  speed: 0.71
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
        // Delay voice by 4 seconds (4000ms), set background to 50% volume
        '[0:a]adelay=4000|4000[voice]',
        '[1:a]volume=0.50[bg]',
        '[voice][bg]amix=inputs=2:duration=longest'
      ])
      .duration(duration * 60)
      .audioCodec('libmp3lame')
      .audioBitrate('320k')
      .audioQuality(0)
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

async function getAudioDuration(audioBuffer) {
  const tempDir = path.join(__dirname, '../../temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempPath = path.join(tempDir, `probe-${Date.now()}.mp3`);
  await fs.writeFile(tempPath, audioBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(tempPath, async (err, metadata) => {
      await fs.unlink(tempPath).catch(() => {}); // Clean up temp file
      
      if (err) {
        console.error('Error probing audio duration:', err);
        reject(err);
        return;
      }
      
      const durationSeconds = metadata.format.duration || 0;
      resolve(durationSeconds);
    });
  });
}

async function generateMeditationAudio({ script, voiceId, background, duration }) {
  // Keep ElevenLabs <break> tags, only remove old [pause] markers if present
  const scriptForTTS = script.replace(/\[pause\]/gi, '');
  
  const voiceBuffer = await generateSpeech(scriptForTTS, voiceId);
  
  if (!voiceBuffer) {
    return { fileName: 'mock-audio-url', ttsAudioDuration: null };
  }

  // Get the duration of the raw TTS audio (before mixing) for QA
  const ttsAudioDuration = await getAudioDuration(voiceBuffer);
  console.log(`🎙️ Raw TTS audio duration: ${Math.floor(ttsAudioDuration / 60)}:${String(Math.floor(ttsAudioDuration % 60)).padStart(2, '0')}`);

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

  return { fileName, ttsAudioDuration };
}

module.exports = {
  generateSpeech,
  mixAudioWithBackground,
  generateMeditationAudio,
  getAudioDuration
};
