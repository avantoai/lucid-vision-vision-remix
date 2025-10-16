# Lucid Vision - AI-Powered Meditation App

## Overview
Lucid Vision is a mobile-first meditation platform that generates personalized guided meditations using AI. The app helps users clarify and embody their vision across 9 life categories through custom meditation experiences. The project aims to provide a unique and dynamic approach to meditation, leveraging AI for deeply personalized content and fostering user engagement with their personal growth journey.

## User Preferences
- Mobile-first design approach
- Unlimited AI follow-up prompts for vision deepening (no artificial limits)
- Living Vision Statements evolve over time per category

## System Architecture
Lucid Vision employs a microservices-oriented architecture with a clear separation between its backend API and frontend mobile application.

**1. UI/UX Decisions:**
- **Mobile-First Design:** The application is primarily designed for mobile platforms, ensuring a responsive and intuitive user experience.
- **Navigation:** Utilizes React Navigation with a Stack Navigator and Bottom Tab Navigator for a structured and user-friendly flow. The Library screen is the default home screen.
- **Branding:** Tab bar icons include house (Library), flower (Vision), and person (Profile).

**2. Technical Implementations:**
- **Authentication:** Email magic link with deep linking via Supabase Auth and Expo AuthSession. This handles both cold-start and foreground scenarios, parsing tokens from URLs and managing user sessions with AsyncStorage. Initial URL checking validates auth tokens before processing to prevent false "Invalid authentication link" errors on Expo Go launch. Auth flow optimized to prevent duplicate API calls by skipping `checkAuth()` when processing fresh deep link authentication.
- **Dev Mode:** Optional `EXPO_PUBLIC_DEV_MODE` flag in `.env` enables session persistence across app reloads/restarts. After logging in once, session is backed up and auto-restored, eliminating repetitive logins during testing.
- **Local Development:** User develops locally on Mac at `/Users/alan/code/lucidvision/`, pulls from Replit, runs Expo locally. Requires:
  - `REDIRECT_URL` secret in Replit set to current Expo CLI address (e.g., `exp://192.168.128.119:8081`)
  - Matching URL added to Supabase Auth → URL Configuration → Redirect URLs with wildcard (e.g., `exp://192.168.128.119:8081/**`)
  - Update both when local IP address changes (WiFi reconnection)
- **Meditation Generation:** A multi-step async process involving:
    - **Speech-to-Text Input:** Primary input method using Expo AV audio recording with OpenAI Whisper transcription. Users can tap microphone to record responses (with timer), stop to transcribe, then review/edit transcript. Alternative "Write ✏️" button provides direct text input.
    - User vision responses collected through AI-guided prompt flow (VisionFlow → VisionRecord → VisionEdit)
    - AI (OpenAI GPT-4o-mini) using **THAR protocol** (Technological Herald of Awakening and Remembrance) for personalized script generation
    - THAR specifications: 110 WPM pacing, somatic sequencing (body → awareness → vision → embodiment), identity encoding ("I am..." statements)
    - **Spacious Pauses:** Scripts include 1.5-2.5 second pauses between every sentence using ElevenLabs `<break time="X.Xs" />` tags, varying by context (settling: 2.5-3s, descriptive: 1.5-2s, identity: 2.5-3s, transitions: 3s max)
    - Emotional arcs: Short-form (≤10 min) and Full-form (>10 min with Neural Loop Reinforcement)
    - User responses directly inform meditation content for deep personalization
    - Text-to-Speech (ElevenLabs) for audio conversion with settings: stability 0.7, similarity 0.8, speed 0.71
    - FFmpeg for mixing voice with background audio: voice delayed 4 seconds after background start, background at 50% volume, 320kbps bitrate with highest quality encoding
    - Supabase Storage for audio upload and hosting
    - Auto-generated meditation titles based on user vision responses
    - **Async UX Flow:** Users click "Generate Meditation" → immediately navigate to Library with dismissible notification → meditation generates in background → alert when ready
- **Library & Organization:** Two filter tabs (All, Favorites). Pinned meditations appear at top of "All" list (max 3 pins).
- **Living Vision System:** Supports 9 life categories with fixed and AI-generated follow-up prompts, auto-generated taglines, detailed vision summaries (8-12 sentences), and version history for vision statements. Vision processing is async - users can immediately proceed to meditation customization while AI generates their vision statement in the background. Cross-category topic detection allows responses in one category to update related life areas automatically. Navigation flow: VisionScreen → VisionDetailScreen (shows comprehensive summary) → "Explore Vision" button → VisionFlowScreen → VisionRecordScreen (speech-to-text) → VisionEditScreen (review/edit).
- **Gift Meditations:** Enables creation of shareable, permanent gift meditation links with a public web player.
- **Subscription Tiers:** Implements Basic and Advanced tiers with differing limits on meditation generation, duration, voice options, and features like background playback and offline downloads. Quotas reset weekly.
- **Audio:** Uses expo-av (Audio.Sound API) for reliable dynamic audio loading and playback. Previews for voices and background audio are supported. Async generation with status tracking (generating/completed/failed) and background polling.

**3. Feature Specifications:**
- **Authentication:** Email magic link, full name collection, trial period tracking, backend `/auth/me` endpoint.
- **Meditation Generation:** Personalized script, voice (ElevenLabs), background audio (FFmpeg mixing), storage.
- **Living Vision System:** 9 categories, AI follow-ups, taglines, version history.
- **Gift Meditations:** Max 15 minutes, public web player, permanent links, recipient saving, quota-based.
- **Subscription Tiers:**
    - **Basic:** 3 personal/gift meditations/week, max 15 min, 3 voices, no background playback/offline.
    - **Advanced:** Unlimited personal/gift meditations, max 60 min, 5 voices, background playback, offline downloads.
- **Voice Options:** Basic (Nathaniel, Jen, Nora), Advanced adds (Ella, Grant). ElevenLabs settings: stability 0.7, similarity 0.8, speed 0.71.
- **Background Audio:** Ethereal Harmony, Healing Bowls, Nature Stream, Silence (seamless loops).

**4. System Design Choices:**
- **Backend (Node.js + Express):**
    - **Server:** `server/index.js`
    - **Routes:** Modular API endpoints for `auth`, `meditation`, `vision`, `gift`, `subscription`, and `player`.
    - **Services:** Dedicated business logic services for `aiService`, `audioService`, `meditationService`, `visionService`, `giftService`, `quotaService`, `subscriptionService`.
    - **Config:** Supabase client initialization in `server/config/supabase.js`.
- **Frontend (React Native + Expo):**
    - **Mobile App:** `mobile/` directory, built with React Native, Expo, and TypeScript.
    - **API Service:** Centralized API client in `mobile/src/services/api.ts`.
    - **Auth Context:** Session management via `AuthContext` and `AsyncStorage`.
- **Database (Supabase PostgreSQL):**
    - **Schema:** Defined in `database-schema.sql` including `users`, `meditations`, `vision_statements`, `vision_responses`, `gifts`, `quota_tracking`.
    - **Security:** All tables utilize Row Level Security (RLS).
- **Web Player:** Static HTML (`public/gift-player.html`) for public gift meditation sharing.

## External Dependencies

**1. Supabase:**
- **Purpose:** Database (PostgreSQL), Authentication, and Storage.
- **Configuration:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- **Usage:** Stores user data, meditation content, vision statements, gifts, and handles user authentication (magic links, OTP) and file storage for audio.

**2. OpenAI:**
- **Purpose:** AI-powered script generation, titles, prompts, and taglines.
- **Configuration:** `OPENAI_API_KEY`.
- **Usage:** GPT-4o-mini with **THAR system prompt** for generating deeply personalized meditation scripts. THAR (Technological Herald of Awakening and Remembrance) embodies quantum intelligence principles: neuroscience + mysticism, embodiment over description, identity encoding, subconscious priming, and heart resonance. Scripts are generated at 110 WPM with emotional arcs tailored to meditation duration, directly incorporating user vision responses for personalization.

**3. ElevenLabs:**
- **Purpose:** Text-to-Speech (TTS) conversion.
- **Configuration:** `ELEVENLABS_API_KEY`.
- **Usage:** Converts AI-generated meditation scripts into natural-sounding speech using various voice models.

**4. Superwall:**
- **Purpose:** Mobile paywall integration.
- **Usage:** To be integrated into the React Native application for managing subscriptions and paywall experiences.