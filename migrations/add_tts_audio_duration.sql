-- Migration: Add TTS audio duration tracking for QA purposes
-- Run this on your Supabase database via SQL Editor

-- First, remove the old column if you added it
ALTER TABLE meditations 
DROP COLUMN IF EXISTS tts_generation_ms;

-- Add new column for actual audio duration
ALTER TABLE meditations 
ADD COLUMN IF NOT EXISTS tts_audio_duration_seconds DECIMAL(6,2);

COMMENT ON COLUMN meditations.tts_audio_duration_seconds IS 'Duration of raw TTS audio output from ElevenLabs in seconds (for QA - verifying audio length before mixing with background)';
