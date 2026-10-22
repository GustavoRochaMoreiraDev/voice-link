import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { CallService } from '../../core/services/call.service';
import { UserSummary } from '../../core/models/user.model';

@Component({
  selector: 'app-contact-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-box">
      <div class="input-wrapper">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange($event)"
          placeholder="Search by username (e.g. bob)..."
        />
        <button *ngIf="searchQuery" class="clear-btn" (click)="clearSearch()">✕</button>
      </div>

      <div *ngIf="isSearching()" class="search-loading">
        Searching users...
      </div>

      <div *ngIf="contactService.searchResults().length > 0" class="search-results">
        <div *ngFor="let user of contactService.searchResults()" class="user-row">
          <div class="user-meta">
            <span class="user-name">{{ user.displayName }}</span>
            <div class="user-sub">
              <span class="username">&#64;{{ user.username }}</span>
              <span class="dot">•</span>
              <span class="status-indicator">
                <span [class.badge-online]="user.online" [class.badge-offline]="!user.online"></span>
                <span class="status-text">{{ user.online ? 'Online' : 'Offline' }}</span>
              </span>
            </div>
          </div>

          <div class="user-actions">
            <button
              class="btn-icon"
              (click)="callUser(user.username)"
              [disabled]="!user.online"
              title="Voice Call"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <button
              class="btn-secondary btn-sm"
              (click)="addContact(user.username)"
              title="Send Contact Request"
            >
              + Add
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-box {
      margin-bottom: 12px;
      position: relative;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      color: var(--text-muted);
      pointer-events: none;
    }
    input {
      padding-left: 32px;
      padding-right: 28px;
    }
    .clear-btn {
      position: absolute;
      right: 8px;
      background: transparent;
      color: var(--text-muted);
      padding: 2px 6px;
      font-size: 11px;
    }
    .search-loading {
      font-size: 11px;
      color: var(--text-muted);
      padding: 6px 0;
      text-align: center;
    }
    .search-results {
      margin-top: 8px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      max-height: 200px;
      overflow-y: auto;
      box-shadow: var(--shadow-md);
    }
    .user-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .user-row:last-child {
      border-bottom: none;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .user-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted);
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .status-text {
      font-size: 10px;
    }
    .user-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-sm {
      padding: 4px 8px;
      font-size: 11px;
    }
  `]
})
export class ContactSearchComponent {

  searchQuery = '';
  isSearching = signal<boolean>(false);
  private searchTimeout: any = null;

  constructor(
    public contactService: ContactService,
    private callService: CallService
  ) {}

  onSearchChange(query: string): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!query || query.trim().length < 2) {
      this.contactService.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchTimeout = setTimeout(async () => {
      await this.contactService.searchUsers(query);
      this.isSearching.set(false);
    }, 300);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.contactService.searchResults.set([]);
    this.isSearching.set(false);
  }

  async addContact(username: string): Promise<void> {
    try {
      await this.contactService.sendRequest(username);
      this.clearSearch();
    } catch (e: any) {
      alert(e.error?.message || 'Could not send contact request');
    }
  }

  callUser(username: string): void {
    this.callService.initiateCall(username);
    this.clearSearch();
  }
}
