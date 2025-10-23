-- Migration Script: Stage-based System → Context Sufficiency Score (CSS) System
-- Run this in your Supabase SQL Editor

-- Step 1: Add new columns to visions table
ALTER TABLE visions 
ADD COLUMN IF NOT EXISTS context_depth JSONB DEFAULT '{
  "Vision": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null},
  "Emotion": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null},
  "Belief": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null},
  "Identity": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null},
  "Embodiment": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null}
}'::jsonb;

-- Step 2: Add denormalized CSS columns for fast queries
ALTER TABLE visions 
ADD COLUMN IF NOT EXISTS css_vision DECIMAL(3,2) DEFAULT 0 CHECK (css_vision >= 0 AND css_vision <= 1),
ADD COLUMN IF NOT EXISTS css_emotion DECIMAL(3,2) DEFAULT 0 CHECK (css_emotion >= 0 AND css_emotion <= 1),
ADD COLUMN IF NOT EXISTS css_belief DECIMAL(3,2) DEFAULT 0 CHECK (css_belief >= 0 AND css_belief <= 1),
ADD COLUMN IF NOT EXISTS css_identity DECIMAL(3,2) DEFAULT 0 CHECK (css_identity >= 0 AND css_identity <= 1),
ADD COLUMN IF NOT EXISTS css_embodiment DECIMAL(3,2) DEFAULT 0 CHECK (css_embodiment >= 0 AND css_embodiment <= 1);

-- Step 3: Add boolean completeness flags
ALTER TABLE visions 
ADD COLUMN IF NOT EXISTS is_complete_vision BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_complete_emotion BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_complete_belief BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_complete_identity BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_complete_embodiment BOOLEAN DEFAULT FALSE;

-- Step 4: Add overall_completeness percentage column
ALTER TABLE visions 
ADD COLUMN IF NOT EXISTS overall_completeness INTEGER DEFAULT 0 CHECK (overall_completeness >= 0 AND overall_completeness <= 100);

-- Step 5: Add last_scored_at timestamp
ALTER TABLE visions 
ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMP WITH TIME ZONE;

-- Step 6: Migrate existing stage_progress to overall_completeness (simple conversion)
UPDATE visions 
SET overall_completeness = LEAST(ROUND((stage_progress::decimal / 5.0) * 100), 100)
WHERE stage_progress IS NOT NULL AND overall_completeness = 0;

-- Step 7: Update vision_responses table - rename stage to category
ALTER TABLE vision_responses 
RENAME COLUMN stage TO category;

-- Step 8: Add categories_addressed column for multi-category tagging
ALTER TABLE vision_responses 
ADD COLUMN IF NOT EXISTS categories_addressed TEXT[] DEFAULT '{}';

-- Step 9: Create trigger function to auto-calculate overall_completeness
CREATE OR REPLACE FUNCTION update_vision_completeness()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate overall completeness as average of 5 CSS scores (0-100%)
  NEW.overall_completeness := ROUND(
    (NEW.css_vision + NEW.css_emotion + NEW.css_belief + NEW.css_identity + NEW.css_embodiment) / 5.0 * 100
  );
  
  -- Update boolean completion flags (threshold: CSS >= 0.70)
  NEW.is_complete_vision := NEW.css_vision >= 0.70;
  NEW.is_complete_emotion := NEW.css_emotion >= 0.70;
  NEW.is_complete_belief := NEW.css_belief >= 0.70;
  NEW.is_complete_identity := NEW.css_identity >= 0.70;
  NEW.is_complete_embodiment := NEW.css_embodiment >= 0.70;
  
  -- Update timestamp
  NEW.last_scored_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger
DROP TRIGGER IF EXISTS trigger_update_vision_completeness ON visions;
CREATE TRIGGER trigger_update_vision_completeness
  BEFORE INSERT OR UPDATE OF css_vision, css_emotion, css_belief, css_identity, css_embodiment
  ON visions
  FOR EACH ROW
  EXECUTE FUNCTION update_vision_completeness();

-- Step 11 (Optional): Drop old stage_progress column after verifying migration
-- UNCOMMENT ONLY AFTER TESTING:
-- ALTER TABLE visions DROP COLUMN IF EXISTS stage_progress;

-- Migration complete!
-- Your database is now using the Context Sufficiency Score (CSS) system.
