import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { LoginComponent } from './features/auth/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { IncomingCallModalComponent } from './features/calls/incoming-call-modal.component';
import { AudioDeviceService } from './core/services/audio-device.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LoginComponent,
    DashboardComponent,
    IncomingCallModalComponent
  ],
  template: `
    <!-- Dedicated Permission Flow Tab -->
    <div *ngIf="isPermissionMode()" class="permission-page">
      <div class="permission-card">
        <div class="mic-icon-circle" [class.success]="permissionGrantedSuccess()">
          <svg *ngIf="!permissionGrantedSuccess()" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          <svg *ngIf="permissionGrantedSuccess()" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <h2>Habilitar Microfone no VoiceLink</h2>
        <p class="desc">
          O Google Chrome exige que a permissão de microfone seja confirmada em uma aba normal para extensões.
        </p>

        <div *ngIf="!permissionGrantedSuccess()">
          <button class="btn-primary btn-lg" (click)="requestMicPermission()">
            Clique para Permitir Microfone
          </button>
          <p class="hint">Quando o Chrome perguntar no topo da página, clique em <strong>"Permitir"</strong>.</p>
        </div>

        <div *ngIf="permissionGrantedSuccess()" class="success-msg">
          <p><strong>Permissão concedida com sucesso!</strong></p>
          <p class="sub">Agora suas chamadas de voz funcionarão perfeitamente. Fechando aba...</p>
        </div>
      </div>
    </div>

    <!-- Regular Application View (Popup or Window) -->
    <ng-container *ngIf="!isPermissionMode()">
      <!-- Global Loading Splash -->
      <div *ngIf="authService.isLoading()" class="splash-screen">
        <div class="spinner"></div>
        <p>Initializing VoiceLink...</p>
      </div>

      <!-- Authenticated Dashboard -->
      <app-dashboard *ngIf="!authService.isLoading() && authService.isAuthenticated()"></app-dashboard>

      <!-- Unauthenticated Login/Register -->
      <app-login *ngIf="!authService.isLoading() && !authService.isAuthenticated()"></app-login>

      <!-- Global Incoming Call Alert Modal -->
      <app-incoming-call-modal></app-incoming-call-modal>
    </ng-container>
  `,
  styles: [`
    .permission-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-primary);
      padding: 24px;
    }
    .permission-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 36px 28px;
      max-width: 440px;
      text-align: center;
      box-shadow: var(--shadow-lg);
    }
    .mic-icon-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      color: var(--accent-primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .mic-icon-circle.success {
      background: rgba(16, 185, 129, 0.15);
    }
    h2 {
      font-size: 20px;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    .desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn-lg {
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 600;
      width: 100%;
    }
    .hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 14px;
    }
    .success-msg {
      color: var(--status-online);
      font-size: 14px;
      margin-top: 12px;
    }
    .success-msg .sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .splash-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: var(--bg-primary);
      color: var(--text-muted);
      gap: 14px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AppComponent implements OnInit {

  isPermissionMode = signal<boolean>(false);
  permissionGrantedSuccess = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    private audioDeviceService: AudioDeviceService
  ) {}

  ngOnInit(): void {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'permission' || urlParams.get('promptMic') === 'true') {
      this.isPermissionMode.set(true);
      // Auto-trigger prompt on load
      this.requestMicPermission();
    }
  }

  async requestMicPermission(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((t) => t.stop());
      this.permissionGrantedSuccess.set(true);
      this.audioDeviceService.permissionGranted.set(true);

      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (err) {
      console.warn('Microphone permission request failed or rejected:', err);
    }
  }
}
