import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import {
  AuthMessageResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
} from '../models/auth.model';
import { ApiService } from './api.service';
import {
  AuthSessionService,
  safeInternalReturnUrl,
} from './auth-session.service';

export type AuthRedirectReason =
  'password-changed' | 'password-reset' | 'session-expired';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('/auth/login', credentials)
      .pipe(tap((res) => this.session.setToken(res.access_token)));
  }

  forgotPassword(
    request: ForgotPasswordRequest,
  ): Observable<AuthMessageResponse> {
    return this.api.post<AuthMessageResponse>('/auth/forgot-password', request);
  }

  resetPassword(
    request: ResetPasswordRequest,
  ): Observable<AuthMessageResponse> {
    const tokenAtStart = this.session.getToken();

    return this.api
      .post<AuthMessageResponse>('/auth/reset-password', request)
      .pipe(
        tap(() => {
          this.session.clearToken(tokenAtStart);
          this.navigateToLogin('password-reset');
        }),
      );
  }

  changePassword(
    request: ChangePasswordRequest,
  ): Observable<AuthMessageResponse> {
    const tokenAtStart = this.session.getToken();

    return this.api
      .post<AuthMessageResponse>('/auth/change-password', request)
      .pipe(
        tap(() => {
          this.session.clearToken(tokenAtStart);
          this.navigateToLogin('password-changed');
        }),
      );
  }

  logout(reason?: AuthRedirectReason, returnUrl?: string): void {
    this.session.clearToken();
    this.navigateToLogin(reason, returnUrl);
  }

  private navigateToLogin(
    reason?: AuthRedirectReason,
    returnUrl?: string,
  ): void {
    const safeReturnUrl = safeInternalReturnUrl(returnUrl);
    const queryParams = {
      ...(reason ? { reason } : {}),
      ...(safeReturnUrl ? { returnUrl: safeReturnUrl } : {}),
    };

    void this.router.navigate(['/login'], {
      queryParams,
      replaceUrl: reason !== undefined,
    });
  }

  isAuthenticated(): boolean {
    return this.session.isAuthenticated();
  }

  getToken(): string | null {
    return this.session.getToken();
  }
}
