import { Component, OnInit } from '@angular/core';
import { MonetaryAdjustmentService } from '../../../core/services/monetary-adjustment.service';
import { ReceivableService } from '../../../core/services/receivable.service';
import { Observable } from 'rxjs';

// Interfaces for monetary adjustment entities
interface MonetaryIndex {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  periodicity: string;
  createdAt: string;
  updatedAt: string;
}

interface MonetaryIndexValue {
  id: string;
  monetaryIndexId: string;
  organizationId: string;
  competence: string; // ISO date string
  percentage: number;
  source: string | null;
  publishedAt: string | null;
  responsibleId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReceivableAdjustmentPolicy {
  id: string;
  receivableId: string;
  organizationId: string;
  monetaryIndexId: string;
  baseDate: string; // ISO date string
  periodicity: string;
  lag: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  // ... other fields we might need
}

@Component({
  selector: 'app-monetary-adjustment',
  templateUrl: './monetary-adjustment.component.html',
  styleUrls: ['./monetary-adjustment.component.scss']
})
export class MonetaryAdjustmentComponent implements OnInit {
  monetaryIndices: MonetaryIndex[] = [];
  selectedMonetaryIndex: MonetaryIndex | null = null;
  monetaryIndexValues: MonetaryIndexValue[] = [];
  receivableAdjustmentPolicies: ReceivableAdjustmentPolicy[] = [];
  receivableAdjustments: ReceivableAdjustment[] = [];
  receivables: Receivable[] = [];
  selectedReceivable: Receivable | null = null;

  // UI states
  isLoading = false;
  errorMessage = '';

  // Form states for creating/editing (we'll move these to the tab components)
  // We'll keep the tab components handle their own forms.

  constructor(
    private monetaryAdjustmentService: MonetaryAdjustmentService,
    private receivableService: ReceivableService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load monetary indices
    this.monetaryAdjustmentService.getMonetaryIndices().subscribe({
      next: (indices) => {
        this.monetaryIndices = indices;
        if (indices.length > 0) {
          this.selectMonetaryIndex(indices[0]);
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load monetary indices';
        console.error(err);
        this.isLoading = false;
      }
    });

    // Load receivables for selection
    this.receivableService.getReceivables().subscribe({
      next: (receivables) => {
        this.receivables = receivables;
        if (receivables.length > 0) {
          this.selectReceivable(receivables[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load receivables', err);
      }
    });
  }

  selectMonetaryIndex(index: MonetaryIndex): void {
    this.selectedMonetaryIndex = index;
    this.loadMonetaryIndexValues(index.id);
  }

  loadMonetaryIndexValues(monetaryIndexId: string): void {
    this.monetaryAdjustmentService.getMonetaryIndexValues(monetaryIndexId).subscribe({
      next: (values) => {
        this.monetaryIndexValues = values;
      },
      error: (err) => {
        console.error('Failed to load monetary index values', err);
      }
    });
  }

  selectReceivable(receivable: Receivable): void {
    this.selectedReceivable = receivable;
    this.loadReceivablePolicies(receivable.id);
    this.loadReceivableAdjustments(receivable.id);
  }

  loadReceivablePolicies(receivableId: string): void {
    // We don't have a method to get policies yet.
    // We'll leave it as a TODO.
    this.receivableAdjustmentPolicies = [];
  }

  loadReceivableAdjustments(receivableId: string): void {
    this.monetaryAdjustmentService.getReceivableAdjustments(receivableId).subscribe({
      next: (adjustments) => {
        this.receivableAdjustments = adjustments;
      },
      error: (err) => {
        console.error('Failed to load receivable adjustments', err);
      }
    });
  }
}
