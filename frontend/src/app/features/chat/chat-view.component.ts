import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { CallService } from '../../core/services/call.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-wrapper">
      <!-- Conversation Header -->
      <div class="chat-header" *ngIf="chatService.activeConversation() as conv">
        <button class="btn-icon back-btn" (click)="chatService.closeActiveConversation()" title="Back to conversations">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div class="recipient-info">
          <h4>{{ conv.participant.displayName }}</h4>
          <span class="handle">&#64;{{ conv.participant.username }}</span>
        </div>

        <button
          class="btn-icon"
          (click)="callUser(conv.participant.username)"
          title="Voice Call"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
      </div>

      <!-- Conversations list when no conversation is active -->
      <div *ngIf="!chatService.activeConversation()" class="conversations-list">
        <h4 class="section-title">Recent Conversations</h4>

        <div *ngIf="chatService.conversations().length === 0" class="empty-state">
          <p>No conversations yet.</p>
          <p class="sub">Click "Chat" on any contact to start messaging.</p>
        </div>

        <div
          *ngFor="let c of chatService.conversations()"
          class="conv-card"
          (click)="openConversation(c.id, c.participant.username)"
        >
          <div class="conv-avatar">
            {{ c.participant.displayName.substring(0, 2).toUpperCase() }}
          </div>
          <div class="conv-meta">
            <div class="conv-row">
              <span class="conv-name">{{ c.participant.displayName }}</span>
              <span class="conv-time">{{ formatTime(c.updatedAt) }}</span>
            </div>
            <p class="conv-snippet">{{ c.lastMessage?.content || 'No messages yet' }}</p>
          </div>
        </div>
      </div>

      <!-- Messages Area when conversation is active -->
      <div #scrollContainer *ngIf="chatService.activeConversation()" class="messages-container">
        <div *ngIf="chatService.isLoadingMessages()" class="empty-state">
          <p>Loading messages...</p>
        </div>

        <div *ngIf="!chatService.isLoadingMessages() && chatService.messages().length === 0" class="empty-state">
          <p>Say hello! This is the beginning of your conversation.</p>
        </div>

        <div
          *ngFor="let msg of chatService.messages()"
          class="message-row"
          [class.sent]="isMine(msg)"
          [class.received]="!isMine(msg)"
        >
          <div class="bubble">
            <p class="content">{{ msg.content }}</p>
            <span class="timestamp">{{ formatTime(msg.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Chat input -->
      <div *ngIf="chatService.activeConversation()" class="chat-input-bar">
        <input
          type="text"
          [(ngModel)]="messageText"
          (keydown.enter)="onEnter($event)"
          placeholder="Type a message..."
          maxlength="2000"
        />
        <button
          class="btn-primary btn-send"
          (click)="send()"
          [disabled]="!messageText.trim()"
          title="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 420px;
    }
    .chat-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }
    .back-btn {
      width: 28px;
      height: 28px;
    }
    .recipient-info {
      flex: 1;
    }
    .recipient-info h4 {
      font-size: 14px;
      color: var(--text-primary);
    }
    .recipient-info .handle {
      font-size: 11px;
      color: var(--text-muted);
    }
    .conversations-list {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .conv-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .conv-card:hover {
      background: var(--bg-tertiary);
    }
    .conv-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--accent-primary-light);
      color: var(--accent-primary);
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .conv-meta {
      flex: 1;
      min-width: 0;
    }
    .conv-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .conv-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .conv-time {
      font-size: 10px;
      color: var(--text-muted);
    }
    .conv-snippet {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--bg-primary);
    }
    .empty-state {
      text-align: center;
      padding: 30px 10px;
      color: var(--text-muted);
      font-size: 12px;
    }
    .empty-state .sub {
      font-size: 11px;
      margin-top: 4px;
    }
    .message-row {
      display: flex;
      width: 100%;
    }
    .message-row.sent {
      justify-content: flex-end;
    }
    .message-row.received {
      justify-content: flex-start;
    }
    .bubble {
      max-width: 78%;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      position: relative;
      word-break: break-word;
    }
    .sent .bubble {
      background-color: var(--accent-primary);
      color: #ffffff;
      border-bottom-right-radius: 2px;
    }
    .received .bubble {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      border-bottom-left-radius: 2px;
    }
    .content {
      font-size: 13px;
      line-height: 1.4;
    }
    .timestamp {
      display: block;
      font-size: 9px;
      opacity: 0.7;
      text-align: right;
      margin-top: 3px;
    }
    .chat-input-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
    }
    .btn-send {
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: var(--radius-sm);
    }
  `]
})
export class ChatViewComponent implements OnInit, AfterViewChecked {

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  messageText = '';
  private shouldScroll = false;

  constructor(
    public chatService: ChatService,
    private callService: CallService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chatService.loadConversations();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  isMine(message: any): boolean {
    const currentId = this.authService.currentUser()?.id;
    return message.sender.id === currentId;
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  callUser(username: string): void {
    this.callService.initiateCall(username);
  }

  async openConversation(convId: string, username: string): Promise<void> {
    await this.chatService.openDirectConversation(username);
    this.shouldScroll = true;
  }

  onEnter(event: Event): void {
    event.preventDefault();
    this.send();
  }

  async send(): Promise<void> {
    if (!this.messageText.trim()) return;
    const text = this.messageText;
    this.messageText = '';
    this.shouldScroll = true;
    try {
      await this.chatService.sendMessage(text);
    } catch (e) {
      this.messageText = text; // restore on error
    }
  }
}
