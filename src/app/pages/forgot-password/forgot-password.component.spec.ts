import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let forgotPassword: jasmine.Spy;

  beforeEach(async () => {
    forgotPassword = jasmine.createSpy().and.returnValue(
      of({
        message:
          'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        { provide: AuthService, useValue: { forgotPassword } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('não envia um e-mail inválido e revela a validação', () => {
    component.form.controls.email.setValue('invalido');

    component.onSubmit();
    fixture.detectChanges();

    expect(forgotPassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Informe um e-mail válido',
    );
  });

  it('envia o e-mail e mostra somente a resposta genérica', () => {
    component.form.controls.email.setValue('usuario@example.com');

    component.onSubmit();
    fixture.detectChanges();

    expect(forgotPassword).toHaveBeenCalledWith({
      email: 'usuario@example.com',
    });
    expect(fixture.nativeElement.textContent).toContain(
      'Se o e-mail estiver cadastrado, você receberá instruções',
    );
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('traduz o limite de solicitações sem expor detalhes da conta', () => {
    forgotPassword.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { message: 'Too Many Requests' },
          }),
      ),
    );
    component.form.controls.email.setValue('usuario@example.com');

    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Muitas solicitações');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Too Many Requests',
    );
  });
});
