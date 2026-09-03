import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AuditLog,
  AuditLogFilters,
  AuditLogPage,
  JsonValue,
} from '../../core/models/audit-log.model';
import { AuditLogService } from '../../core/services/audit-log.service';
import { DialogFocusDirective } from '../../shared/directives/dialog-focus.directive';
import { extractError } from '../../shared/utils/http-error';

const EMPTY_PAGE: AuditLogPage = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogFocusDirective],
  templateUrl: './audit-logs.component.html',
})
export class AuditLogsComponent implements OnInit {
  private readonly auditLogService = inject(AuditLogService);
  private loadSequence = 0;
  private detailSequence = 0;
  private lastRequestedPage = 1;

  readonly result = signal<AuditLogPage>(EMPTY_PAGE);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly filterError = signal('');

  readonly action = signal('');
  readonly entityType = signal('');
  readonly entityId = signal('');
  readonly actorUserId = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');

  readonly selected = signal<AuditLog | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');

  readonly knownActions = [
    'CREATE',
    'UPDATE',
    'DELETE',
    'DOWNLOAD',
    'AUTH_LOGIN',
    'AUTH_PASSWORD_RESET',
    'AUTH_PASSWORD_CHANGED',
    'USER_INVITATION_CREATED',
    'USER_INVITATION_REVOKED',
    'USER_INVITATION_ACCEPTED',
    'USER_ROLE_CHANGED',
    'USER_STATUS_CHANGED',
    'USER_ACTIVATED',
    'USER_DEACTIVATED',
    'RETURN_PAID',
    'DOCUMENT_UPLOADED',
    'DOCUMENT_DOWNLOADED',
    'DOCUMENT_DELETED',
    'REPORT_EXPORTED',
    'CRM_PIPELINE_CREATED',
    'OPPORTUNITY_CREATED',
    'OPPORTUNITY_UPDATED',
    'OPPORTUNITY_DELETED',
    'OPPORTUNITY_STAGE_CHANGED',
    'OPPORTUNITY_WON',
    'OPPORTUNITY_LOST',
    'SALES_ACTIVITY_CREATED',
    'SALES_ACTIVITY_UPDATED',
    'SALES_ACTIVITY_DELETED',
    'UNIT_RESERVED',
    'UNIT_RESERVATION_CANCELLED',
    'UNIT_RESERVATION_EXPIRED',
    'UNIT_RESERVATION_CONVERTED',
    'PROPOSAL_CREATED',
    'PROPOSAL_VERSION_CREATED',
    'PROPOSAL_SENT',
    'PROPOSAL_ACCEPTED',
    'PROPOSAL_REJECTED',
    'PROPOSAL_EXPIRED',
    'SALE_CREATED',
    'SALE_UPDATED',
    'SALE_BUYER_ADDED',
    'SALE_COMMISSION_CREATED',
    'PROPOSAL_CONVERTED_TO_SALE',
    'RECEIVABLE_CREATED',
    'PAYMENT_RECORDED',
    'PAYMENT_REVERSED',
    'RECEIVABLE_CANCELLED',
    'PAYABLE_CREATED',
    'PAYABLE_UPDATED',
    'PAYABLE_PAID',
    'PAYMENT_CREATED',
    'FINANCIAL_TRANSACTION_CREATED',
    'BANK_STATEMENT_IMPORTED',
    'BANK_TRANSACTION_MATCHED',
    'BANK_TRANSACTION_UNMATCHED',
    'BANK_STATEMENT_IGNORED',
    'BANK_STATEMENT_RESTORED',
  ] as const;

  readonly knownEntityTypes = [
    'AUTH_SESSION',
    'USER',
    'USER_INVITATION',
    'PERSON',
    'COMPANY',
    'DEVELOPMENT',
    'UNIT_TYPE',
    'UNIT',
    'PRICE_TABLE',
    'UNIT_PRICE',
    'INVESTMENT',
    'ALLOCATION',
    'RETURN',
    'DOCUMENT',
    'REPORT',
    'SALES_PIPELINE',
    'OPPORTUNITY',
    'SALES_ACTIVITY',
    'UNIT_RESERVATION',
    'SALES_PROPOSAL',
    'PROPOSAL_VERSION',
    'SALE',
    'RECEIVABLE',
    'FINANCIAL_PAYMENT',
    'FINANCIAL_CATEGORY',
    'COST_CENTER',
    'PAYABLE',
    'FINANCIAL_TRANSACTION',
    'BANK_STATEMENT_ENTRY',
  ] as const;

  private readonly dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  ngOnInit(): void {
    this.load(1);
  }

  applyFilters(): void {
    if (
      this.startDate() &&
      this.endDate() &&
      this.startDate() > this.endDate()
    ) {
      this.filterError.set(
        'A data inicial deve ser anterior ou igual à data final.',
      );
      return;
    }

    this.filterError.set('');
    this.load(1);
  }

  clearFilters(): void {
    this.action.set('');
    this.entityType.set('');
    this.entityId.set('');
    this.actorUserId.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.filterError.set('');
    this.load(1);
  }

  previousPage(): void {
    const page = this.result().pagination.page;
    if (page > 1 && !this.loading()) {
      this.load(page - 1);
    }
  }

  nextPage(): void {
    const { page, totalPages } = this.result().pagination;
    if (page < totalPages && !this.loading()) {
      this.load(page + 1);
    }
  }

  retryLoad(): void {
    this.load(this.lastRequestedPage);
  }

  openDetail(id: string): void {
    if (this.detailLoading()) {
      return;
    }

    this.selected.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
    const sequence = ++this.detailSequence;
    this.auditLogService.getById(id).subscribe({
      next: (log) => {
        if (sequence !== this.detailSequence) {
          return;
        }
        this.selected.set(log);
        this.detailLoading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.detailSequence) {
          return;
        }
        const status = (error as HttpErrorResponse).status;
        this.detailError.set(
          status === 404
            ? 'Registro de auditoria não encontrado.'
            : extractError(
                error,
                'Não foi possível abrir o registro de auditoria.',
              ),
        );
        this.detailLoading.set(false);
      },
    });
  }

  closeDetail(): void {
    this.detailSequence += 1;
    this.selected.set(null);
    this.detailError.set('');
    this.detailLoading.set(false);
  }

  actorLabel(log: AuditLog): string {
    return log.actor?.name || 'Sistema ou usuário removido';
  }

  formatDate(value: string): string {
    return this.dateTimeFormatter.format(new Date(value));
  }

  formatMetadata(metadata: JsonValue | null): string {
    if (metadata === null) {
      return 'Sem metadados';
    }

    return JSON.stringify(metadata, null, 2);
  }

  private load(page: number): void {
    this.lastRequestedPage = page;
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.loadError.set('');

    this.auditLogService.list(this.buildFilters(page)).subscribe({
      next: (result) => {
        if (sequence !== this.loadSequence) {
          return;
        }
        this.result.set(result);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) {
          return;
        }
        this.loadError.set(
          extractError(
            error,
            'Não foi possível carregar os registros de auditoria.',
          ),
        );
        this.loading.set(false);
      },
    });
  }

  private buildFilters(page: number): AuditLogFilters {
    const value = (input: string): string | undefined =>
      input.trim() || undefined;

    return {
      page,
      pageSize: this.result().pagination.pageSize || 20,
      action: value(this.action()),
      entityType: value(this.entityType()),
      entityId: value(this.entityId()),
      actorUserId: value(this.actorUserId()),
      startDate: value(this.startDate()),
      endDate: value(this.endDate()),
    };
  }
}
