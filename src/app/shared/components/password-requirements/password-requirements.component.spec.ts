import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PasswordRequirementsComponent } from './password-requirements.component';

describe('PasswordRequirementsComponent', () => {
  let fixture: ComponentFixture<PasswordRequirementsComponent>;
  let component: PasswordRequirementsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordRequirementsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordRequirementsComponent);
    component = fixture.componentInstance;
  });

  it('renderiza uma lista acessivel dos requisitos', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const section = element.querySelector('section');
    const items = element.querySelectorAll('li[data-requirement]');

    expect(section?.getAttribute('aria-label')).toBe('Requisitos da senha');
    expect(element.querySelector('ul')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(items.length).toBe(7);
    expect(element.textContent).toContain('Requisito não atendido');
  });

  it('atualiza visualmente o estado de cada requisito', () => {
    fixture.componentRef.setInput('password', 'SenhaForte1!');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const unmet = element.querySelectorAll('[data-state="unmet"]');
    const met = element.querySelectorAll('[data-state="met"]');

    expect(component.isValid()).toBeTrue();
    expect(unmet.length).toBe(0);
    expect(met.length).toBe(7);
    expect(met[0].classList).toContain('text-primary');
  });

  it('mostra a regra de e-mail somente quando ele é conhecido', () => {
    fixture.componentRef.setInput('password', 'User@Example.com-Aa1!');
    fixture.componentRef.setInput('email', ' USER@example.com ');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const emailRequirement = element.querySelector(
      '[data-requirement="email"]',
    );

    expect(emailRequirement).not.toBeNull();
    expect(emailRequirement?.getAttribute('data-state')).toBe('unmet');
    expect(component.isValid()).toBeFalse();
  });

  it('nunca inclui a senha recebida no conteúdo renderizado', () => {
    const secret = 'SegredoUnico1!NaoRenderizar';
    fixture.componentRef.setInput('password', secret);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).not.toContain(secret);
    expect(element.innerHTML).not.toContain(secret);
  });
});
