# Lucid Vision - AI-Powered Meditation App

## Overview
Lucid Vision is a mobile-first AI-powered meditation platform designed to help users clarify and embody their vision across 9 life categories. It generates personalized guided meditations using AI, offering a unique and adaptive experience for personal growth and clarity. The project aims to provide a seamless and intuitive mobile experience with a robust backend for content generation and user management.

## User Preferences
- Mobile-first design approach
- Unlimited AI follow-up prompts for vision deepening (no artificial limits)
- Living Vision Statements evolve over time per category

## System Architecture

### UI/UX Decisions
- Mobile-first design with React Native (Expo) for consistent experience across devices.
- Intuitive navigation using Stack and Bottom Tab Navigators.
- Clear user flows for authentication, meditation generation, and vision tracking.

### Technical Implementations
- **Backend**: Node.js and Express.js for API services.
- **Frontend**: React Native with Expo and TypeScript for the mobile application.
- **Web Player**: Simple HTML for public gift meditation sharing.
- **Authentication**: Email magic links with deep linking for seamless user login and onboarding.
- **Meditation Generation**:
    - OpenAI (GPT-4o-mini) for personalized script generation.
    - ElevenLabs for Text-to-Speech (TTS).
    - FFmpeg for mixing voice with background audio.
    - Audio uploaded to Supabase Storage.
- **Living Vision System**:
    - Supports 9 predefined categories with fixed and AI-generated follow-up prompts.
    - Tracks user responses and synthesizes living vision statements with version history.
    - Auto-generates taglines from vision statements.
- **Gift Meditations**:
    - Creation of shareable, public meditations via a web player.
    - Quota-managed sharing with options to save to a user's library.
- **Subscription Tiers**:
    - "Basic" and "Advanced" tiers with differing quotas, durations, voice options, and features (e.g., background playback, offline downloads).
    - Weekly quota resets.

### Feature Specifications
- **Authentication**: Email magic link, deep linking, onboarding flow, trial period tracking.
- **Meditation Generation**: AI-driven script, TTS, audio mixing, auto-generated titles.
- **Living Vision**: 9 categories, AI-powered prompts, taglines, vision statement management.
- **Gift Meditations**: Public web player, shareable links, save-to-library functionality.
- **Subscription Tiers**: Differentiated features based on Basic and Advanced plans.
- **Voice Options**: Multiple ElevenLabs voices with specific IDs and settings (stability, similarity, speed).
- **Background Audio**: Seamless looping tracks (Ethereal Harmony, Healing Bowls, Nature Stream, Silence).

### System Design Choices
- **Modularity**: Backend structured with separate routes and services for maintainability.
- **Database**: Supabase PostgreSQL with extensive Row Level Security (RLS) policies for data protection.
- **API Client**: Comprehensive API service layer in the mobile app for backend integration.
- **Auth Context**: Manages user sessions and authentication state using AsyncStorage.
- **Error Handling**: Implemented for API calls and background processes.

## External Dependencies

- **Supabase**:
    - Database (PostgreSQL)
    - Authentication
    - Storage (for audio files, voice previews)
- **OpenAI**:
    - GPT-4o-mini for AI script generation, titles, prompts, and taglines.
- **ElevenLabs**:
    - Text-to-Speech (TTS) for voice generation.
- **FFmpeg**:
    - Used for mixing generated voice with background audio.
- **Superwall**:
    - (Planned) For mobile app paywall integration.