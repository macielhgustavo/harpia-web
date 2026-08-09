import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AuthorizationService } from '../../core/services/authorization.service';
import { LoginComponent } from './login.component';

@Component({
  standalone: true,
  template: '',
})
class TestPageComponent {}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let router: Router;
  let authService: {
    login: jasmine.Spy;
  };
  let authorization: {
    firstAccessibleRoute: jasmine.Spy;
  };

  beforeEach(async () => {
    authService = {
      login: jasmine.createSpy().and.returnValue(of({ access_token: 'jwt' })),
    };
    authorization = {
      firstAccessibleRoute: jasmine.createSpy().and.returnValue('/dashboard'),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthorizationService, useValue: authorization },
        provideRouter([
          { path: 'login', component: TestPageComponent },
          { path: 'dashboard', component: TestPageComponent },
          { path: 'account/security', component: TestPageComponent },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  async function renderAt(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('oferece recuperação de senha e explica sessão expirada', async () => {
    await renderAt('/login?reason=session-expired');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/forgot-password"]')).not.toBeNull();
    expect(compiled.textContent).toContain(
      'Sua sessão expirou ou foi revogada',
    );
  });

  it('mantém compatibilidade com senha legada exigindo apenas valor não vazio', async () => {
    await renderAt('/login');
    component.form.setValue({ email: 'admin@harpia.com', password: 'x' });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@harpia.com',
      password: 'x',
    });
  });

  it('redireciona somente para um retorno interno seguro após login', async () => {
    await renderAt('/login?returnUrl=%2Faccount%2Fsecurity');
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    component.form.setValue({ email: 'admin@harpia.com', password: 'senha' });

    component.onSubmit();

    expect(navigateByUrl).toHaveBeenCalledWith('/account/security', {
      replaceUrl: true,
    });
  });

  it('ignora retorno externo e volta ao dashboard', async () => {
    await renderAt('/login?returnUrl=https%3A%2F%2Fevil.example');
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    component.form.setValue({ email: 'admin@harpia.com', password: 'senha' });

    component.onSubmit();

    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard', {
      replaceUrl: true,
    });
  });

  it('usa a primeira rota permitida quando o perfil não acessa o dashboard', async () => {
    authorization.firstAccessibleRoute.and.returnValue('/people');
    await renderAt('/login');
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    component.form.setValue({
      email: 'comercial@harpia.com',
      password: 'senha',
    });

    component.onSubmit();

    expect(navigateByUrl).toHaveBeenCalledWith('/people', {
      replaceUrl: true,
    });
  });

  it('não retorna para uma página pública de autenticação codificada', async () => {
    await renderAt('/login?returnUrl=%2F%256Cogin');
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    component.form.setValue({ email: 'admin@harpia.com', password: 'senha' });

    component.onSubmit();

    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard', {
      replaceUrl: true,
    });
  });

  it('distingue indisponibilidade do serviço de credenciais inválidas', async () => {
    authService.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { message: 'Internal server error' },
          }),
      ),
    );
    await renderAt('/login');
    component.form.setValue({ email: 'admin@harpia.com', password: 'senha' });

    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível acessar o Harpia agora',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'E-mail ou senha inválidos',
    );
  });

  it('mostra credenciais inválidas somente para 401', async () => {
    authService.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { message: 'Credenciais inválidas' },
          }),
      ),
    );
    await renderAt('/login');
    component.form.setValue({ email: 'admin@harpia.com', password: 'errada' });

    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'E-mail ou senha inválidos',
    );
  });

  it('explica o limite de tentativas em 429', async () => {
    authService.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { message: 'Too Many Requests' },
          }),
      ),
    );
    await renderAt('/login');
    component.form.setValue({ email: 'admin@harpia.com', password: 'senha' });

    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Muitas tentativas');
    expect(fixture.nativeElement.textContent).not.toContain(
      'E-mail ou senha inválidos',
    );
  });
});
