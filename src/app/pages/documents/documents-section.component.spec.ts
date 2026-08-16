import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { Document } from '../../core/models/document.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { DocumentService } from '../../core/services/document.service';
import {
  DocumentsSectionComponent,
  MAX_DOCUMENT_BYTES,
} from './documents-section.component';

describe('DocumentsSectionComponent', () => {
  let fixture: ComponentFixture<DocumentsSectionComponent>;
  let component: DocumentsSectionComponent;
  let service: jasmine.SpyObj<DocumentService>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

  const document: Document = {
    id: 'document-1',
    organizationId: 'organization-1',
    name: 'Contrato assinado',
    fileUrl: '/documents/document-1/download',
    downloadUrl: '/documents/document-1/download',
    originalName: 'contrato.pdf',
    mimeType: 'application/pdf',
    size: 1200,
    category: 'CONTRATO',
    personId: 'person-1',
    investmentId: null,
    unitId: null,
    developmentId: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<DocumentService>('DocumentService', [
      'list',
      'upload',
      'download',
      'remove',
    ]);
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    service.list.and.returnValue(of([document]));
    service.upload.and.returnValue(of(document));
    service.download.and.returnValue(
      of(
        new HttpResponse({
          body: new Blob(['arquivo'], { type: 'application/pdf' }),
          headers: new HttpHeaders({
            'Content-Disposition':
              "attachment; filename*=UTF-8''contrato%20assinado.pdf",
          }),
        }),
      ),
    );
    service.remove.and.returnValue(of(document));
    authorization.hasPermission.and.returnValue(true);
    TestBed.configureTestingModule({
      imports: [DocumentsSectionComponent],
      providers: [
        { provide: DocumentService, useValue: service },
        { provide: AuthorizationService, useValue: authorization },
      ],
    });
  });

  function render(): void {
    fixture = TestBed.createComponent(DocumentsSectionComponent);
    component = fixture.componentInstance;
    component.personId = 'person-1';
    fixture.detectChanges();
  }

  it('lista pelo vínculo recebido e mostra metadados seguros', () => {
    render();
    expect(service.list).toHaveBeenCalledOnceWith({ personId: 'person-1' });
    expect(component.documents()).toEqual([document]);
    expect(component.formatSize(1200)).toBe('1.2 KB');
    expect(component.categoryLabel('CONTRATO')).toBe('Contrato');
  });

  it('filtra por categoria e texto', () => {
    service.list.and.returnValue(
      of([
        document,
        { ...document, id: 'document-2', name: 'Foto', category: 'OUTRO' },
      ]),
    );
    render();
    component.categoryFilter.set('CONTRATO');
    component.search.set('assinado');
    expect(component.filteredDocuments()).toEqual([document]);
    component.resetFilters();
    expect(component.filteredDocuments().length).toBe(2);
  });

  it('envia arquivo permitido com vínculo e impede clique duplicado', () => {
    const request = new Subject<Document>();
    service.upload.and.returnValue(request);
    render();
    component.name = ' Contrato ';
    component.category = 'CONTRATO';
    component.selectedFile.set(
      new File(['%PDF-'], 'contrato.pdf', { type: 'application/pdf' }),
    );
    component.upload();
    component.upload();
    expect(service.upload).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        personId: 'person-1',
        name: 'Contrato',
        category: 'CONTRATO',
      }),
    );
    request.next(document);
    expect(component.feedback()).toContain('enviado');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('rejeita tamanho e MIME antes do upload, mantendo backend como autoridade', () => {
    render();
    component.name = 'Arquivo';
    component.selectedFile.set(
      new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], 'grande.pdf', {
        type: 'application/pdf',
      }),
    );
    component.upload();
    expect(component.uploadError()).toContain('25 MB');
    component.selectedFile.set(
      new File(['texto'], 'arquivo.txt', { type: 'text/plain' }),
    );
    component.upload();
    expect(component.uploadError()).toContain('Tipo não permitido');
    expect(service.upload).not.toHaveBeenCalled();
  });

  it('baixa via Blob autenticado e preserva o nome do cabeçalho', () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:document');
    spyOn(URL, 'revokeObjectURL');
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    render();
    component.download(document);
    expect(service.download).toHaveBeenCalledOnceWith(document.id);
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:document');
  });

  it('oculta e bloqueia upload e exclusão sem permissão de escrita', () => {
    authorization.hasPermission.and.returnValue(false);
    render();
    component.openUpload();
    component.requestDelete(document);
    expect(component.uploadOpen()).toBeFalse();
    expect(component.deleteTarget()).toBeNull();
    expect(authorization.hasPermission).toHaveBeenCalledWith(
      APP_PERMISSIONS.DOCUMENTS_WRITE,
    );
  });

  it('exclui, bloqueia duplicidade e atualiza a lista', () => {
    const request = new Subject<Document>();
    service.remove.and.returnValue(request);
    render();
    component.requestDelete(document);
    component.confirmDelete();
    component.confirmDelete();
    expect(service.remove).toHaveBeenCalledTimes(1);
    request.next(document);
    expect(component.feedback()).toContain('excluído');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('reconcilia 404 e preserva mensagem real de falha', () => {
    service.remove.and.returnValue(throwError(() => ({ status: 404 })));
    render();
    component.requestDelete(document);
    component.confirmDelete();
    expect(component.feedback()).toContain('não existe mais');
    expect(service.list).toHaveBeenCalledTimes(2);

    service.remove.and.returnValue(
      throwError(() => ({ status: 403, error: { message: 'Sem permissão' } })),
    );
    component.requestDelete(document);
    component.confirmDelete();
    expect(component.deleteError()).toBe('Sem permissão');
  });

  it('ignora resposta antiga da listagem', () => {
    const oldRequest = new Subject<Document[]>();
    service.list.and.returnValues(oldRequest, of([]));
    render();
    component.reload();
    oldRequest.next([document]);
    expect(component.documents()).toEqual([]);
  });
});
