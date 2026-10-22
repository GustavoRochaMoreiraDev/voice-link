import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Call } from '../../core/models/call.model';
import { CallService } from '../../core/services/call.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-call-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-container">
      <div class="header">
        <h3>Call History</h3>
        <button class="btn-secondary btn-sm" (click)="loadHistory()">Refresh</button>
      </div>

      <div *ngIf="isLoading()" class="empty-state">
        <p>Loading calls...</p>
      </div>

      <div *ngIf="!isLoading() && calls().length === 0" class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <p>No call history yet</p>
      </div>

      <div class="call-list" *ngIf="!isLoading() && calls().length > 0">
        <div *ngFor="let call of calls()" class="call-item">
          <div class="call-direction-icon" [class.incoming]="isIncoming(call)" [class.missed]="isMissed(call)">
            <svg *ngIf="!isIncoming(call)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="7" y1="17" x2="17" y2="7"/>
              <polyline points="7 7 17 7 17 17"/>
            </svg>
            <svg *ngIf="isIncoming(call)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="17" y1="7" x2="7" y2="17"/>
              <polyline points="17 17 7 17 7 7"/>
            </svg>
          </div>

          <div class="call-details">
            <span class="peer-name">{{ getPeer(call).displayName }}</span>
            <div class="sub-details">
              <span class="status-tag" [class.tag-missed]="isMissed(call)">
                {{ call.status === 'ENDED' ? formatDuration(call.durationSeconds) : call.status }}
              </span>
              <span class="dot">•</span>
              <span class="call-date">{{ formatDate(call.createdAt) }}</span>
            </div>
          </div>

          <button
            class="btn-icon btn-call"
            (click)="callBack(getPeer(call).username)"
            title="Call back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-container {
      padding: 12px 16px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .btn-sm {
      padding: 4px 10px;
      font-size: 11px;
    }
    .empty-state {
      text-align: center;
      padding: 40px 16px;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .call-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .call-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }
    .call-direction-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      color: var(--accent-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .call-direction-icon.incoming {
      background: rgba(16, 185, 129, 0.15);
      color: var(--status-online);
    }
    .call-direction-icon.missed {
      background: rgba(239, 68, 68, 0.15);
      color: var(--status-danger);
    }
    .call-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .peer-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .sub-details {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .status-tag.tag-missed {
      color: var(--status-danger);
      font-weight: 500;
    }
    .btn-call {
      color: var(--status-online);
    }
    .btn-call:hover {
      background: rgba(16, 185, 129, 0.15);
    }
  `]
})
export class CallHistoryComponent implements OnInit {

  calls = signal<Call[]>([]);
  isLoading = signal<boolean>(true);

  constructor(
    private callService: CallService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  async loadHistory(): Promise<void> {
    this.isLoading.set(true);
    try {
      const history = await this.callService.getCallHistory();
      this.calls.set(history);
    } catch (e) {
      console.warn('Failed to load call history:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  isIncoming(call: Call): boolean {
    const currentId = this.authService.currentUser()?.id;
    return call.callee.id === currentId;
  }

  isMissed(call: Call): boolean {
    return call.status === 'MISSED' || call.status === 'REJECTED';
  }

  getPeer(call: Call) {
    const currentId = this.authService.currentUser()?.id;
    return call.caller.id === currentId ? call.callee : call.caller;
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  callBack(username: string): void {
    this.callService.initiateCall(username);
  }
}
