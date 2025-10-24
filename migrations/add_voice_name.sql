-- Migration: Add voice_name column to track human-readable voice selection
-- Run this on your Supabase database via SQL Editor

ALTER TABLE meditations 
ADD COLUMN IF NOT EXISTS voice_name TEXT;

COMMENT ON COLUMN meditations.voice_name IS 'Human-readable voice name (e.g., "Jen", "Nathaniel") for easier QA and analytics';

-- Optional: Backfill existing records with voice names based on voice_id
UPDATE meditations SET voice_name = CASE voice_id
  WHEN 'HzVnxqtdk9eqrcwfxD57' THEN 'Jen'
  WHEN 'AeRdCCKzvd23BpJoofzx' THEN 'Nathaniel'
  WHEN 'RxDql9IVj8LjC1obxK7z' THEN 'Nora'
  WHEN 'ItH39nl7BrnB34569EL1' THEN 'Ella'
  WHEN '1TmWQEtqNZdO4bVt9Xo1' THEN 'Grant'
  ELSE 'Unknown'
END
WHERE voice_name IS NULL;
