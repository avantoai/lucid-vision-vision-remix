-- Migration: Remove CSS framework and add word count tracking
-- Run this on your Supabase database via SQL Editor

-- Step 1: Drop the trigger and function that depend on CSS columns
DROP TRIGGER IF EXISTS trigger_update_vision_completeness ON visions;
DROP FUNCTION IF EXISTS update_vision_completeness();

-- Step 2: Now we can safely remove all CSS-related columns from visions table
ALTER TABLE visions 
DROP COLUMN IF EXISTS context_depth,
DROP COLUMN IF EXISTS css_vision,
DROP COLUMN IF EXISTS css_emotion,
DROP COLUMN IF EXISTS css_belief,
DROP COLUMN IF EXISTS css_identity,
DROP COLUMN IF EXISTS css_embodiment,
DROP COLUMN IF EXISTS is_complete_vision,
DROP COLUMN IF EXISTS is_complete_emotion,
DROP COLUMN IF EXISTS is_complete_belief,
DROP COLUMN IF EXISTS is_complete_identity,
DROP COLUMN IF EXISTS is_complete_embodiment,
DROP COLUMN IF EXISTS last_scored_at,
DROP COLUMN IF EXISTS micro_tags;

-- Add word count tracking column
ALTER TABLE visions 
ADD COLUMN IF NOT EXISTS total_word_count INTEGER DEFAULT 0;

-- Update overall_completeness comment to reflect new word-count-based calculation
COMMENT ON COLUMN visions.overall_completeness IS 'Percentage based on total_word_count (600 words = 100%)';
COMMENT ON COLUMN visions.total_word_count IS 'Total word count from all user responses for this vision';

-- Optional: Backfill word counts for existing visions
-- This calculates word count from existing vision_responses
UPDATE visions v
SET total_word_count = (
  SELECT COALESCE(SUM(array_length(regexp_split_to_array(trim(answer), '\s+'), 1)), 0)
  FROM vision_responses
  WHERE vision_id = v.id
),
overall_completeness = LEAST(100, (
  SELECT COALESCE(ROUND((SUM(array_length(regexp_split_to_array(trim(answer), '\s+'), 1)) * 100.0) / 600), 0)
  FROM vision_responses
  WHERE vision_id = v.id
))
WHERE EXISTS (SELECT 1 FROM vision_responses WHERE vision_id = v.id);
