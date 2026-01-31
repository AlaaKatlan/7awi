import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactRevenue } from '../../models/data.models';

@Component({
  selector: 'app-revenue-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revenue-manager.component.html',
  styleUrls: ['./revenue-manager.component.scss']
})
export class RevenueManagerComponent {
  dataService = inject(DataService);

  // Filters
  searchText = signal('');
  filterYear = signal<number | null>(new Date().getFullYear());
  filterMonth = signal<number | null>(null);
  filterProduct = signal<number | null>(null);
  filterCountry = signal('ALL');

  // UI State
  showModal = false;
  isEditMode = false;
  loading = signal(false);

  // Lists
  employees = this.dataService.employees;
  products = this.dataService.products;

  months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  yearsList = computed(() => {
    const years = new Set(this.dataService.revenues().map(r => new Date(r.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  });

  // Modal Fields
  modalMonth = new Date().getMonth() + 1;
  modalYear = new Date().getFullYear();

  currentItem: Partial<FactRevenue> = this.getEmptyRevenue();

  // Filter Logic
  filteredRevenues = computed(() => {
    let data = this.dataService.revenues();

    // فلتر السنة
    if (this.filterYear()) {
      data = data.filter(r => new Date(r.date).getFullYear() === this.filterYear());
    }
    // فلتر الشهر
    if (this.filterMonth()) {
      data = data.filter(r => new Date(r.date).getMonth() + 1 === this.filterMonth());
    }
    // فلتر المنتج (تم إصلاحه)
    if (this.filterProduct()) {
      // استخدام == للمقارنة المرنة بين النص والرقم
      data = data.filter(r => r.product_id == this.filterProduct());
    }
    // فلتر الدولة
    if (this.filterCountry() !== 'ALL') {
      data = data.filter(r => r.country === this.filterCountry());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(r =>
        (r.order_number?.toLowerCase().includes(text)) ||
        (r.country.toLowerCase().includes(text))
      );
    }

    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  totalGross = computed(() => {
    return this.filteredRevenues().reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);
  });

  getEmptyRevenue(): Partial<FactRevenue> {
    const today = new Date();
    return {
      date: today.toISOString().split('T')[0],
      product_id: this.products()[0]?.product_id || 1,
      country: 'UAE',
      gross_amount: 0,
      total_value: 0,
      order_number: 'Generating...',
      lead_id: this.employees()[0]?.employee_id,
      owner_id: this.employees()[0]?.employee_id
    };
  }

  openModal() {
    this.isEditMode = false;
    this.currentItem = this.getEmptyRevenue();
    this.showModal = true;
    this.updateBookingOrder();
  }

  editItem(item: FactRevenue) {
    this.isEditMode = true;
    this.currentItem = { ...item };
    const d = new Date(item.date);
    this.modalMonth = d.getMonth() + 1;
    this.modalYear = d.getFullYear();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  updateBookingOrder() {
    if (!this.isEditMode && this.currentItem.country && this.currentItem.product_id) {
      this.currentItem.order_number = this.dataService.generateBookingRef(
        this.currentItem.country,
        Number(this.currentItem.product_id)
      );
    }
  }

  async save() {
    this.loading.set(true);
    const monthStr = this.modalMonth.toString().padStart(2, '0');
    this.currentItem.date = `${this.modalYear}-${monthStr}-01`;

    try {
      let result;
      if (this.isEditMode) {
        result = await this.dataService.updateRevenue(this.currentItem);
      } else {
        result = await this.dataService.addRevenue(this.currentItem);
      }

      if (result.success) {
        this.closeModal();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}
