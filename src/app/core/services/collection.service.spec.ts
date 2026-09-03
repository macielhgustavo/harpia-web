import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { CollectionService } from './collection.service';

describe('CollectionService', () => {
  let service: CollectionService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
    ]);
    api.get.and.returnValue(of({}));
    api.post.and.returnValue(of({}));
    api.patch.and.returnValue(of({}));
    TestBed.configureTestingModule({
      providers: [CollectionService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(CollectionService);
  });

  it('uses the collection rule and processing endpoints', () => {
    const input = {
      name: 'Após o vencimento',
      daysOffset: 3,
      subject: 'Parcela vencida',
      message: 'Olá, {{cliente}}',
      active: true,
    };
    service.rules().subscribe();
    service.createRule(input).subscribe();
    service.updateRule('rule-1', { active: false }).subscribe();
    service.run().subscribe();

    expect(api.get.calls.first().args[0]).toBe('/collections/rules');
    expect(api.post.calls.allArgs()).toEqual([
      ['/collections/rules', input],
      ['/collections/run', {}],
    ]);
    expect(api.patch).toHaveBeenCalledWith('/collections/rules/rule-1', {
      active: false,
    });
  });

  it('lists dispatches without sending empty filters', () => {
    service
      .dispatches({
        page: 2,
        status: 'FALHOU',
        ruleId: '',
        search: '',
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/collections/dispatches');
    expect(params?.get('page')).toBe('2');
    expect(params?.get('status')).toBe('FALHOU');
    expect(params?.has('ruleId')).toBeFalse();
    expect(params?.has('search')).toBeFalse();
  });

  it('uses explicit retry and cancellation endpoints', () => {
    service.retry('dispatch-1').subscribe();
    service.cancel('dispatch-1').subscribe();

    expect(api.post.calls.allArgs()).toEqual([
      ['/collections/dispatches/dispatch-1/retry', {}],
      ['/collections/dispatches/dispatch-1/cancel', {}],
    ]);
  });
});
