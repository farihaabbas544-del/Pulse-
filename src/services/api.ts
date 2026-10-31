import { User, Contact, Conversation, Message, StatusUpdate, ContactStatusGroup, PaymentRecord } from '../types';

const TOKEN_KEY = 'pulsechat_token';

class ApiService {
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private wsListeners: Set<(event: any) => void> = new Set();
  private reconnectTimer: any = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      this.initWebSocket();
    } else {
      localStorage.removeItem(TOKEN_KEY);
      this.closeWebSocket();
    }
  }

  // --------------------------------------------------
  // WebSocket Management
  // --------------------------------------------------
  public initWebSocket(): void {
    if (!this.token) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.ws && this.token) {
          this.ws.send(JSON.stringify({ type: 'auth', token: this.token }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.wsListeners.forEach(listener => listener(data));
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      this.ws.onclose = () => {
        // Attempt automatic reconnection if token exists
        if (this.token) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.initWebSocket();
          }, 3000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WS error:', err);
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
    }
  }

  public closeWebSocket(): void {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public sendWs(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public onWsMessage(callback: (event: any) => void): () => void {
    this.wsListeners.add(callback);
    return () => {
      this.wsListeners.delete(callback);
    };
  }

  // --------------------------------------------------
  // HTTP Fetch Wrapper
  // --------------------------------------------------
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error || response.statusText || 'Request failed';
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // --------------------------------------------------
  // Auth Endpoints
  // --------------------------------------------------
  public async register(payload: { name: string; username: string; email: string; password: string }) {
    const res = await this.request<{ user: User; token: string; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  public async login(payload: { loginIdentifier: string; password: string }) {
    const res = await this.request<{ user: User; token: string; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  public async forgotPassword(email: string) {
    return this.request<{ message: string; verificationCode?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(payload: { email: string; code: string; newPassword: string }) {
    return this.request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateProfile(payload: {
    name?: string;
    username?: string;
    about?: string;
    avatarUrl?: string | null;
    avatarColor?: string;
    settings?: Partial<User['settings']>;
  }) {
    return this.request<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // --------------------------------------------------
  // Users & Contacts
  // --------------------------------------------------
  public async searchUsers(query: string) {
    return this.request<{ users: Array<{ id: string; name: string; username: string; avatarUrl: string | null; avatarColor: string; about: string; plan: string }> }>(
      `/api/users/search?q=${encodeURIComponent(query)}`
    );
  }

  public async getContacts(): Promise<{ contacts: Contact[] }> {
    return this.request<{ contacts: Contact[] }>('/api/contacts');
  }

  public async addContact(payload: {
    contactName?: string;
    usernameOrHandle: string;
    description?: string;
    avatarColor?: string;
  }) {
    return this.request<{ contact: Contact; conversationId: string; message: string }>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --------------------------------------------------
  // Conversations & Messages
  // --------------------------------------------------
  public async getConversations(): Promise<{ conversations: Conversation[] }> {
    return this.request<{ conversations: Conversation[] }>('/api/conversations');
  }

  public async createConversation(payload: {
    type: 'group' | 'space';
    name: string;
    description?: string;
    avatarUrl?: string | null;
    memberUsernames?: string[];
    channels?: Array<{ id: string; name: string; description: string; type: 'text' | 'canvas' | 'polls' }>;
  }) {
    return this.request<{ conversation: Conversation }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getMessages(conversationId: string, channelId?: string): Promise<{ messages: Message[] }> {
    const q = channelId ? `?channelId=${encodeURIComponent(channelId)}` : '';
    return this.request<{ messages: Message[] }>(`/api/conversations/${conversationId}/messages${q}`);
  }

  public async sendMessage(
    conversationId: string,
    payload: {
      content?: string;
      channelId?: string | null;
      type?: string;
      mediaUrl?: string | null;
      mediaName?: string | null;
      mediaSize?: number | null;
      mediaDuration?: number | null;
      isViewOnce?: boolean;
      replyTo?: { id: string; senderName: string; content: string } | null;
    }
  ): Promise<{ message: Message }> {
    return this.request<{ message: Message }>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async openViewOnce(messageId: string) {
    return this.request<{
      mediaUrl: string;
      mediaName: string;
      mediaType: string;
      disclaimer: string;
    }>(`/api/messages/${messageId}/view-once`, {
      method: 'POST',
    });
  }

  public async markConversationRead(conversationId: string) {
    return this.request<{ updatedCount: number }>(`/api/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  }

  public async reactMessage(messageId: string, emoji: string) {
    return this.request<{ reactions: any[] }>(`/api/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  public async editMessage(messageId: string, content: string) {
    return this.request<{ message: Message }>(`/api/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  public async deleteMessage(messageId: string) {
    return this.request<{ message: string }>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // --------------------------------------------------
  // WhatsApp-Style Status Updates
  // --------------------------------------------------
  public async getStatuses(): Promise<{
    myStatuses: StatusUpdate[];
    contactsStatuses: ContactStatusGroup[];
  }> {
    return this.request<{
      myStatuses: StatusUpdate[];
      contactsStatuses: ContactStatusGroup[];
    }>('/api/statuses');
  }

  public async createStatus(payload: {
    type: 'photo' | 'video' | 'poster';
    mediaUrl?: string | null;
    posterBg?: string | null;
    posterFont?: string | null;
    caption?: string;
  }) {
    return this.request<{ status: StatusUpdate }>('/api/statuses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async viewStatus(statusId: string) {
    return this.request<{ success: boolean; viewersCount: number }>(`/api/statuses/${statusId}/view`, {
      method: 'POST',
    });
  }

  public async deleteStatus(statusId: string) {
    return this.request<{ message: string }>(`/api/statuses/${statusId}`, {
      method: 'DELETE',
    });
  }

  // --------------------------------------------------
  // Payments & Subscriptions (Razorpay)
  // --------------------------------------------------
  public async getPaymentConfig() {
    return this.request<{
      keyId: string;
      mode: string;
      supportedMethods: string[];
      plans: any;
    }>('/api/payment/config');
  }

  public async createPaymentOrder(plan: 'plus' | 'pro', method: 'card' | 'upi' = 'card') {
    return this.request<{
      orderId: string;
      amount: number;
      currency: string;
      plan: string;
      customerName: string;
      customerEmail: string;
    }>('/api/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan, method }),
    });
  }

  public async verifyPayment(payload: {
    orderId: string;
    paymentId?: string;
    signature?: string;
    plan: 'plus' | 'pro';
  }) {
    return this.request<{
      success: boolean;
      plan: string;
      paymentId: string;
      message: string;
    }>('/api/payment/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getPaymentHistory(): Promise<{ payments: PaymentRecord[] }> {
    return this.request<{ payments: PaymentRecord[] }>('/api/payment/history');
  }

  public async cancelSubscription() {
    return this.request<{ message: string }>('/api/payment/cancel', {
      method: 'POST',
    });
  }

  // --------------------------------------------------
  // VIP QR Pass Methods
  // --------------------------------------------------
  public async getVipPasses() {
    return this.request<{
      passes: {
        plus: { plan: string; name: string; code: string; qrData: string; badge: string; description: string };
        pro: { plan: string; name: string; code: string; qrData: string; badge: string; description: string };
      };
    }>('/api/subscription/vip-passes');
  }

  public async redeemVipPass(scannedCode: string, scannerType: 'plus' | 'pro') {
    return this.request<{ success: boolean; plan: 'plus' | 'pro'; message: string }>(
      '/api/subscription/redeem-vip',
      {
        method: 'POST',
        body: JSON.stringify({ scannedCode, scannerType }),
      }
    );
  }

  // --------------------------------------------------
  // Upload Media
  // --------------------------------------------------
  public async uploadFile(dataUrl: string, filename: string, mimeType?: string) {
    return this.request<{ url: string; filename: string; size: number; mimeType: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename, mimeType }),
    });
  }
}

export const api = new ApiService();
