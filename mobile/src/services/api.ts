import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';
import { User, Meditation, VisionStatement, SubscriptionStatus, QuotaUsage, Gift } from '../types';

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async sendMagicLink(email: string): Promise<boolean> {
    const data = await this.request<{ success: boolean }>('/auth/send-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data.success;
  }

  async verifyOTP(email: string, token: string): Promise<{
    user: User;
    session: { access_token: string };
    isNewUser: boolean;
  }> {
    const data = await this.request<any>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, token }),
    });
    
    await AsyncStorage.setItem('auth_token', data.session.access_token);
    await AsyncStorage.setItem('user_id', data.user.id);
    
    return data;
  }

  async updateProfile(userId: string, fullName: string): Promise<User> {
    const data = await this.request<{ user: User }>('/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ userId, fullName }),
    });
    return data.user;
  }

  async generateMeditation(params: {
    category: string;
    duration: number;
    voiceId: string;
    background: string;
    responses: Array<{ question: string; answer: string }>;
    isGift?: boolean;
  }): Promise<Meditation> {
    const data = await this.request<{ meditation: Meditation }>('/meditation/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data.meditation;
  }

  async getMeditations(filter?: string, category?: string): Promise<Meditation[]> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (category) params.append('category', category);
    
    const data = await this.request<{ meditations: Meditation[] }>(
      `/meditation/list?${params.toString()}`
    );
    return data.meditations;
  }

  async pinMeditation(meditationId: string): Promise<void> {
    await this.request(`/meditation/pin/${meditationId}`, { method: 'POST' });
  }

  async toggleFavorite(meditationId: string): Promise<void> {
    await this.request(`/meditation/favorite/${meditationId}`, { method: 'POST' });
  }

  async updateMeditationTitle(meditationId: string, title: string): Promise<void> {
    await this.request(`/meditation/${meditationId}/title`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  async getVisionCategories(): Promise<Array<{ name: string; status: string; tagline: string | null }>> {
    const data = await this.request<{ categories: any[] }>('/vision/categories');
    return data.categories;
  }

  async getCategoryVision(category: string): Promise<{
    statement: string | null;
    tagline: string | null;
    responses: Array<{ question: string; answer: string }>;
  }> {
    const data = await this.request<{ vision: any }>(`/vision/category/${category}`);
    return data.vision;
  }

  async getNextPrompt(
    category: string,
    previousResponses: Array<{ question: string; answer: string }>
  ): Promise<string> {
    const params = new URLSearchParams({
      responses: JSON.stringify(previousResponses),
    });
    const data = await this.request<{ prompt: string }>(
      `/vision/next-prompt/${category}?${params.toString()}`
    );
    return data.prompt;
  }

  async submitVisionFlow(
    category: string,
    responses: Array<{ question: string; answer: string }>
  ): Promise<{ statement: string; tagline: string }> {
    const data = await this.request<any>('/vision/prompt-flow', {
      method: 'POST',
      body: JSON.stringify({ category, responses }),
    });
    return { statement: data.statement, tagline: data.tagline };
  }

  async createGift(params: {
    duration: number;
    voiceId: string;
    background: string;
    responses: Array<{ question: string; answer: string }>;
  }): Promise<Gift> {
    const data = await this.request<{ gift: Gift }>('/gift/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data.gift;
  }

  async getGift(giftId: string): Promise<{
    id: string;
    senderName: string;
    meditation: Meditation;
  }> {
    const data = await this.request<{ gift: any }>(`/gift/${giftId}`);
    return {
      id: data.gift.id,
      senderName: data.gift.sender_name,
      meditation: data.gift.meditations,
    };
  }

  async saveGift(giftId: string): Promise<boolean> {
    const data = await this.request<{ success: boolean }>(`/gift/${giftId}/save`, {
      method: 'POST',
    });
    return data.success;
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const data = await this.request<{ status: SubscriptionStatus }>('/subscription/status');
    return data.status;
  }

  async getQuotaUsage(): Promise<QuotaUsage> {
    const data = await this.request<{ quota: QuotaUsage }>('/subscription/quota');
    return data.quota;
  }

  async getMeditationAudioUrl(meditationId: string): Promise<string> {
    const data = await this.request<{ url: string }>(`/player/audio/${meditationId}`);
    return data.url;
  }

  async getVoicePreviewUrl(voiceId: string): Promise<string> {
    const data = await this.request<{ url: string }>(`/player/preview/voice/${voiceId}`);
    return data.url;
  }

  async getBackgroundPreviewUrl(backgroundId: string): Promise<string> {
    const data = await this.request<{ url: string }>(`/player/preview/background/${backgroundId}`);
    return data.url;
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/whisper/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.transcript;
  }
}

export default new ApiService();
