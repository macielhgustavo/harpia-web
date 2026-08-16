import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Interaction } from '../models/interaction.model';
import { ApiService } from './api.service';
import { InteractionService } from './interaction.service';

describe('InteractionService', () => {
  let service: InteractionService;
  let api: jasmine.SpyObj<ApiService>;
  const interaction: Interaction = {
    id: 'interaction-1',
    organizationId: 'organization-1',
    personId: 'person-1',
    date: '2026-08-16T00:00:00.000Z',
    type: 'REUNIAO',
    summary: 'Reunião de alinhamento',
    nextStep: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(of(interaction));
    api.patch.and.returnValue(of(interaction));
    api.delete.and.returnValue(of(interaction));
    TestBed.configureTestingModule({
      providers: [InteractionService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(InteractionService);
  });

  it('lista sem filtros vazios nem tenant', () => {
    service.list('  ').subscribe();
    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/interactions');
    expect(params?.toString()).toBe('');
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('filtra pelo personId real', () => {
    service.list(' person-1 ').subscribe();
    expect(api.get.calls.mostRecent().args[1]?.get('personId')).toBe(
      'person-1',
    );
  });

  it('cria, atualiza e remove nos endpoints corretos', () => {
    const create = {
      personId: 'person-1',
      date: '2026-08-16',
      type: 'REUNIAO' as const,
      summary: 'Reunião',
    };
    const update = { nextStep: '' };
    service.create(create).subscribe();
    service.update('interaction-1', update).subscribe();
    service.remove('interaction-1').subscribe();
    expect(api.post).toHaveBeenCalledWith('/interactions', create);
    expect(api.patch).toHaveBeenCalledWith(
      '/interactions/interaction-1',
      update,
    );
    expect(api.delete).toHaveBeenCalledWith('/interactions/interaction-1');
  });
});
