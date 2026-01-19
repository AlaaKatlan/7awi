import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactRevenue } from '../../models/data.models';

@Component({
  selector: 'app-revenue-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-hawy-blue">
            <h3 class="text-gray-400 text-sm font-medium uppercase">Total Transactions</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ filteredRevenues().length }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
            <h3 class="text-gray-400 text-sm font-medium uppercase">Total Gross (Filtered)</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ totalGross() | currency:'AED ':'symbol':'1.0-0' }}</p>
        </div>
    </div>

    <div class="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">

            <div class="lg:col-span-2">
                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Search</label>
                <input type="text" [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" placeholder="Search anything..."
                       class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-hawy-blue outline-none transition text-sm">
            </div>

            <div>
                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Product</label>
                <select [ngModel]="filterProduct()" (ngModelChange)="filterProduct.set($event)" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:ring-2 focus:ring-hawy-blue">
                    <option [ngValue]="null">All Products</option>
                    @for (p of dataService.products(); track p.product_id) {
                        <option [ngValue]="p.product_id">{{ p.product_name }}</option>
                    }
                </select>
            </div>

            <div>
                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Month</label>
                <select [ngModel]="filterMonth()" (ngModelChange)="filterMonth.set($event)" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:ring-2 focus:ring-hawy-blue">
                    <option [ngValue]="null">All Months</option>
                    @for (m of months; track m.value) {
                        <option [ngValue]="m.value">{{ m.name }}</option>
                    }
                </select>
            </div>

            <div>
                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Year</label>
                <select [ngModel]="filterYear()" (ngModelChange)="filterYear.set($event)" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:ring-2 focus:ring-hawy-blue">
                    <option [ngValue]="null">All Years</option>
                    <option [ngValue]="2024">2024</option>
                    <option [ngValue]="2025">2025</option>
                    <option [ngValue]="2026">2026</option>
                </select>
            </div>

            <div>
                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Country</label>
                <select [ngModel]="filterCountry()" (ngModelChange)="filterCountry.set($event)" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm focus:ring-2 focus:ring-hawy-blue">
                    <option value="ALL">All Countries</option>
                    <option value="UAE">UAE</option>
                    <option value="KSA">KSA</option>
                </select>
            </div>
        </div>

        <div class="mt-4 flex justify-end">
             <button (click)="openModal()" class="bg-hawy-blue hover:bg-hawy-dark text-white px-6 py-2 rounded-lg shadow-md transition flex items-center text-sm font-bold">
                <span class="material-icons mr-2 text-base">add</span> Add Revenue
            </button>
        </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                        <th class="p-5">Date</th>
                        <th class="p-5">Product</th>
                        <th class="p-5">Country</th>
                        <th class="p-5 text-right">Gross Amount</th>
                        <th class="p-5 text-center">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-sm text-gray-700">
                    @for (item of filteredRevenues(); track item.id) {
                        <tr class="hover:bg-blue-50/50 transition duration-150">
                            <td class="p-5">
                                <div class="font-bold text-gray-800">{{ item.date | date: 'MMM yyyy' }}</div>
                                <div class="text-[10px] text-gray-400">{{ item.date | date: 'dd/MM/yyyy' }}</div>
                            </td>
                            <td class="p-5">
                                <span class="bg-blue-50 text-hawy-blue px-3 py-1 rounded-full text-[11px] font-bold">
                                    {{ dataService.getProductName(item.product_id) }}
                                </span>
                            </td>
                            <td class="p-5">
                                <span [class]="item.country === 'UAE' ? 'text-green-600' : 'text-orange-600'" class="text-xs font-black">
                                    {{ item.country }}
                                </span>
                            </td>
                            <td class="p-5 text-right font-mono font-bold text-gray-900">{{ item.gross_amount | currency:'AED ':'symbol':'1.0-0' }}</td>
                            <td class="p-5 text-center">
                                <button (click)="editItem(item)" class="text-gray-400 hover:text-hawy-blue transition">
                                    <span class="material-icons text-base">edit</span>
                                </button>
                            </td>
                        </tr>
                    }
                    @empty {
                        <tr>
                            <td colspan="5" class="p-12 text-center">
                                <div class="text-gray-300 text-4xl mb-2"><span class="material-icons">search_off</span></div>
                                <div class="text-gray-400 font-medium">No records match your criteria.</div>
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    </div>

    @if (showModal) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-black text-gray-800">{{ isEditMode ? 'Update Entry' : 'New Entry' }}</h2>
                    <button (click)="closeModal()" class="text-gray-400 hover:text-red-500 transition"><span class="material-icons">close</span></button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Date</label>
                        <input [(ngModel)]="currentItem.date" type="date" class="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-hawy-blue outline-none">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Product</label>
                        <select [(ngModel)]="currentItem.product_id" class="w-full p-3 bg-gray-50 rounded-xl border-0 outline-none">
                            @for (prod of dataService.products(); track prod.product_id) {
                                <option [value]="prod.product_id">{{ prod.product_name }}</option>
                            }
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div>
                          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Country</label>
                          <select [(ngModel)]="currentItem.country" class="w-full p-3 bg-gray-50 rounded-xl border-0 outline-none">
                              <option value="UAE">UAE</option>
                              <option value="KSA">KSA</option>
                          </select>
                      </div>
                      <div>
                          <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Gross Amount</label>
                          <input [(ngModel)]="currentItem.gross_amount" type="number" class="w-full p-3 bg-gray-50 rounded-xl border-0 outline-none font-bold">
                      </div>
                    </div>
                </div>

                <div class="mt-8 flex gap-3">
                    <button (click)="closeModal()" class="flex-1 py-3 rounded-xl text-gray-500 font-bold hover:bg-gray-50 transition">Cancel</button>
                    <button (click)="save()" class="flex-[2] py-3 rounded-xl bg-hawy-blue text-white font-bold shadow-lg shadow-blue-200 hover:bg-hawy-dark transition">
                        {{ isEditMode ? 'Update Now' : 'Save Entry' }}
                    </button>
                </div>
            </div>
        </div>
    }
  `
})
export class RevenueManagerComponent {
  dataService = inject(DataService);

  // Filters Signals
  searchText = signal('');
  filterYear = signal<number | null>(2025);
  filterMonth = signal<number | null>(null);
  filterProduct = signal<number | null>(null);
  filterCountry = signal('ALL');

  showModal = false;
  isEditMode = false;
  currentItem: FactRevenue = this.getEmptyRevenue();

  months = [
    { name: 'January', value: 0 }, { name: 'February', value: 1 }, { name: 'March', value: 2 },
    { name: 'April', value: 3 }, { name: 'May', value: 4 }, { name: 'June', value: 5 },
    { name: 'July', value: 6 }, { name: 'August', value: 7 }, { name: 'September', value: 8 },
    { name: 'October', value: 9 }, { name: 'November', value: 10 }, { name: 'December', value: 11 }
  ];

  filteredRevenues = computed(() => {
    let data = this.dataService.revenues();

    // Year Filter
    if (this.filterYear()) {
      data = data.filter(r => new Date(r.date).getFullYear() === this.filterYear());
    }

    // Month Filter
    if (this.filterMonth() !== null) {
      data = data.filter(r => new Date(r.date).getMonth() === this.filterMonth());
    }

    // Product Filter
    if (this.filterProduct()) {
      data = data.filter(r => r.product_id === this.filterProduct());
    }

    // Country Filter
    if (this.filterCountry() !== 'ALL') {
      data = data.filter(r => r.country === this.filterCountry());
    }

    // Search Filter (Product Name)
    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(r =>
        this.dataService.getProductName(r.product_id).toLowerCase().includes(text)
      );
    }

    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  totalGross = computed(() => {
    return this.filteredRevenues().reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);
  });

  getEmptyRevenue(): FactRevenue {
    return {
      date: new Date().toISOString().split('T')[0],
      product_id: 1,
      country: 'UAE',
      gross_amount: 0
    };
  }

  openModal() {
    this.isEditMode = false;
    this.currentItem = this.getEmptyRevenue();
    this.showModal = true;
  }

  editItem(item: FactRevenue) {
    this.isEditMode = true;
    this.currentItem = { ...item };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  async save() {
    if (this.isEditMode) {
      await (this.dataService as any).updateRevenue(this.currentItem);
    } else {
      await this.dataService.addRevenue(this.currentItem);
    }
    this.closeModal();
  }
}
