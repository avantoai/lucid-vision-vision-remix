-- Lucid Vision Database Schema - My Visions Edition
-- This file defines the Supabase PostgreSQL schema with Row Level Security (RLS)

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'advanced')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  streak_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meditations table
CREATE TABLE meditations (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visions table (replaces vision_statements)
CREATE TABLE visions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}',
  micro_tags TEXT[] DEFAULT '{}',
  stage_progress INTEGER DEFAULT 0 CHECK (stage_progress >= 0 AND stage_progress <= 5),
  summary TEXT,
  tagline TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vision responses table (updated with stage tracking)
CREATE TABLE vision_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vision_id UUID NOT NULL REFERENCES visions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('Vision', 'Belief', 'Identity', 'Embodiment', 'Action')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gifts table
CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meditation_id UUID NOT NULL REFERENCES meditations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quota tracking table
CREATE TABLE quota_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  personal_count INTEGER DEFAULT 0,
  gift_count INTEGER DEFAULT 0,
  UNIQUE(user_id, week_start)
);

-- Row Level Security (RLS) Policies

-- Users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Meditations table RLS
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meditations" ON meditations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meditations" ON meditations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meditations" ON meditations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meditations" ON meditations
  FOR DELETE USING (auth.uid() = user_id);

-- Visions table RLS
ALTER TABLE visions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own visions" ON visions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visions" ON visions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visions" ON visions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own visions" ON visions
  FOR DELETE USING (auth.uid() = user_id);

-- Vision responses table RLS
ALTER TABLE vision_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vision responses" ON vision_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vision responses" ON vision_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Gifts table RLS (public read for gift sharing)
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gifts" ON gifts
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create own gifts" ON gifts
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Quota tracking table RLS
ALTER TABLE quota_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quota" ON quota_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quota" ON quota_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quota" ON quota_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_meditations_user_id ON meditations(user_id);
CREATE INDEX idx_meditations_vision_id ON meditations(vision_id);
CREATE INDEX idx_meditations_category ON meditations(category);
CREATE INDEX idx_meditations_created_at ON meditations(created_at DESC);
CREATE INDEX idx_visions_user_id ON visions(user_id);
CREATE INDEX idx_visions_categories ON visions USING GIN(categories);
CREATE INDEX idx_visions_updated_at ON visions(updated_at DESC);
CREATE INDEX idx_vision_responses_vision_id ON vision_responses(vision_id);
CREATE INDEX idx_vision_responses_stage ON vision_responses(stage);
CREATE INDEX idx_quota_tracking_user_week ON quota_tracking(user_id, week_start);
