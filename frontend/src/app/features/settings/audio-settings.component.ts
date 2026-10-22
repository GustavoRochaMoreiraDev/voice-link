import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioDeviceService } from '../../core/services/audio-device.service';
import { WebRTCService } from '../../core/services/webrtc.service';

@Component({
  selector: 'app-audio-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <h3>Audio & Connection Settings</h3>

      <!-- Permission card -->
      <div class="setting-card">
        <div class="card-header">
          <span class="label">Microphone Access</span>
          <span class="status-badge" [class.granted]="audioDeviceService.permissionGranted()">
            {{ audioDeviceService.permissionGranted() ? 'Granted' : 'Needs Permission' }}
          </span>
        </div>
        <p class="description">
          VoiceLink requires microphone access to transmit your voice during WebRTC calls.
        </p>
        <button
          *ngIf="!audioDeviceService.permissionGranted()"
          class="btn-primary btn-sm"
          (click)="requestPermission()"
        >
          Allow Microphone
        </button>
      </div>

      <!-- Device selection -->
      <div class="setting-card" *ngIf="audioDeviceService.audioInputs().length > 0">
        <label for="device-select" class="label">Input Device (Microphone)</label>
        <select
          id="device-select"
          [(ngModel)]="selectedDevice"
          (change)="onDeviceChange()"
        >
          <option *ngFor="let dev of audioDeviceService.audioInputs()" [value]="dev.deviceId">
            {{ dev.label || 'Default Microphone' }}
          </option>
        </select>
      </div>

      <!-- Microphone test meter -->
      <div class="setting-card">
        <div class="card-header">
          <span class="label">Microphone Test</span>
          <button
            class="btn-secondary btn-xs"
            (click)="toggleMicTest()"
          >
            {{ isTestingMic ? 'Stop Test' : 'Test Mic' }}
          </button>
        </div>
        <div class="meter-bar">
          <div class="meter-fill" [style.width.%]="micVolume"></div>
        </div>
        <span class="meter-hint">{{ isTestingMic ? 'Speak to test level' : 'Click "Test Mic" to check your audio' }}</span>
      </div>

      <!-- DSP Audio Processing -->
      <div class="setting-card">
        <span class="label">Processamento de Voz & Supressão de Ruído</span>
        <p class="description">
          Filtros nativos WebRTC de alta performance para comunicação limpa.
        </p>

        <label class="toggle-row">
          <div class="toggle-text">
            <span class="toggle-name">Supressão de Ruído (Noise Suppression)</span>
            <span class="toggle-desc">Filtra ruídos contínuos de ventoinhas, computadores e ambiente</span>
          </div>
          <input
            type="checkbox"
            [checked]="webrtcService.noiseSuppressionEnabled()"
            (change)="toggleNoiseSuppression($event)"
          />
        </label>

        <label class="toggle-row">
          <div class="toggle-text">
            <span class="toggle-name">Cancelamento de Eco (AEC)</span>
            <span class="toggle-desc">Impede que o som dos fones retorne para o microfone</span>
          </div>
          <input
            type="checkbox"
            [checked]="webrtcService.echoCancellationEnabled()"
            (change)="toggleEchoCancellation($event)"
          />
        </label>

        <label class="toggle-row">
          <div class="toggle-text">
            <span class="toggle-name">Controle de Ganho Automático (AGC)</span>
            <span class="toggle-desc">Normaliza o volume da fala para não estourar</span>
          </div>
          <input
            type="checkbox"
            [checked]="webrtcService.autoGainControlEnabled()"
            (change)="toggleAutoGainControl($event)"
          />
        </label>
      </div>

      <!-- ICE / STUN / TURN Info -->
      <div class="setting-card">
        <span class="label">WebRTC Media Infrastructure</span>
        <div class="info-table">
          <div class="info-row">
            <span class="k">STUN Server:</span>
            <span class="v">stun.l.google.com:19302</span>
          </div>
          <div class="info-row">
            <span class="k">TURN Relay:</span>
            <span class="v">Coturn (configured via docker-compose)</span>
          </div>
          <div class="info-row">
            <span class="k">Audio Codec:</span>
            <span class="v">Opus 48kHz (WebRTC default)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .setting-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .status-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: var(--radius-xs);
      background: rgba(239, 68, 68, 0.15);
      color: var(--status-danger);
    }
    .status-badge.granted {
      background: rgba(16, 185, 129, 0.15);
      color: var(--status-online);
    }
    .description {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      align-self: flex-start;
    }
    .btn-xs {
      padding: 3px 8px;
      font-size: 11px;
    }
    .meter-bar {
      width: 100%;
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-top: 4px;
    }
    .meter-fill {
      height: 100%;
      background: var(--status-online);
      transition: width 0.05s ease;
    }
    .meter-hint {
      font-size: 10px;
      color: var(--text-muted);
    }
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
    }
    .toggle-row:last-child {
      border-bottom: none;
    }
    .toggle-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .toggle-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .toggle-desc {
      font-size: 10px;
      color: var(--text-muted);
    }
    .toggle-row input[type="checkbox"] {
      cursor: pointer;
      width: 16px;
      height: 16px;
      accent-color: var(--accent-primary);
    }
    .info-table {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      margin-top: 2px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
    }
    .info-row .k {
      color: var(--text-secondary);
    }
    .info-row .v {
      color: var(--accent-primary);
      font-family: monospace;
    }
  `]
})
export class AudioSettingsComponent implements OnDestroy {

  selectedDevice = '';
  isTestingMic = false;
  micVolume = 0;

  private testStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private animFrameId: any = null;

  constructor(
    public audioDeviceService: AudioDeviceService,
    public webrtcService: WebRTCService
  ) {
    this.selectedDevice = this.audioDeviceService.selectedInputId();
  }

  toggleNoiseSuppression(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.webrtcService.setNoiseSuppression(checked);
  }

  toggleEchoCancellation(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.webrtcService.setEchoCancellation(checked);
  }

  toggleAutoGainControl(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.webrtcService.setAutoGainControl(checked);
  }

  ngOnDestroy(): void {
    this.stopMicTest();
  }

  async requestPermission(): Promise<void> {
    await this.audioDeviceService.requestMicrophonePermission();
  }

  onDeviceChange(): void {
    this.audioDeviceService.selectedInputId.set(this.selectedDevice);
  }

  async toggleMicTest(): Promise<void> {
    if (this.isTestingMic) {
      this.stopMicTest();
    } else {
      await this.startMicTest();
    }
  }

  private async startMicTest(): Promise<void> {
    try {
      this.testStream = await navigator.mediaDevices.getUserMedia({
        audio: this.selectedDevice ? { deviceId: { exact: this.selectedDevice } } : true
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.testStream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      this.isTestingMic = true;

      const updateVolume = () => {
        if (!this.isTestingMic) return;
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        this.micVolume = Math.min(100, Math.round((avg / 128) * 100));
        this.animFrameId = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e) {
      console.warn('Failed to start mic test:', e);
      this.stopMicTest();
    }
  }

  private stopMicTest(): void {
    this.isTestingMic = false;
    this.micVolume = 0;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.testStream) {
      this.testStream.getTracks().forEach((t) => t.stop());
      this.testStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
