import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ResetPasswordComponent } from './reset-password.component';

@Component({
  standalone: true,
  template: '',
})
class TestPageComponent {}

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let router: Router;
  let resetPassword: jasmine.Spy;

  beforeEach(async () => {
    resetPassword = jasmine
      .createSpy()
      .and.returnValue(of({ message: 'Senha redefinida com sucesso.' }));

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        { provide: AuthService, useValue: { resetPassword } },
        provideRouter([
          { path: 'reset-password', component: TestPageComponent },
          { path: 'forgot-password', component: TestPageComponent },
          { path: 'login', component: TestPageComponent },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  async function renderAt(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('bloqueia a redefinição quando o link não contém token', async () => {
    await renderAt('/reset-password');

    expect(component.hasToken).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain(
      'link de redefinição está incompleto',
    );
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('valida política forte e confirmação antes de enviar', async () => {
    await renderAt('/reset-password?token=token-seguro');
    component.form.setValue({
      newPassword: 'fraca',
      confirmPassword: 'diferente',
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(resetPassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'As senhas não coincidem',
    );
  });

  it('envia apenas token e nova senha', async () => {
    await renderAt('/reset-password?token=token-seguro');
    component.form.setValue({
      newPassword: 'SenhaNova1!',
      confirmPassword: 'SenhaNova1!',
    });

    component.onSubmit();

    expect(resetPassword).toHaveBeenCalledWith({
      token: 'token-seguro',
      newPassword: 'SenhaNova1!',
    });
  });

  it('orienta solicitar novo link quando o token expirou', async () => {
    resetPassword.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Token de redefinição inválido ou expirado.' },
          }),
      ),
    );
    await renderAt('/reset-password?token=expirado');
    component.form.setValue({
      newPassword: 'SenhaNova1!',
      confirmPassword: 'SenhaNova1!',
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.invalidToken()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Solicitar novo link');
  });
});
