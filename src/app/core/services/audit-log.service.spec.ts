import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuditLog, AuditLogPage } from '../models/audit-log.model';
import { ApiService } from './api.service';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let api: jasmine.SpyObj<ApiService>;
  const auditLog: AuditLog = {
    id: 'audit-1',
    organizationId: 'organization-1',
    actorUserId: 'user-1',
    action: 'USER_ROLE_CHANGED',
    entityType: 'USER',
    entityId: 'user-2',
    metadata: { oldRole: 'LEITURA', newRole: 'FINANCEIRO' },
    createdAt: '2026-08-09T12:00:00.000Z',
    actor: {
      id: 'user-1',
      name: 'Owner',
      email: 'owner@example.com',
      role: 'OWNER',
    },
  };
  const page: AuditLogPage = {
    data: [auditLog],
    pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(of(page));

    TestBed.configureTestingModule({
      providers: [AuditLogService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(AuditLogService);
  });

  it('envia todos os filtros definidos sem organizationId', () => {
    service
      .list({
        action: ' USER_ROLE_CHANGED ',
        entityType: ' USER ',
        entityId: ' user-2 ',
        actorUserId: ' user-1 ',
        startDate: '2026-08-01',
        endDate: '2026-08-09',
        page: 2,
        pageSize: 50,
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/audit-logs');
    expect(params?.get('action')).toBe('USER_ROLE_CHANGED');
    expect(params?.get('entityType')).toBe('USER');
    expect(params?.get('entityId')).toBe('user-2');
    expect(params?.get('actorUserId')).toBe('user-1');
    expect(params?.get('startDate')).toBe('2026-08-01');
    expect(params?.get('endDate')).toBe('2026-08-09');
    expect(params?.get('page')).toBe('2');
    expect(params?.get('pageSize')).toBe('50');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('preserva datas date-only sem conversão de fuso e omite vazios', () => {
    service
      .list({
        action: ' ',
        startDate: '2026-12-31',
        endDate: '2026-12-31',
      })
      .subscribe();

    const params = api.get.calls.mostRecent().args[1];
    expect(params?.get('startDate')).toBe('2026-12-31');
    expect(params?.get('endDate')).toBe('2026-12-31');
    expect(params?.has('action')).toBeFalse();
  });

  it('consulta um registro individual pelo id', () => {
    api.get.and.returnValue(of(auditLog));

    service.getById('audit-1').subscribe();

    expect(api.get).toHaveBeenCalledOnceWith('/audit-logs/audit-1');
  });
});
