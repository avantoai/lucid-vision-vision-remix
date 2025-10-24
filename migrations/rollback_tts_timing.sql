-- Rollback: Remove TTS generation timing column
-- Run this on your Supabase database via SQL Editor

ALTER TABLE meditations 
DROP COLUMN IF EXISTS tts_generation_ms;
