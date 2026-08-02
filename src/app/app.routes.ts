import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { PlaceholderComponent } from './shared/components/placeholder/placeholder.component';

const placeholder = (title: string) => ({
  canActivate: [authGuard],
  component: PlaceholderComponent,
  data: { title },
});

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  { path: 'dashboard', ...placeholder('Dashboard') },
  {
    path: 'people',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/people/people.component').then((m) => m.PeopleComponent),
  },
  {
    path: 'people/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/people/person-detail.component').then((m) => m.PersonDetailComponent),
  },
  { path: 'interactions', ...placeholder('Interações') },
  { path: 'developments', ...placeholder('Empreendimentos') },
  { path: 'investments', ...placeholder('Investimentos') },
  { path: 'returns', ...placeholder('Retornos') },
  {
    path: 'companies',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/companies/companies.component').then((m) => m.CompaniesComponent),
  },
  {
    path: 'companies/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/companies/company-detail.component').then(
        (m) => m.CompanyDetailComponent,
      ),
  },
  { path: 'bank-accounts', ...placeholder('Contas Bancárias') },
  { path: '**', redirectTo: 'dashboard' },
];
