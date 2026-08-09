import { Injectable } from '@angular/core';
import { AuthTokenClaims } from '../models/auth.model';

const TOKEN_KEY = 'harpia_token';

export function safeInternalReturnUrl(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const candidate = value.trim();
  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.startsWith('/\\') ||
    /[\u0000-\u001f\u007f\\]/.test(candidate)
  ) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(candidate);
    if (
      decoded.startsWith('//') ||
      decoded.startsWith('/\\') ||
      /[\u0000-\u001f\u007f\\]/.test(decoded)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return candidate;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getClaims(token = this.getToken()): AuthTokenClaims | null {
    if (!token) {
      return null;
    }

    const segments = token.split('.');
    if (segments.length !== 3 || segments.some((segment) => !segment)) {
      return null;
    }

    try {
      const payload = this.decodePayload(segments[1]);
      if (!this.isClaims(payload)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  isTokenValid(token: string, now = Date.now()): boolean {
    const claims = this.getClaims(token);
    return !!claims && claims.exp * 1000 > now;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    if (this.isTokenValid(token)) {
      return true;
    }

    this.clearToken(token);
    return false;
  }

  clearToken(expectedToken?: string | null): boolean {
    const currentToken = this.getToken();
    if (
      !currentToken ||
      (expectedToken !== undefined && currentToken !== expectedToken)
    ) {
      return false;
    }

    localStorage.removeItem(TOKEN_KEY);
    return true;
  }

  private decodePayload(segment: string): unknown {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(`${normalized}${padding}`);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  }

  private isClaims(value: unknown): value is AuthTokenClaims {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const claims = value as Partial<AuthTokenClaims>;
    return (
      typeof claims.sub === 'string' &&
      claims.sub.length > 0 &&
      typeof claims.email === 'string' &&
      typeof claims.organizationId === 'string' &&
      claims.organizationId.length > 0 &&
      Number.isInteger(claims.tokenVersion) &&
      typeof claims.role === 'string' &&
      Number.isFinite(claims.exp)
    );
  }
}
