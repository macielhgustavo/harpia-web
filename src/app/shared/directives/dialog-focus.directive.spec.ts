import { Component } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flushMicrotasks,
} from '@angular/core/testing';
import { DialogFocusDirective } from './dialog-focus.directive';

@Component({
  standalone: true,
  imports: [DialogFocusDirective],
  template: `
    <button id="opener" type="button" (click)="open = true">Abrir</button>
    @if (open) {
      <section appDialogFocus (dialogEscape)="open = false" role="dialog">
        <button id="first" type="button" data-dialog-initial-focus>
          Primeiro
        </button>
        <button id="last" type="button">Último</button>
      </section>
    }
  `,
})
class DialogHostComponent {
  open = false;
}

describe('DialogFocusDirective', () => {
  let fixture: ComponentFixture<DialogHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
  });

  it('move, contém e restaura o foco, além de fechar com Escape', fakeAsync(() => {
    const opener = fixture.nativeElement.querySelector(
      '#opener',
    ) as HTMLButtonElement;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    flushMicrotasks();

    const first = fixture.nativeElement.querySelector(
      '#first',
    ) as HTMLButtonElement;
    const last = fixture.nativeElement.querySelector(
      '#last',
    ) as HTMLButtonElement;
    expect(document.activeElement).toBe(first);

    last.focus();
    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    flushMicrotasks();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  }));
});
