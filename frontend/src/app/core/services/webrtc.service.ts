import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { SignalingMessage } from '../models/signaling.model';

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {

  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;

  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private meterAnimationId: any = null;

  private queuedCandidates: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet = false;
  private initializingPromise: Promise<RTCPeerConnection> | null = null;

  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  isMuted = signal<boolean>(false);
  connectionState = signal<RTCPeerConnectionState>('new');
  iceConnectionState = signal<RTCIceConnectionState>('new');
  localAudioLevel = signal<number>(0);
  remoteAudioLevel = signal<number>(0);

  // Audio DSP filters (Noise Suppression, Acoustic Echo Cancellation, Gain Control)
  noiseSuppressionEnabled = signal<boolean>(true);
  echoCancellationEnabled = signal<boolean>(true);
  autoGainControlEnabled = signal<boolean>(true);

  private localIceCandidateSubject = new Subject<{
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
  }>();

  localIceCandidate$: Observable<{
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
  }> = this.localIceCandidateSubject.asObservable();

  constructor() {
    this.initAudioElement();
  }

  private initAudioElement(): void {
    if (typeof document !== 'undefined') {
      let el = document.getElementById('voicelink-remote-audio') as HTMLAudioElement;
      if (!el) {
        el = document.createElement('audio');
        el.id = 'voicelink-remote-audio';
        el.autoplay = true;
        el.style.position = 'fixed';
        el.style.top = '-9999px';
        el.style.left = '-9999px';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
      }
      this.remoteAudioElement = el;
    }
  }

  setIceServers(servers: RTCIceServer[]): void {
    this.iceServers = servers;
  }

  async acquireMedia(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: this.echoCancellationEnabled(),
        noiseSuppression: this.noiseSuppressionEnabled(),
        autoGainControl: this.autoGainControlEnabled()
      };

      // Chromium-specific DSP constraint flags
      (audioConstraints as any).googNoiseSuppression = this.noiseSuppressionEnabled();
      (audioConstraints as any).googHighpassFilter = this.noiseSuppressionEnabled();
      (audioConstraints as any).googEchoCancellation = this.echoCancellationEnabled();
      (audioConstraints as any).googAutoGainControl = this.autoGainControlEnabled();

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });

      this.setupLocalAudioMeter(this.localStream);
      return this.localStream;
    } catch (err: any) {
      console.error('[WebRTC] Error acquiring microphone:', err);
      throw new Error(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access in extension settings.'
          : 'Could not access audio device: ' + err.message
      );
    }
  }

  async createPeerConnection(): Promise<RTCPeerConnection> {
    if (this.peerConnection) {
      return this.peerConnection;
    }

    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      console.log('[WebRTC] Initializing new RTCPeerConnection...');
      const pc = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceCandidatePoolSize: 2
      });
      this.peerConnection = pc;
      this.isRemoteDescriptionSet = false;

      // Attach event listeners IMMEDIATELY before any async media operations
      pc.ontrack = (event: RTCTrackEvent) => {
        console.log('[WebRTC] Received remote audio track:', event.track.id, event.streams);
        let remoteStream: MediaStream;
        if (event.streams && event.streams[0]) {
          remoteStream = event.streams[0];
        } else {
          remoteStream = new MediaStream([event.track]);
        }
        this.playRemoteStream(remoteStream);
      };

      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate && event.candidate.candidate) {
          console.log('[WebRTC] Gathered local ICE candidate:', event.candidate.candidate.substring(0, 45));
          this.localIceCandidateSubject.next({
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state changed to:', pc.connectionState);
        this.connectionState.set(pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state changed to:', pc.iceConnectionState);
        this.iceConnectionState.set(pc.iceConnectionState);
      };

      // Add local audio tracks to peer connection
      try {
        const stream = await this.acquireMedia();
        stream.getAudioTracks().forEach((track) => {
          console.log('[WebRTC] Adding local audio track to PeerConnection:', track.id);
          pc.addTrack(track, stream);
        });
      } catch (err) {
        console.error('[WebRTC] Failed to acquire local microphone in createPeerConnection:', err);
      }

      return pc;
    })();

    try {
      return await this.initializingPromise;
    } finally {
      this.initializingPromise = null;
    }
  }

  private playRemoteStream(stream: MediaStream): void {
    console.log('[WebRTC] Playing remote stream with', stream.getAudioTracks().length, 'audio track(s)');

    // 1. Play through HTMLAudioElement
    if (!this.remoteAudioElement || !document.body.contains(this.remoteAudioElement)) {
      this.initAudioElement();
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = stream;
      this.remoteAudioElement.muted = false;
      this.remoteAudioElement.volume = 1.0;
      
      const playPromise = this.remoteAudioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[WebRTC] Remote audio playback active via HTMLAudioElement');
          })
          .catch((err) => {
            console.warn('[WebRTC] HTMLAudioElement play blocked/failed:', err);
            const resumeAudio = () => {
              this.remoteAudioElement?.play().then(() => {
                console.log('[WebRTC] Resumed audio playback on user gesture');
              }).catch((e) => console.error('[WebRTC] Resume failed:', e));
              if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
              }
              window.removeEventListener('click', resumeAudio);
              window.removeEventListener('keydown', resumeAudio);
            };
            window.addEventListener('click', resumeAudio);
            window.addEventListener('keydown', resumeAudio);
          });
      }
    }

    // 2. Web Audio API ONLY for UI Volume Meter Analyser
    // NOTE: We deliberately do NOT connect to audioContext.destination to avoid Chromium AEC muting/phasing.
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);

      // Connect to remote analyser for UI volume meter
      this.remoteAnalyser = this.audioContext.createAnalyser();
      this.remoteAnalyser.fftSize = 64;
      source.connect(this.remoteAnalyser);

      this.startAudioMeterMonitoring();
    } catch (e) {
      console.warn('[WebRTC] Web Audio API analyser setup warning:', e);
    }
  }

  private setupLocalAudioMeter(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      const source = this.audioContext.createMediaStreamSource(stream);
      this.localAnalyser = this.audioContext.createAnalyser();
      this.localAnalyser.fftSize = 64;
      source.connect(this.localAnalyser);
      this.startAudioMeterMonitoring();
    } catch (e) {
      console.warn('[WebRTC] Error setting up local audio meter:', e);
    }
  }

  private startAudioMeterMonitoring(): void {
    if (this.meterAnimationId) return;

    const localBuffer = new Uint8Array(32);
    const remoteBuffer = new Uint8Array(32);

    const update = () => {
      if (this.localAnalyser) {
        this.localAnalyser.getByteFrequencyData(localBuffer);
        let sum = 0;
        for (let i = 0; i < localBuffer.length; i++) sum += localBuffer[i];
        this.localAudioLevel.set(Math.min(100, Math.round((sum / (localBuffer.length * 128)) * 100)));
      }

      if (this.remoteAnalyser) {
        this.remoteAnalyser.getByteFrequencyData(remoteBuffer);
        let sum = 0;
        for (let i = 0; i < remoteBuffer.length; i++) sum += remoteBuffer[i];
        this.remoteAudioLevel.set(Math.min(100, Math.round((sum / (remoteBuffer.length * 128)) * 100)));
      }

      this.meterAnimationId = requestAnimationFrame(update);
    };

    this.meterAnimationId = requestAnimationFrame(update);
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const pc = await this.createPeerConnection();

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });

    await pc.setLocalDescription(offer);
    return offer;
  }

  async handleOfferAndCreateAnswer(offerSdp: string): Promise<RTCSessionDescriptionInit> {
    const pc = await this.createPeerConnection();

    const remoteDesc = new RTCSessionDescription({
      type: 'offer',
      sdp: offerSdp
    });

    await pc.setRemoteDescription(remoteDesc);
    this.isRemoteDescriptionSet = true;
    await this.drainQueuedCandidates();

    const answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answerSdp: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized when receiving answer');
    }

    const remoteDesc = new RTCSessionDescription({
      type: 'answer',
      sdp: answerSdp
    });

    await this.peerConnection.setRemoteDescription(remoteDesc);
    this.isRemoteDescriptionSet = true;
    await this.drainQueuedCandidates();
  }

  async addIceCandidate(candidateData: {
    candidate: string;
    sdpMid?: string;
    sdpMLineIndex?: number;
  }): Promise<void> {
    const candidateInit: RTCIceCandidateInit = {
      candidate: candidateData.candidate,
      sdpMid: candidateData.sdpMid,
      sdpMLineIndex: candidateData.sdpMLineIndex
    };

    if (!this.isRemoteDescriptionSet || !this.peerConnection) {
      // Queue candidate safely until remote description is set
      this.queuedCandidates.push(candidateInit);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(candidateInit);
    } catch (e) {
      console.warn('[WebRTC] Error adding ICE candidate:', e);
    }
  }

  private async drainQueuedCandidates(): Promise<void> {
    if (!this.peerConnection || !this.isRemoteDescriptionSet) return;

    while (this.queuedCandidates.length > 0) {
      const candidateInit = this.queuedCandidates.shift()!;
      try {
        await this.peerConnection.addIceCandidate(candidateInit);
      } catch (e) {
        console.warn('[WebRTC] Error adding queued ICE candidate:', e);
      }
    }
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const tracks = this.localStream.getAudioTracks();
      const current = this.isMuted();
      tracks.forEach((track) => {
        track.enabled = current;
      });
      this.isMuted.set(!current);
      return !current;
    }
    return false;
  }

  async toggleNoiseSuppression(): Promise<boolean> {
    const newState = !this.noiseSuppressionEnabled();
    await this.setNoiseSuppression(newState);
    return newState;
  }

  async setNoiseSuppression(enabled: boolean): Promise<void> {
    this.noiseSuppressionEnabled.set(enabled);
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        try {
          const constraints: MediaTrackConstraints = {
            noiseSuppression: enabled
          };
          (constraints as any).googNoiseSuppression = enabled;
          (constraints as any).googHighpassFilter = enabled;
          await track.applyConstraints(constraints);
          console.log(`[WebRTC] Noise suppression set to ${enabled} on track ${track.id}`);
        } catch (e) {
          console.warn('[WebRTC] Error applying noise suppression constraints:', e);
        }
      }
    }
  }

  async toggleEchoCancellation(): Promise<boolean> {
    const newState = !this.echoCancellationEnabled();
    await this.setEchoCancellation(newState);
    return newState;
  }

  async setEchoCancellation(enabled: boolean): Promise<void> {
    this.echoCancellationEnabled.set(enabled);
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        try {
          const constraints: MediaTrackConstraints = {
            echoCancellation: enabled
          };
          (constraints as any).googEchoCancellation = enabled;
          await track.applyConstraints(constraints);
          console.log(`[WebRTC] Echo cancellation set to ${enabled} on track ${track.id}`);
        } catch (e) {
          console.warn('[WebRTC] Error applying echo cancellation constraints:', e);
        }
      }
    }
  }

  async setAutoGainControl(enabled: boolean): Promise<void> {
    this.autoGainControlEnabled.set(enabled);
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        try {
          const constraints: MediaTrackConstraints = {
            autoGainControl: enabled
          };
          (constraints as any).googAutoGainControl = enabled;
          await track.applyConstraints(constraints);
          console.log(`[WebRTC] Auto gain control set to ${enabled} on track ${track.id}`);
        } catch (e) {
          console.warn('[WebRTC] Error applying auto gain control constraints:', e);
        }
      }
    }
  }

  cleanup(): void {
    if (this.meterAnimationId) {
      cancelAnimationFrame(this.meterAnimationId);
      this.meterAnimationId = null;
    }

    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
    }

    this.isRemoteDescriptionSet = false;
    this.initializingPromise = null;
    this.queuedCandidates = [];
    this.isMuted.set(false);
    this.connectionState.set('new');
    this.iceConnectionState.set('new');
    this.localAudioLevel.set(0);
    this.remoteAudioLevel.set(0);
  }
}
