# Lucid Vision Backend Setup Guide

## Overview
This is the backend API server for Lucid Vision, an AI-powered meditation app. The backend handles authentication, meditation generation, vision tracking, gift sharing, and subscription management.

## Prerequisites
You'll need accounts and API keys for:
- **Supabase** (Database, Auth, Storage)
- **OpenAI** (Script generation, Whisper STT)
- **ElevenLabs** (Text-to-speech)
- **Superwall** (Paywall - for mobile app integration)

## Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and API keys from Project Settings > API

### 2. Run Database Schema
Execute the SQL in `database-schema.sql` in your Supabase SQL Editor:
- Creates all tables (users, meditations, vision_statements, etc.)
- Sets up Row Level Security (RLS) policies
- Creates indexes for performance

### 3. Configure Storage Buckets
Create the following storage buckets in Supabase Storage:

**Bucket: `meditations`**
- Public: No
- Allowed MIME types: `audio/mpeg`, `audio/mp3`
- Max file size: 50MB

**Bucket: `audio-assets`**
- Public: Yes (for previews)
- Allowed MIME types: `audio/mpeg`, `audio/mp3`
- Max file size: 10MB

### 4. Upload Preview Audio Files
You'll need to create and upload preview audio files to `audio-assets`:

**Voice Previews** (`previews/voices/`):
- `nathaniel.mp3` - Voice preview sample
- `jen.mp3` - Voice preview sample
- `nora.mp3` - Voice preview sample
- `ella.mp3` - Voice preview sample (Advanced tier)
- `grant.mp3` - Voice preview sample (Advanced tier)

**Background Previews** (`previews/backgrounds/`):
- `ocean-waves.mp3` - Ocean waves loop (12-20s)
- `deep-ambient.mp3` - Deep ambient loop (12-20s)
- `crystal-bowls.mp3` - Crystal bowls loop (12-20s)
- `theta-beats.mp3` - Theta beats loop (12-20s)
- `silence.mp3` - Silent preview (5s)

### 5. Background Audio Files
Create full-length background audio files in `server/assets/backgrounds/`:
- `ocean-waves.mp3`
- `deep-ambient.mp3`
- `crystal-bowls.mp3`
- `theta-beats.mp3`
- `silence.mp3`

These should be seamless loops suitable for meditation (at least 60 minutes).

## Environment Variables
All API credentials are stored as Replit Secrets (environment variables):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secure!)
- `OPENAI_API_KEY` - OpenAI API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key

## API Documentation

### Base URL
`http://localhost:5000/api` (development)

### Authentication
Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### Auth
- `POST /api/auth/send-magic-link` - Send magic link email
- `POST /api/auth/verify-otp` - Verify OTP and get session
- `POST /api/auth/update-profile` - Update user profile with full name

#### Meditation
- `POST /api/meditation/generate` - Generate new meditation
- `GET /api/meditation/list` - Get user's meditations (filters: all, gift, favorites, category)
- `POST /api/meditation/pin/:meditationId` - Pin meditation (max 3)
- `POST /api/meditation/favorite/:meditationId` - Toggle favorite
- `PUT /api/meditation/:meditationId/title` - Update title

#### Vision
- `GET /api/vision/categories` - Get all categories with status/taglines
- `GET /api/vision/category/:category` - Get category vision and responses
- `POST /api/vision/update-statement` - Manually update vision statement
- `POST /api/vision/prompt-flow` - Process prompt responses and synthesize statement
- `GET /api/vision/next-prompt/:category` - Get next prompt (fixed or AI-generated)

#### Gift
- `POST /api/gift/create` - Create gift meditation
- `GET /api/gift/:giftId` - Get gift details (public, no auth required)
- `POST /api/gift/:giftId/save` - Save gift to library (requires auth)

#### Subscription
- `GET /api/subscription/status` - Get subscription status and features
- `GET /api/subscription/quota` - Get weekly quota usage
- `POST /api/subscription/upgrade` - Upgrade subscription tier

#### Player
- `GET /api/player/preview/:type/:id` - Get preview audio URL (voice/background)
- `GET /api/player/audio/:meditationId` - Get meditation audio URL (auth required for personal, public for gifts)

#### Whisper (STT)
- `POST /api/whisper/transcribe` - Transcribe audio file to text (multipart/form-data, field: `audio`)

## Voice Configuration

### Voice Previews (for user selection)
The mobile app can preview voices using these IDs via `/api/player/preview/voice/{id}`:

**Basic Tier (3 voices):**
- `nathaniel` - Preview sample (maps to ElevenLabs voice for TTS)
- `jen` - Preview sample (maps to ElevenLabs voice for TTS)
- `nora` - Preview sample (maps to ElevenLabs voice for TTS)

**Advanced Tier (adds 2 more):**
- `ella` - Preview sample (maps to ElevenLabs voice for TTS)
- `grant` - Preview sample (maps to ElevenLabs voice for TTS)

### Voice ID Mapping (for meditation generation)
When calling `/api/meditation/generate`, use the ElevenLabs voice ID in the `voiceId` field:

**Basic Tier:**
- `HzVnxqtdk9eqrcwfxD57` - Neutral Calm (use for ElevenLabs TTS)
- `voice_female_calm` - Female Calm (use for ElevenLabs TTS)
- `voice_male_calm1` - Male Calm (use for ElevenLabs TTS)

**Advanced Tier:**
- `voice_female_assert` - Female Assertive (use for ElevenLabs TTS)
- `voice_male_calm2` - Male Calm 2 (use for ElevenLabs TTS)

Voice settings: stability 0.7, similarity 0.8, speed 0.9

## Categories
- `freeform` - Open-ended vision
- `health` - Physical wellbeing
- `wealth` - Financial abundance
- `relationships` - Connections with others
- `play` - Joy and recreation
- `love` - Love and affection
- `purpose` - Life meaning
- `spirit` - Spiritual connection
- `healing` - Transformation and wholeness

## Subscription Tiers

### Basic
- 3 personal meditations/week
- 3 gift meditations/week
- Max 15 min duration
- 3 voices
- No background playback
- No offline downloads

### Advanced
- Unlimited personal/gift meditations
- Max 60 min duration
- 5 voices
- Background playback
- Offline downloads

Weekly quota resets: Monday 00:00 local time

## Testing the API

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Send Magic Link
```bash
curl -X POST http://localhost:5000/api/auth/send-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### 3. Generate Meditation (requires auth token)
```bash
curl -X POST http://localhost:5000/api/meditation/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "category": "health",
    "duration": 5,
    "voiceId": "HzVnxqtdk9eqrcwfxD57",
    "background": "ocean-waves",
    "responses": [
      {"question": "What does vibrant health feel like?", "answer": "I feel energized and strong"},
      {"question": "What practices support you?", "answer": "Daily yoga and meditation"}
    ],
    "isGift": false
  }'
```

## Mobile App Integration

### React Native Setup
The mobile app should:
1. Use Expo for React Native development
2. Implement Superwall paywall for subscriptions
3. Use Expo Audio for meditation playback
4. Implement deep linking for magic link authentication
5. Store auth tokens securely (AsyncStorage or SecureStore)

### Authentication Flow
1. User enters email → call `/api/auth/send-magic-link`
2. User clicks magic link → deep link opens app with token
3. App calls `/api/auth/verify-otp` with token
4. If new user, collect full name → call `/api/auth/update-profile`
5. Store session token for API requests

### Meditation Playback
1. Fetch meditation list → `/api/meditation/list`
2. User selects meditation
3. Get signed audio URL → `/api/player/audio/:meditationId`
4. Stream audio using Expo AV or React Native Track Player

## Troubleshooting

### Server won't start
- Check that all environment variables are set
- Verify Supabase credentials are correct
- Check logs for specific error messages

### Meditation generation fails
- Verify OpenAI API key is valid
- Check ElevenLabs API key and voice IDs
- Ensure background audio files exist in `server/assets/backgrounds/`

### Database errors
- Verify database schema was created successfully
- Check RLS policies are enabled
- Ensure service role key is set for admin operations

### Gift playback not working
- Check that meditations are marked as `is_gift: true`
- Verify storage bucket permissions allow signed URLs
- Test with unauthenticated requests

## Next Steps
1. Create and upload background audio files
2. Create and upload voice preview samples
3. Test authentication flow end-to-end
4. Test meditation generation with real API keys
5. Build React Native mobile app
6. Integrate Superwall paywall
7. Test gift meditation sharing flow
8. Implement push notifications (Expo Push)
9. Add streak tracking system
10. Build shareable content generation (audiograms, quote cards)
