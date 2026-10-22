import { Injectable, signal } from '@angular/core';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {

  private onlineMap = signal<Map<string, boolean>>(new Map());

  constructor(private wsService: WebSocketService) {
    this.wsService.presenceEvents$.subscribe((event) => {
      if (event && event.userId) {
        this.updatePresence(event.userId, !!event.online);
      }
    });
  }

  updatePresence(userId: string, isOnline: boolean): void {
    const current = new Map(this.onlineMap());
    current.set(userId, isOnline);
    this.onlineMap.set(current);
  }

  isOnline(userId: string): boolean {
    return this.onlineMap().get(userId) ?? false;
  }
}
