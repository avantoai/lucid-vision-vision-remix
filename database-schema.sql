-- Lucid Vision Database Schema - Context Depth Edition
-- This file defines the Supabase PostgreSQL schema with Row Level Security (RLS)

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'advanced')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  streak_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meditations table
CREATE TABLE IF NOT EXISTS meditations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vision_id UUID REFERENCES visions(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  duration INTEGER NOT NULL,
  voice_id TEXT NOT NULL,
  background TEXT NOT NULL,
  script TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  title_auto TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('generating', 'completed', 'failed')),
  is_gift BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_downloaded BOOLEAN DEFAULT FALSE,
  received_from TEXT,
  tts_generation_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visions table with context depth tracking
CREATE TABLE IF NOT EXISTS visions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}',
  micro_tags TEXT[] DEFAULT '{}',
  
  -- Context depth tracking (JSONB for flexibility + denormalized for performance)
  context_depth JSONB DEFAULT '{
    "Vision": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null},
    "Emotion": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null},
    "Belief": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null},
    "Identity": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null},
    "Embodiment": {"css": 0, "coverage": {}, "subscores": {}, "last_scored": null}
  }'::jsonb,
  
  -- Denormalized CSS columns for fast queries (0.00 to 1.00)
  css_vision DECIMAL(3,2) DEFAULT 0 CHECK (css_vision >= 0 AND css_vision <= 1),
  css_emotion DECIMAL(3,2) DEFAULT 0 CHECK (css_emotion >= 0 AND css_emotion <= 1),
  css_belief DECIMAL(3,2) DEFAULT 0 CHECK (css_belief >= 0 AND css_belief <= 1),
  css_identity DECIMAL(3,2) DEFAULT 0 CHECK (css_identity >= 0 AND css_identity <= 1),
  css_embodiment DECIMAL(3,2) DEFAULT 0 CHECK (css_embodiment >= 0 AND css_embodiment <= 1),
  
  -- Boolean completeness flags (threshold: CSS >= 0.70)
  is_complete_vision BOOLEAN DEFAULT FALSE,
  is_complete_emotion BOOLEAN DEFAULT FALSE,
  is_complete_belief BOOLEAN DEFAULT FALSE,
  is_complete_identity BOOLEAN DEFAULT FALSE,
  is_complete_embodiment BOOLEAN DEFAULT FALSE,
  
  -- Overall completeness percentage (0-100)
  overall_completeness INTEGER DEFAULT 0 CHECK (overall_completeness >= 0 AND overall_completeness <= 100),
  
  -- Auto-generated content
  summary TEXT,
  tagline TEXT,
  
  -- Metadata
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  last_scored_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vision responses table (tracks user answers)
CREATE TABLE IF NOT EXISTS vision_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vision_id UUID NOT NULL REFERENCES visions(id) ON DELETE CASCADE,
  
  -- Primary category this question was targeting
  category TEXT NOT NULL CHECK (category IN ('Vision', 'Emotion', 'Belief', 'Identity', 'Embodiment')),
  
  -- Additional categories this response addressed (for cross-domain answers)
  categories_addressed TEXT[] DEFAULT '{}',
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gifts table
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meditation_id UUID NOT NULL REFERENCES meditations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quota tracking table
CREATE TABLE IF NOT EXISTS quota_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  personal_count INTEGER DEFAULT 0,
  gift_count INTEGER DEFAULT 0,
  UNIQUE(user_id, week_start)
);

-- Function to auto-update overall completeness and boolean flags
CREATE OR REPLACE FUNCTION update_vision_completeness()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate overall completeness percentage (average CSS * 100)
  NEW.overall_completeness := ROUND(
    (NEW.css_vision + NEW.css_emotion + NEW.css_belief + NEW.css_identity + NEW.css_embodiment) / 5.0 * 100
  );
  
  -- Update boolean flags (threshold: CSS >= 0.70)
  NEW.is_complete_vision := NEW.css_vision >= 0.70;
  NEW.is_complete_emotion := NEW.css_emotion >= 0.70;
  NEW.is_complete_belief := NEW.css_belief >= 0.70;
  NEW.is_complete_identity := NEW.css_identity >= 0.70;
  NEW.is_complete_embodiment := NEW.css_embodiment >= 0.70;
  
  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate completeness on CSS updates
CREATE TRIGGER trigger_update_vision_completeness
  BEFORE INSERT OR UPDATE OF css_vision, css_emotion, css_belief, css_identity, css_embodiment
  ON visions
  FOR EACH ROW
  EXECUTE FUNCTION update_vision_completeness();

-- Row Level Security (RLS) Policies

-- Users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Meditations table RLS
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meditations" ON meditations;
CREATE POLICY "Users can view own meditations" ON meditations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meditations" ON meditations;
CREATE POLICY "Users can insert own meditations" ON meditations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meditations" ON meditations;
CREATE POLICY "Users can update own meditations" ON meditations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meditations" ON meditations;
CREATE POLICY "Users can delete own meditations" ON meditations
  FOR DELETE USING (auth.uid() = user_id);

-- Visions table RLS
ALTER TABLE visions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own visions" ON visions;
CREATE POLICY "Users can view own visions" ON visions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own visions" ON visions;
CREATE POLICY "Users can insert own visions" ON visions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own visions" ON visions;
CREATE POLICY "Users can update own visions" ON visions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own visions" ON visions;
CREATE POLICY "Users can delete own visions" ON visions
  FOR DELETE USING (auth.uid() = user_id);

-- Vision responses table RLS
ALTER TABLE vision_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vision responses" ON vision_responses;
CREATE POLICY "Users can view own vision responses" ON vision_responses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own vision responses" ON vision_responses;
CREATE POLICY "Users can insert own vision responses" ON vision_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Gifts table RLS (public read for gift sharing)
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view gifts" ON gifts;
CREATE POLICY "Anyone can view gifts" ON gifts
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create own gifts" ON gifts;
CREATE POLICY "Users can create own gifts" ON gifts
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Quota tracking table RLS
ALTER TABLE quota_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quota" ON quota_tracking;
CREATE POLICY "Users can view own quota" ON quota_tracking
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quota" ON quota_tracking;
CREATE POLICY "Users can insert own quota" ON quota_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quota" ON quota_tracking;
CREATE POLICY "Users can update own quota" ON quota_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meditations_user_id ON meditations(user_id);
CREATE INDEX IF NOT EXISTS idx_meditations_vision_id ON meditations(vision_id);
CREATE INDEX IF NOT EXISTS idx_meditations_category ON meditations(category);
CREATE INDEX IF NOT EXISTS idx_meditations_created_at ON meditations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visions_user_id ON visions(user_id);
CREATE INDEX IF NOT EXISTS idx_visions_categories ON visions USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_visions_updated_at ON visions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_visions_overall_completeness ON visions(overall_completeness);
CREATE INDEX IF NOT EXISTS idx_visions_last_scored_at ON visions(last_scored_at);

CREATE INDEX IF NOT EXISTS idx_vision_responses_vision_id ON vision_responses(vision_id);
CREATE INDEX IF NOT EXISTS idx_vision_responses_category ON vision_responses(category);
CREATE INDEX IF NOT EXISTS idx_vision_responses_categories_addressed ON vision_responses USING GIN(categories_addressed);

CREATE INDEX IF NOT EXISTS idx_quota_tracking_user_week ON quota_tracking(user_id, week_start);
