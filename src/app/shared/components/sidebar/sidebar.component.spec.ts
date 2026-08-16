import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  APP_PERMISSIONS,
  AppPermission,
} from '../../../core/config/rbac.config';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let hasPermission: jasmine.Spy;

  beforeEach(async () => {
    hasPermission = jasmine.createSpy();

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthorizationService, useValue: { hasPermission } },
        {
          provide: AuthSessionService,
          useValue: {
            getClaims: () => ({
              sub: 'user-1',
              email: 'owner@harpia.com',
              organizationId: 'organization-a',
              tokenVersion: 1,
              role: 'OWNER',
              exp: 4_102_444_800,
            }),
          },
        },
      ],
    }).compileComponents();
  });

  function render(allowed: readonly AppPermission[]): void {
    hasPermission.and.callFake((permission: AppPermission) =>
      allowed.includes(permission),
    );
    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  }

  it('mostra administração e identidade da sessão para OWNER', () => {
    render([
      APP_PERMISSIONS.DASHBOARD_READ,
      APP_PERMISSIONS.REPORTS_EXPORT,
      APP_PERMISSIONS.USERS_MANAGE,
      APP_PERMISSIONS.AUDIT_READ,
    ]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Administração');
    expect(text).toContain('Usuários');
    expect(text).toContain('Convites');
    expect(text).toContain('Auditoria');
    expect(text).toContain('Gestão');
    expect(text).toContain('Relatórios');
    expect(
      fixture.componentInstance.navigation
        .find((group) => group.label === 'Gestão')
        ?.items.map((item) => item.route),
    ).toEqual(['/reports']);
    expect(text).toContain('owner@harpia.com');
    expect(text).toContain('Proprietário');
    expect(
      fixture.componentInstance.navigation
        .flatMap((group) => group.items)
        .find((item) => item.route === '/users')?.exact,
    ).toBeTrue();
  });

  it('remove grupos e links para os quais o perfil não tem permissão', () => {
    render([APP_PERMISSIONS.PEOPLE_READ]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pessoas');
    expect(text).not.toContain('Administração');
    expect(text).not.toContain('Gestão');
    expect(text).not.toContain('Auditoria');
    expect(text).not.toContain('Dashboard');
  });
});
