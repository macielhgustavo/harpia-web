import { Component, ChangeDetectorRef, Input, OnChanges, OnInit } from '@angular/core';
import { MonetaryAdjustmentService } from '../../../../core/services/monetary-adjustment.service';

interface ReceivableAdjustment {
  id: string;
  receivableId: string;
  organizationId: string;
  previousAmount: number;
  adjustedAmount: number;
  difference: number;
  startCompetence: string; // ISO date string
  endCompetence: string; // ISO date string
  indexValues: Record<string, number>; // map of competence to percentage
  appliedAt: string | null;
  appliedById: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Receivable {
  id: string;
  description: string;
  originalAmount: number;
  adjustedAmount: number;
  status: string;
}

@Component({
  selector: 'app-receivable-adjustments-tab',
  templateUrl: './receivable-adjustments-tab.component.html',
  styleUrls: ['./receivable-adjustments-tab.component.scss']
})
export class ReceivableAdjustmentsTabComponent implements OnChanges, OnInit {
  @Input() selectedReceivable: Receivable | null = null;
  adjustments: ReceivableAdjustment[] = [];
  isLoading = false;
  errorMessage = '';

  // Form states
  editingAdjustmentId: string | null = null;
  newStartCompetence = '';
  newEndCompetence = '';
  newIndexValues: Record<string, number> = {};

  constructor(
    private monetaryAdjustmentService: MonetaryAdjustmentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAdjustments();
  }

  ngOnChanges(): void {
    this.loadAdjustments();
  }

  loadAdjustments(): void {
    if (!this.selectedReceivable) {
      this.adjustments = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.monetaryAdjustmentService.getReceivableAdjustments(this.selectedReceivable.id).subscribe({
      next: (adjustments) => {
        this.adjustments = adjustments;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load receivable adjustments';
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // CRUD operations
  createAdjustment(): void {
    if (!this.selectedReceivable) return;
    if (!this.newStartCompetence || !this.newEndCompetence) {
      return;
    }

    // We need to get the user ID from somewhere.
    // For now, we'll hardcode it or get it from a service.
    // We'll leave it as a placeholder.
    const userId = 'current-user-id'; // TODO: get from auth service

    const dto = {
      startCompetence: this.newStartCompetence,
      endCompetence: this.newEndCompetence,
      indexValues: this.newIndexValues,
      appliedById: userId,
    };

    this.monetaryAdjustmentService.createReceivableAdjustment(this.selectedReceivable.id, dto, userId).subscribe({
      next: (createdAdjustment) => {
        this.adjustments.push(createdAdjustment);
        this.clearForm();
        this.loadAdjustments();
      },
      error: (err) => {
        this.errorMessage = 'Failed to create receivable adjustment';
        console.error(err);
      }
    });
  }

  updateAdjustment(): void {
    if (!this.selectedReceivable || !this.editingAdjustmentId) return;

    // We need to get the user ID from somewhere.
    // For now, we'll hardcode it or get it from a service.
    // We'll leave it as a placeholder.
    const userId = 'current-user-id'; // TODO: get from auth service

    const dto = {
      startCompetence: this.newStartCompetence,
      endCompetence: this.newEndCompetence,
      indexValues: this.newIndexValues,
      appliedById: userId,
    };

    this.monetaryAdjustmentService.updateReceivableAdjustment(this.editingAdjustmentId, dto).subscribe({
      next: (updatedAdjustment) => {
        // Update the adjustments array
        const index = this.adjustments.findIndex(a => a.id === updatedAdjustment.id);
        if (index !== -1) {
          this.adjustments[index] = updatedAdjustment;
        }
        this.clearForm();
        this.loadAdjustments();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update receivable adjustment';
        console.error(err);
      }
    });
  }

  deleteAdjustment(id: string): void {
    if (!this.selectedReceivable) return;
    if (!confirm('Tem certeza que deseja excluir este ajuste?')) return;

    this.monetaryAdjustmentService.deleteReceivableAdjustment(id).subscribe({
      next: () => {
        this.adjustments = this.adjustments.filter(a => a.id !== id);
        this.clearForm();
        this.loadAdjustments();
      },
      error: (err) => {
        this.errorMessage = 'Failed to delete receivable adjustment';
        console.error(err);
      }
    });
  }

  // Form handling
  clearForm(): void {
    this.newStartCompetence = '';
    this.newEndCompetence = '';
    this.newIndexValues = {};
    this.editingAdjustmentId = null;
  }

  editAdjustment(adjustment: ReceivableAdjustment): void {
    this.editingAdjustmentId = adjustment.id;
    this.newStartCompetence = adjustment.startCompetence;
    this.newEndCompetence = adjustment.endCompetence;
    this.newIndexValues = { ...adjustment.indexValues };
  }
}