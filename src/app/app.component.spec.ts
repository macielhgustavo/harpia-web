import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

@Component({
  standalone: true,
  template: '',
})
class TestPageComponent {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'login', component: TestPageComponent },
          { path: 'forgot-password', component: TestPageComponent },
          { path: 'reset-password', component: TestPageComponent },
          { path: 'account/security', component: TestPageComponent },
          { path: 'dashboard', component: TestPageComponent },
        ]),
        provideHttpClient(),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  async function renderAt(url: string): Promise<HTMLElement> {
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('cria a aplicação', async () => {
    await renderAt('/dashboard');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza o shell autenticado nas páginas internas', async () => {
    const compiled = await renderAt('/account/security');

    expect(compiled.querySelector('app-sidebar')).not.toBeNull();
    expect(compiled.querySelector('app-header')).not.toBeNull();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  for (const url of [
    '/login',
    '/forgot-password',
    '/reset-password?token=segredo',
  ]) {
    it(`não renderiza o shell autenticado em ${url}`, async () => {
      const compiled = await renderAt(url);

      expect(compiled.querySelector('app-sidebar')).toBeNull();
      expect(compiled.querySelector('app-header')).toBeNull();
      expect(compiled.querySelector('router-outlet')).not.toBeNull();
    });
  }
});
