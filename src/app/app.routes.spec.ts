import { authGuard } from './core/guards/auth.guard';
import { routes } from './app.routes';

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
