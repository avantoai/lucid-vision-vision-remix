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
  { id: 'ambient', name: 'Ethereal Harmony', fileName: 'ambient.mp3', previewFileName: 'ambient-sample.mp3' },
  { id: 'bowls', name: 'Healing Bowls', fileName: 'bowls.mp3', previewFileName: 'bowls-sample.mp3' },
  { id: 'stream', name: 'Nature Stream', fileName: 'stream.mp3', previewFileName: 'stream-sample.mp3' },
  { id: 'silence', name: 'Silence', fileName: 'silence.mp3', previewFileName: 'silence-sample.mp3' },
];

export const MEDITATION_TYPES = [
  { 
    id: 'embodied_future', 
    name: 'Embodied Future', 
    description: 'Vivid visualization of your dream life already realized'
  },
  { 
    id: 'mental_rehearsal', 
    name: 'Mental Rehearsal', 
    description: 'Practice a perfect day living your vision'
  },
  { 
    id: 'energetic_expansion', 
    name: 'Energetic Expansion', 
    description: 'Amplify and broadcast your vision\'s core frequency'
  },
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
