import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Trash2, X } from 'lucide-angular';
import { Person } from '../../core/models/person.model';
import { SalesProposal } from '../../core/models/proposal.model';
import { SaleDetail } from '../../core/models/sale.model';
import { PersonService } from '../../core/services/person.service';
import { SaleService } from '../../core/services/sale.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { formatBrl } from '../../shared/utils/currency';
import { extractError } from '../../shared/utils/http-error';

interface BuyerRow {
  personId: string;
  participation: string;
}

@Component({
  selector: 'app-sale-conversion-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DialogFocusDirective],
  templateUrl: './sale-conversion-modal.component.html',
})
export class SaleConversionModalComponent implements OnInit {
  private readonly peopleService = inject(PersonService);
  private readonly salesService = inject(SaleService);

  @Input({ required: true }) proposal!: SalesProposal;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly converted = new EventEmitter<SaleDetail>();

  readonly people = signal<Person[]>([]);
  readonly loadingPeople = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly AddIcon = Plus;
  readonly RemoveIcon = Trash2;
  readonly CloseIcon = X;

  saleNumber = '';
  saleDate = new Date().toISOString().slice(0, 10);
  notes = '';
  useParticipation = false;
  buyerRows: BuyerRow[] = [];

  ngOnInit(): void {
    this.peopleService.list().subscribe({
      next: (people) => {
        this.people.set(people);
        this.loadingPeople.set(false);
      },
      error: (error: unknown) => {
        this.loadingPeople.set(false);
        this.error.set(
          extractError(error, 'Não foi possível carregar os compradores.'),
        );
      },
    });
  }

  addBuyer(): void {
    if (this.saving()) return;
    this.buyerRows = [...this.buyerRows, { personId: '', participation: '' }];
  }

  removeBuyer(index: number): void {
    if (this.saving()) return;
    this.buyerRows = this.buyerRows.filter((_, rowIndex) => rowIndex !== index);
  }

  close(): void {
    if (!this.saving()) this.closed.emit();
  }

  save(): void {
    if (this.saving() || this.loadingPeople()) return;
    this.error.set('');
    const allIds = [
      this.proposal.personId,
      ...this.buyerRows.map(({ personId }) => personId),
    ];
    if (this.buyerRows.some(({ personId }) => !personId)) {
      this.error.set('Selecione todos os compradores adicionais.');
      return;
    }
    if (new Set(allIds).size !== allIds.length) {
      this.error.set('Não repita compradores na mesma venda.');
      return;
    }
    const participations = [
      this.primaryParticipation(),
      ...this.buyerRows.map(({ participation }) => participation),
    ];
    if (
      this.useParticipation &&
      (participations.some((value) => !this.validPercentage(value)) ||
        Math.abs(
          participations.reduce(
            (sum, value) => sum + Number(value.replace(',', '.')),
            0,
          ) - 100,
        ) > 0.001)
    ) {
      this.error.set('As participações devem ser válidas e somar 100%.');
      return;
    }
    const normalize = (value: string) => value.trim().replace(',', '.');
    this.saving.set(true);
    this.salesService
      .convertProposal(this.proposal.id, {
        ...(this.saleNumber.trim()
          ? { saleNumber: this.saleNumber.trim() }
          : {}),
        saleDate: this.saleDate,
        ...(this.notes.trim() ? { notes: this.notes.trim() } : {}),
        buyers: [
          {
            personId: this.proposal.personId,
            isPrimary: true,
            ...(this.useParticipation
              ? {
                  participationPercentage: normalize(
                    this.primaryParticipation(),
                  ),
                }
              : {}),
          },
          ...this.buyerRows.map((buyer) => ({
            personId: buyer.personId,
            isPrimary: false,
            ...(this.useParticipation
              ? { participationPercentage: normalize(buyer.participation) }
              : {}),
          })),
        ],
      })
      .subscribe({
        next: (sale) => {
          this.saving.set(false);
          this.converted.emit(sale);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.error.set(
            extractError(
              error,
              'Não foi possível converter a proposta em venda.',
            ),
          );
        },
      });
  }

  availablePeople(index: number): Person[] {
    const selected = new Set([
      this.proposal.personId,
      ...this.buyerRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map(({ personId }) => personId),
    ]);
    return this.people().filter((person) => !selected.has(person.id));
  }

  primaryParticipation(): string {
    if (!this.useParticipation) return '';
    const additional = this.buyerRows.reduce(
      (sum, buyer) =>
        sum + (Number(buyer.participation.replace(',', '.')) || 0),
      0,
    );
    return Math.max(0, 100 - additional).toFixed(2);
  }

  formatMoney(value: string | undefined): string {
    return formatBrl(Number(value ?? 0));
  }

  private validPercentage(value: string): boolean {
    const number = Number(value.replace(',', '.'));
    return Number.isFinite(number) && number > 0 && number <= 100;
  }
}
