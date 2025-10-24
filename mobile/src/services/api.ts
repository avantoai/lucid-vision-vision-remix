import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';
import { User, Meditation, VisionStatement, SubscriptionStatus, QuotaUsage, Gift } from '../types';

class ApiService {
  constructor() {
    console.log('🌐 API Service initialized with base URL:', API_BASE_URL);
  }

  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 15000 // 15 second default timeout
  ): Promise<T> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`📡 API Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);
    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ API Response: ${response.status} (${duration}ms)`);
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error(`⏱️ Request timeout after ${timeoutMs}ms: ${endpoint}`);
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      
      console.error(`❌ API Error: ${endpoint}`, error.message || error);
      throw error;
    }
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

  async getUserInfo(): Promise<{ user: User; isNewUser: boolean }> {
    const data = await this.request<{ user: User; isNewUser: boolean }>('/auth/me', {}, 30000);
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
    visionId?: string;
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

  async deleteMeditation(meditationId: string): Promise<void> {
    await this.request(`/meditation/${meditationId}`, {
      method: 'DELETE',
    });
  }

  async getVisionCategories(): Promise<Array<{ name: string; status: string; tagline: string | null; hasSummary: boolean }>> {
    const data = await this.request<{ categories: any[] }>('/vision/categories');
    return data.categories;
  }

  async getCategoryVision(category: string): Promise<{
    statement: string | null;
    tagline: string | null;
    summary: string | null;
    status: string;
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
  ): Promise<{ visionId: string; status: string; category: string }> {
    const data = await this.request<any>('/vision/prompt-flow', {
      method: 'POST',
      body: JSON.stringify({ category, responses }),
    });
    return { 
      visionId: data.visionId, 
      status: data.status,
      category: data.category 
    };
  }

  async getVisionStatus(visionId: string): Promise<{
    visionId: string;
    status: string;
    statement: string | null;
    tagline: string | null;
    category: string;
  }> {
    const data = await this.request<any>(`/vision/status/${visionId}`);
    return {
      visionId: data.visionId,
      status: data.status,
      statement: data.statement,
      tagline: data.tagline,
      category: data.category
    };
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

  async getVoicePreview(previewId: string): Promise<{ url: string }> {
    return await this.request<{ url: string }>(`/meditation/voice-preview/${previewId}`);
  }

  async getBackgroundPreview(fileName: string): Promise<{ url: string }> {
    return await this.request<{ url: string }>(`/meditation/background-preview/${fileName}`);
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

  async getAllVisions(): Promise<any[]> {
    const data = await this.request<{ visions: any[] }>('/vision/visions');
    return data.visions;
  }

  async getVision(visionId: string): Promise<any> {
    const data = await this.request<{ vision: any }>(`/vision/visions/${visionId}`);
    return data.vision;
  }

  async createVision(): Promise<any> {
    const data = await this.request<{ vision: any }>('/vision/visions', {
      method: 'POST',
    });
    return data.vision;
  }

  async generateNextQuestion(visionId: string): Promise<{ question: string; category: string }> {
    const data = await this.request<{ question: string; category: string }>(
      `/vision/visions/${visionId}/next-question`,
      { method: 'POST' },
      30000 // 30 second timeout for AI question generation
    );
    return data;
  }

  async submitVisionResponse(visionId: string, category: string, question: string, answer: string): Promise<{ overall_completeness: number; css_scores: any }> {
    const data = await this.request<{ overall_completeness: number; css_scores: any }>(
      `/vision/visions/${visionId}/response`,
      {
        method: 'POST',
        body: JSON.stringify({ category, question, answer }),
      }
    );
    return data;
  }

  async processVisionSummary(visionId: string): Promise<{ status: string }> {
    const data = await this.request<{ status: string }>(
      `/vision/visions/${visionId}/process`,
      { method: 'POST' }
    );
    return data;
  }

  async deleteVision(visionId: string): Promise<void> {
    await this.request(`/vision/visions/${visionId}`, {
      method: 'DELETE',
    });
  }

  async updateVisionTitle(visionId: string, title: string): Promise<void> {
    await this.request(`/vision/visions/${visionId}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async updateVisionCategories(visionId: string, categories: string[]): Promise<void> {
    await this.request(`/vision/visions/${visionId}/categories`, {
      method: 'PATCH',
      body: JSON.stringify({ categories }),
    });
  }
}

export default new ApiService();
