import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthSessionService,
  safeInternalReturnUrl,
} from '../services/auth-session.service';

const API_BASE_URL = environment.apiUrl.replace(/\/+$/, '');
const PUBLIC_AUTH_PATHS = new Set([
  '/auth/register',
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/accept-invitation',
]);
const CHANGE_PASSWORD_PATH = '/auth/change-password';
const INVALID_CURRENT_PASSWORD_MESSAGE = 'Senha atual inválida';
let sessionRedirectPending = false;

function apiPath(url: string): string | null {
  if (url !== API_BASE_URL && !url.startsWith(`${API_BASE_URL}/`)) {
    return null;
  }

  const pathWithQuery = url.slice(API_BASE_URL.length) || '/';
  return pathWithQuery.split(/[?#]/, 1)[0];
}

function isLoginPage(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return path === '/login';
}

function redirectToLogin(router: Router): void {
  if (sessionRedirectPending || isLoginPage(router.url)) {
    return;
  }

  sessionRedirectPending = true;
  const returnUrl = safeInternalReturnUrl(router.url);
  void router
    .navigate(['/login'], {
      queryParams: {
        reason: 'session-expired',
        ...(returnUrl ? { returnUrl } : {}),
      },
      replaceUrl: true,
    })
    .finally(() => {
      sessionRedirectPending = false;
    });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  const path = apiPath(req.url);
  const isApiRequest = path !== null;
  const isPublicAuthRequest = path !== null && PUBLIC_AUTH_PATHS.has(path);
  let token = session.getToken();

  if (isApiRequest && token && !session.isTokenValid(token)) {
    const endedSession = session.clearToken(token);
    token = null;

    if (endedSession && !isPublicAuthRequest) {
      redirectToLogin(router);
    }
  }

  const request =
    isApiRequest && !isPublicAuthRequest && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      const isProtectedSessionError =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest &&
        !isPublicAuthRequest &&
        !(
          path === CHANGE_PASSWORD_PATH &&
          error.error?.message === INVALID_CURRENT_PASSWORD_MESSAGE
        );

      if (isProtectedSessionError) {
        const endedSession = token
          ? session.clearToken(token)
          : session.getToken() === null;

        if (endedSession) {
          redirectToLogin(router);
        }
      }

      return throwError(() => error);
    }),
  );
};
