export interface User {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: 'basic' | 'advanced';
  trial_ends_at: string | null;
}

export interface Meditation {
  id: string;
  user_id: string;
  category: string;
  title: string;
  duration: number;
  voice_id: string;
  background: string;
  audio_url: string;
  script: string;
  status: 'generating' | 'completed' | 'failed';
  is_favorite: boolean;
  is_pinned: boolean;
  is_gift: boolean;
  received_from: string | null;
  created_at: string;
}

export interface VisionStatement {
  id: string;
  user_id: string;
  category: string;
  statement: string;
  tagline: string | null;
  is_active: boolean;
  created_at: string;
}

export interface VisionResponse {
  id: string;
  vision_id: string;
  question: string;
  answer: string;
  response_order: number;
}

export interface SubscriptionStatus {
  tier: 'basic' | 'advanced';
  isInTrial: boolean;
  trialEndsAt: string | null;
  features: {
    personalQuota: number | 'unlimited';
    giftQuota: number | 'unlimited';
    maxDuration: number;
    backgroundPlayback: boolean;
    offline: boolean;
    voices: number;
  };
}

export interface QuotaUsage {
  personal: { used: number; limit: number | 'unlimited' };
  gift: { used: number; limit: number | 'unlimited' };
  weekStart: string;
}

export interface Gift {
  id: string;
  sender_id: string;
  sender_name: string;
  meditation_id: string;
  share_url: string;
  created_at: string;
}

export type RootStackParamList = {
  Auth: undefined;
  EmailInput: undefined;
  Onboarding: { isNewUser: boolean };
  MainTabs: undefined;
  MyVisions: undefined;
  CategorySelection: undefined;
  VisionFlow: { visionId: string; isNewVision: boolean };
  VisionDetail: { visionId: string };
  VisionRecord: { visionId: string; question: string; stage: string; stageIndex: number };
  VisionEdit: { visionId: string; question: string; stage: string; stageIndex: number; audioUri: string | null; recordingDuration: number };
  MeditationSetup: { category: string; responses: Array<{ question: string; answer: string }>; visionId?: string };
  MeditationPlayer: { meditationId: string };
  CreateGift: undefined;
  GiftPlayer: { giftId: string };
  SelectVoice: { onSelect: (voiceId: string) => void };
  SelectBackground: { onSelect: (backgroundId: string) => void };
};

export type TabParamList = {
  Library: { showGeneratingNotification?: boolean } | undefined;
  Vision: undefined;
  Profile: undefined;
};
