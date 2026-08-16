import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  PersonDetail,
  PersonDocumentType,
  PersonRoleType,
  PersonType,
} from '../../core/models/person.model';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import { Interaction } from '../../core/models/interaction.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { PersonService } from '../../core/services/person.service';
import { DocumentsSectionComponent } from '../documents/documents-section.component';
import { InteractionFormModalComponent } from '../interactions/interaction-form-modal.component';
import { formatDate as formatCalendarDate } from '../../shared/utils/development';
import { extractError, isEmailValid } from '../../shared/utils/http-error';
import {
  ROLE_OPTIONS,
  roleBadge,
  roleLabel,
} from '../../shared/utils/person-roles';

interface EditForm {
  name: string;
  documentType: PersonDocumentType;
  document: string;
  personType: PersonType;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

@Component({
  selector: 'app-person-detail',
  standalone: true,
  imports: [
    CommonModule,
    DocumentsSectionComponent,
    FormsModule,
    InteractionFormModalComponent,
    RouterLink,
  ],
  template: `
    <a
      routerLink="/people"
      class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary"
    >
      ← Voltar
    </a>

    @if (loading()) {
      <p class="text-sm text-muted">Carregando...</p>
    } @else if (error()) {
      <div
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {{ error() }}
      </div>
    } @else {
      @if (person(); as p) {
        <!-- Cabeçalho -->
        <div class="mb-6">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-bold text-ink">{{ p.name }}</h1>
            @for (r of p.roles; track r.id) {
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                [ngClass]="badge(r.role)"
                >{{ label(r.role) }}</span
              >
            }
            <button
              type="button"
              (click)="openEdit(p)"
              class="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-warm"
            >
              Editar
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <!-- Dados + Papéis -->
          <div class="space-y-6 lg:col-span-1">
            <section
              class="rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <h2
                class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted"
              >
                Dados
              </h2>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="text-muted">Documento</dt>
                  <dd class="text-ink">
                    {{ p.documentType }} {{ p.document || '—' }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-muted">Tipo</dt>
                  <dd class="text-ink">{{ typeLabel(p.personType) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-muted">Email</dt>
                  <dd class="text-ink">{{ p.email || '—' }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-muted">Telefone</dt>
                  <dd class="text-ink">{{ p.phone || '—' }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-muted">Endereço</dt>
                  <dd class="text-right text-ink">{{ p.address || '—' }}</dd>
                </div>
              </dl>
              @if (p.notes) {
                <p class="mt-3 rounded-lg bg-surface-warm p-3 text-sm text-ink">
                  {{ p.notes }}
                </p>
              }
            </section>

            <section
              class="rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <h2
                class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted"
              >
                Papéis
              </h2>
              <div class="mb-3 flex flex-wrap gap-2">
                @for (r of p.roles; track r.id) {
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    [ngClass]="badge(r.role)"
                  >
                    {{ label(r.role) }}
                    <button
                      type="button"
                      (click)="removeRole(r.role)"
                      [disabled]="roleBusy()"
                      class="ml-0.5 text-current hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                }
                @if (p.roles.length === 0) {
                  <span class="text-xs text-muted">Nenhum papel</span>
                }
              </div>
              <div class="flex gap-2">
                <select
                  [(ngModel)]="roleToAdd"
                  class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                >
                  <option value="">Adicionar papel...</option>
                  @for (opt of addableRoles(); track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
                <button
                  type="button"
                  (click)="addRole()"
                  [disabled]="!roleToAdd || roleBusy()"
                  class="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Adicionar
                </button>
              </div>
              @if (roleError()) {
                <p class="mt-2 text-sm text-red-600">{{ roleError() }}</p>
              }
            </section>
          </div>

          <!-- Investimentos + Interações -->
          <div class="space-y-6 lg:col-span-2">
            @if (isInvestor()) {
              <section>
                <div class="mb-3 flex items-baseline justify-between">
                  <h2 class="text-lg font-semibold text-ink">
                    Investimentos
                    <span class="text-sm font-normal text-muted"
                      >({{ p.investments.length }})</span
                    >
                  </h2>
                  <span class="text-sm font-semibold text-primary">{{
                    formatBRL(totalInvested())
                  }}</span>
                </div>
                @if (p.investments.length === 0) {
                  <div
                    class="rounded-xl border border-border bg-card p-5 text-sm text-muted shadow-card"
                  >
                    Nenhum investimento registrado
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (inv of p.investments; track inv.id) {
                      <div
                        class="rounded-xl border border-border bg-card p-4 shadow-card"
                      >
                        <div class="flex items-center justify-between">
                          <span class="text-lg font-bold text-primary">{{
                            formatBRL(inv.amount)
                          }}</span>
                          <span
                            class="rounded-full bg-surface-warm px-2 py-0.5 text-xs font-medium text-ink"
                            >{{ inv.type }}</span
                          >
                        </div>
                        <p class="mt-1 text-sm text-muted">
                          {{ formatDate(inv.date) }}
                        </p>
                        @if (inv.notes) {
                          <p class="mt-2 text-sm text-ink">{{ inv.notes }}</p>
                        }
                      </div>
                    }
                  </div>
                }
              </section>
            }

            <section>
              <div
                class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <h2 class="text-lg font-semibold text-ink">
                  Interações
                  <span class="text-sm font-normal text-muted"
                    >({{ p.interactions.length }})</span
                  >
                </h2>
                @if (canWriteInteractions) {
                  <button
                    type="button"
                    (click)="openInteractionForm()"
                    class="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                  >
                    Nova interação
                  </button>
                }
              </div>
              @if (interactionFeedback()) {
                <div
                  class="mb-3 rounded-lg border border-primary bg-card px-3 py-2 text-sm text-primary"
                  role="status"
                >
                  {{ interactionFeedback() }}
                </div>
              }
              @if (p.interactions.length === 0) {
                <div
                  class="rounded-xl border border-border bg-card p-5 text-sm text-muted shadow-card"
                >
                  Nenhuma interação registrada
                </div>
              } @else {
                <ol class="relative space-y-4 border-l border-border pl-5">
                  @for (it of sortedInteractions(); track it.id) {
                    <li class="relative">
                      <span
                        class="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary"
                      ></span>
                      <div
                        class="rounded-xl border border-border bg-card p-4 shadow-card"
                      >
                        <div class="flex items-center justify-between">
                          <span
                            class="rounded-full bg-surface-warm px-2 py-0.5 text-xs font-medium text-ink"
                            >{{ interactionTypeLabel(it.type) }}</span
                          >
                          <span class="text-xs text-muted">{{
                            formatDate(it.date)
                          }}</span>
                        </div>
                        <p class="mt-2 text-sm text-ink">{{ it.summary }}</p>
                        @if (it.nextStep) {
                          <p
                            class="mt-2 rounded-lg bg-surface-warm px-3 py-2 text-sm text-ink"
                          >
                            <span class="font-medium text-primary"
                              >Próximo passo:</span
                            >
                            {{ it.nextStep }}
                          </p>
                        }
                      </div>
                    </li>
                  }
                </ol>
              }
            </section>

            <app-documents-section
              [personId]="p.id"
              title="Documentos da pessoa"
            />
          </div>
        </div>

        <!-- Modal Editar -->
        @if (editOpen()) {
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            (click)="closeEdit()"
          >
            <div
              class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl"
              (click)="$event.stopPropagation()"
            >
              <h2 class="mb-4 text-lg font-semibold text-ink">Editar Pessoa</h2>
              <form (ngSubmit)="saveEdit()" class="space-y-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink"
                    >Nome *</label
                  >
                  <input
                    type="text"
                    name="ename"
                    [(ngModel)]="editForm.name"
                    required
                    class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink"
                      >Tipo de Pessoa</label
                    >
                    <select
                      name="epersonType"
                      [(ngModel)]="editForm.personType"
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="FISICA">Física</option>
                      <option value="JURIDICA">Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink"
                      >Tipo de Doc.</label
                    >
                    <select
                      name="edocumentType"
                      [(ngModel)]="editForm.documentType"
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink"
                      >Documento *</label
                    >
                    <input
                      type="text"
                      name="edocument"
                      [(ngModel)]="editForm.document"
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink"
                      >Email</label
                    >
                    <input
                      type="email"
                      name="eemail"
                      [(ngModel)]="editForm.email"
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    @if (editEmailInvalid()) {
                      <p class="mt-1 text-xs text-red-600">Email inválido</p>
                    }
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink"
                      >Telefone</label
                    >
                    <input
                      type="text"
                      name="ephone"
                      [(ngModel)]="editForm.phone"
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink"
                    >Endereço</label
                  >
                  <input
                    type="text"
                    name="eaddress"
                    [(ngModel)]="editForm.address"
                    class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink"
                    >Observações</label
                  >
                  <textarea
                    name="enotes"
                    [(ngModel)]="editForm.notes"
                    rows="2"
                    class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  ></textarea>
                </div>
                @if (saveEditError()) {
                  <p class="text-sm text-red-600">{{ saveEditError() }}</p>
                }
                <div class="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    (click)="closeEdit()"
                    class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-warm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    [disabled]="
                      !editForm.name.trim() ||
                      !editForm.document.trim() ||
                      editEmailInvalid() ||
                      savingEdit()
                    "
                    class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {{ savingEdit() ? 'Salvando...' : 'Salvar' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        @if (interactionFormOpen()) {
          <app-interaction-form-modal
            [fixedPersonId]="p.id"
            [fixedPersonName]="p.name"
            (closed)="closeInteractionForm()"
            (saved)="onInteractionSaved($event)"
          />
        }
      }
    }
  `,
})
export class PersonDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly personService = inject(PersonService);
  private readonly authorization = inject(AuthorizationService);

  private personId = '';

  readonly person = signal<PersonDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly interactionFormOpen = signal(false);
  readonly interactionFeedback = signal('');
  readonly canWriteInteractions = this.authorization.hasPermission(
    APP_PERMISSIONS.INTERACTIONS_WRITE,
  );

  roleToAdd: PersonRoleType | '' = '';
  readonly roleBusy = signal(false);
  readonly roleError = signal('');

  readonly editOpen = signal(false);
  readonly savingEdit = signal(false);
  readonly saveEditError = signal('');
  editForm: EditForm = this.emptyEdit();

  readonly label = roleLabel;
  readonly badge = roleBadge;

  private readonly currencyFmt = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  readonly isInvestor = computed(
    () => !!this.person()?.roles.some((r) => r.role === 'INVESTIDOR'),
  );
  readonly totalInvested = computed(() =>
    (this.person()?.investments ?? []).reduce((sum, i) => sum + i.amount, 0),
  );
  readonly sortedInteractions = computed(() =>
    [...(this.person()?.interactions ?? [])].sort(
      (a, b) => +new Date(b.date) - +new Date(a.date),
    ),
  );
  readonly addableRoles = computed(() => {
    const current = new Set((this.person()?.roles ?? []).map((r) => r.role));
    return ROLE_OPTIONS.filter((o) => !current.has(o.value));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Pessoa não encontrada.');
      this.loading.set(false);
      return;
    }
    this.personId = id;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.personService.getById(this.personId).subscribe({
      next: (p) => {
        this.person.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar a pessoa.');
        this.loading.set(false);
      },
    });
  }

  private refreshPerson(): void {
    this.personService
      .getById(this.personId)
      .subscribe({ next: (p) => this.person.set(p) });
  }

  openInteractionForm(): void {
    if (!this.canWriteInteractions || !this.person()) return;
    this.interactionFeedback.set('');
    this.interactionFormOpen.set(true);
  }

  closeInteractionForm(): void {
    this.interactionFormOpen.set(false);
  }

  onInteractionSaved(_: Interaction): void {
    this.closeInteractionForm();
    this.interactionFeedback.set('Interação criada com sucesso.');
    this.refreshPerson();
  }

  addRole(): void {
    if (!this.roleToAdd || this.roleBusy()) {
      return;
    }
    this.roleBusy.set(true);
    this.roleError.set('');
    this.personService.addRole(this.personId, this.roleToAdd).subscribe({
      next: () => {
        this.roleToAdd = '';
        this.roleBusy.set(false);
        this.refreshPerson();
      },
      error: (err) => {
        this.roleBusy.set(false);
        this.roleError.set(
          extractError(err, 'Não foi possível adicionar o papel.'),
        );
      },
    });
  }

  removeRole(role: PersonRoleType): void {
    if (this.roleBusy()) {
      return;
    }
    this.roleBusy.set(true);
    this.roleError.set('');
    this.personService.removeRole(this.personId, role).subscribe({
      next: () => {
        this.roleBusy.set(false);
        this.refreshPerson();
      },
      error: (err) => {
        this.roleBusy.set(false);
        this.roleError.set(
          extractError(err, 'Não foi possível remover o papel.'),
        );
      },
    });
  }

  openEdit(p: PersonDetail): void {
    this.editForm = {
      name: p.name,
      documentType: p.documentType ?? 'CPF',
      document: p.document ?? '',
      personType: p.personType,
      email: p.email ?? '',
      phone: p.phone ?? '',
      address: p.address ?? '',
      notes: p.notes ?? '',
    };
    this.saveEditError.set('');
    this.editOpen.set(true);
  }

  closeEdit(): void {
    this.editOpen.set(false);
  }

  editEmailInvalid(): boolean {
    const email = this.editForm.email.trim();
    return email.length > 0 && !isEmailValid(email);
  }

  saveEdit(): void {
    if (
      !this.editForm.name.trim() ||
      !this.editForm.document.trim() ||
      this.editEmailInvalid() ||
      this.savingEdit()
    ) {
      return;
    }
    this.savingEdit.set(true);
    this.saveEditError.set('');
    this.personService
      .update(this.personId, {
        name: this.editForm.name.trim(),
        personType: this.editForm.personType,
        documentType: this.editForm.documentType,
        document: this.editForm.document.trim(),
        email: this.editForm.email.trim() || undefined,
        phone: this.editForm.phone.trim() || undefined,
        address: this.editForm.address.trim() || undefined,
        notes: this.editForm.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingEdit.set(false);
          this.closeEdit();
          this.refreshPerson();
        },
        error: (err) => {
          this.savingEdit.set(false);
          this.saveEditError.set(
            err?.status === 409 ? 'Documento já cadastrado' : extractError(err),
          );
        },
      });
  }

  typeLabel(type: PersonType): string {
    return type === 'FISICA' ? 'Física' : 'Jurídica';
  }

  formatBRL(value: number): string {
    return this.currencyFmt.format(value ?? 0);
  }

  formatDate(value?: string | null): string {
    return value ? formatCalendarDate(value) : '—';
  }

  interactionTypeLabel(type: Interaction['type']): string {
    const labels: Record<Interaction['type'], string> = {
      REUNIAO: 'Reunião',
      LIGACAO: 'Ligação',
      WHATSAPP: 'WhatsApp',
      EMAIL: 'E-mail',
      OUTRO: 'Outro',
    };
    return labels[type];
  }

  private emptyEdit(): EditForm {
    return {
      name: '',
      documentType: 'CPF',
      document: '',
      personType: 'FISICA',
      email: '',
      phone: '',
      address: '',
      notes: '',
    };
  }
}
