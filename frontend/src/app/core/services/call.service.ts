import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { Call, CallStatus } from '../models/call.model';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';
import { WebRTCService } from './webrtc.service';
import { SoundEffectsService } from './sound-effects.service';
import { SignalingMessage } from '../models/signaling.model';

@Injectable({
  providedIn: 'root'
})
export class CallService {

  private readonly API_URL = 'http://localhost:8080/api/calls';

  activeCall = signal<Call | null>(null);
  incomingCall = signal<Call | null>(null);
  durationSeconds = signal<number>(0);
  statusMessage = signal<string>('');

  private durationTimer: any = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private wsService: WebSocketService,
    private webrtcService: WebRTCService,
    private soundEffects: SoundEffectsService
  ) {
    this.initListeners();
  }

  private initListeners(): void {
    // Listen to call events from STOMP
    const subCalls = this.wsService.callEvents$.subscribe((event) => {
      this.handleCallEvent(event);
    });
    this.subscriptions.push(subCalls);

    // Listen to WebRTC signaling events
    const subSignaling = this.wsService.signalingEvents$.subscribe((signalMsg) => {
      this.handleSignalingEvent(signalMsg);
    });
    this.subscriptions.push(subSignaling);

    // Listen to local ICE candidates to forward to peer
    const subIce = this.webrtcService.localIceCandidate$.subscribe((cand) => {
      const call = this.activeCall();
      if (call) {
        this.wsService.send('/app/call/signal', {
          callId: call.id,
          type: 'ICE_CANDIDATE',
          candidate: cand.candidate,
          sdpMid: cand.sdpMid,
          sdpMLineIndex: cand.sdpMLineIndex
        });
      }
    });
    this.subscriptions.push(subIce);
  }

  private handleCallEvent(event: any): void {
    console.log('[CallService] Received call event:', event.type, event.call);
    const call: Call = event.call;

    switch (event.type) {
      case 'CALL_INCOMING':
        this.incomingCall.set(call);
        this.statusMessage.set(`Incoming call from @${call.caller.username}`);
        this.soundEffects.playRingTone();
        break;

      case 'CALL_INITIATED':
        this.activeCall.set(call);
        this.statusMessage.set(`Calling @${call.callee.username}...`);
        break;

      case 'CALL_ACCEPTED':
        this.soundEffects.stopRingTone();
        this.incomingCall.set(null);
        this.activeCall.set(call);
        this.statusMessage.set('Call connected');
        this.startTimer();

        // If I am the caller, I create and send the WebRTC offer
        const currentUserId = this.authService.currentUser()?.id;
        if (call.caller.id === currentUserId) {
          this.initiateWebRTCOffer(call.id);
        } else {
          // As callee, eagerly prepare media and peer connection to receive tracks
          this.webrtcService.createPeerConnection().catch((err) => {
            console.error('[CallService] Callee media preparation error:', err);
          });
        }
        break;

      case 'CALL_REJECTED':
      case 'CALL_CANCELLED':
      case 'CALL_TIMEOUT':
      case 'CALL_ENDED':
        this.handleCallTerminated(event.type, call);
        break;

      case 'CALL_STATE':
        if (this.activeCall() && this.activeCall()!.id === call.id) {
          this.activeCall.set(call);
        }
        break;
    }
  }

  private async initiateWebRTCOffer(callId: string): Promise<void> {
    try {
      console.log('[CallService] Generating WebRTC offer...');
      const offer = await this.webrtcService.createOffer();
      this.wsService.send('/app/call/signal', {
        callId,
        type: 'OFFER',
        sdp: offer.sdp
      });
    } catch (e: any) {
      console.error('[CallService] Failed to create offer:', e);
      this.statusMessage.set('Audio error: ' + e.message);
    }
  }

  private async handleSignalingEvent(message: SignalingMessage): Promise<void> {
    const call = this.activeCall();
    if (!call || call.id !== message.callId) {
      console.warn('[CallService] Ignored signal for inactive call:', message.callId);
      return;
    }

    try {
      if (message.type === 'OFFER' && message.sdp) {
        console.log('[CallService] Received OFFER, creating ANSWER...');
        const answer = await this.webrtcService.handleOfferAndCreateAnswer(message.sdp);
        this.wsService.send('/app/call/signal', {
          callId: call.id,
          type: 'ANSWER',
          sdp: answer.sdp
        });
      } else if (message.type === 'ANSWER' && message.sdp) {
        console.log('[CallService] Received ANSWER, setting remote description...');
        await this.webrtcService.handleAnswer(message.sdp);
      } else if (message.type === 'ICE_CANDIDATE' && message.candidate) {
        await this.webrtcService.addIceCandidate({
          candidate: message.candidate,
          sdpMid: message.sdpMid,
          sdpMLineIndex: message.sdpMLineIndex
        });
      }
    } catch (e: any) {
      console.error('[CallService] Signaling error:', e);
    }
  }

  private handleCallTerminated(eventType: string, call?: Call): void {
    this.soundEffects.stopRingTone();
    this.stopTimer();
    this.webrtcService.cleanup();

    const currentActive = this.activeCall();
    if (currentActive) {
      this.soundEffects.playHangup();
    }

    this.activeCall.set(null);
    this.incomingCall.set(null);

    let reason = 'Call ended';
    if (eventType === 'CALL_REJECTED') reason = 'Call was declined';
    else if (eventType === 'CALL_TIMEOUT') reason = 'Call timed out (no answer)';
    else if (eventType === 'CALL_CANCELLED') reason = 'Call was cancelled';

    this.statusMessage.set(reason);
    setTimeout(() => this.statusMessage.set(''), 4000);
  }

  async initiateCall(targetUsername: string): Promise<Call> {
    const headers = this.authService.getAuthHeader();
    const call = await firstValueFrom(
      this.http.post<Call>(`${this.API_URL}/initiate`, { targetUsername }, { headers })
    );

    this.activeCall.set(call);
    this.statusMessage.set(`Calling @${targetUsername}...`);
    return call;
  }

  async acceptCall(callId: string): Promise<void> {
    this.soundEffects.stopRingTone();
    const headers = this.authService.getAuthHeader();
    const call = await firstValueFrom(
      this.http.post<Call>(`${this.API_URL}/${callId}/accept`, {}, { headers })
    );

    this.incomingCall.set(null);
    this.activeCall.set(call);
    this.startTimer();
  }

  async rejectCall(callId: string): Promise<void> {
    this.soundEffects.stopRingTone();
    const headers = this.authService.getAuthHeader();
    await firstValueFrom(
      this.http.post<Call>(`${this.API_URL}/${callId}/reject`, { reason: 'DECLINED' }, { headers })
    );

    this.incomingCall.set(null);
  }

  async cancelCall(callId: string): Promise<void> {
    const headers = this.authService.getAuthHeader();
    await firstValueFrom(
      this.http.post<Call>(`${this.API_URL}/${callId}/cancel`, {}, { headers })
    );

    this.handleCallTerminated('CALL_CANCELLED');
  }

  async endCall(callId: string): Promise<void> {
    const headers = this.authService.getAuthHeader();
    await firstValueFrom(
      this.http.post<Call>(`${this.API_URL}/${callId}/end`, { reason: 'HANGUP' }, { headers })
    );

    this.handleCallTerminated('CALL_ENDED');
  }

  async getCallHistory(): Promise<Call[]> {
    const headers = this.authService.getAuthHeader();
    const response = await firstValueFrom(
      this.http.get<{ content: Call[] }>(`${this.API_URL}/history?page=0&size=30`, { headers })
    );
    return response.content || [];
  }

  private startTimer(): void {
    this.stopTimer();
    this.durationSeconds.set(0);
    this.durationTimer = setInterval(() => {
      this.durationSeconds.update((d) => d + 1);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    this.durationSeconds.set(0);
  }
}
