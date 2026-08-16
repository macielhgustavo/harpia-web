import { HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Document } from '../models/document.model';
import { filenameFromContentDisposition } from '../../shared/utils/file-download';
import { ApiService } from './api.service';
import { DocumentService } from './document.service';

describe('DocumentService', () => {
  let service: DocumentService;
  let api: jasmine.SpyObj<ApiService>;

  const document: Document = {
    id: 'document-1',
    organizationId: 'organization-1',
    name: 'Contrato',
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
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'postFormData',
      'getBlob',
      'delete',
    ]);
    api.get.and.returnValue(of([document]));
    api.postFormData.and.returnValue(of(document));
    api.getBlob.and.returnValue(of(new HttpResponse({ body: new Blob() })));
    api.delete.and.returnValue(of(document));
    TestBed.configureTestingModule({
      providers: [DocumentService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(DocumentService);
  });

  it('lista somente com vínculos definidos e sem tenant', () => {
    service.list({ personId: ' person-1 ', unitId: ' ' }).subscribe();
    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/documents');
    expect(params?.get('personId')).toBe('person-1');
    expect(params?.has('unitId')).toBeFalse();
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('envia arquivo e metadados por multipart sem Content-Type manual', () => {
    const file = new File(['%PDF-'], 'contrato.pdf', {
      type: 'application/pdf',
    });
    service
      .upload({
        file,
        name: 'Contrato',
        category: 'CONTRATO',
        investmentId: 'investment-1',
      })
      .subscribe();
    const [path, body] = api.postFormData.calls.mostRecent().args;
    expect(path).toBe('/documents');
    expect(body.get('file')).toEqual(file);
    expect(body.get('name')).toBe('Contrato');
    expect(body.get('category')).toBe('CONTRATO');
    expect(body.get('investmentId')).toBe('investment-1');
  });

  it('baixa e exclui pelos endpoints autenticados', () => {
    service.download('document-1').subscribe();
    service.remove('document-1').subscribe();
    expect(api.getBlob).toHaveBeenCalledWith('/documents/document-1/download');
    expect(api.delete).toHaveBeenCalledWith('/documents/document-1');
  });

  it('extrai nome UTF-8, nome simples e fallback', () => {
    expect(
      filenameFromContentDisposition(
        "attachment; filename*=UTF-8''contrato%20assinado.pdf",
        'fallback.pdf',
      ),
    ).toBe('contrato assinado.pdf');
    expect(
      filenameFromContentDisposition(
        'attachment; filename="planilha.xlsx"',
        'fallback.xlsx',
      ),
    ).toBe('planilha.xlsx');
    expect(filenameFromContentDisposition(null, 'fallback.pdf')).toBe(
      'fallback.pdf',
    );
  });
});
