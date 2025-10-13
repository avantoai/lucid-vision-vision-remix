# Database Migration Required for Async Vision Processing

## What Changed
The vision statement processing is now asynchronous. Users can immediately proceed to meditation customization while the AI generates their vision statement in the background.

## Required Supabase SQL Migration

**Execute this SQL in your Supabase SQL Editor:**

```sql
-- Add status column to vision_statements table
ALTER TABLE vision_statements 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' 
CHECK (status IN ('processing', 'completed', 'failed'));

-- Make statement and tagline nullable (they won't be immediately available)
ALTER TABLE vision_statements 
ALTER COLUMN statement DROP NOT NULL,
ALTER COLUMN tagline DROP NOT NULL;
```

## How It Works

1. **User completes vision prompts** → API immediately creates a vision record with `status='processing'`
2. **User navigates to customization** → No waiting for AI generation
3. **Background processing** → AI generates statement and tagline, updates status to 'completed'
4. **Mobile app polls** → Checks vision status every 2 seconds, shows loading spinner until complete
5. **Error handling** → If AI fails, previous vision is automatically restored

## Testing

After applying the migration:
1. Start a new vision flow in the mobile app
2. Answer prompts and hit "Complete"
3. You should immediately see the customization screen
4. Watch for the "✨ Crafting your vision statement..." message
5. Within 10-30 seconds, the vision statement and tagline should appear

## Benefits

- ✅ Much faster UX - no loading screens between vision and customization
- ✅ Users can start customizing while waiting
- ✅ Graceful error handling with automatic fallback
