-- Migration: Add status column to meditations table
-- Run this in your Supabase SQL Editor to add meditation generation status tracking

-- Add status column to meditations table
ALTER TABLE meditations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' 
CHECK (status IN ('generating', 'completed', 'failed'));

-- Update all existing meditations to 'completed' status
UPDATE meditations 
SET status = 'completed' 
WHERE status IS NULL;

-- Add index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_meditations_status ON meditations(status);
