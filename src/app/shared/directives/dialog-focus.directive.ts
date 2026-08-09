import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Keeps keyboard focus inside an open modal and restores it when closed. */
@Directive({
  selector: '[appDialogFocus]',
  standalone: true,
  host: {
    tabindex: '-1',
    '(keydown)': 'onKeydown($event)',
  },
})
export class DialogFocusDirective implements AfterViewInit, OnDestroy {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  @Output() readonly dialogEscape = new EventEmitter<void>();

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (!this.host.isConnected) {
        return;
      }

      const initial = this.host.querySelector<HTMLElement>(
        '[data-dialog-initial-focus]',
      );
      (initial ?? this.focusableElements()[0] ?? this.host).focus();
    });
  }

  ngOnDestroy(): void {
    queueMicrotask(() => {
      if (this.previousFocus?.isConnected) {
        this.previousFocus.focus();
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.dialogEscape.emit();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = this.focusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      this.host.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === this.host)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(
      this.host.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      (element) =>
        !element.hasAttribute('hidden') &&
        element.getAttribute('aria-hidden') !== 'true',
    );
  }
}
