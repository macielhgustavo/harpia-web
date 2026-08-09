import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ManagedUser } from '../models/user-management.model';
import { ApiService } from './api.service';
import { UserManagementService } from './user-management.service';

describe('UserManagementService', () => {
  let service: UserManagementService;
  let api: jasmine.SpyObj<ApiService>;
  const user: ManagedUser = {
    id: 'user-1',
    email: 'ana@example.com',
    name: 'Ana',
    role: 'LEITURA',
    isActive: true,
    lastLoginAt: null,
    invitedAt: null,
    acceptedAt: null,
    personId: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'patch']);
    api.get.and.returnValue(of([user]));
    api.patch.and.returnValue(of(user));

    TestBed.configureTestingModule({
      providers: [
        UserManagementService,
        { provide: ApiService, useValue: api },
      ],
    });
    service = TestBed.inject(UserManagementService);
  });

  it('envia apenas filtros definidos e preserva isActive=false', () => {
    service
      .list({ role: 'FINANCEIRO', isActive: false, search: '  ana  ' })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/users');
    expect(params?.get('role')).toBe('FINANCEIRO');
    expect(params?.get('isActive')).toBe('false');
    expect(params?.get('search')).toBe('ana');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('omite filtros vazios em vez de enviar valores inválidos', () => {
    service.list({ role: '', search: '   ' }).subscribe();

    const params = api.get.calls.mostRecent().args[1];
    expect(params?.keys()).toEqual([]);
  });

  it('usa os contratos exatos de detalhe, papel e status', () => {
    api.get.and.returnValue(of(user));

    service.getById('user-1').subscribe();
    service.updateRole('user-1', { role: 'COMERCIAL' }).subscribe();
    service.updateStatus('user-1', { isActive: false }).subscribe();

    expect(api.get).toHaveBeenCalledWith('/users/user-1');
    expect(api.patch).toHaveBeenCalledWith('/users/user-1/role', {
      role: 'COMERCIAL',
    });
    expect(api.patch).toHaveBeenCalledWith('/users/user-1/status', {
      isActive: false,
    });
  });
});
