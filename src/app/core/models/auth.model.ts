export interface LoginResponse {
  access_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthMessageResponse {
  message: string;
}

export interface AuthTokenClaims {
  sub: string;
  email: string;
  organizationId: string;
  tokenVersion: number;
  role: string;
  iat?: number;
  exp: number;
}
