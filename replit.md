# Lucid Vision - AI-Powered Meditation App

## Overview
Lucid Vision is a mobile-first meditation platform that generates personalized guided meditations using AI. The app helps users clarify and embody their vision across 9 life categories through custom meditation experiences.

## Current State
Backend API infrastructure is set up and running. The project is structured for React Native mobile development with a Node.js/Express backend serving API endpoints and a web player for gift meditations.

## Recent Changes (October 10, 2025)
- **Implemented deep link authentication with Expo AuthSession**
  - Configured custom URL scheme `lucidvision://` for magic link deep linking
  - Created deep link handler service to parse Supabase auth tokens from URLs
  - Updated AuthContext to handle both cold-start and foreground deep links
  - Added `/auth/me` backend endpoint to fetch user info from auth tokens
  - Updated EmailInputScreen with waiting state UI after sending magic link
  - Fixed hash parameter parsing for Supabase URL format (#access_token=...)
  - Auth flow now works seamlessly: email → magic link → deep link → auto-login

## Previous Changes (October 8, 2025)
- Initial project setup with Node.js/Express backend
- Implemented core API structure with routes for auth, meditation, vision, gift, subscription, and player
- Created services for AI (OpenAI), audio (ElevenLabs + FFmpeg), meditation generation, vision tracking, and quota management
- Built web player for public gift meditation sharing
- Defined complete database schema with RLS policies for Supabase PostgreSQL
- Configured workflow to run backend server on port 5000
- Voice preview files uploaded to Supabase Storage (nathaniel, jen, nora, ella, grant)
- Configured deployment for VM with npm start command
- Built complete React Native mobile app with Expo and TypeScript
- Implemented all screens: Auth, Home, Library, Vision, Profile, Vision Flow, Meditation Player, Gift screens
- Created comprehensive API service layer for backend integration
- Set up navigation with Stack Navigator and Bottom Tab Navigator
- Implemented authentication context with AsyncStorage for session management

## Project Architecture

### Backend (Node.js + Express)
- **Server**: `server/index.js` - Main Express server
- **Routes**: API endpoints in `server/routes/`
  - `auth.js` - Magic link authentication
  - `meditation.js` - Meditation CRUD and generation
  - `vision.js` - Living Vision Statement management
  - `gift.js` - Gift meditation creation and sharing
  - `subscription.js` - Tier management and quota
  - `player.js` - Audio playback and previews

- **Services**: Business logic in `server/services/`
  - `aiService.js` - OpenAI script generation, titles, prompts, taglines
  - `audioService.js` - ElevenLabs TTS + FFmpeg audio mixing
  - `meditationService.js` - Meditation generation pipeline
  - `visionService.js` - Category vision and prompt flow
  - `giftService.js` - Gift creation and saving
  - `quotaService.js` - Weekly quota tracking (Basic: 3/week, Advanced: unlimited)
  - `subscriptionService.js` - Tier features and limits

- **Config**: `server/config/supabase.js` - Supabase client initialization

### Frontend (React Native + Expo)
- **Mobile App**: React Native with Expo and TypeScript in `mobile/`
  - **Screens**: Auth (Email, Onboarding), Home, Library, Vision, Profile, Vision Flow, Meditation Player, Gift screens
  - **Navigation**: Stack Navigator + Bottom Tab Navigator (React Navigation)
  - **API Service**: Comprehensive API client in `mobile/src/services/api.ts`
  - **Auth Context**: Session management with AsyncStorage
  - **Audio**: Expo AV for meditation playback
  
- **Web Player**: Public gift meditation player (HTML in `public/gift-player.html`)

### Database (Supabase PostgreSQL)
Schema defined in `database-schema.sql`:
- `users` - User profiles with subscription tier and trial info
- `meditations` - Generated meditations with audio, scripts, metadata
- `vision_statements` - Living Vision Statements per category
- `vision_responses` - User responses to vision prompts
- `gifts` - Gift meditation sharing records
- `quota_tracking` - Weekly usage tracking

All tables have Row Level Security (RLS) enabled.

## Key Features

### Authentication
- **Email magic link with deep linking** (Supabase Auth)
  - User enters email and receives magic link
  - Clicking link opens app via `lucidvision://` custom URL scheme
  - Tokens parsed from URL hash and saved to AsyncStorage
  - App automatically fetches user info and navigates to onboarding
  - Works for both cold-start (app closed) and foreground scenarios
- Full name collection for new users
- Trial period tracking (3-5 days)
- Backend endpoint `/auth/me` for token-based user info retrieval

### Meditation Generation
1. User provides responses to prompts (text or voice via Whisper STT)
2. OpenAI generates personalized script (135 WPM, 2nd person, mindful tone)
3. ElevenLabs converts script to speech
4. FFmpeg mixes voice with background audio
5. Audio uploaded to Supabase Storage
6. Auto-generated title (2-5 words, Title Case)

### Living Vision System
- 9 categories: freeform, health, wealth, relationships, play, love, purpose, spirit, healing
- 2 fixed prompts per category + unlimited AI follow-ups
- Auto-generated taglines (8-12 words) from vision statements
- Version history (active statement shown by default)

### Gift Meditations
- Maximum 15 minutes for gifts
- Public web player (no login required)
- Permanent shareable links
- Recipients can save to library via signup flow
- Quota: 3/week (Basic), unlimited (Advanced)

### Subscription Tiers
**Basic:**
- 3 personal meditations/week
- 3 gift meditations/week
- Max 15 min duration
- 3 voices (Neutral Calm, Female Calm, Male Calm)
- No background playback or offline

**Advanced:**
- Unlimited personal/gift meditations
- Max 60 min duration
- 5 voices (+ Female Assertive, Male Calm 2)
- Background playback
- Offline downloads

Weekly reset: Monday 00:00 local time

### Voice Options
**Preview IDs (uploaded to Supabase Storage at previews/voices/):**
- Basic: nathaniel.mp3, jen.mp3, nora.mp3
- Advanced adds: ella.mp3, grant.mp3

**ElevenLabs Voice IDs (for TTS generation):**
- Basic Tier: Jen (HzVnxqtdk9eqrcwfxD57), Nathaniel (AeRdCCKzvd23BpJoofzx), Nora (RxDql9IVj8LjC1obxK7z)
- Advanced Tier adds: Ella (ItH39nl7BrnB34569EL1), Grant (1TmWQEtqNZdO4bVt9Xo1)
- Settings: stability 0.7, similarity 0.8, speed 0.9

### Background Audio
- Ethereal Harmony (ambient.mp3)
- Healing Bowls (bowls.mp3)
- Nature Stream (stream.mp3)
- Silence (silence.mp3)

**File Structure:**
- Full tracks: `ambient.mp3`, `bowls.mp3`, `stream.mp3`, `silence.mp3`
- Preview samples: `ambient-sample.mp3`, `bowls-sample.mp3`, `stream-sample.mp3`, `silence-sample.mp3`

All backgrounds are seamless loops for meditation mixing.

## Third-Party Services Required

### Supabase (Database, Auth, Storage)
- `SUPABASE_URL` - Project URL
- `SUPABASE_ANON_KEY` - Public anon key

### OpenAI (Script Generation)
- `OPENAI_API_KEY` - API key for GPT-4o-mini

### ElevenLabs (Text-to-Speech)
- `ELEVENLABS_API_KEY` - API key for TTS

### Superwall (Paywall - Mobile Integration)
- To be configured in React Native app

## API Endpoints

### Auth
- `POST /api/auth/send-magic-link` - Send magic link email
- `POST /api/auth/verify-otp` - Verify OTP and get session
- `POST /api/auth/update-profile` - Update user profile with full name

### Meditation
- `POST /api/meditation/generate` - Generate new meditation
- `GET /api/meditation/list` - Get user's meditations (with filters)
- `POST /api/meditation/pin/:meditationId` - Pin meditation (max 3)
- `POST /api/meditation/favorite/:meditationId` - Toggle favorite
- `PUT /api/meditation/:meditationId/title` - Update title

### Vision
- `GET /api/vision/categories` - Get all categories with status
- `GET /api/vision/category/:category` - Get category vision and responses
- `POST /api/vision/update-statement` - Manually update vision statement
- `POST /api/vision/prompt-flow` - Process prompt responses and synthesize statement
- `GET /api/vision/next-prompt/:category` - Get next prompt (fixed or AI-generated)

### Gift
- `POST /api/gift/create` - Create gift meditation
- `GET /api/gift/:giftId` - Get gift details (public)
- `POST /api/gift/:giftId/save` - Save gift to library (requires auth)

### Subscription
- `GET /api/subscription/status` - Get subscription status and features
- `GET /api/subscription/quota` - Get weekly quota usage
- `POST /api/subscription/upgrade` - Upgrade subscription tier

### Player
- `GET /api/player/preview/:type/:id` - Get preview audio URL (voice/background)
- `GET /api/player/audio/:meditationId` - Get meditation audio URL (requires auth)

## User Preferences
- Mobile-first design approach
- Unlimited AI follow-up prompts for vision deepening (no artificial limits)
- Living Vision Statements evolve over time per category

## Next Steps
1. Configure Supabase project and add credentials
2. Set up OpenAI API key
3. Configure ElevenLabs API key
4. Create background audio asset files
5. Implement React Native mobile app
6. Integrate Superwall paywall in mobile app
7. Add Whisper STT endpoint for voice input
8. Implement streak tracking system
9. Add push notification system (Expo Push)
10. Build shareable content generation (audiogram, quote cards)
