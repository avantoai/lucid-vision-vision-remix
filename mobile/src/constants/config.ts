export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const VOICE_OPTIONS = {
  basic: [
    { id: 'HzVnxqtdk9eqrcwfxD57', name: 'Jen', previewId: 'jen', tier: 'basic' },
    { id: 'AeRdCCKzvd23BpJoofzx', name: 'Nathaniel', previewId: 'nathaniel', tier: 'basic' },
    { id: 'RxDql9IVj8LjC1obxK7z', name: 'Nora', previewId: 'nora', tier: 'basic' },
  ],
  advanced: [
    { id: 'ItH39nl7BrnB34569EL1', name: 'Ella', previewId: 'ella', tier: 'advanced' },
    { id: '1TmWQEtqNZdO4bVt9Xo1', name: 'Grant', previewId: 'grant', tier: 'advanced' },
  ],
};

export const BACKGROUND_OPTIONS = [
  { id: 'ocean-waves', name: 'Ocean Waves' },
  { id: 'deep-ambient', name: 'Deep Ambient' },
  { id: 'crystal-bowls', name: 'Crystal Bowls' },
  { id: 'theta-beats', name: 'Theta Beats' },
  { id: 'silence', name: 'Silence' },
];

export const CATEGORIES = [
  { id: 'freeform', name: 'Freeform', description: 'Open-ended vision' },
  { id: 'health', name: 'Health', description: 'Physical wellbeing' },
  { id: 'wealth', name: 'Wealth', description: 'Financial abundance' },
  { id: 'relationships', name: 'Relationships', description: 'Connections with others' },
  { id: 'play', name: 'Play', description: 'Joy and recreation' },
  { id: 'love', name: 'Love', description: 'Love and affection' },
  { id: 'purpose', name: 'Purpose', description: 'Life meaning' },
  { id: 'spirit', name: 'Spirit', description: 'Spiritual connection' },
  { id: 'healing', name: 'Healing', description: 'Transformation and wholeness' },
];
