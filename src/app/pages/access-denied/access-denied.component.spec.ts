import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthorizationService } from '../../core/services/authorization.service';
import { AccessDeniedComponent } from './access-denied.component';

describe('AccessDeniedComponent', () => {
  let fixture: ComponentFixture<AccessDeniedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessDeniedComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthorizationService,
          useValue: { firstAccessibleRoute: () => '/people' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessDeniedComponent);
    fixture.detectChanges();
  });

  it('explica a restrição sem encerrar a sessão e aponta para uma rota permitida', () => {
    const anchor = fixture.nativeElement.querySelector(
      'a',
    ) as HTMLAnchorElement;
    expect(fixture.nativeElement.textContent).toContain('Acesso não permitido');
    expect(anchor.getAttribute('href')).toBe('/people');
  });
});
