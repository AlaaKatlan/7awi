import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactCost } from '../../models/data.models';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-cost-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cost-manager.component.html'
})
export class CostManagerComponent {
  dataService = inject(DataService);

  // --- Filters ---
  searchText = signal('');
  filterYear = signal<number | null>(new Date().getFullYear());
  filterMonth = signal<number | null>(new Date().getMonth() + 1);
  filterProduct = signal<number | null>(null);
  filterClient = signal<number | null>(null);

  // --- UI State ---
  showModal = false;
  showDeleteModal = false;
  showGenerateModal = false;
  isEditMode = false;
  loading = signal(false);
  generating = signal(false);

  costToDelete: FactCost | null = null;
  currentCost: FactCost = this.getEmptyCost();

  // --- Generate Options ---
  generateTargetYear = new Date().getFullYear();
  generateTargetMonth = new Date().getMonth() + 1;

  // --- Constants ---
  months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  // --- Computed Lists ---
  yearsList = computed(() => {
    const years = this.dataService.costs().map(c => c.year);
    const allYears = [...years, new Date().getFullYear(), new Date().getFullYear() + 1];
    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  });

  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) =>
      a.product_name.localeCompare(b.product_name)
    );
  });

  sortedClients = computed(() => {
    return this.dataService.clients().slice().sort((a, b) =>
      a.client_name.localeCompare(b.client_name)
    );
  });

  // --- Filter Logic ---
  filteredCosts = computed(() => {
    let data = this.dataService.costs();

    if (this.filterYear() !== null) {
      data = data.filter(c => c.year === this.filterYear());
    }
    if (this.filterMonth() !== null) {
      data = data.filter(c => c.month === this.filterMonth());
    }
    if (this.filterProduct() !== null) {
      data = data.filter(c => c.product_id === this.filterProduct());
    }
    if (this.filterClient() !== null) {
      data = data.filter(c => c.client_id === this.filterClient());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(c =>
        (c.description?.toLowerCase().includes(text)) ||
        (this.dataService.getProductName(c.product_id).toLowerCase().includes(text)) ||
        (this.dataService.getClientName(c.client_id).toLowerCase().includes(text))
      );
    }

    return data.sort((a, b) => {
        // ترتيب حسب التاريخ ثم حسب القسم لسهولة الإدخال
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.product_id || 0) - (b.product_id || 0); // لمقارنة تقريبية
    });
  });

  totalCost = computed(() => {
    return this.filteredCosts().reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  });

  // --- Helpers ---
  getEmptyCost(): FactCost {
    const today = new Date();
    return {
      date: today.toISOString().split('T')[0],
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      amount: 0,
      description: '',
      product_id: undefined,
      client_id: undefined
    };
  }

  getMonthName(m: number) {
    return this.months.find(x => x.value === m)?.name || m;
  }

  // --- Actions ---
  openModal() {
    this.isEditMode = false;
    this.currentCost = this.getEmptyCost();
    const products = this.sortedProducts();
    if (products.length > 0) this.currentCost.product_id = products[0].product_id;
    this.showModal = true;
  }

  editCost(cost: FactCost) {
    this.isEditMode = true;
    this.currentCost = { ...cost };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  confirmDelete(cost: FactCost) {
    this.costToDelete = cost;
    this.showDeleteModal = true;
  }

  // --- Generate Zero Costs Logic ---
  openGenerateModal() {
    // تعيين الشهر الحالي كافتراضي
    const today = new Date();
    this.generateTargetYear = today.getFullYear();
    this.generateTargetMonth = today.getMonth() + 1;
    this.showGenerateModal = true;
  }

  async generateCosts() {
    this.generating.set(true);

    const result = await this.dataService.generateZeroCostsForMonth(
      this.generateTargetYear,
      this.generateTargetMonth
    );

    this.generating.set(false);
    this.showGenerateModal = false;

    if (result.success) {
        if(result.generated > 0) {
            alert(`Success! Generated ${result.generated} records with 0 amount for ${this.getMonthName(this.generateTargetMonth)}.`);
            // الانتقال للفلتر المختار لرؤية النتائج فوراً
            this.filterYear.set(this.generateTargetYear);
            this.filterMonth.set(this.generateTargetMonth);
        } else {
            alert('All departments already have cost records for this month.');
        }
    } else {
        alert('Error: ' + result.error);
    }
  }

  // --- Excel Export ---
  exportToExcel() {
    const data = this.filteredCosts().map(c => ({
      'Date': c.date,
      'Description': c.description,
      'Department': this.dataService.getProductName(c.product_id),
      'Client': this.dataService.getClientName(c.client_id),
      'Amount': c.amount,
      'Year': c.year,
      'Month': this.getMonthName(c.month)
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Costs');
    XLSX.writeFile(wb, `Costs_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  // --- Save & Delete ---
  async save() {
    // السماح بالقيمة 0 الآن لأننا قد نعدل السجلات المولدة
    if (this.currentCost.amount === undefined || this.currentCost.amount === null) {
      alert('Valid amount is required');
      return;
    }

    this.loading.set(true);
    const d = new Date(this.currentCost.date);
    this.currentCost.year = d.getFullYear();
    this.currentCost.month = d.getMonth() + 1;

    try {
      let result;
      if (this.isEditMode) {
        result = await this.dataService.updateCost(this.currentCost);
      } else {
        result = await this.dataService.addCost(this.currentCost);
      }
      if (result.success) {
        this.closeModal();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (e: any) {
      alert('Unexpected error: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteCost() {
    if (!this.costToDelete?.id) return;
    // نتأكد من وجود دالة الحذف في السيرفس أو نستدعيها مباشرة
    // هنا سأفترض أنك أضفتها كما اتفقنا، أو سأستخدم الحذف المباشر هنا للأمان
    try {
        const { error } = await this.dataService['supabase'].from('fact_cost').delete().eq('id', this.costToDelete.id);
        if (!error) {
            this.dataService.costs.update(v => v.filter(c => c.id !== this.costToDelete?.id));
        } else {
            alert('Error deleting: ' + error.message);
        }
    } catch(e: any) {
        alert('Error: ' + e.message);
    }

    this.showDeleteModal = false;
    this.costToDelete = null;
  }
}
