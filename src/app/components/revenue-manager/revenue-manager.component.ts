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

  // Filters Signals
  searchText = signal('');
  filterYear = signal<number | null>(new Date().getFullYear());
  filterMonth = signal<number | null>(null);
  filterProduct = signal<number | null>(null);
  filterCountry = signal('ALL');

  showModal = false;
  isEditMode = false;

  // Modal specific variables
  modalMonth = new Date().getMonth();
  modalYear = new Date().getFullYear();

  months = [
    { name: 'January', value: 0 }, { name: 'February', value: 1 }, { name: 'March', value: 2 },
    { name: 'April', value: 3 }, { name: 'May', value: 4 }, { name: 'June', value: 5 },
    { name: 'July', value: 6 }, { name: 'August', value: 7 }, { name: 'September', value: 8 },
    { name: 'October', value: 9 }, { name: 'November', value: 10 }, { name: 'December', value: 11 }
  ];

  // Dynamic years list from database
  yearsList = computed(() => {
    const data = this.dataService.revenues();
    const currentYear = new Date().getFullYear();
    const dbYears = data.map(r => new Date(r.date).getFullYear());
    const allYears = Array.from(new Set([...dbYears, currentYear]));
    return allYears.sort((a, b) => b - a);
  });

  filteredRevenues = computed(() => {
    let data = this.dataService.revenues();

    if (this.filterYear()) {
      data = data.filter(r => new Date(r.date).getFullYear() === this.filterYear());
    }

    if (this.filterMonth() !== null) {
      data = data.filter(r => new Date(r.date).getMonth() === this.filterMonth());
    }

    if (this.filterProduct()) {
      data = data.filter(r => r.product_id === this.filterProduct());
    }

    if (this.filterCountry() !== 'ALL') {
      data = data.filter(r => r.country === this.filterCountry());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(r =>
        this.dataService.getProductName(r.product_id).toLowerCase().includes(text) ||
        (r.order_number?.toLowerCase().includes(text))
      );
    }

    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  totalGross = computed(() => {
    return this.filteredRevenues().reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);
  });

  getEmptyRevenue(): FactRevenue {
    return {
      date: '',
      product_id: this.dataService.products()[0]?.product_id || 1,
      country: 'UAE',
      gross_amount: 0,
      order_number: ''
    };
  }

  async openModal() {
    this.isEditMode = false;
    this.currentItem = this.getEmptyRevenue();
    this.modalMonth = new Date().getMonth();
    this.modalYear = new Date().getFullYear();
    
    // Auto-generate order number
    this.currentItem.order_number = await this.dataService.generateOrderNumber();
    
    this.showModal = true;
  }

  editItem(item: FactRevenue) {
    this.isEditMode = true;
    this.currentItem = { ...item };
    const d = new Date(item.date);
    this.modalMonth = d.getMonth();
    this.modalYear = d.getFullYear();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  currentItem: FactRevenue = this.getEmptyRevenue();

  async save() {
    const monthStr = (this.modalMonth + 1).toString().padStart(2, '0');
    this.currentItem.date = `${this.modalYear}-${monthStr}-01`;

    if (this.isEditMode) {
      await this.dataService.updateRevenue(this.currentItem);
    } else {
      await this.dataService.addRevenue(this.currentItem);
    }
    this.closeModal();
  }
}
