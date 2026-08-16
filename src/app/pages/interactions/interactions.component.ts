import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CalendarClock,
  LucideAngularModule,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Interaction,
  InteractionListItem,
  InteractionType,
} from '../../core/models/interaction.model';
import { Person } from '../../core/models/person.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { InteractionService } from '../../core/services/interaction.service';
import { PersonService } from '../../core/services/person.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatDate } from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';
import { InteractionFormModalComponent } from './interaction-form-modal.component';

@Component({
  selector: 'app-interactions',
  standalone: true,
  imports: [
    DialogFocusDirective,
    FormsModule,
    InteractionFormModalComponent,
    LucideAngularModule,
    RouterLink,
  ],
  templateUrl: './interactions.component.html',
})
export class InteractionsComponent implements OnInit {
  private readonly interactionService = inject(InteractionService);
  private readonly personService = inject(PersonService);
  private readonly authorization = inject(AuthorizationService);
  private loadSequence = 0;

  readonly interactions = signal<InteractionListItem[]>([]);
  readonly people = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly peopleLoading = signal(false);
  readonly peopleError = signal('');
  readonly feedback = signal('');
  readonly search = signal('');
  readonly personFilter = signal('');
  readonly typeFilter = signal<InteractionType | ''>('');
  readonly formOpen = signal(false);
  readonly selectedInteraction = signal<InteractionListItem | null>(null);
  readonly deleteOpen = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.INTERACTIONS_WRITE,
  );
  readonly formatDate = formatDate;
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

  readonly AddIcon = Plus;
  readonly SearchIcon = Search;
  readonly InteractionIcon = MessageSquare;
  readonly NextIcon = CalendarClock;
  readonly EditIcon = Pencil;
  readonly DeleteIcon = Trash2;
  readonly RetryIcon = RefreshCw;
  readonly CloseIcon = X;

  readonly filterPeople = computed(() => {
    const map = new Map<string, string>();
    for (const item of this.interactions()) {
      map.set(item.person.id, item.person.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  readonly filteredInteractions = computed(() => {
    const query = this.normalize(this.search());
    return this.interactions().filter((item) => {
      if (this.personFilter() && item.personId !== this.personFilter()) {
        return false;
      }
      if (this.typeFilter() && item.type !== this.typeFilter()) return false;
      return (
        !query ||
        this.normalize(item.person.name).includes(query) ||
        this.normalize(item.summary).includes(query) ||
        this.normalize(item.nextStep ?? '').includes(query)
      );
    });
  });

  readonly withNextStep = computed(
    () => this.interactions().filter((item) => !!item.nextStep?.trim()).length,
  );
  readonly peopleCount = computed(
    () => new Set(this.interactions().map((item) => item.personId)).size,
  );

  ngOnInit(): void {
    this.loadInteractions();
    if (this.canWrite) this.loadPeople();
  }

  loadInteractions(): void {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.error.set('');
    this.interactionService.list().subscribe({
      next: (interactions) => {
        if (sequence !== this.loadSequence) return;
        this.interactions.set(interactions);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar as interações.'),
        );
      },
    });
  }

  loadPeople(): void {
    if (!this.canWrite || this.peopleLoading()) return;
    this.peopleLoading.set(true);
    this.peopleError.set('');
    this.personService.list().subscribe({
      next: (people) => {
        this.people.set(people);
        this.peopleLoading.set(false);
      },
      error: (error: unknown) => {
        this.peopleLoading.set(false);
        this.peopleError.set(
          extractError(error, 'Não foi possível carregar as pessoas.'),
        );
      },
    });
  }

  resetFilters(): void {
    this.search.set('');
    this.personFilter.set('');
    this.typeFilter.set('');
  }

  openCreate(): void {
    if (
      !this.canWrite ||
      this.peopleLoading() ||
      !!this.peopleError() ||
      this.people().length === 0
    ) {
      return;
    }
    this.selectedInteraction.set(null);
    this.formOpen.set(true);
  }

  openEdit(item: InteractionListItem): void {
    if (!this.canWrite) return;
    this.selectedInteraction.set(item);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.selectedInteraction.set(null);
  }

  onSaved(_: Interaction): void {
    const editing = !!this.selectedInteraction();
    this.closeForm();
    this.feedback.set(
      editing
        ? 'Interação atualizada com sucesso.'
        : 'Interação criada com sucesso.',
    );
    this.loadInteractions();
  }

  onStale(): void {
    this.closeForm();
    this.feedback.set('A interação não existe mais. A lista foi atualizada.');
    this.loadInteractions();
  }

  requestDelete(item: InteractionListItem): void {
    if (!this.canWrite) return;
    this.selectedInteraction.set(item);
    this.deleteError.set('');
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteOpen.set(false);
    this.selectedInteraction.set(null);
    this.deleteError.set('');
  }

  confirmDelete(): void {
    const item = this.selectedInteraction();
    if (!this.canWrite || !item || this.deleting()) return;
    this.deleting.set(true);
    this.interactionService.remove(item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteOpen.set(false);
        this.selectedInteraction.set(null);
        this.feedback.set('Interação excluída com sucesso.');
        this.loadInteractions();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.deleteOpen.set(false);
          this.selectedInteraction.set(null);
          this.feedback.set(
            'A interação não existe mais. A lista foi atualizada.',
          );
          this.loadInteractions();
          return;
        }
        this.deleteError.set(
          extractError(error, 'Não foi possível excluir a interação.'),
        );
      },
    });
  }

  typeLabel(type: InteractionType): string {
    return this.typeOptions.find((item) => item.value === type)?.label ?? type;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }
}
