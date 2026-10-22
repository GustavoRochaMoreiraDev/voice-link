import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Contact } from '../models/contact.model';
import { UserSummary } from '../models/user.model';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  private readonly API_URL = 'http://localhost:8080/api/contacts';
  private readonly USERS_URL = 'http://localhost:8080/api/users';

  contacts = signal<Contact[]>([]);
  pendingRequests = signal<Contact[]>([]);
  searchResults = signal<UserSummary[]>([]);
  isLoading = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private wsService: WebSocketService
  ) {
    this.wsService.contactEvents$.subscribe(() => {
      this.loadContacts();
      this.loadPendingRequests();
    });
  }

  async loadContacts(): Promise<void> {
    try {
      const headers = this.authService.getAuthHeader();
      const list = await firstValueFrom(
        this.http.get<Contact[]>(this.API_URL, { headers })
      );
      this.contacts.set(list || []);
    } catch (e) {
      console.warn('Failed to load contacts:', e);
    }
  }

  async loadPendingRequests(): Promise<void> {
    try {
      const headers = this.authService.getAuthHeader();
      const list = await firstValueFrom(
        this.http.get<Contact[]>(`${this.API_URL}/requests`, { headers })
      );
      this.pendingRequests.set(list || []);
    } catch (e) {
      console.warn('Failed to load contact requests:', e);
    }
  }

  async sendRequest(username: string): Promise<Contact> {
    const headers = this.authService.getAuthHeader();
    const contact = await firstValueFrom(
      this.http.post<Contact>(`${this.API_URL}/requests`, { username }, { headers })
    );
    await this.loadPendingRequests();
    return contact;
  }

  async acceptRequest(contactId: string): Promise<void> {
    const headers = this.authService.getAuthHeader();
    await firstValueFrom(
      this.http.post<Contact>(`${this.API_URL}/requests/${contactId}/accept`, {}, { headers })
    );
    await this.loadContacts();
    await this.loadPendingRequests();
  }

  async rejectRequest(contactId: string): Promise<void> {
    const headers = this.authService.getAuthHeader();
    await firstValueFrom(
      this.http.post<void>(`${this.API_URL}/requests/${contactId}/reject`, {}, { headers })
    );
    await this.loadPendingRequests();
  }

  async removeContact(contactId: string): Promise<void> {
    const headers = this.authService.getAuthHeader();
    await firstValueFrom(
      this.http.delete<void>(`${this.API_URL}/${contactId}`, { headers })
    );
    await this.loadContacts();
  }

  async searchUsers(query: string): Promise<UserSummary[]> {
    if (!query || query.trim().length < 2) {
      this.searchResults.set([]);
      return [];
    }

    try {
      const headers = this.authService.getAuthHeader();
      const results = await firstValueFrom(
        this.http.get<UserSummary[]>(`${this.USERS_URL}/search?q=${encodeURIComponent(query.trim())}`, { headers })
      );
      this.searchResults.set(results || []);
      return results;
    } catch (e) {
      console.warn('Search failed:', e);
      return [];
    }
  }
}
