import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../core/services/call.service';

@Component({
  selector: 'app-incoming-call-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="callService.incomingCall() as call" class="modal-backdrop">
      <div class="incoming-card">
        <div class="avatar-ring">
          <div class="avatar">
            {{ call.caller.displayName.substring(0, 2).toUpperCase() }}
          </div>
        </div>

        <div class="call-info">
          <h3>{{ call.caller.displayName }}</h3>
          <p class="caller-username">&#64;{{ call.caller.username }}</p>
          <p class="ringing-text">Incoming Voice Call...</p>
        </div>

        <div class="actions">
          <button class="btn-danger btn-circle" (click)="reject(call.id)" title="Decline">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m18 6-12 12M6 6l12 12"/>
            </svg>
          </button>
          <button class="btn-success btn-circle pulse" (click)="accept(call.id)" title="Accept">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .incoming-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
      width: 100%;
      max-width: 320px;
      text-align: center;
      box-shadow: var(--shadow-lg);
    }
    .avatar-ring {
      display: inline-flex;
      padding: 6px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.2);
      margin-bottom: 12px;
      animation: pulse-ring 1.5s infinite;
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--accent-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
    }
    .call-info h3 {
      font-size: 17px;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    .caller-username {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .ringing-text {
      font-size: 12px;
      color: var(--status-ringing);
      margin-top: 6px;
      font-weight: 500;
    }
    .actions {
      display: flex;
      justify-content: center;
      gap: 28px;
      margin-top: 24px;
    }
    .btn-circle {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      padding: 0;
    }
    .pulse {
      animation: pulse-btn 1.5s infinite;
    }
    @keyframes pulse-btn {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  `]
})
export class IncomingCallModalComponent {
  constructor(public callService: CallService) {}

  accept(callId: string): void {
    this.callService.acceptCall(callId);
  }

  reject(callId: string): void {
    this.callService.rejectCall(callId);
  }
}
