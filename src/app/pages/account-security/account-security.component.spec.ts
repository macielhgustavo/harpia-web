import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { AccountSecurityComponent } from './account-security.component';

describe('AccountSecurityComponent', () => {
  let fixture: ComponentFixture<AccountSecurityComponent>;
  let component: AccountSecurityComponent;
  let changePassword: jasmine.Spy;

  beforeEach(async () => {
    changePassword = jasmine
      .createSpy()
      .and.returnValue(of({ message: 'Senha alterada com sucesso.' }));

    await TestBed.configureTestingModule({
      imports: [AccountSecurityComponent],
      providers: [
        { provide: AuthService, useValue: { changePassword } },
        {
          provide: AuthSessionService,
          useValue: {
            getClaims: () => ({ email: 'admin@harpia.com' }),
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inclui o e-mail conhecido na avaliação da política', () => {
    component.form.controls.newPassword.setValue('admin@harpia.com1!A');
    fixture.detectChanges();

    expect(
      component.form.controls.newPassword.hasError('passwordPolicy'),
    ).toBeTrue();
    const emailRule = fixture.nativeElement.querySelector(
      '[data-requirement="email"]',
    ) as HTMLElement;
    expect(emailRule.dataset['state']).toBe('unmet');
  });

  it('não envia senha repetida ou confirmação divergente', () => {
    component.form.setValue({
      currentPassword: 'SenhaAtual1!',
      newPassword: 'SenhaAtual1!',
      confirmPassword: 'OutraSenha1!',
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(changePassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'A nova senha deve ser diferente da senha atual',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'As senhas não coincidem',
    );
    const newPassword = fixture.nativeElement.querySelector(
      '#account-new-password',
    ) as HTMLInputElement;
    const repeatedPasswordError = fixture.nativeElement.querySelector(
      '#account-new-password-error',
    ) as HTMLElement;
    expect(newPassword.getAttribute('aria-errormessage')).toBe(
      'account-new-password-error',
    );
    expect(repeatedPasswordError.getAttribute('role')).toBe('alert');
  });

  it('envia apenas senha atual e nova senha válidas', () => {
    component.form.setValue({
      currentPassword: 'SenhaAtual1!',
      newPassword: 'SenhaNova2@',
      confirmPassword: 'SenhaNova2@',
    });

    component.onSubmit();

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'SenhaAtual1!',
      newPassword: 'SenhaNova2@',
    });
  });

  it('mantém a tela e mostra o erro de senha atual inválida', () => {
    changePassword.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { message: 'Senha atual inválida' },
          }),
      ),
    );
    component.form.setValue({
      currentPassword: 'SenhaErrada1!',
      newPassword: 'SenhaNova2@',
      confirmPassword: 'SenhaNova2@',
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Senha atual inválida');
    expect(component.loading()).toBeFalse();
  });
});
