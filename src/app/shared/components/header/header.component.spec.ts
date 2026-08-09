import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let logout: jasmine.Spy;

  beforeEach(async () => {
    logout = jasmine.createSpy();
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: AuthService, useValue: { logout } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('oferece acesso à segurança da conta', () => {
    const accountLink = fixture.nativeElement.querySelector(
      'a[aria-label="Abrir segurança da conta"]',
    ) as HTMLAnchorElement;

    expect(accountLink).not.toBeNull();
    expect(accountLink.getAttribute('href')).toBe('/account/security');
  });

  it('encerra a sessão pelo cabeçalho', () => {
    fixture.componentInstance.logout();
    expect(logout).toHaveBeenCalled();
  });
});
