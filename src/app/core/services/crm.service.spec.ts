import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { CrmService } from './crm.service';

describe('CrmService', () => {
  let service: CrmService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(of({}));
    api.patch.and.returnValue(of({}));
    api.delete.and.returnValue(of({}));
    TestBed.configureTestingModule({
      providers: [CrmService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(CrmService);
  });

  it('lists pipelines without sending tenant data', () => {
    service.listPipelines().subscribe();
    expect(api.get).toHaveBeenCalledOnceWith('/crm/pipelines');
  });

  it('serializes only defined opportunity filters and preserves pagination', () => {
    service
      .listOpportunities({
        page: 2,
        pageSize: 50,
        search: ' Ana ',
        pipelineId: 'pipeline-1',
        stageId: '',
      })
      .subscribe();

    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/crm/opportunities');
    expect(params?.get('page')).toBe('2');
    expect(params?.get('pageSize')).toBe('50');
    expect(params?.get('search')).toBe('Ana');
    expect(params?.get('pipelineId')).toBe('pipeline-1');
    expect(params?.has('stageId')).toBeFalse();
    expect(params?.has('organizationId')).toBeFalse();
  });

  it('uses the exact create, update and move contracts', () => {
    const create = {
      personId: 'person-1',
      pipelineId: 'pipeline-1',
      estimatedValue: '150000.50',
    };
    const update = { probability: 75, assignedUserId: null };
    const move = { stageId: 'stage-lost', lostReason: 'Sem orçamento' };

    service.createOpportunity(create).subscribe();
    service.updateOpportunity('opportunity-1', update).subscribe();
    service.moveOpportunity('opportunity-1', move).subscribe();

    expect(api.post).toHaveBeenCalledWith('/crm/opportunities', create);
    expect(api.patch).toHaveBeenCalledWith(
      '/crm/opportunities/opportunity-1',
      update,
    );
    expect(api.post).toHaveBeenCalledWith(
      '/crm/opportunities/opportunity-1/move',
      move,
    );
  });

  it('queries commercial history and paginated activities', () => {
    service.getHistory('opportunity-1').subscribe();
    service.getTimeline('opportunity-1').subscribe();
    expect(api.get).toHaveBeenCalledWith(
      '/crm/opportunities/opportunity-1/timeline',
    );
    service
      .listActivities({
        opportunityId: 'opportunity-1',
        pageSize: 50,
        type: 'WHATSAPP',
      })
      .subscribe();

    expect(api.get).toHaveBeenCalledWith(
      '/crm/opportunities/opportunity-1/history',
    );
    const [path, params] = api.get.calls.mostRecent().args;
    expect(path).toBe('/crm/activities');
    expect(params?.get('opportunityId')).toBe('opportunity-1');
    expect(params?.get('pageSize')).toBe('50');
    expect(params?.get('type')).toBe('WHATSAPP');
  });

  it('creates and removes an activity through the dedicated collection', () => {
    const activity = {
      opportunityId: 'opportunity-1',
      type: 'VISITA' as const,
      summary: 'Visita ao decorado',
    };

    service.createActivity(activity).subscribe();
    service.removeActivity('activity-1').subscribe();

    expect(api.post).toHaveBeenCalledOnceWith('/crm/activities', activity);
    expect(api.delete).toHaveBeenCalledOnceWith('/crm/activities/activity-1');
  });
});
