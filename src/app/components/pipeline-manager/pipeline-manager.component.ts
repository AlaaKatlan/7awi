import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactPipeline } from '../../models/data.models';

@Component({
  selector: 'app-pipeline-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pipeline-manager.component.html'
})
export class PipelineManagerComponent {
  dataService = inject(DataService);

  searchText = signal('');
  filterYear = signal(new Date().getFullYear());
  filterQuarter = signal<number | null>(null);
  filterStatus = signal('all');
  saving = signal(false);

  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  pipelineToDelete: FactPipeline | null = null;

  currentPipeline: FactPipeline = this.getEmptyPipeline();

  // Computed: قائمة السنوات
  yearsList = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];
  });

  // Computed: العملاء مرتبين أبجدياً مع Other في النهاية
  sortedClients = computed(() => {
    return this.dataService.clients().slice().sort((a, b) => {
      if (a.client_name.toLowerCase() === 'others') return 1;
      if (b.client_name.toLowerCase() === 'others') return -1;
      return a.client_name.localeCompare(b.client_name);
    });
  });

  // Computed: المنتجات مرتبة أبجدياً مع Other في النهاية
  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) => {
      if (a.product_name.toLowerCase() === 'others') return 1;
      if (b.product_name.toLowerCase() === 'others') return -1;
      return a.product_name.localeCompare(b.product_name);
    });
  });

  // Computed: الموظفين مرتبين أبجدياً
  sortedEmployees = computed(() => {
    return this.dataService.employees().filter(e => !e.end_date).slice().sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  // Computed: فلترة البيانات
  filteredPipelines = computed(() => {
    let data = this.dataService.pipelines();

    data = data.filter(p => p.year === this.filterYear());

    if (this.filterQuarter() !== null) {
      data = data.filter(p => p.quarter === this.filterQuarter());
    }

    if (this.filterStatus() !== 'all') {
      data = data.filter(p => p.status === this.filterStatus());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(p =>
        this.dataService.getClientName(p.client_id).toLowerCase().includes(text) ||
        this.dataService.getProductName(p.product_id).toLowerCase().includes(text)
      );
    }

    return data;
  });

  // Stats
  totalPipelineCount = computed(() => this.filteredPipelines().length);
  pendingValue = computed(() => this.filteredPipelines().filter(p => p.status === 'Pending').reduce((sum, p) => sum + Number(p.target_amount), 0));
  doneValue = computed(() => this.filteredPipelines().filter(p => p.status === 'Done' || p.status === 'Completed').reduce((sum, p) => sum + Number(p.target_amount), 0));
  totalValue = computed(() => this.filteredPipelines().reduce((sum, p) => sum + Number(p.target_amount), 0));

  getEmptyPipeline(): FactPipeline {
    return {
      product_id: null as any,
      client_id: null as any,
      target_amount: 0,
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      year: new Date().getFullYear(),
      status: 'Pending',
      lead_id: undefined,
      owner_id: undefined
    };
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Done': return 'bg-emerald-50 text-emerald-700';
      case 'Pending': return 'bg-amber-50 text-amber-700';
      case 'Completed': return 'bg-blue-50 text-blue-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  getClientInitial(clientId: number): string {
    const name = this.dataService.getClientName(clientId);
    return name.charAt(0).toUpperCase();
  }

  canSave(): boolean {
    return !!(this.currentPipeline.client_id && this.currentPipeline.product_id && this.currentPipeline.target_amount > 0);
  }

  openModal() {
    this.isEditMode = false;
    this.currentPipeline = this.getEmptyPipeline();
    this.showModal = true;
  }

  editPipeline(pipe: FactPipeline) {
    this.isEditMode = true;
    this.currentPipeline = {
      id: pipe.id,
      product_id: pipe.product_id,
      client_id: pipe.client_id,
      target_amount: pipe.target_amount,
      quarter: pipe.quarter,
      year: pipe.year,
      status: pipe.status,
      lead_id: pipe.lead_id || undefined,
      owner_id: pipe.owner_id || undefined
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.currentPipeline = this.getEmptyPipeline();
  }

  confirmDelete(pipe: FactPipeline) {
    this.pipelineToDelete = pipe;
    this.showDeleteModal = true;
  }

  async save() {
    if (!this.canSave()) {
      alert('Please fill all required fields.');
      return;
    }

    this.saving.set(true);

    try {
      let result;

      const payload: Partial<FactPipeline> = {
        product_id: Number(this.currentPipeline.product_id),
        client_id: Number(this.currentPipeline.client_id),
        target_amount: Number(this.currentPipeline.target_amount),
        quarter: Number(this.currentPipeline.quarter),
        year: Number(this.currentPipeline.year),
        status: this.currentPipeline.status,
        lead_id: this.currentPipeline.lead_id ? Number(this.currentPipeline.lead_id) : null as any,
        owner_id: this.currentPipeline.owner_id ? Number(this.currentPipeline.owner_id) : null as any
      };

      if (this.isEditMode && this.currentPipeline.id) {
        payload.id = this.currentPipeline.id;
        result = await this.dataService.updatePipeline(payload);
      } else {
        result = await this.dataService.addPipeline(payload);
      }

      if (result.success) {
        this.closeModal();
      } else {
        alert('Error saving pipeline: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      this.saving.set(false);
    }
  }

  async deletePipeline() {
    if (!this.pipelineToDelete?.id) return;

    try {
      const result = await this.dataService.deletePipeline(this.pipelineToDelete.id);
      if (!result.success) {
        alert('Error deleting pipeline: ' + result.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }

    this.showDeleteModal = false;
    this.pipelineToDelete = null;
  }
}
