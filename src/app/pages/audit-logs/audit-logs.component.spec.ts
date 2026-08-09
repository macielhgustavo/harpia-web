import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuditLog, AuditLogPage } from '../../core/models/audit-log.model';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLogsComponent } from './audit-logs.component';

const LOG: AuditLog = {
  id: 'audit-1',
  organizationId: 'organization-a',
  actorUserId: null,
  action: 'UPDATE',
  entityType: 'USER',
  entityId: 'user-1',
  metadata: {
    changedFields: ['role'],
    nested: { value: '<img src=x onerror=alert(1)>' },
  },
  createdAt: '2026-08-09T12:30:00.000Z',
  actor: null,
};

const PAGE: AuditLogPage = {
  data: [LOG],
  pagination: { page: 1, pageSize: 20, total: 21, totalPages: 2 },
};

class AuditLogServiceMock {
  readonly list = jasmine.createSpy().and.returnValue(of(PAGE));
  readonly getById = jasmine.createSpy().and.returnValue(of(LOG));
}

describe('AuditLogsComponent', () => {
  let fixture: ComponentFixture<AuditLogsComponent>;
  let component: AuditLogsComponent;
  let service: AuditLogServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogsComponent],
      providers: [{ provide: AuditLogService, useClass: AuditLogServiceMock }],
    }).compileComponents();

    service = TestBed.inject(AuditLogService) as unknown as AuditLogServiceMock;
    fixture = TestBed.createComponent(AuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carrega a página inicial com paginação do servidor', () => {
    expect(service.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, pageSize: 20 }),
    );
    expect(fixture.nativeElement.textContent).toContain('Página 1 de 2');
    expect(fixture.nativeElement.textContent).toContain(
      'Sistema ou usuário removido',
    );
    expect(component.knownActions).toContain('USER_ACTIVATED');
    expect(component.knownActions).toContain('USER_DEACTIVATED');
    expect(component.knownEntityTypes).toContain('UNIT_TYPE');
  });

  it('envia filtros definidos e reinicia na página 1 sem converter datas', () => {
    component.action.set('CREATE');
    component.entityType.set('UNIT_TYPE');
    component.startDate.set('2026-08-01');
    component.endDate.set('2026-08-09');
    component.applyFilters();

    expect(service.list).toHaveBeenCalledWith(
      jasmine.objectContaining({
        page: 1,
        action: 'CREATE',
        entityType: 'UNIT_TYPE',
        startDate: '2026-08-01',
        endDate: '2026-08-09',
      }),
    );
  });

  it('bloqueia intervalo invertido antes de chamar a API', () => {
    service.list.calls.reset();
    component.startDate.set('2026-08-10');
    component.endDate.set('2026-08-09');
    component.applyFilters();

    expect(service.list).not.toHaveBeenCalled();
    expect(component.filterError()).toContain('data inicial');
  });

  it('avança usando a paginação informada pela API', () => {
    component.nextPage();
    expect(service.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 2 }),
    );
  });

  it('repete a página que falhou em vez de voltar à primeira', () => {
    service.list.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({ status: 500, error: { message: 'Falha' } }),
      ),
    );
    component.nextPage();
    service.list.and.returnValue(of(PAGE));
    service.list.calls.reset();

    component.retryLoad();

    expect(service.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 2 }),
    );
  });

  it('abre o endpoint de detalhe e interpola metadados sem criar HTML ativo', () => {
    component.openDetail(LOG.id);
    fixture.detectChanges();

    expect(service.getById).toHaveBeenCalledWith(LOG.id);
    const pre = fixture.nativeElement.querySelector('pre') as HTMLElement;
    expect(pre.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(pre.querySelector('img')).toBeNull();
  });

  it('exibe 404 deliberado no detalhe', () => {
    service.getById.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { message: 'Registro de auditoria não encontrado' },
          }),
      ),
    );

    component.openDetail('missing');
    fixture.detectChanges();

    expect(component.detailError()).toBe(
      'Registro de auditoria não encontrado.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Registro de auditoria não encontrado.',
    );
  });

  it('ignora uma listagem antiga que termina depois de filtros mais novos', () => {
    const stale = new Subject<AuditLogPage>();
    const fresh = new Subject<AuditLogPage>();
    service.list.and.returnValue(stale);
    component.action.set('DELETE');
    component.applyFilters();
    service.list.and.returnValue(fresh);
    component.clearFilters();

    const freshPage: AuditLogPage = {
      data: [{ ...LOG, id: 'fresh' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    fresh.next(freshPage);
    stale.next({
      data: [{ ...LOG, id: 'stale' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    expect(component.result().data[0].id).toBe('fresh');
  });

  it('não reabre um detalhe cuja resposta chegou depois de fechar o modal', () => {
    const detail = new Subject<AuditLog>();
    service.getById.and.returnValue(detail);

    component.openDetail(LOG.id);
    component.closeDetail();
    detail.next(LOG);
    fixture.detectChanges();

    expect(component.selected()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
});
