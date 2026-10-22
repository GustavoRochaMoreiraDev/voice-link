import { Component, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactService } from '../../core/services/contact.service';
import { CallService } from '../../core/services/call.service';
import { ChatService } from '../../core/services/chat.service';
import { PresenceService } from '../../core/services/presence.service';
import { Contact } from '../../core/models/contact.model';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="contacts-container">
      <!-- Pending Requests Section -->
      <div *ngIf="pendingIncoming().length > 0" class="pending-section">
        <h4 class="section-title">Pending Requests ({{ pendingIncoming().length }})</h4>
        <div *ngFor="let req of pendingIncoming()" class="pending-item">
          <div class="pending-user">
            <span class="name">{{ req.user.displayName }}</span>
            <span class="handle">&#64;{{ req.user.username }}</span>
          </div>
          <div class="pending-actions">
            <button class="btn-success btn-xs" (click)="accept(req.contactId)">Accept</button>
            <button class="btn-secondary btn-xs" (click)="reject(req.contactId)">Reject</button>
          </div>
        </div>
      </div>

      <!-- Contacts List -->
      <div class="contacts-header">
        <h4 class="section-title">Contacts ({{ contactService.contacts().length }})</h4>
        <button class="btn-secondary btn-xs" (click)="refresh()">Refresh</button>
      </div>

      <div *ngIf="contactService.contacts().length === 0" class="empty-state">
        <p>No contacts yet.</p>
        <p class="sub">Search users above to send contact requests.</p>
      </div>

      <div class="list">
        <div *ngFor="let contact of contactService.contacts()" class="contact-card">
          <div class="avatar-col">
            <div class="avatar">
              {{ contact.user.displayName.substring(0, 2).toUpperCase() }}
              <span
                class="online-dot"
                [class.online]="isOnline(contact)"
                [title]="isOnline(contact) ? 'Online' : 'Offline'"
              ></span>
            </div>
          </div>

          <div class="info-col">
            <span class="display-name">{{ contact.user.displayName }}</span>
            <span class="username">&#64;{{ contact.user.username }}</span>
          </div>

          <div class="actions-col">
            <!-- Voice Call button -->
            <button
              class="btn-icon"
              (click)="call(contact.user.username)"
              [disabled]="!isOnline(contact)"
              [title]="isOnline(contact) ? 'Start Voice Call' : 'User is offline'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>

            <!-- Chat button -->
            <button
              class="btn-icon"
              (click)="chat(contact.user.username)"
              title="Open Chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>

            <!-- Remove contact -->
            <button
              class="btn-icon btn-remove"
              (click)="remove(contact.contactId)"
              title="Remove Contact"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contacts-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }
    .contacts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pending-section {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: var(--radius-sm);
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pending-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-secondary);
      padding: 6px 10px;
      border-radius: var(--radius-xs);
    }
    .pending-user {
      display: flex;
      flex-direction: column;
    }
    .pending-user .name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .pending-user .handle {
      font-size: 11px;
      color: var(--text-muted);
    }
    .pending-actions {
      display: flex;
      gap: 6px;
    }
    .btn-xs {
      padding: 3px 8px;
      font-size: 11px;
    }
    .empty-state {
      text-align: center;
      padding: 30px 10px;
      color: var(--text-muted);
    }
    .empty-state .sub {
      font-size: 11px;
      margin-top: 4px;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .contact-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }
    .contact-card:hover {
      background: var(--bg-tertiary);
    }
    .avatar-col {
      position: relative;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--bg-elevated);
      color: var(--accent-primary);
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .online-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--status-offline);
      border: 2px solid var(--bg-secondary);
    }
    .online-dot.online {
      background: var(--status-online);
      box-shadow: 0 0 6px var(--status-online-glow);
    }
    .info-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .display-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .username {
      font-size: 11px;
      color: var(--text-secondary);
    }
    .actions-col {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .btn-remove {
      color: var(--text-muted);
    }
    .btn-remove:hover {
      color: var(--status-danger);
    }
  `]
})
export class ContactListComponent implements OnInit {

  openChatTab = output<string>();

  constructor(
    public contactService: ContactService,
    private callService: CallService,
    private chatService: ChatService,
    private presenceService: PresenceService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.contactService.loadContacts();
    this.contactService.loadPendingRequests();
  }

  pendingIncoming(): Contact[] {
    return this.contactService.pendingRequests().filter((r) => r.isIncoming);
  }

  isOnline(contact: Contact): boolean {
    return this.presenceService.isOnline(contact.user.id) || contact.user.online;
  }

  call(username: string): void {
    this.callService.initiateCall(username);
  }

  async chat(username: string): Promise<void> {
    await this.chatService.openDirectConversation(username);
    this.openChatTab.emit(username);
  }

  accept(contactId: string): void {
    this.contactService.acceptRequest(contactId);
  }

  reject(contactId: string): void {
    this.contactService.rejectRequest(contactId);
  }

  remove(contactId: string): void {
    if (confirm('Are you sure you want to remove this contact?')) {
      this.contactService.removeContact(contactId);
    }
  }
}
