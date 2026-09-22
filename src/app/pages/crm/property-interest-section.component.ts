import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Opportunity,
  OpportunityPropertyInterest,
  UnitMatch,
  UnitMatchCriterion,
  UnitMatchScoreFactor,
  UnitMatchesPage,
  PropertyInterestPurpose,
  UpsertOpportunityPropertyInterestInput,
} from '../../core/models/crm.model';
import { DevelopmentListItem } from '../../core/models/development.model';
import { UnitTypeListItem } from '../../core/models/unit-type.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import { CrmService } from '../../core/services/crm.service';
import { UnitTypeService } from '../../core/services/unit-type.service';
import { extractError } from '../../shared/utils/http-error';

interface InterestForm {
  developmentId: string;
  unitTypeId: string;
  minBedrooms: string;
  maxBedrooms: string;
  minArea: string;
  maxArea: string;
  minPrice: string;
  maxPrice: string;
  availableDownPayment: string;
  purpose: PropertyInterestPurpose | '';
  notes: string;
}

const DECIMAL_PATTERN = /^(?:0|[1-9]\d{0,15})(?:[.,]\d{1,2})?$/;
const BEDROOM_PATTERN = /^\d{1,3}$/;

@Component({
  selector: 'app-property-interest-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './property-interest-section.component.html',
})
export class PropertyInterestSectionComponent implements OnInit, OnDestroy {
  private readonly crm = inject(CrmService);
  private readonly unitTypesService = inject(UnitTypeService);
  private readonly authorization = inject(AuthorizationService);
  private readonly destroy$ = new Subject<void>();
  private typeLoadSequence = 0;
  private matchingSequence = 0;
  private failedMatchesPage = 1;

  @Input({ required: true }) opportunity!: Opportunity;
  @Input() developments: DevelopmentListItem[] = [];
  @Output() readonly unitSelected = new EventEmitter<Opportunity>();

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.CRM_WRITE,
  );
  readonly interest = signal<OpportunityPropertyInterest | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly removing = signal(false);
  readonly confirmRemove = signal(false);
  readonly actionError = signal('');
  readonly feedback = signal('');
  readonly submitted = signal(false);
  readonly unitTypes = signal<UnitTypeListItem[]>([]);
  readonly typesLoading = signal(false);
  readonly typesError = signal('');
  readonly matchesOpen = signal(false);
  readonly matches = signal<UnitMatch[]>([]);
  readonly matchesPage = signal<UnitMatchesPage['pagination'] | null>(null);
  readonly matchesLoading = signal(false);
  readonly matchesError = signal('');
  readonly selectingUnitId = signal<string | null>(null);
  readonly pendingSelection = signal<UnitMatch | null>(null);
  readonly selectionError = signal('');
  readonly selectionFeedback = signal('');
  readonly staleUnitId = signal<string | null>(null);
  form: InterestForm = this.emptyForm();

  readonly purposes: { value: PropertyInterestPurpose; label: string }[] = [
    { value: 'MORADIA', label: 'Moradia' },
    { value: 'INVESTIMENTO', label: 'Investimento' },
    { value: 'SEGUNDA_MORADIA', label: 'Segunda moradia' },
    { value: 'OUTRO', label: 'Outro' },
  ];

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.crm
      .getPropertyInterest(this.opportunity.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interest) => {
          const wasOpen = this.matchesOpen();
          this.interest.set(interest);
          this.resetMatches();
          if (wasOpen) this.showMatches();
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(
            extractError(error, 'Não foi possível carregar as preferências.'),
          );
        },
      });
  }

  openEditor(): void {
    if (!this.canWrite || this.loading() || this.saving()) return;
    const interest = this.interest();
    this.form = interest
      ? {
          developmentId: interest.developmentId ?? '',
          unitTypeId: interest.unitTypeId ?? '',
          minBedrooms: this.field(interest.minBedrooms),
          maxBedrooms: this.field(interest.maxBedrooms),
          minArea: this.field(interest.minArea),
          maxArea: this.field(interest.maxArea),
          minPrice: interest.minPrice ?? '',
          maxPrice: interest.maxPrice ?? '',
          availableDownPayment: interest.availableDownPayment ?? '',
          purpose: interest.purpose ?? '',
          notes: interest.notes ?? '',
        }
      : {
          ...this.emptyForm(),
          developmentId: this.opportunity.developmentId ?? '',
          unitTypeId: this.opportunity.unit?.unitTypeId ?? '',
        };
    this.actionError.set('');
    this.submitted.set(false);
    this.editing.set(true);
    this.loadTypes();
  }

  closeEditor(): void {
    if (!this.saving()) this.editing.set(false);
  }

  onDevelopmentChange(): void {
    this.form.unitTypeId = '';
    this.loadTypes();
  }

  loadTypes(): void {
    const sequence = ++this.typeLoadSequence;
    this.unitTypes.set([]);
    this.typesError.set('');
    if (!this.form.developmentId) {
      this.typesLoading.set(false);
      return;
    }
    this.typesLoading.set(true);
    this.unitTypesService
      .list(this.form.developmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          if (sequence !== this.typeLoadSequence) return;
          this.unitTypes.set(items);
          this.typesLoading.set(false);
          if (
            this.form.unitTypeId &&
            !items.some((item) => item.id === this.form.unitTypeId)
          ) {
            this.form.unitTypeId = '';
          }
        },
        error: (error: unknown) => {
          if (sequence !== this.typeLoadSequence) return;
          this.typesLoading.set(false);
          this.typesError.set(
            extractError(error, 'Não foi possível carregar as tipologias.'),
          );
        },
      });
  }

  isValid(): boolean {
    const bedrooms = [this.form.minBedrooms, this.form.maxBedrooms];
    const areas = [this.form.minArea, this.form.maxArea];
    const money = [
      this.form.minPrice,
      this.form.maxPrice,
      this.form.availableDownPayment,
    ];
    return (
      bedrooms.every(
        (value) =>
          !value || (BEDROOM_PATTERN.test(value) && Number(value) <= 100),
      ) &&
      areas.every((value) => !value || DECIMAL_PATTERN.test(value)) &&
      money.every((value) => !value || DECIMAL_PATTERN.test(value)) &&
      this.inOrder(this.form.minBedrooms, this.form.maxBedrooms) &&
      this.inOrder(this.form.minArea, this.form.maxArea) &&
      this.moneyInOrder(this.form.minPrice, this.form.maxPrice) &&
      (!this.form.unitTypeId || !!this.form.developmentId) &&
      this.form.notes.trim().length <= 2000
    );
  }

  save(): void {
    if (!this.canWrite || this.saving()) return;
    this.submitted.set(true);
    if (!this.isValid()) return;
    this.saving.set(true);
    this.actionError.set('');
    const payload: UpsertOpportunityPropertyInterestInput = {
      developmentId: this.form.developmentId || null,
      unitTypeId: this.form.unitTypeId || null,
      minBedrooms: this.integerOrNull(this.form.minBedrooms),
      maxBedrooms: this.integerOrNull(this.form.maxBedrooms),
      minArea: this.numberOrNull(this.form.minArea),
      maxArea: this.numberOrNull(this.form.maxArea),
      minPrice: this.moneyOrNull(this.form.minPrice),
      maxPrice: this.moneyOrNull(this.form.maxPrice),
      availableDownPayment: this.moneyOrNull(this.form.availableDownPayment),
      purpose: this.form.purpose || null,
      notes: this.form.notes.trim() || null,
    };
    this.crm
      .upsertPropertyInterest(this.opportunity.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interest) => {
          const wasOpen = this.matchesOpen();
          this.interest.set(interest);
          this.resetMatches();
          if (wasOpen) this.showMatches();
          this.saving.set(false);
          this.editing.set(false);
          this.feedback.set('Preferências salvas.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.actionError.set(
            extractError(error, 'Não foi possível salvar as preferências.'),
          );
        },
      });
  }

  remove(): void {
    if (!this.canWrite || !this.interest() || this.removing()) return;
    this.removing.set(true);
    this.actionError.set('');
    this.crm
      .removePropertyInterest(this.opportunity.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.interest.set(null);
          this.resetMatches();
          this.removing.set(false);
          this.confirmRemove.set(false);
          this.editing.set(false);
          this.feedback.set('Preferências removidas.');
        },
        error: (error: unknown) => {
          this.removing.set(false);
          this.actionError.set(
            extractError(error, 'Não foi possível remover as preferências.'),
          );
        },
      });
  }

  purposeLabel(value: PropertyInterestPurpose | null): string {
    return this.purposes.find((item) => item.value === value)?.label ?? '—';
  }

  compatibilityLevelLabel(level: UnitMatch['compatibilityLevel']): string {
    return {
      EXCELENTE: 'Excelente',
      ALTA: 'Alta',
      MODERADA: 'Moderada',
      BAIXA: 'Baixa',
      NOT_EVALUATED: 'Não avaliada',
    }[level];
  }

  scoreFactorLabel(criterion: UnitMatchScoreFactor['criterion']): string {
    return { PRICE: 'Preço', AREA: 'Área', BEDROOMS: 'Quartos' }[criterion];
  }

  formatScoreContribution(value: string): string {
    return value.replace('.', ',');
  }

  showMatches(): void {
    if (!this.interest()) return;
    this.matchesOpen.set(true);
    this.loadMatches(1);
  }

  loadMoreMatches(): void {
    const current = this.matchesPage();
    if (!current || current.page >= current.totalPages) return;
    this.loadMatches(current.page + 1);
  }

  retryMatches(): void {
    this.loadMatches(this.failedMatchesPage);
  }

  refreshMatches(): void {
    if (!this.interest() || this.matchesLoading()) return;
    this.loadMatches(1);
  }

  mainReasons(match: UnitMatch): UnitMatchCriterion[] {
    return match.criteria
      .filter(
        (criterion) =>
          criterion.kind === 'SOFT' && criterion.status !== 'NOT_EVALUATED',
      )
      .sort(
        (a, b) =>
          ['PRICE', 'AREA', 'BEDROOMS'].indexOf(a.code) -
          ['PRICE', 'AREA', 'BEDROOMS'].indexOf(b.code),
      )
      .slice(0, 3);
  }

  isSelected(match: UnitMatch): boolean {
    return this.opportunity.unitId === match.unit.id;
  }

  requestSelection(match: UnitMatch): void {
    if (
      !this.canWrite ||
      this.selectingUnitId() ||
      this.isSelected(match) ||
      this.staleUnitId() === match.unit.id
    )
      return;
    this.selectionError.set('');
    this.selectionFeedback.set('');
    if (this.opportunity.unitId) {
      this.pendingSelection.set(match);
      return;
    }
    this.selectUnit(match);
  }

  cancelSelection(): void {
    if (!this.selectingUnitId()) this.pendingSelection.set(null);
  }

  confirmSelection(): void {
    const match = this.pendingSelection();
    if (match) this.selectUnit(match);
  }

  private selectUnit(match: UnitMatch): void {
    if (this.selectingUnitId()) return;
    this.selectingUnitId.set(match.unit.id);
    this.selectionError.set('');
    this.crm
      .updateOpportunity(this.opportunity.id, {
        developmentId: match.development.id,
        unitId: match.unit.id,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.selectingUnitId.set(null);
          this.pendingSelection.set(null);
          this.staleUnitId.set(null);
          this.selectionFeedback.set(
            `Unidade ${match.unit.identifier} selecionada. Você pode reservar ou criar uma proposta nas seções abaixo.`,
          );
          this.unitSelected.emit(updated);
        },
        error: (error: unknown) => {
          this.selectingUnitId.set(null);
          this.pendingSelection.set(null);
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.staleUnitId.set(match.unit.id);
            this.selectionError.set(
              'Esta unidade não está mais disponível. Atualizamos as sugestões; escolha outra unidade.',
            );
            this.refreshMatches();
          } else {
            this.selectionError.set(
              extractError(
                error,
                'Não foi possível selecionar a unidade. Tente novamente.',
              ),
            );
          }
        },
      });
  }

  private loadMatches(page: number): void {
    if (this.matchesLoading()) return;
    const sequence = ++this.matchingSequence;
    this.matchesLoading.set(true);
    this.matchesError.set('');
    this.crm
      .getUnitMatches(this.opportunity.id, page)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (sequence !== this.matchingSequence) return;
          const byId = new Map(
            (page === 1 ? [] : this.matches()).map((item) => [
              item.unit.id,
              item,
            ]),
          );
          for (const item of result.data) byId.set(item.unit.id, item);
          this.matches.set([...byId.values()]);
          this.matchesPage.set(result.pagination);
          this.matchesLoading.set(false);
          if (page === 1) this.staleUnitId.set(null);
        },
        error: (error: unknown) => {
          if (sequence !== this.matchingSequence) return;
          this.matchesLoading.set(false);
          this.failedMatchesPage = page;
          this.matchesError.set(
            extractError(
              error,
              'Não foi possível carregar unidades compatíveis.',
            ),
          );
        },
      });
  }

  private resetMatches(): void {
    this.matchingSequence += 1;
    this.matchesOpen.set(false);
    this.matches.set([]);
    this.matchesPage.set(null);
    this.matchesLoading.set(false);
    this.matchesError.set('');
    this.failedMatchesPage = 1;
    this.pendingSelection.set(null);
    this.selectionError.set('');
    this.selectionFeedback.set('');
    this.staleUnitId.set(null);
  }

  bedroomsLabel(interest: OpportunityPropertyInterest): string | null {
    return this.rangeLabel(
      interest.minBedrooms,
      interest.maxBedrooms,
      'quarto',
      'quartos',
    );
  }

  areaLabel(interest: OpportunityPropertyInterest): string | null {
    return this.rangeLabel(interest.minArea, interest.maxArea, 'm²', 'm²');
  }

  priceLabel(interest: OpportunityPropertyInterest): string | null {
    const min = interest.minPrice;
    const max = interest.maxPrice;
    if (min && max) return `${this.formatMoney(min)}–${this.formatMoney(max)}`;
    if (max) return `Até ${this.formatMoney(max)}`;
    if (min) return `A partir de ${this.formatMoney(min)}`;
    return null;
  }

  formatMoney(value: string): string {
    const [whole, fraction = ''] = value.replace(',', '.').split('.');
    if (!/^\d+$/.test(whole) || !/^\d{0,2}$/.test(fraction)) return value;
    return `R$ ${new Intl.NumberFormat('pt-BR').format(BigInt(whole))},${fraction.padEnd(2, '0')}`;
  }

  formatArea(value: string): string {
    return value
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1')
      .replace('.', ',');
  }

  private rangeLabel(
    min: number | null,
    max: number | null,
    singular: string,
    plural: string,
  ): string | null {
    if (min != null && max != null) {
      if (min === max) return `${min} ${min === 1 ? singular : plural}`;
      return `${min}–${max} ${plural}`;
    }
    if (max != null) return `Até ${max} ${plural}`;
    if (min != null) return `A partir de ${min} ${plural}`;
    return null;
  }

  private inOrder(min: string, max: string): boolean {
    return (
      !min ||
      !max ||
      Number(min.replace(',', '.')) <= Number(max.replace(',', '.'))
    );
  }

  private moneyInOrder(min: string, max: string): boolean {
    if (!min || !max) return true;
    return this.cents(min) <= this.cents(max);
  }

  private cents(value: string): bigint {
    const [whole, fraction = ''] = value.replace(',', '.').split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  }

  private integerOrNull(value: string): number | null {
    return value ? Number(value) : null;
  }

  private numberOrNull(value: string): number | null {
    return value ? Number(value.replace(',', '.')) : null;
  }

  private moneyOrNull(value: string): string | null {
    return value ? value.replace(',', '.') : null;
  }

  private field(value: number | null): string {
    return value == null ? '' : String(value);
  }

  private emptyForm(): InterestForm {
    return {
      developmentId: '',
      unitTypeId: '',
      minBedrooms: '',
      maxBedrooms: '',
      minArea: '',
      maxArea: '',
      minPrice: '',
      maxPrice: '',
      availableDownPayment: '',
      purpose: '',
      notes: '',
    };
  }
}
