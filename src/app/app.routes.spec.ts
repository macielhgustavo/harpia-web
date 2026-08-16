import { authGuard } from './core/guards/auth.guard';
import { APP_PERMISSIONS } from './core/config/rbac.config';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { routes } from './app.routes';

describe('Rota inicial', () => {
  it('redireciona por perfil sem renderizar componente provisório', () => {
    const route = routes.find((item) => item.path === '');

    expect(route?.canActivate).toContain(homeRedirectGuard);
    expect(route?.component).toBeUndefined();
    expect(route?.loadComponent).toBeUndefined();
  });
});

describe('Rotas de empreendimentos', () => {
  it('protege e carrega de forma lazy a lista e o detalhe', () => {
    const listRoute = routes.find((route) => route.path === 'developments');
    const detailRoute = routes.find(
      (route) => route.path === 'developments/:id',
    );

    expect(listRoute?.canActivate).toContain(authGuard);
    expect(detailRoute?.canActivate).toContain(authGuard);
    expect(listRoute?.loadComponent).toBeDefined();
    expect(detailRoute?.loadComponent).toBeDefined();
  });
});

describe('Rotas de investimentos', () => {
  it('protege e carrega de forma lazy a lista e o detalhe', () => {
    const listRoute = routes.find((route) => route.path === 'investments');
    const detailRoute = routes.find(
      (route) => route.path === 'investments/:id',
    );

    for (const route of [listRoute, detailRoute]) {
      expect(route?.canActivate).toContain(authGuard);
      expect(route?.canActivate).toContain(permissionGuard);
      expect(route?.data?.['permission']).toBe(
        APP_PERMISSIONS.INVESTMENTS_READ,
      );
      expect(route?.loadComponent).toBeDefined();
    }
  });
});

describe('Rota de retornos', () => {
  it('substitui o placeholder por página lazy protegida', () => {
    const route = routes.find((item) => item.path === 'returns');
    expect(route?.canActivate).toContain(authGuard);
    expect(route?.canActivate).toContain(permissionGuard);
    expect(route?.data?.['permission']).toBe(APP_PERMISSIONS.RETURNS_READ);
    expect(route?.loadComponent).toBeDefined();
    expect(route?.component).toBeUndefined();
  });
});

describe('Rota de interações', () => {
  it('substitui o placeholder por página lazy protegida', () => {
    const route = routes.find((item) => item.path === 'interactions');
    expect(route?.canActivate).toContain(authGuard);
    expect(route?.canActivate).toContain(permissionGuard);
    expect(route?.data?.['permission']).toBe(APP_PERMISSIONS.INTERACTIONS_READ);
    expect(route?.loadComponent).toBeDefined();
    expect(route?.component).toBeUndefined();
  });
});

describe('Rota de contas bancárias', () => {
  it('substitui o placeholder por página lazy protegida', () => {
    const route = routes.find((item) => item.path === 'bank-accounts');
    expect(route?.canActivate).toContain(authGuard);
    expect(route?.canActivate).toContain(permissionGuard);
    expect(route?.data?.['permission']).toBe(
      APP_PERMISSIONS.BANK_ACCOUNTS_READ,
    );
    expect(route?.loadComponent).toBeDefined();
    expect(route?.component).toBeUndefined();
  });
});

describe('Rota do dashboard', () => {
  it('substitui o placeholder por página lazy e protegida por permissão', () => {
    const route = routes.find((item) => item.path === 'dashboard');
    expect(route?.canActivate).toContain(authGuard);
    expect(route?.canActivate).toContain(permissionGuard);
    expect(route?.data?.['permission']).toBe(APP_PERMISSIONS.DASHBOARD_READ);
    expect(route?.loadComponent).toBeDefined();
    expect(route?.component).toBeUndefined();
  });
});

describe('Rota de relatórios', () => {
  it('é lazy e exige a permissão de exportação', () => {
    const route = routes.find((item) => item.path === 'reports');
    expect(route?.canActivate).toContain(authGuard);
    expect(route?.canActivate).toContain(permissionGuard);
    expect(route?.data?.['permission']).toBe(APP_PERMISSIONS.REPORTS_EXPORT);
    expect(route?.loadComponent).toBeDefined();
    expect(route?.component).toBeUndefined();
  });
});

describe('Rotas administrativas', () => {
  it('protege usuários, convites e auditoria com as permissões correspondentes', () => {
    const usersRoute = routes.find((route) => route.path === 'users');
    const invitationsRoute = routes.find(
      (route) => route.path === 'users/invitations',
    );
    const auditRoute = routes.find((route) => route.path === 'audit-logs');

    for (const route of [usersRoute, invitationsRoute, auditRoute]) {
      expect(route?.canActivate).toContain(authGuard);
      expect(route?.canActivate).toContain(permissionGuard);
      expect(route?.loadComponent).toBeDefined();
    }
    expect(usersRoute?.data?.['permission']).toBe(APP_PERMISSIONS.USERS_MANAGE);
    expect(invitationsRoute?.data?.['permission']).toBe(
      APP_PERMISSIONS.USERS_MANAGE,
    );
    expect(auditRoute?.data?.['permission']).toBe(APP_PERMISSIONS.AUDIT_READ);
  });

  it('declara a rota estática de convites antes do detalhe dinâmico', () => {
    const invitationsIndex = routes.findIndex(
      (route) => route.path === 'users/invitations',
    );
    const detailIndex = routes.findIndex((route) => route.path === 'users/:id');

    expect(invitationsIndex).toBeGreaterThan(-1);
    expect(invitationsIndex).toBeLessThan(detailIndex);
  });
});

describe('Rotas de autenticação', () => {
  it('carrega recuperação e redefinição sem exigir sessão', () => {
    const forgotRoute = routes.find(
      (route) => route.path === 'forgot-password',
    );
    const resetRoute = routes.find((route) => route.path === 'reset-password');

    expect(forgotRoute?.loadComponent).toBeDefined();
    expect(resetRoute?.loadComponent).toBeDefined();
    expect(forgotRoute?.canActivate).toBeUndefined();
    expect(resetRoute?.canActivate).toBeUndefined();
  });

  it('protege e carrega de forma lazy a segurança da conta', () => {
    const securityRoute = routes.find(
      (route) => route.path === 'account/security',
    );

    expect(securityRoute?.canActivate).toContain(authGuard);
    expect(securityRoute?.loadComponent).toBeDefined();
  });
});
