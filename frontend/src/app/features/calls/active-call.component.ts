import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../core/services/call.service';
import { WebRTCService } from '../../core/services/webrtc.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-active-call',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="callService.activeCall() as call" class="active-call-panel">
      <div class="call-top-bar">
        <div class="status-indicator">
          <span class="badge" [class.badge-active]="call.status === 'ACTIVE' || call.status === 'ACCEPTED'"></span>
          <span class="status-label">{{ getStatusText(call.status) }}</span>
          <span class="ice-badge" *ngIf="webrtcService.connectionState() !== 'new'">
            {{ webrtcService.connectionState() }}
          </span>
        </div>
        <div class="timer" *ngIf="call.status === 'ACTIVE' || call.status === 'ACCEPTED'">
          {{ formattedDuration() }}
        </div>
      </div>

      <div class="peer-profile">
        <div class="peer-avatar">
          {{ peerUser()?.displayName?.substring(0, 2)?.toUpperCase() || '?' }}
        </div>
        <h4>{{ peerUser()?.displayName }}</h4>
        <span class="peer-handle">&#64;{{ peerUser()?.username }}</span>
      </div>

      <!-- Real-Time Audio Meters -->
      <div class="audio-meters">
        <div class="meters-header">
          <span class="meters-title">Níveis de Áudio</span>
          <span
            class="nr-pill"
            [class.nr-active]="webrtcService.noiseSuppressionEnabled()"
            (click)="toggleNoiseSuppression()"
            [title]="webrtcService.noiseSuppressionEnabled() ? 'Filtro de ruído ativo (Clique para alternar)' : 'Filtro desativado (Clique para ativar)'"
          >
            {{ webrtcService.noiseSuppressionEnabled() ? '⚡ Redução de Ruído ON' : '⚠️ Ruído RAW' }}
          </span>
        </div>
        <div class="meter-row">
          <span class="meter-label">Seu Mic:</span>
          <div class="meter-track">
            <div class="meter-level local" [style.width.%]="webrtcService.localAudioLevel()"></div>
          </div>
        </div>
        <div class="meter-row">
          <span class="meter-label">Áudio Remoto:</span>
          <div class="meter-track">
            <div class="meter-level remote" [style.width.%]="webrtcService.remoteAudioLevel()"></div>
          </div>
        </div>
      </div>

      <!-- Call controls -->
      <div class="call-controls">
        <!-- Mute / Unmute button -->
        <button
          type="button"
          class="btn-control"
          [class.muted]="webrtcService.isMuted()"
          (click)="toggleMute()"
          [title]="webrtcService.isMuted() ? 'Ativar Microfone' : 'Silenciar Microfone'"
        >
          <!-- Mic icon -->
          <svg *ngIf="!webrtcService.isMuted()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          <!-- Muted icon with slash -->
          <svg *ngIf="webrtcService.isMuted()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="2" x2="22" y1="2" y2="22"/>
            <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
            <path d="M5 10v2a7 7 0 0 0 12 5"/>
            <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
        </button>

        <!-- Noise Suppression Toggle button -->
        <button
          type="button"
          class="btn-control"
          [class.active-feature]="webrtcService.noiseSuppressionEnabled()"
          (click)="toggleNoiseSuppression()"
          [title]="webrtcService.noiseSuppressionEnabled() ? 'Supressão de Ruído: Ativada (Clique para desativar)' : 'Supressão de Ruído: Desativada (Clique para ativar)'"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 10v4"/>
            <path d="M6 7v10"/>
            <path d="M10 4v16"/>
            <path d="M14 8v8"/>
            <path d="M18 6v12"/>
            <path d="M22 10v4"/>
          </svg>
        </button>

        <!-- Popout window button (Manifest V3 persistent call capability) -->
        <button
          type="button"
          class="btn-control"
          (click)="popoutCall()"
          title="Abrir em janela persistente"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" x2="21" y1="14" y2="3"/>
          </svg>
        </button>

        <!-- End Call / Cancel button -->
        <button
          type="button"
          class="btn-control btn-hangup"
          (click)="hangUp(call.id)"
          title="Encerrar Chamada"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
            <line x1="22" x2="2" y1="2" y2="22"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .active-call-panel {
      background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      margin: 10px;
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .call-top-bar {
      display: flex;
      justify-content: space-between;
      width: 100%;
      align-items: center;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--status-ringing);
      display: inline-block;
    }
    .badge-active {
      background: var(--status-online);
      box-shadow: 0 0 8px var(--status-online-glow);
    }
    .status-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      font-weight: 600;
    }
    .ice-badge {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: var(--radius-xs);
      background: rgba(99, 102, 241, 0.2);
      color: var(--accent-primary);
      text-transform: uppercase;
      font-weight: 700;
    }
    .timer {
      font-size: 13px;
      font-family: monospace;
      font-weight: 700;
      color: var(--status-online);
    }
    .peer-profile {
      text-align: center;
    }
    .peer-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--accent-primary);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 17px;
      margin-bottom: 4px;
    }
    .peer-profile h4 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .peer-handle {
      font-size: 11px;
      color: var(--text-secondary);
    }
    .audio-meters {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: rgba(0, 0, 0, 0.2);
      padding: 8px 10px;
      border-radius: var(--radius-sm);
    }
    .meters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .meters-title {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .nr-pill {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      background: var(--bg-tertiary);
      color: var(--text-muted);
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    }
    .nr-pill.nr-active {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .meter-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
    }
    .meter-label {
      width: 70px;
      color: var(--text-muted);
    }
    .meter-track {
      flex: 1;
      height: 6px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .meter-level {
      height: 100%;
      transition: width 0.08s ease;
    }
    .meter-level.local {
      background: var(--accent-primary);
    }
    .meter-level.remote {
      background: var(--status-online);
    }
    .call-controls {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 4px;
    }
    .btn-control {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: var(--bg-elevated);
      color: var(--text-primary);
      padding: 0;
      border: 1px solid var(--border-color);
    }
    .btn-control:hover {
      background: var(--bg-hover);
    }
    .btn-control.active-feature {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border-color: #6366f1;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.35);
    }
    .btn-control.muted {
      background: var(--status-danger);
      color: #fff;
      border-color: var(--status-danger);
    }
    .btn-hangup {
      background: var(--status-danger);
      color: #fff;
      border-color: var(--status-danger);
    }
    .btn-hangup:hover {
      background: var(--status-danger-hover);
    }
  `]
})
export class ActiveCallComponent {

  formattedDuration = computed(() => {
    const totalSecs = this.callService.durationSeconds();
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  peerUser = computed(() => {
    const call = this.callService.activeCall();
    if (!call) return null;
    const currentId = this.authService.currentUser()?.id;
    return call.caller.id === currentId ? call.callee : call.caller;
  });

  constructor(
    public callService: CallService,
    public webrtcService: WebRTCService,
    private authService: AuthService
  ) {}

  getStatusText(status: string): string {
    switch (status) {
      case 'INITIATED':
      case 'RINGING':
        return 'Chamando...';
      case 'CONNECTING':
        return 'Conectando Áudio...';
      case 'ACCEPTED':
      case 'ACTIVE':
        return 'Em Chamada';
      default:
        return status;
    }
  }

  toggleMute(): void {
    this.webrtcService.toggleMute();
  }

  toggleNoiseSuppression(): void {
    this.webrtcService.toggleNoiseSuppression();
  }

  hangUp(callId: string): void {
    this.callService.endCall(callId);
  }

  popoutCall(): void {
    if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.create) {
      chrome.windows.create({
        url: 'index.html',
        type: 'popup',
        width: 420,
        height: 600
      });
    } else {
      window.open('index.html', '_blank', 'width=420,height=600');
    }
  }
}
