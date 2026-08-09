import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedUser } from '../../core/models/user-management.model';
import { AuthService } from '../../core/services/auth.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { UserDetailComponent } from './user-detail.component';

const CURRENT_USER: ManagedUser = {
  id: 'user-1',
  email: 'owner@example.com',
  name: 'Owner Harpia',
  role: 'OWNER',
  isActive: true,
  lastLoginAt: '2026-08-08T12:00:00.000Z',
  invitedAt: null,
  acceptedAt: null,
  personId: null,
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-08-08T12:00:00.000Z',
};

describe('UserDetailComponent', () => {
  let fixture: ComponentFixture<UserDetailComponent>;
  let component: UserDetailComponent;
  let getById: jasmine.Spy;
  let updateRole: jasmine.Spy;
  let updateStatus: jasmine.Spy;
  let logoutIfCurrentToken: jasmine.Spy;

  beforeEach(async () => {
    getById = jasmine.createSpy().and.returnValue(of(CURRENT_USER));
    updateRole = jasmine.createSpy().and.returnValue(
      of({
        ...CURRENT_USER,
        role: 'ADMIN',
        updatedAt: '2026-08-09T12:00:00.000Z',
      }),
    );
    updateStatus = jasmine.createSpy().and.returnValue(of(CURRENT_USER));
    logoutIfCurrentToken = jasmine.createSpy().and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [UserDetailComponent],
      providers: [
        {
          provide: UserManagementService,
          useValue: { getById, updateRole, updateStatus },
        },
        { provide: AuthService, useValue: { logoutIfCurrentToken } },
        {
          provide: AuthSessionService,
          useValue: {
            getClaims: () => ({ sub: 'user-1', role: 'OWNER' }),
            getToken: () => 'current-token',
          },
        },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'user-1' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega dados, datas e identifica o próprio usuário', () => {
    expect(getById).toHaveBeenCalledWith('user-1');
    expect(component.isCurrentUser()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Owner Harpia');
    expect(fixture.nativeElement.textContent).toContain('Último acesso');
  });

  it('desabilita a autodesativação', () => {
    expect(component.canToggleStatus()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain(
      'Você não pode desativar o próprio usuário',
    );
    component.requestStatusChange();
    expect(component.pendingAction()).toBeNull();
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('confirma a mudança real do próprio papel e encerra a sessão', () => {
    component.onRoleChange('ADMIN');
    component.requestRoleChange();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Alterar o papel de Owner Harpia de Proprietário para Administrador',
    );
    component.confirmAction();

    expect(updateRole).toHaveBeenCalledWith('user-1', { role: 'ADMIN' });
    expect(logoutIfCurrentToken).toHaveBeenCalledWith(
      'current-token',
      'session-expired',
    );
  });

  it('mostra conflito 409 sem encerrar a sessão', () => {
    updateRole.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message:
                'O último OWNER ativo não pode ser desativado ou rebaixado',
            },
          }),
      ),
    );
    component.onRoleChange('ADMIN');
    component.requestRoleChange();
    component.confirmAction();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('O último OWNER ativo');
    expect(logoutIfCurrentToken).not.toHaveBeenCalled();
  });

  it('não envia alteração quando o papel selecionado não mudou', () => {
    component.onRoleChange('OWNER');
    component.requestRoleChange();

    expect(component.pendingAction()).toBeNull();
    expect(updateRole).not.toHaveBeenCalled();
  });
});
