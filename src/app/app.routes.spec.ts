import { authGuard } from './core/guards/auth.guard';
import { routes } from './app.routes';

describe('Rotas de empreendimentos', () => {
  it('protege e carrega de forma lazy a lista e o detalhe', () => {
    const listRoute = routes.find((route) => route.path === 'developments');
    const detailRoute = routes.find((route) => route.path === 'developments/:id');

    expect(listRoute?.canActivate).toContain(authGuard);
    expect(detailRoute?.canActivate).toContain(authGuard);
    expect(listRoute?.loadComponent).toBeDefined();
    expect(detailRoute?.loadComponent).toBeDefined();
  });
});
