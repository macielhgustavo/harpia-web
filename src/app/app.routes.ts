import { Routes } from '@angular/router';
import { APP_PERMISSIONS, AppPermission } from './core/config/rbac.config';
import { authGuard } from './core/guards/auth.guard';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { PlaceholderComponent } from './shared/components/placeholder/placeholder.component';

const placeholder = (title: string, permission: AppPermission) => ({
  canActivate: [authGuard, permissionGuard],
  component: PlaceholderComponent,
  data: { title, permission },
});

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [homeRedirectGuard],
    component: PlaceholderComponent,
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'account/security',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/account-security/account-security.component').then(
        (m) => m.AccountSecurityComponent,
      ),
  },
  {
    path: 'access-denied',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/access-denied/access-denied.component').then(
        (m) => m.AccessDeniedComponent,
      ),
  },
  {
    path: 'dashboard',
    ...placeholder('Dashboard', APP_PERMISSIONS.DASHBOARD_READ),
  },
  {
    path: 'people',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.PEOPLE_READ },
    loadComponent: () =>
      import('./pages/people/people.component').then((m) => m.PeopleComponent),
  },
  {
    path: 'people/:id',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.PEOPLE_READ },
    loadComponent: () =>
      import('./pages/people/person-detail.component').then(
        (m) => m.PersonDetailComponent,
      ),
  },
  {
    path: 'interactions',
    ...placeholder('Interações', APP_PERMISSIONS.INTERACTIONS_READ),
  },
  {
    path: 'developments',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.DEVELOPMENTS_READ },
    loadComponent: () =>
      import('./pages/developments/developments.component').then(
        (m) => m.DevelopmentsComponent,
      ),
  },
  {
    path: 'developments/:id',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.DEVELOPMENTS_READ },
    loadComponent: () =>
      import('./pages/developments/development-detail.component').then(
        (m) => m.DevelopmentDetailComponent,
      ),
  },
  {
    path: 'investments',
    ...placeholder('Investimentos', APP_PERMISSIONS.INVESTMENTS_READ),
  },
  {
    path: 'returns',
    ...placeholder('Retornos', APP_PERMISSIONS.RETURNS_READ),
  },
  {
    path: 'companies',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.COMPANIES_READ },
    loadComponent: () =>
      import('./pages/companies/companies.component').then(
        (m) => m.CompaniesComponent,
      ),
  },
  {
    path: 'companies/:id',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.COMPANIES_READ },
    loadComponent: () =>
      import('./pages/companies/company-detail.component').then(
        (m) => m.CompanyDetailComponent,
      ),
  },
  {
    path: 'bank-accounts',
    ...placeholder('Contas Bancárias', APP_PERMISSIONS.BANK_ACCOUNTS_READ),
  },
  {
    path: 'users',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.USERS_MANAGE },
    loadComponent: () =>
      import('./pages/users/users.component').then((m) => m.UsersComponent),
  },
  {
    path: 'users/invitations',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.USERS_MANAGE },
    loadComponent: () =>
      import('./pages/user-invitations/user-invitations.component').then(
        (m) => m.UserInvitationsComponent,
      ),
  },
  {
    path: 'users/:id',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.USERS_MANAGE },
    loadComponent: () =>
      import('./pages/users/user-detail.component').then(
        (m) => m.UserDetailComponent,
      ),
  },
  {
    path: 'audit-logs',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.AUDIT_READ },
    loadComponent: () =>
      import('./pages/audit-logs/audit-logs.component').then(
        (m) => m.AuditLogsComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
