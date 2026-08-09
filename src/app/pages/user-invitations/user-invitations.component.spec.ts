import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { UserInvitation } from '../../core/models/user-invitation.model';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { UserInvitationService } from '../../core/services/user-invitation.service';
import { UserInvitationsComponent } from './user-invitations.component';

const PENDING: UserInvitation = {
  id: 'invite-pending',
  email: 'pending@example.com',
  role: 'LEITURA',
  expiresAt: '2099-08-16T12:00:00.000Z',
  acceptedAt: null,
  revokedAt: null,
  createdAt: '2026-08-09T12:00:00.000Z',
  updatedAt: '2026-08-09T12:00:00.000Z',
  invitedBy: { id: 'admin-1', name: 'Admin Harpia' },
};

const INVITATIONS: UserInvitation[] = [
  PENDING,
  {
    ...PENDING,
    id: 'invite-accepted',
    email: 'accepted@example.com',
    acceptedAt: '2026-08-10T12:00:00.000Z',
  },
  {
    ...PENDING,
    id: 'invite-revoked',
    email: 'revoked@example.com',
    revokedAt: '2026-08-10T12:00:00.000Z',
  },
  {
    ...PENDING,
    id: 'invite-expired',
    email: 'expired@example.com',
    expiresAt: '2020-08-16T12:00:00.000Z',
  },
];

describe('UserInvitationsComponent', () => {
  let fixture: ComponentFixture<UserInvitationsComponent>;
  let component: UserInvitationsComponent;
  let list: jasmine.Spy;
  let create: jasmine.Spy;
  let revoke: jasmine.Spy;

  beforeEach(async () => {
    list = jasmine.createSpy().and.returnValue(of(INVITATIONS));
    create = jasmine.createSpy().and.returnValue(of(PENDING));
    revoke = jasmine.createSpy().and.returnValue(
      of({
        ...PENDING,
        revokedAt: '2026-08-10T12:00:00.000Z',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [UserInvitationsComponent],
      providers: [
        { provide: UserInvitationService, useValue: { list, create, revoke } },
        {
          provide: AuthSessionService,
          useValue: { getClaims: () => ({ role: 'ADMIN' }) },
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserInvitationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deriva e apresenta os quatro status de convite', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pendente');
    expect(text).toContain('Aceito');
    expect(text).toContain('Revogado');
    expect(text).toContain('Expirado');
    expect(text).toContain('Aceito em');
    expect(text).toContain('Revogado em');
  });

  it('não oferece OWNER a um ADMIN', () => {
    component.openCreate();
    fixture.detectChanges();

    const values = Array.from(
      fixture.nativeElement.querySelectorAll(
        '#invitation-role option',
      ) as NodeListOf<HTMLOptionElement>,
    ).map((option) => option.value);
    expect(values).not.toContain('OWNER');
    expect(values).toContain('ADMIN');
  });

  it('não inicia convite antes de a listagem pendente terminar', () => {
    const pendingList = new Subject<UserInvitation[]>();
    list.and.returnValue(pendingList);
    component.reload();
    fixture.detectChanges();

    component.openCreate();
    expect(component.createOpen()).toBeFalse();
    const button = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button',
      ) as NodeListOf<HTMLButtonElement>,
    ).find((item) => item.textContent?.includes('Novo convite'));
    expect(button?.disabled).toBeTrue();

    pendingList.next(INVITATIONS);
    fixture.detectChanges();
    component.openCreate();
    expect(component.createOpen()).toBeTrue();
  });

  it('registra convite com mensagem honesta sobre o não envio', () => {
    component.openCreate();
    component.form.setValue({
      email: 'pending@example.com',
      role: 'LEITURA',
    });

    component.createInvitation();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledWith({
      email: 'pending@example.com',
      role: 'LEITURA',
    });
    expect(fixture.nativeElement.textContent).toContain('Convite registrado');
    expect(fixture.nativeElement.textContent).toContain(
      'envio por e-mail ainda não está habilitado',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Convite enviado');
  });

  it('revoga somente um convite pendente após confirmação', () => {
    component.requestRevoke(PENDING);
    expect(component.revokeTarget()?.id).toBe('invite-pending');

    component.confirmRevoke();

    expect(revoke).toHaveBeenCalledWith('invite-pending');
    expect(component.revokeTarget()).toBeNull();
    expect(component.statusOf(component.invitations()[0])).toBe('REVOKED');

    component.requestRevoke(INVITATIONS[1]);
    expect(component.revokeTarget()).toBeNull();
  });

  it('não oferece a um ADMIN revogar convite de OWNER', () => {
    const ownerInvitation: UserInvitation = {
      ...PENDING,
      id: 'invite-owner',
      role: 'OWNER',
    };
    component.invitations.set([ownerInvitation]);
    component.requestRevoke(ownerInvitation);
    fixture.detectChanges();

    expect(component.revokeTarget()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Revogar convite');
    expect(revoke).not.toHaveBeenCalled();
  });

  it('mostra conflito 409 ao tentar registrar convite duplicado', () => {
    create.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Não foi possível criar o convite.' },
          }),
      ),
    );
    component.openCreate();
    component.form.setValue({
      email: 'pending@example.com',
      role: 'LEITURA',
    });

    component.createInvitation();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível criar o convite.',
    );
    expect(component.createOpen()).toBeTrue();
  });

  it('mostra erro 404 ao revogar convite que não existe mais', () => {
    revoke.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { message: 'Convite não encontrado.' },
          }),
      ),
    );
    component.requestRevoke(PENDING);
    component.confirmRevoke();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Convite não encontrado.',
    );
    expect(component.revokeTarget()?.id).toBe('invite-pending');
  });
});
