-- Migration: Transform stage-based to context-depth based vision system
-- This migrates from the old 5-stage progression to the new dynamic CSS system

-- 1. Rename 'stage' to 'category' in vision_responses
ALTER TABLE vision_responses RENAME COLUMN stage TO category;

-- 2. Update category check constraint to new categories
ALTER TABLE vision_responses DROP CONSTRAINT vision_responses_stage_check;
ALTER TABLE vision_responses ADD CONSTRAINT vision_responses_category_check 
  CHECK (category IN ('Vision', 'Emotion', 'Belief', 'Identity', 'Embodiment'));

-- 3. Replace stage_progress with context_depth in visions table
ALTER TABLE visions DROP COLUMN stage_progress;

-- Add JSONB column for full context depth tracking
ALTER TABLE visions ADD COLUMN context_depth JSONB DEFAULT '{
  "Vision": {"css": 0, "coverage": {}, "last_scored": null},
  "Emotion": {"css": 0, "coverage": {}, "last_scored": null},
  "Belief": {"css": 0, "coverage": {}, "last_scored": null},
  "Identity": {"css": 0, "coverage": {}, "last_scored": null},
  "Embodiment": {"css": 0, "coverage": {}, "last_scored": null}
}'::jsonb;

-- Add denormalized CSS columns for fast querying
ALTER TABLE visions ADD COLUMN css_vision DECIMAL(3,2) DEFAULT 0 CHECK (css_vision >= 0 AND css_vision <= 1);
ALTER TABLE visions ADD COLUMN css_emotion DECIMAL(3,2) DEFAULT 0 CHECK (css_emotion >= 0 AND css_emotion <= 1);
ALTER TABLE visions ADD COLUMN css_belief DECIMAL(3,2) DEFAULT 0 CHECK (css_belief >= 0 AND css_belief <= 1);
ALTER TABLE visions ADD COLUMN css_identity DECIMAL(3,2) DEFAULT 0 CHECK (css_identity >= 0 AND css_identity <= 1);
ALTER TABLE visions ADD COLUMN css_embodiment DECIMAL(3,2) DEFAULT 0 CHECK (css_embodiment >= 0 AND css_embodiment <= 1);

-- Add derived boolean flags for quick completeness checks
ALTER TABLE visions ADD COLUMN is_complete_vision BOOLEAN DEFAULT FALSE;
ALTER TABLE visions ADD COLUMN is_complete_emotion BOOLEAN DEFAULT FALSE;
ALTER TABLE visions ADD COLUMN is_complete_belief BOOLEAN DEFAULT FALSE;
ALTER TABLE visions ADD COLUMN is_complete_identity BOOLEAN DEFAULT FALSE;
ALTER TABLE visions ADD COLUMN is_complete_embodiment BOOLEAN DEFAULT FALSE;

-- Add overall completeness percentage (0-100)
ALTER TABLE visions ADD COLUMN overall_completeness INTEGER DEFAULT 0 CHECK (overall_completeness >= 0 AND overall_completeness <= 100);

-- Add timestamp for when CSS was last calculated
ALTER TABLE visions ADD COLUMN last_scored_at TIMESTAMP WITH TIME ZONE;

-- 4. Add category tracking to vision_responses for multi-category answers
ALTER TABLE vision_responses ADD COLUMN categories_addressed TEXT[] DEFAULT '{}';

-- 5. Create indexes for new columns
CREATE INDEX idx_visions_overall_completeness ON visions(overall_completeness);
CREATE INDEX idx_visions_last_scored_at ON visions(last_scored_at);
CREATE INDEX idx_vision_responses_category ON vision_responses(category);
CREATE INDEX idx_vision_responses_categories_addressed ON vision_responses USING GIN(categories_addressed);

-- 6. Drop old stage index
DROP INDEX IF EXISTS idx_vision_responses_stage;

-- 7. Add function to calculate overall completeness percentage
CREATE OR REPLACE FUNCTION calculate_overall_completeness(vision_row visions)
RETURNS INTEGER AS $$
BEGIN
  RETURN ROUND(
    (vision_row.css_vision + 
     vision_row.css_emotion + 
     vision_row.css_belief + 
     vision_row.css_identity + 
     vision_row.css_embodiment) / 5.0 * 100
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Add trigger to auto-update overall_completeness and boolean flags
CREATE OR REPLACE FUNCTION update_vision_completeness()
RETURNS TRIGGER AS $$
BEGIN
  -- Update overall completeness percentage
  NEW.overall_completeness := ROUND(
    (NEW.css_vision + NEW.css_emotion + NEW.css_belief + NEW.css_identity + NEW.css_embodiment) / 5.0 * 100
  );
  
  -- Update boolean flags (threshold: 0.70)
  NEW.is_complete_vision := NEW.css_vision >= 0.70;
  NEW.is_complete_emotion := NEW.css_emotion >= 0.70;
  NEW.is_complete_belief := NEW.css_belief >= 0.70;
  NEW.is_complete_identity := NEW.css_identity >= 0.70;
  NEW.is_complete_embodiment := NEW.css_embodiment >= 0.70;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vision_completeness
  BEFORE INSERT OR UPDATE OF css_vision, css_emotion, css_belief, css_identity, css_embodiment
  ON visions
  FOR EACH ROW
  EXECUTE FUNCTION update_vision_completeness();

-- 9. Migrate existing data: convert old stage_progress to estimated CSS values
-- This is a one-time data migration for existing visions
-- We'll estimate CSS based on old progress (simplistic but gets us started)
-- Vision with old stage_progress of 1 = Vision category at 0.70, others at 0
-- Progress of 2 = Vision + Emotion at 0.70, etc.

-- Note: This migration file will be run manually via execute_sql_tool
-- Run this only if there's existing data to migrate
