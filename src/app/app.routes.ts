import { Routes } from '@angular/router';
import { APP_PERMISSIONS } from './core/config/rbac.config';
import { authGuard } from './core/guards/auth.guard';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [homeRedirectGuard],
    children: [],
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
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.DASHBOARD_READ },
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
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
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.INTERACTIONS_READ },
    loadComponent: () =>
      import('./pages/interactions/interactions.component').then(
        (m) => m.InteractionsComponent,
      ),
  },
  {
    path: 'crm',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.CRM_READ },
    loadComponent: () =>
      import('./pages/crm/crm.component').then((m) => m.CrmComponent),
  },
  {
    path: 'crm/opportunities/:id',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.CRM_READ },
    loadComponent: () =>
      import('./pages/crm/opportunity-detail.component').then(
        (m) => m.OpportunityDetailComponent,
      ),
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
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.INVESTMENTS_READ },
    loadComponent: () =>
      import('./pages/investments/investments.component').then(
        (m) => m.InvestmentsComponent,
      ),
  },
  {
    path: 'investments/:id',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.INVESTMENTS_READ },
    loadComponent: () =>
      import('./pages/investments/investment-detail.component').then(
        (m) => m.InvestmentDetailComponent,
      ),
  },
  {
    path: 'returns',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.RETURNS_READ },
    loadComponent: () =>
      import('./pages/returns/returns.component').then(
        (m) => m.ReturnsComponent,
      ),
  },
  {
    path: 'sales',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.SALES_READ },
    loadComponent: () =>
      import('./pages/sales/sales.component').then((m) => m.SalesComponent),
  },
  {
    path: 'sales/:id',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.SALES_READ },
    loadComponent: () =>
      import('./pages/sales/sale-detail.component').then(
        (m) => m.SaleDetailComponent,
      ),
  },
  {
    path: 'finance',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.FINANCE_READ },
    loadComponent: () =>
      import('./pages/finance/finance-dashboard.component').then(
        (m) => m.FinanceDashboardComponent,
      ),
  },
  {
    path: 'finance/receivables',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.FINANCE_READ },
    loadComponent: () =>
      import('./pages/receivables/receivables.component').then(
        (m) => m.ReceivablesComponent,
      ),
  },
  {
    path: 'finance/payables',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.FINANCE_READ },
    loadComponent: () =>
      import('./pages/finance/payables.component').then(
        (m) => m.PayablesComponent,
      ),
  },
  {
    path: 'finance/cash-flow',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.FINANCE_READ },
    loadComponent: () =>
      import('./pages/finance/cash-flow.component').then(
        (m) => m.CashFlowComponent,
      ),
  },
  {
    path: 'finance/reconciliation',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.FINANCE_READ },
    loadComponent: () =>
      import('./pages/finance/bank-reconciliation.component').then(
        (m) => m.BankReconciliationComponent,
      ),
  },
  {
    path: 'finance/income-statement',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.FINANCE_READ },
    loadComponent: () =>
      import('./pages/finance/income-statement.component').then(
        (m) => m.IncomeStatementComponent,
      ),
  },
  {
    path: 'finance/collections',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.FINANCE_READ },
    loadComponent: () =>
      import('./pages/finance/collections.component').then(
        (m) => m.CollectionsComponent,
      ),
  },
  {
    path: 'finance/monetary-adjustment',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.FINANCE_READ },
    loadComponent: () =>
      import('./pages/finance/monetary-adjustment/monetary-adjustment.component').then(
        (m) => m.MonetaryAdjustmentComponent,
      ),
  },
  { path: 'receivables', redirectTo: 'finance/receivables', pathMatch: 'full' },
  {
    path: 'reports',
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.REPORTS_EXPORT },
    loadComponent: () =>
      import('./pages/reports/reports.component').then(
        (m) => m.ReportsComponent,
      ),
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
    canActivate: [authGuard, permissionGuard],
    data: { permission: APP_PERMISSIONS.BANK_ACCOUNTS_READ },
    loadComponent: () =>
      import('./pages/bank-accounts/bank-accounts.component').then(
        (m) => m.BankAccountsComponent,
      ),
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
