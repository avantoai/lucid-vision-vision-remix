# Lucid Vision API Examples

This document provides practical examples for integrating with the Lucid Vision backend API from a React Native mobile app.

## Authentication Examples

### Send Magic Link
```javascript
async function sendMagicLink(email) {
  const response = await fetch('https://your-api.com/api/auth/send-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  return data.success;
}
```

### Verify OTP (After Magic Link Click)
```javascript
async function verifyOTP(email, token) {
  const response = await fetch('https://your-api.com/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token })
  });
  
  const data = await response.json();
  
  if (data.success) {
    await AsyncStorage.setItem('auth_token', data.session.access_token);
    await AsyncStorage.setItem('user_id', data.user.id);
    
    return {
      isNewUser: data.isNewUser,
      user: data.user,
      session: data.session
    };
  }
  
  throw new Error('Verification failed');
}
```

### Update Profile (New Users)
```javascript
async function updateProfile(userId, fullName, authToken) {
  const response = await fetch('https://your-api.com/api/auth/update-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ userId, fullName })
  });
  
  return await response.json();
}
```

## Vision Statement Examples

### Get All Categories
```javascript
async function getCategories(authToken) {
  const response = await fetch('https://your-api.com/api/vision/categories', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const data = await response.json();
  return data.categories;
  // Returns: [
  //   { name: 'health', status: 'in_progress', tagline: 'Living with energy and vitality' },
  //   { name: 'wealth', status: 'not_started', tagline: null },
  //   ...
  // ]
}
```

### Get Category Vision
```javascript
async function getCategoryVision(category, authToken) {
  const response = await fetch(
    `https://your-api.com/api/vision/category/${category}`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  const data = await response.json();
  return data.vision;
  // Returns: {
  //   statement: "I am vibrant, energized, and living in optimal health...",
  //   tagline: "Living with energy and vitality",
  //   responses: [
  //     { question: "What does vibrant health feel like?", answer: "..." },
  //     ...
  //   ]
  // }
}
```

### Get Next Prompt (Unlimited Flow)
```javascript
async function getNextPrompt(category, previousResponses, authToken) {
  const params = new URLSearchParams({
    responses: JSON.stringify(previousResponses)
  });
  
  const response = await fetch(
    `https://your-api.com/api/vision/next-prompt/${category}?${params}`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  const data = await response.json();
  return data.prompt;
  // Returns: "How do you want to feel in your body each day?"
}
```

### Submit Vision Prompt Flow
```javascript
async function submitVisionFlow(category, responses, authToken) {
  const response = await fetch('https://your-api.com/api/vision/prompt-flow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ category, responses })
  });
  
  const data = await response.json();
  return {
    statement: data.statement,
    tagline: data.tagline
  };
}
```

## Meditation Examples

### Generate Personal Meditation
```javascript
async function generateMeditation({
  category,
  duration,
  voiceId,
  background,
  responses,
  authToken
}) {
  const response = await fetch('https://your-api.com/api/meditation/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      category,
      duration,
      voiceId,
      background,
      responses,
      isGift: false
    })
  });
  
  const data = await response.json();
  
  if (!data.success && data.upgradeRequired) {
    // Show upgrade modal
    throw new Error('QUOTA_EXCEEDED');
  }
  
  return data.meditation;
}
```

### Get Meditation List
```javascript
async function getMeditations(filter = 'all', category = null, authToken) {
  const params = new URLSearchParams();
  if (filter !== 'all') params.append('filter', filter);
  if (category) params.append('category', category);
  
  const response = await fetch(
    `https://your-api.com/api/meditation/list?${params}`,
    { headers: { 'Authorization': `Bearer ${authToken}` } }
  );
  
  const data = await response.json();
  return data.meditations;
}
```

### Pin Meditation
```javascript
async function pinMeditation(meditationId, authToken) {
  const response = await fetch(
    `https://your-api.com/api/meditation/pin/${meditationId}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    }
  );
  
  const data = await response.json();
  if (!data.success) {
    throw new Error('Maximum of 3 pinned meditations allowed');
  }
}
```

### Toggle Favorite
```javascript
async function toggleFavorite(meditationId, authToken) {
  await fetch(`https://your-api.com/api/meditation/favorite/${meditationId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
}
```

## Gift Meditation Examples

### Create Gift Meditation
```javascript
async function createGift({
  duration,
  voiceId,
  background,
  responses,
  authToken
}) {
  const response = await fetch('https://your-api.com/api/gift/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      duration,
      voiceId,
      background,
      responses
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Auto-copy share URL to clipboard
    await Clipboard.setStringAsync(data.gift.shareUrl);
    // Show toast: "Link copied"
    return data.gift;
  }
  
  throw new Error(data.error);
}
```

### Get Gift Details (Public, No Auth)
```javascript
async function getGift(giftId) {
  const response = await fetch(`https://your-api.com/api/gift/${giftId}`);
  const data = await response.json();
  
  return {
    id: data.gift.id,
    senderName: data.gift.sender_name,
    meditation: data.gift.meditations
  };
}
```

### Save Gift to Library
```javascript
async function saveGift(giftId, authToken) {
  const response = await fetch(
    `https://your-api.com/api/gift/${giftId}/save`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    }
  );
  
  const data = await response.json();
  return data.success;
}
```

## Audio Playback Examples

### Get Audio URL
```javascript
async function getMeditationAudio(meditationId, authToken) {
  const headers = authToken 
    ? { 'Authorization': `Bearer ${authToken}` }
    : {};
    
  const response = await fetch(
    `https://your-api.com/api/player/audio/${meditationId}`,
    { headers }
  );
  
  const data = await response.json();
  return data.url; // Signed URL valid for 1 hour
}
```

### Play Meditation (Expo AV)
```javascript
import { Audio } from 'expo-av';

async function playMeditation(meditationId, authToken) {
  const audioUrl = await getMeditationAudio(meditationId, authToken);
  
  const { sound } = await Audio.Sound.createAsync(
    { uri: audioUrl },
    { shouldPlay: true }
  );
  
  return sound;
}
```

### Get Voice Preview
```javascript
async function getVoicePreview(voiceId) {
  const response = await fetch(
    `https://your-api.com/api/player/preview/voice/${voiceId}`
  );
  
  const data = await response.json();
  return data.url;
}
```

### Get Background Preview
```javascript
async function getBackgroundPreview(backgroundId) {
  const response = await fetch(
    `https://your-api.com/api/player/preview/background/${backgroundId}`
  );
  
  const data = await response.json();
  return data.url;
}
```

## Whisper STT Example

### Transcribe Voice Input
```javascript
import * as DocumentPicker from 'expo-document-picker';

async function transcribeAudio(authToken) {
  // Record or pick audio file
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*'
  });
  
  if (result.type !== 'success') return null;
  
  const formData = new FormData();
  formData.append('audio', {
    uri: result.uri,
    type: 'audio/m4a',
    name: 'recording.m4a'
  });
  
  const response = await fetch('https://your-api.com/api/whisper/transcribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'multipart/form-data'
    },
    body: formData
  });
  
  const data = await response.json();
  return data.transcript;
}
```

## Subscription Examples

### Get Subscription Status
```javascript
async function getSubscriptionStatus(authToken) {
  const response = await fetch('https://your-api.com/api/subscription/status', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const data = await response.json();
  return data.status;
  // Returns: {
  //   tier: 'basic',
  //   isInTrial: true,
  //   trialEndsAt: '2025-10-10T00:00:00Z',
  //   features: {
  //     personalQuota: 3,
  //     giftQuota: 3,
  //     maxDuration: 15,
  //     backgroundPlayback: false,
  //     offline: false,
  //     voices: 3
  //   }
  // }
}
```

### Get Quota Usage
```javascript
async function getQuotaUsage(authToken) {
  const response = await fetch('https://your-api.com/api/subscription/quota', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const data = await response.json();
  return data.quota;
  // Returns: {
  //   personal: { used: 2, limit: 3 },
  //   gift: { used: 1, limit: 3 },
  //   weekStart: '2025-09-30T00:00:00Z'
  // }
}
```

## Complete Flow Example: First-Run Onboarding

```javascript
async function completeOnboarding() {
  // 1. User enters email
  await sendMagicLink('user@example.com');
  
  // 2. User clicks magic link, app receives token
  const { isNewUser, user, session } = await verifyOTP('user@example.com', 'token123');
  
  // 3. If new user, collect full name
  if (isNewUser) {
    await updateProfile(user.id, 'John Doe', session.access_token);
  }
  
  // 4. Show welcome slides (client-side)
  
  // 5. Start first meditation prompt flow
  const responses = [];
  
  // First prompt (fixed)
  let prompt = "If you could shift or create one thing in your life right now, what would it be?";
  let answer = await showPromptScreen(prompt); // User types or records
  responses.push({ question: prompt, answer });
  
  // Continue with more prompts...
  
  // 6. Generate first meditation (in background)
  const meditation = await generateMeditation({
    category: 'freeform',
    duration: 5,
    voiceId: 'HzVnxqtdk9eqrcwfxD57',
    background: 'ocean-waves',
    responses,
    authToken: session.access_token
  });
  
  // 7. Show paywall (Superwall)
  const subscribed = await showPaywall();
  
  // 8. Play first meditation
  if (subscribed) {
    await playMeditation(meditation.id, session.access_token);
  }
}
```
