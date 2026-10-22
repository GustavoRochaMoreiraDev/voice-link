import { Injectable, effect } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { SignalingMessage } from '../models/signaling.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  private client: Client | null = null;
  private readonly WS_URL = 'ws://localhost:8080/ws';

  private callEventsSubject = new Subject<any>();
  private signalingEventsSubject = new Subject<SignalingMessage>();
  private messageEventsSubject = new Subject<any>();
  private contactEventsSubject = new Subject<any>();
  private presenceEventsSubject = new Subject<any>();
  private connectionStateSubject = new Subject<boolean>();

  callEvents$: Observable<any> = this.callEventsSubject.asObservable();
  signalingEvents$: Observable<SignalingMessage> = this.signalingEventsSubject.asObservable();
  messageEvents$: Observable<any> = this.messageEventsSubject.asObservable();
  contactEvents$: Observable<any> = this.contactEventsSubject.asObservable();
  presenceEvents$: Observable<any> = this.presenceEventsSubject.asObservable();
  isConnected$: Observable<boolean> = this.connectionStateSubject.asObservable();

  private subscriptions: StompSubscription[] = [];

  constructor(private authService: AuthService) {
    // Automatically manage connection based on auth state
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const token = this.authService.token();

      if (isAuth && token) {
        this.connect(token);
      } else {
        this.disconnect();
      }
    });
  }

  connect(token: string): void {
    if (this.client && this.client.active) {
      return;
    }

    this.client = new Client({
      brokerURL: this.WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // debug logging can be enabled when troubleshooting
        // console.debug('[STOMP]', str);
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[STOMP] Connected to WebSocket');
        this.connectionStateSubject.next(true);
        this.setupSubscriptions();
      },
      onDisconnect: () => {
        console.log('[STOMP] Disconnected from WebSocket');
        this.connectionStateSubject.next(false);
        this.clearSubscriptions();
      },
      onStompError: (frame) => {
        console.error('[STOMP] Broker error:', frame.headers['message'], frame.body);
      }
    });

    this.client.activate();
  }

  private setupSubscriptions(): void {
    if (!this.client || !this.client.connected) return;

    this.clearSubscriptions();

    // Call queue
    const subCalls = this.client.subscribe('/user/queue/calls', (message: IMessage) => {
      try {
        const payload = JSON.parse(message.body);
        this.callEventsSubject.next(payload);
      } catch (e) {
        console.error('[STOMP] Error parsing call message:', e);
      }
    });
    this.subscriptions.push(subCalls);

    // Signaling queue
    const subSignaling = this.client.subscribe('/user/queue/signaling', (message: IMessage) => {
      try {
        const payload = JSON.parse(message.body) as SignalingMessage;
        this.signalingEventsSubject.next(payload);
      } catch (e) {
        console.error('[STOMP] Error parsing signaling message:', e);
      }
    });
    this.subscriptions.push(subSignaling);

    // Chat messages queue
    const subMessages = this.client.subscribe('/user/queue/messages', (message: IMessage) => {
      try {
        const payload = JSON.parse(message.body);
        this.messageEventsSubject.next(payload);
      } catch (e) {
        console.error('[STOMP] Error parsing chat message:', e);
      }
    });
    this.subscriptions.push(subMessages);

    // Contacts queue
    const subContacts = this.client.subscribe('/user/queue/contacts', (message: IMessage) => {
      try {
        const payload = JSON.parse(message.body);
        this.contactEventsSubject.next(payload);
      } catch (e) {
        console.error('[STOMP] Error parsing contact message:', e);
      }
    });
    this.subscriptions.push(subContacts);

    // Global Presence topic
    const subPresence = this.client.subscribe('/topic/presence', (message: IMessage) => {
      try {
        const payload = JSON.parse(message.body);
        this.presenceEventsSubject.next(payload);
      } catch (e) {
        console.error('[STOMP] Error parsing presence message:', e);
      }
    });
    this.subscriptions.push(subPresence);
  }

  private clearSubscriptions(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
  }

  send(destination: string, body: any): void {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body)
      });
    } else {
      console.warn('[STOMP] Cannot send message, client not connected:', destination);
    }
  }

  disconnect(): void {
    if (this.client) {
      this.clearSubscriptions();
      this.client.deactivate();
      this.client = null;
      this.connectionStateSubject.next(false);
    }
  }
}
