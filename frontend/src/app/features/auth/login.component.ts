import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-header">
        <div class="brand-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
        </div>
        <h1>VoiceLink</h1>
        <p class="subtitle">Direct Voice & Chat Browser Extension</p>
      </div>

      <div class="tabs">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'login'"
          (click)="setTab('login')"
        >
          Sign In
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'register'"
          (click)="setTab('register')"
        >
          Register
        </button>
      </div>

      <!-- Error alert -->
      <div *ngIf="errorMessage()" class="alert-error">
        {{ errorMessage() }}
      </div>

      <!-- Login Form -->
      <form *ngIf="activeTab() === 'login'" [formGroup]="loginForm" (ngSubmit)="onLogin()">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            type="text"
            formControlName="username"
            placeholder="e.g. alice"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            placeholder="••••••••"
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="btn-primary w-full" [disabled]="loginForm.invalid || isSubmitting()">
          <span *ngIf="!isSubmitting()">Sign In</span>
          <span *ngIf="isSubmitting()">Signing in...</span>
        </button>
      </form>

      <!-- Register Form -->
      <form *ngIf="activeTab() === 'register'" [formGroup]="registerForm" (ngSubmit)="onRegister()">
        <div class="form-group">
          <label for="reg-username">Username</label>
          <input
            id="reg-username"
            type="text"
            formControlName="username"
            placeholder="e.g. bob (3-30 chars, letters/numbers)"
            autocomplete="username"
          />
          <span class="field-hint" *ngIf="registerForm.get('username')?.errors?.['pattern'] && registerForm.get('username')?.touched">
            Only letters, numbers, and underscores allowed
          </span>
        </div>

        <div class="form-group">
          <label for="reg-display">Display Name</label>
          <input
            id="reg-display"
            type="text"
            formControlName="displayName"
            placeholder="e.g. Bob Smith"
          />
        </div>

        <div class="form-group">
          <label for="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            formControlName="email"
            placeholder="bob@example.com"
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            formControlName="password"
            placeholder="At least 8 characters"
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="btn-primary w-full" [disabled]="registerForm.invalid || isSubmitting()">
          <span *ngIf="!isSubmitting()">Create Account</span>
          <span *ngIf="isSubmitting()">Creating account...</span>
        </button>
      </form>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      flex-direction: column;
      padding: 24px;
      max-width: 360px;
      margin: 0 auto;
      height: 100%;
      justify-content: center;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .brand-logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background-color: var(--accent-primary);
      color: #fff;
      border-radius: var(--radius-md);
      margin-bottom: 10px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .subtitle {
      font-size: 12px;
      color: var(--text-muted);
    }
    .tabs {
      display: flex;
      background-color: var(--bg-secondary);
      border-radius: var(--radius-sm);
      padding: 3px;
      margin-bottom: 18px;
    }
    .tab-btn {
      flex: 1;
      padding: 8px;
      background: transparent;
      color: var(--text-secondary);
      border-radius: var(--radius-xs);
    }
    .tab-btn.active {
      background-color: var(--accent-primary);
      color: #ffffff;
      font-weight: 600;
    }
    .form-group {
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .w-full {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
    }
    .alert-error {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--status-danger);
      color: #fca5a5;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      margin-bottom: 14px;
    }
    .field-hint {
      font-size: 11px;
      color: #fca5a5;
    }
  `]
})
export class LoginComponent {

  activeTab = signal<'login' | 'register'>('login');
  errorMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);

  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]{3,30}$/)]],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  setTab(tab: 'login' | 'register'): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const { username, password } = this.loginForm.value;
      await this.authService.login(username, password);
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Invalid username or password');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const { username, email, password, displayName } = this.registerForm.value;
      await this.authService.register(username, email, password, displayName);
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Registration failed');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
