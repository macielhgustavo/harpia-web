import { Component, ChangeDetectorRef, Input, OnChanges, OnInit } from '@angular/core';
import { MonetaryAdjustmentService } from '../../../../core/services/monetary-adjustment.service';

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

interface MonetaryIndex {
  id: string;
  name: string;
  code: string;
}

interface Receivable {
  id: string;
  description: string;
  // other fields as needed
}

@Component({
  selector: 'app-receivable-adjustment-policies-tab',
  templateUrl: './receivable-adjustment-policies-tab.component.html',
  styleUrls: ['./receivable-adjustment-policies-tab.component.scss']
})
export class ReceivableAdjustmentPoliciesTabComponent implements OnChanges, OnInit {
  @Input() selectedReceivable: Receivable | null = null;
  policies: ReceivableAdjustmentPolicy[] = [];
  monetaryIndices: MonetaryIndex[] = [];
  isLoading = false;
  errorMessage = '';

  // Form states
  editingPolicyId: string | null = null;
  newMonetaryIndexId = '';
  newBaseDate = '';
  newPeriodicity = '';
  newLag = null;
  newActive = true;

  constructor(
    private monetaryAdjustmentService: MonetaryAdjustmentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMonetaryIndices();
    this.loadPolicies();
  }

  ngOnChanges(): void {
    this.loadPolicies();
  }

  loadMonetaryIndices(): void {
    this.monetaryAdjustmentService.getMonetaryIndices().subscribe({
      next: (indices) => {
        this.monetaryIndices = indices;
      },
      error: (err) => {
        console.error('Failed to load monetary indices', err);
      }
    });
  }

  loadPolicies(): void {
    if (!this.selectedReceivable) {
      this.policies = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.monetaryAdjustmentService.getReceivableAdjustmentPolicies(this.selectedReceivable.id).subscribe({
      next: (policies) => {
        this.policies = policies;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load receivable adjustment policies';
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // CRUD operations
  createPolicy(): void {
    if (!this.selectedReceivable) return;
    if (!this.newMonetaryIndexId || !this.newBaseDate || !this.newPeriodicity) {
      return;
    }

    const dto = {
      receivableId: this.selectedReceivable.id,
      monetaryIndexId: this.newMonetaryIndexId,
      baseDate: this.newBaseDate,
      periodicity: this.newPeriodicity,
      lag: this.newLag,
      active: this.newActive,
    };

    this.monetaryAdjustmentService.createReceivableAdjustmentPolicy(dto).subscribe({
      next: (createdPolicy) => {
        this.policies.push(createdPolicy);
        this.clearForm();
        this.loadPolicies();
      },
      error: (err) => {
        this.errorMessage = 'Failed to create receivable adjustment policy';
        console.error(err);
      }
    });
  }

  updatePolicy(): void {
    if (!this.selectedReceivable || !this.editingPolicyId) return;

    const dto = {
      receivableId: this.selectedReceivable.id,
      monetaryIndexId: this.newMonetaryIndexId,
      baseDate: this.newBaseDate,
      periodicity: this.newPeriodicity,
      lag: this.newLag,
      active: this.newActive,
    };

    this.monetaryAdjustmentService.updateReceivableAdjustmentPolicy(this.editingPolicyId, dto).subscribe({
      next: (updatedPolicy) => {
        // Update the policies array
        const index = this.policies.findIndex(p => p.id === updatedPolicy.id);
        if (index !== -1) {
          this.policies[index] = updatedPolicy;
        }
        this.clearForm();
        this.loadPolicies();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update receivable adjustment policy';
        console.error(err);
      }
    });
  }

  deletePolicy(id: string): void {
    if (!this.selectedReceivable) return;
    if (!confirm('Tem certeza que deseja excluir esta política?')) return;

    this.monetaryAdjustmentService.deleteReceivableAdjustmentPolicy(id).subscribe({
      next: () => {
        this.policies = this.policies.filter(p => p.id !== id);
        this.clearForm();
        this.loadPolicies();
      },
      error: (err) => {
        this.errorMessage = 'Failed to delete receivable adjustment policy';
        console.error(err);
      }
    });
  }

  // Form handling
  clearForm(): void {
    this.newMonetaryIndexId = '';
    this.newBaseDate = '';
    this.newPeriodicity = '';
    this.newLag = null;
    this.newActive = true;
    this.editingPolicyId = null;
  }

  editPolicy(policy: ReceivableAdjustmentPolicy): void {
    this.editingPolicyId = policy.id;
    this.newMonetaryIndexId = policy.monetaryIndexId;
    this.newBaseDate = policy.baseDate;
    this.newPeriodicity = policy.periodicity;
    this.newLag = policy.lag;
    this.newActive = policy.active;
  }
}