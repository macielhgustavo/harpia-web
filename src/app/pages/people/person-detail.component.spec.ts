import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { PersonDetail } from '../../core/models/person.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { DocumentService } from '../../core/services/document.service';
import { PersonService } from '../../core/services/person.service';
import { PersonDetailComponent } from './person-detail.component';

describe('PersonDetailComponent', () => {
  let fixture: ComponentFixture<PersonDetailComponent>;
  let component: PersonDetailComponent;
  let documentService: jasmine.SpyObj<DocumentService>;

  const person: PersonDetail = {
    id: 'person-1',
    organizationId: 'organization-1',
    name: 'Carlos Braga',
    personType: 'FISICA',
    roles: [],
    investments: [],
    documents: [],
    interactions: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  beforeEach(() => {
    const personService = jasmine.createSpyObj<PersonService>('PersonService', [
      'getById',
    ]);
    personService.getById.and.returnValue(of(person));
    const authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );
    authorization.hasPermission.and.returnValue(true);
    documentService = jasmine.createSpyObj<DocumentService>('DocumentService', [
      'list',
      'upload',
      'download',
      'remove',
    ]);
    documentService.list.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [PersonDetailComponent],
      providers: [
        provideRouter([]),
        { provide: PersonService, useValue: personService },
        { provide: AuthorizationService, useValue: authorization },
        { provide: DocumentService, useValue: documentService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: person.id }) },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(PersonDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('preserva a data de calendário sem recuar pelo fuso horário local', () => {
    expect(component.formatDate('2026-06-25T00:00:00.000Z')).toBe('25/06/2026');
    expect(component.formatDate(null)).toBe('—');
  });

  it('integra documentos usando apenas o vínculo da pessoa', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Documentos da pessoa');
    expect(documentService.list).toHaveBeenCalledOnceWith({
      personId: person.id,
    });
  });
});
