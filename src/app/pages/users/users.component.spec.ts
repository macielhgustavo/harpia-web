import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ManagedUser } from '../../core/models/user-management.model';
import { UserManagementService } from '../../core/services/user-management.service';
import { UsersComponent } from './users.component';

const USERS: ManagedUser[] = [
  {
    id: 'user-1',
    email: 'ana@example.com',
    name: 'Ana Souza',
    role: 'ADMIN',
    isActive: true,
    lastLoginAt: '2026-08-08T12:00:00.000Z',
    invitedAt: '2026-07-01T12:00:00.000Z',
    acceptedAt: '2026-07-02T12:00:00.000Z',
    personId: null,
    createdAt: '2026-07-02T12:00:00.000Z',
    updatedAt: '2026-08-08T12:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'bia@example.com',
    name: 'Bia Lima',
    role: 'LEITURA',
    isActive: false,
    lastLoginAt: null,
    invitedAt: null,
    acceptedAt: null,
    personId: null,
    createdAt: '2026-07-03T12:00:00.000Z',
    updatedAt: '2026-07-03T12:00:00.000Z',
  },
];

describe('UsersComponent', () => {
  let fixture: ComponentFixture<UsersComponent>;
  let component: UsersComponent;
  let list: jasmine.Spy;

  beforeEach(async () => {
    list = jasmine.createSpy().and.returnValue(of(USERS));

    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UserManagementService, useValue: { list } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega usuários e oferece links de detalhe responsivos', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(list).toHaveBeenCalledWith({});
    expect(compiled.textContent).toContain('Ana Souza');
    expect(compiled.textContent).toContain('Bia Lima');
    expect(compiled.querySelector('a[href="/users/user-1"]')).not.toBeNull();
  });

  it('preserva explicitamente false no filtro de inativos', () => {
    component.onStatusChange('INACTIVE');

    expect(list.calls.mostRecent().args[0]).toEqual({ isActive: false });
  });

  it('combina busca com papel após o debounce', fakeAsync(() => {
    component.onRoleChange('ADMIN');
    component.onSearch(' Ana ');
    tick(301);

    expect(list.calls.mostRecent().args[0]).toEqual({
      search: 'Ana',
      role: 'ADMIN',
    });
  }));

  it('mostra o erro 403 e permite tentar novamente', () => {
    list.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { message: 'Acesso negado' },
          }),
      ),
    );

    component.reload();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Acesso negado');
    list.and.returnValue(of(USERS));
    component.reload();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ana Souza');
  });

  it('mostra estado vazio sem dados', () => {
    list.and.returnValue(of([]));
    component.reload();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nenhum usuário encontrado',
    );
  });
});
