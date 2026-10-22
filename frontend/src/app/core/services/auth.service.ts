import { environment } from '../../../environments/environment';
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User, AuthResponse } from '../models/user.model';
import { ExtensionStorageService } from './extension-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL = environment.apiUrl + '/auth';
  private readonly TOKEN_KEY = 'voicelink_token';
  private readonly USER_KEY = 'voicelink_user';

  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);
  isAuthenticated = signal<boolean>(false);
  isLoading = signal<boolean>(true);

  constructor(
    private http: HttpClient,
    private storage: ExtensionStorageService
  ) {
    this.initAuth();
  }

  async initAuth(): Promise<void> {
    this.isLoading.set(true);
    try {
      const storedToken = await this.storage.getItem(this.TOKEN_KEY);
      const storedUser = await this.storage.getItem(this.USER_KEY);

      if (storedToken && storedUser) {
        this.token.set(storedToken);
        this.currentUser.set(JSON.parse(storedUser));
        this.isAuthenticated.set(true);

        // Verify token with backend
        this.verifyCurrentSession();
      }
    } catch (e) {
      console.warn('Failed to restore auth session:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async verifyCurrentSession(): Promise<void> {
    try {
      const headers = { Authorization: `Bearer ${this.token()}` };
      const user = await firstValueFrom(this.http.get<User>(`${this.API_URL}/me`, { headers }));
      this.currentUser.set(user);
      await this.storage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Session verification failed, logging out:', e);
      this.logout();
    }
  }

  async login(username: string, password: string): Promise<User> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.API_URL}/login`, { username, password })
    );

    await this.handleAuthSuccess(response);
    return response.user;
  }

  async register(username: string, email: string, password: string, displayName: string): Promise<User> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.API_URL}/register`, {
        username,
        email,
        password,
        displayName
      })
    );

    await this.handleAuthSuccess(response);
    return response.user;
  }

  private async handleAuthSuccess(response: AuthResponse): Promise<void> {
    this.token.set(response.token);
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);

    await this.storage.setItem(this.TOKEN_KEY, response.token);
    await this.storage.setItem(this.USER_KEY, JSON.stringify(response.user));
  }

  async logout(): Promise<void> {
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    await this.storage.removeItem(this.TOKEN_KEY);
    await this.storage.removeItem(this.USER_KEY);
  }

  getAuthHeader(): { Authorization: string } {
    return { Authorization: `Bearer ${this.token() || ''}` };
  }
}
