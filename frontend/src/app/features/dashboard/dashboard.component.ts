import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CallService } from '../../core/services/call.service';
import { AudioDeviceService } from '../../core/services/audio-device.service';
import { ContactSearchComponent } from '../contacts/contact-search.component';
import { ContactListComponent } from '../contacts/contact-list.component';
import { ChatViewComponent } from '../chat/chat-view.component';
import { CallHistoryComponent } from '../calls/call-history.component';
import { AudioSettingsComponent } from '../settings/audio-settings.component';
import { ActiveCallComponent } from '../calls/active-call.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ContactSearchComponent,
    ContactListComponent,
    ChatViewComponent,
    CallHistoryComponent,
    AudioSettingsComponent,
    ActiveCallComponent
  ],
  template: `
    <div class="dashboard-layout">
      <!-- Top Bar Profile -->
      <header class="app-header">
        <div class="profile-meta">
          <div class="user-avatar">
            {{ (authService.currentUser()?.displayName || 'VL').substring(0, 2).toUpperCase() }}
            <span class="online-indicator"></span>
          </div>
          <div class="user-text">
            <span class="user-name">{{ authService.currentUser()?.displayName }}</span>
            <span class="user-handle">&#64;{{ authService.currentUser()?.username }}</span>
          </div>
        </div>

        <div class="header-actions">
          <!-- Popout window button (Manifest V3 support) -->
          <button class="btn-icon" (click)="openDedicatedWindow()" title="Open in Dedicated Window">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" x2="21" y1="14" y2="3"/>
            </svg>
          </button>

          <!-- Settings Tab Shortcut -->
          <button
            class="btn-icon"
            [class.active-btn]="currentTab() === 'settings'"
            (click)="setTab('settings')"
            title="Audio Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          <!-- Logout Button -->
          <button class="btn-icon" (click)="logout()" title="Sign Out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Microphone Permission Warning Banner -->
      <div
        *ngIf="!audioDeviceService.permissionGranted()"
        class="perm-banner"
        (click)="audioDeviceService.openPermissionTab()"
        title="Clique para autorizar o microfone no Chrome"
      >
        <span>⚠️ Microfone não autorizado. <strong>Clique aqui para permitir</strong></span>
      </div>

      <!-- Persistent Active Call Panel (if call is underway) -->
      <app-active-call></app-active-call>

      <!-- Status banner -->
      <div *ngIf="callService.statusMessage()" class="status-banner">
        {{ callService.statusMessage() }}
      </div>

      <!-- Navigation Tabs -->
      <nav class="nav-tabs">
        <button
          type="button"
          class="nav-tab"
          [class.active]="currentTab() === 'contacts'"
          (click)="setTab('contacts')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Contacts
        </button>

        <button
          type="button"
          class="nav-tab"
          [class.active]="currentTab() === 'chat'"
          (click)="setTab('chat')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>

        <button
          type="button"
          class="nav-tab"
          [class.active]="currentTab() === 'history'"
          (click)="setTab('history')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Calls
        </button>
      </nav>

      <!-- Tab Content Area -->
      <main class="main-content">
        <!-- Contacts Tab -->
        <div *ngIf="currentTab() === 'contacts'" class="tab-pane">
          <app-contact-search></app-contact-search>
          <app-contact-list (openChatTab)="onOpenChat($event)"></app-contact-list>
        </div>

        <!-- Chat Tab -->
        <div *ngIf="currentTab() === 'chat'" class="tab-pane-full">
          <app-chat-view></app-chat-view>
        </div>

        <!-- Call History Tab -->
        <div *ngIf="currentTab() === 'history'" class="tab-pane">
          <app-call-history></app-call-history>
        </div>

        <!-- Settings Tab -->
        <div *ngIf="currentTab() === 'settings'" class="tab-pane">
          <app-audio-settings></app-audio-settings>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--bg-primary);
    }
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }
    .profile-meta {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--accent-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      position: relative;
    }
    .online-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--status-online);
      border: 2px solid var(--bg-secondary);
      box-shadow: 0 0 6px var(--status-online-glow);
    }
    .user-text {
      display: flex;
      flex-direction: column;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .user-handle {
      font-size: 11px;
      color: var(--text-secondary);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .active-btn {
      background: var(--accent-primary-light);
      color: var(--accent-primary);
    }
    .status-banner {
      background: rgba(99, 102, 241, 0.12);
      border-bottom: 1px solid var(--accent-primary);
      padding: 6px 14px;
      font-size: 12px;
      text-align: center;
      color: #c7d2fe;
    }
    .nav-tabs {
      display: flex;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }
    .nav-tab {
      flex: 1;
      padding: 10px 6px;
      background: transparent;
      color: var(--text-secondary);
      border-radius: 0;
      border-bottom: 2px solid transparent;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .nav-tab.active {
      color: var(--accent-primary);
      border-bottom-color: var(--accent-primary);
      font-weight: 600;
    }
    .main-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .tab-pane {
      padding: 12px 14px;
      flex: 1;
    }
    .tab-pane-full {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .perm-banner {
      background: rgba(245, 158, 11, 0.2);
      border-bottom: 1px solid var(--status-ringing);
      color: #fde68a;
      padding: 7px 12px;
      font-size: 11px;
      text-align: center;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background var(--transition-fast);
    }
    .perm-banner:hover {
      background: rgba(245, 158, 11, 0.3);
    }
  `]
})
export class DashboardComponent {

  currentTab = signal<'contacts' | 'chat' | 'history' | 'settings'>('contacts');

  constructor(
    public authService: AuthService,
    public callService: CallService,
    public audioDeviceService: AudioDeviceService
  ) {}

  setTab(tab: 'contacts' | 'chat' | 'history' | 'settings'): void {
    this.currentTab.set(tab);
  }

  onOpenChat(username: string): void {
    this.currentTab.set('chat');
  }

  openDedicatedWindow(): void {
    if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.create) {
      chrome.windows.create({
        url: 'index.html',
        type: 'popup',
        width: 440,
        height: 650
      });
    } else {
      window.open('index.html', '_blank', 'width=440,height=650');
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
