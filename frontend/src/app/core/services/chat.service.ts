import { environment } from '../../../environments/environment';
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Message, Conversation } from '../models/message.model';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private readonly API_URL = environment.apiUrl + '/conversations';

  conversations = signal<Conversation[]>([]);
  activeConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  isLoadingMessages = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private wsService: WebSocketService
  ) {
    this.wsService.messageEvents$.subscribe((event) => {
      if (event && event.message) {
        this.handleIncomingMessage(event.message);
      }
    });
  }

  private handleIncomingMessage(msg: Message): void {
    const active = this.activeConversation();
    if (active && active.id === msg.conversationId) {
      // Append to active message list if not already present
      const current = this.messages();
      if (!current.some((m) => m.id === msg.id || (m.clientMessageId && m.clientMessageId === msg.clientMessageId))) {
        this.messages.set([...current, msg]);
      }
    }
    this.loadConversations();
  }

  async loadConversations(): Promise<void> {
    try {
      const headers = this.authService.getAuthHeader();
      const list = await firstValueFrom(
        this.http.get<Conversation[]>(this.API_URL, { headers })
      );
      this.conversations.set(list || []);
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    }
  }

  async openDirectConversation(username: string): Promise<Conversation> {
    const headers = this.authService.getAuthHeader();
    const conv = await firstValueFrom(
      this.http.post<Conversation>(`${this.API_URL}/direct/${encodeURIComponent(username)}`, {}, { headers })
    );

    this.activeConversation.set(conv);
    await this.loadMessages(conv.id);
    return conv;
  }

  async loadMessages(conversationId: string): Promise<void> {
    this.isLoadingMessages.set(true);
    try {
      const headers = this.authService.getAuthHeader();
      const response = await firstValueFrom(
        this.http.get<{ content: Message[] }>(
          `${this.API_URL}/${conversationId}/messages?page=0&size=50`,
          { headers }
        )
      );

      // Backend returns DESC by date, reverse so oldest is top
      const sorted = (response.content || []).slice().reverse();
      this.messages.set(sorted);
    } catch (e) {
      console.warn('Failed to load messages:', e);
    } finally {
      this.isLoadingMessages.set(false);
    }
  }

  async sendMessage(content: string): Promise<void> {
    const conv = this.activeConversation();
    if (!conv || !content.trim()) return;

    const currentUser = this.authService.currentUser();
    const clientMessageId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    // Optimistic message
    const optimisticMessage: Message = {
      id: clientMessageId,
      conversationId: conv.id,
      sender: {
        id: currentUser?.id || '',
        username: currentUser?.username || '',
        displayName: currentUser?.displayName || '',
        online: true
      },
      content: content.trim(),
      clientMessageId,
      createdAt: new Date().toISOString()
    };

    this.messages.update((msgs) => [...msgs, optimisticMessage]);

    try {
      const headers = this.authService.getAuthHeader();
      const savedMessage = await firstValueFrom(
        this.http.post<Message>(
          `${this.API_URL}/${conv.id}/messages`,
          { content: content.trim(), clientMessageId },
          { headers }
        )
      );

      // Replace optimistic message with actual persisted message
      this.messages.update((msgs) =>
        msgs.map((m) => (m.clientMessageId === clientMessageId ? savedMessage : m))
      );
    } catch (e) {
      console.error('Failed to send message:', e);
      // Remove optimistic message on failure
      this.messages.update((msgs) => msgs.filter((m) => m.clientMessageId !== clientMessageId));
      throw e;
    }
  }

  closeActiveConversation(): void {
    this.activeConversation.set(null);
    this.messages.set([]);
  }
}
