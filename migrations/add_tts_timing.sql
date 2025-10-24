-- Migration: Add TTS generation timing for QA purposes
-- Run this on your Supabase database via SQL Editor

ALTER TABLE meditations 
ADD COLUMN IF NOT EXISTS tts_generation_ms INTEGER;

COMMENT ON COLUMN meditations.tts_generation_ms IS 'ElevenLabs TTS generation time in milliseconds (for QA tracking)';
