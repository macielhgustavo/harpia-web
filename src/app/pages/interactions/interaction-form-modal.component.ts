import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Save, X } from 'lucide-angular';
import { Observable } from 'rxjs';
import {
  CreateInteractionInput,
  Interaction,
  InteractionType,
  UpdateInteractionInput,
} from '../../core/models/interaction.model';
import { Person } from '../../core/models/person.model';
import { InteractionService } from '../../core/services/interaction.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

interface InteractionForm {
  personId: string;
  date: string;
  type: InteractionType;
  summary: string;
  nextStep: string;
}

@Component({
  selector: 'app-interaction-form-modal',
  standalone: true,
  imports: [DialogFocusDirective, FormsModule, LucideAngularModule],
  templateUrl: './interaction-form-modal.component.html',
})
export class InteractionFormModalComponent implements OnInit {
  private readonly interactionService = inject(InteractionService);

  @Input() interaction: Interaction | null = null;
  @Input() people: Person[] = [];
  @Input() fixedPersonId = '';
  @Input() fixedPersonName = '';
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<Interaction>();
  @Output() readonly stale = new EventEmitter<void>();

  @ViewChild('personInput')
  private personInput?: ElementRef<HTMLSelectElement>;
  @ViewChild('dateInput') private dateInput?: ElementRef<HTMLInputElement>;
  @ViewChild('summaryInput')
  private summaryInput?: ElementRef<HTMLTextAreaElement>;

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly CloseIcon = X;
  readonly SaveIcon = Save;
  readonly typeOptions: ReadonlyArray<{
    value: InteractionType;
    label: string;
  }> = [
    { value: 'REUNIAO', label: 'Reunião' },
    { value: 'LIGACAO', label: 'Ligação' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'EMAIL', label: 'E-mail' },
    { value: 'OUTRO', label: 'Outro' },
  ];

  form: InteractionForm = this.emptyForm();

  get isEditing(): boolean {
    return this.interaction !== null;
  }

  get isPersonFixed(): boolean {
    return this.isEditing || !!this.fixedPersonId;
  }

  get personName(): string {
    return (
      this.fixedPersonName ||
      this.interaction?.person?.name ||
      this.people.find((person) => person.id === this.form.personId)?.name ||
      'Pessoa não informada'
    );
  }

  get sortedPeople(): Person[] {
    return [...this.people].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }

  ngOnInit(): void {
    if (this.interaction) {
      this.form = {
        personId: this.interaction.personId,
        date: this.interaction.date.slice(0, 10),
        type: this.interaction.type,
        summary: this.interaction.summary,
        nextStep: this.interaction.nextStep ?? '',
      };
    } else if (this.fixedPersonId) {
      this.form.personId = this.fixedPersonId;
    }
  }

  personInvalid(): boolean {
    return !this.form.personId;
  }

  dateInvalid(): boolean {
    return !this.form.date;
  }

  summaryInvalid(): boolean {
    return !this.form.summary.trim();
  }

  requestClose(): void {
    if (!this.saving()) this.closed.emit();
  }

  save(): void {
    this.submitted.set(true);
    if (
      this.saving() ||
      this.personInvalid() ||
      this.dateInvalid() ||
      this.summaryInvalid()
    ) {
      if (!this.saving()) this.focusFirstInvalid();
      return;
    }

    const summary = this.form.summary.trim();
    const nextStep = this.form.nextStep.trim();
    let request: Observable<Interaction>;
    if (this.interaction) {
      const payload: UpdateInteractionInput = {
        date: this.form.date,
        type: this.form.type,
        summary,
        nextStep,
      };
      request = this.interactionService.update(this.interaction.id, payload);
    } else {
      const payload: CreateInteractionInput = {
        personId: this.form.personId,
        date: this.form.date,
        type: this.form.type,
        summary,
      };
      if (nextStep) payload.nextStep = nextStep;
      request = this.interactionService.create(payload);
    }

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (interaction) => {
        this.saving.set(false);
        this.saved.emit(interaction);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.stale.emit();
          return;
        }
        this.error.set(
          extractError(error, 'Não foi possível salvar a interação.'),
        );
      },
    });
  }

  private focusFirstInvalid(): void {
    const target = this.personInvalid()
      ? this.personInput
      : this.dateInvalid()
        ? this.dateInput
        : this.summaryInput;
    queueMicrotask(() => target?.nativeElement.focus());
  }

  private emptyForm(): InteractionForm {
    return {
      personId: '',
      date: new Date().toISOString().slice(0, 10),
      type: 'OUTRO',
      summary: '',
      nextStep: '',
    };
  }
}
