import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExcelService } from '../../services/excel.service';
import { FactRevenue } from '../../models/data.models';

@Component({
  selector: 'app-revenue-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-hawy-blue">
            <h3 class="text-gray-400 text-sm font-medium uppercase">Total Transactions</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ filteredRevenues().length }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
            <h3 class="text-gray-400 text-sm font-medium uppercase">Total Gross (Filtered)</h3>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ totalGross() | currency:'AED ':'symbol':'1.0-0' }}</p>
        </div>
    </div>

    <div class="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div class="flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[200px]">
                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Search</label>
                <input type="text" [(ngModel)]="searchText" placeholder="Client, Product..."
                       class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-hawy-blue outline-none transition">
            </div>

            <div class="w-32">
                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Year</label>
                <select [(ngModel)]="filterYear" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-hawy-blue">
                    <option [ngValue]="null">All Years</option>
                    <option [ngValue]="2023">2023</option>
                    <option [ngValue]="2024">2024</option>
                    <option [ngValue]="2025">2025</option>
                    <option [ngValue]="2026">2026</option>
                </select>
            </div>

            <div class="w-32">
                <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">Country</label>
                <select [(ngModel)]="filterCountry" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-hawy-blue">
                    <option value="ALL">All</option>
                    <option value="UAE">UAE</option>
                    <option value="KSA">KSA</option>
                </select>
            </div>

            <button (click)="openModal()" class="bg-hawy-blue hover:bg-hawy-dark text-white px-6 py-2 rounded-lg shadow-md transition flex items-center h-[42px]">
                <span class="material-icons mr-2">add</span> Add
            </button>
        </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50 text-gray-500 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th class="p-5">Date</th>
                        <th class="p-5">Client</th>
                        <th class="p-5">Product</th>
                        <th class="p-5">Country</th>
                        <th class="p-5 text-right">Gross</th>
                        <th class="p-5 text-center">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-sm text-gray-700">
                    @for (item of filteredRevenues(); track $index) {
                        <tr class="hover:bg-blue-50 transition duration-150">
                            <td class="p-5 font-medium">{{ item.Date |date: 'dd/MM/yyyy' }}</td>
                            <td class="p-5">{{ excelService.getClientName(item.Client_ID) }}</td>
                            <td class="p-5">
                                <span class="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">
                                    {{ excelService.getProductName(item.Product_ID) }}
                                </span>
                            </td>
                            <td class="p-5">
                                <span [class]="item.Country === 'UAE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'" class="px-2 py-1 rounded text-xs font-bold">
                                    {{ item.Country }}
                                </span>
                            </td>
                            <td class="p-5 text-right font-bold text-gray-800">{{ item.Gross | currency }}</td>
                            <td class="p-5 text-center">
                                <button (click)="editItem(item)" class="text-hawy-blue hover:text-hawy-dark font-medium text-xs uppercase">Edit</button>
                            </td>
                        </tr>
                    }
                    @empty {
                        <tr>
                            <td colspan="6" class="p-8 text-center text-gray-400">No records found matching your filters.</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    </div>

    @if (showModal) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">{{ isEditMode ? 'Edit Revenue' : 'New Revenue' }}</h2>
                    <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <span class="material-icons">close</span>
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div class="col-span-1">
                        <label class="block text-sm font-bold text-gray-700 mb-1">Date</label>
                        <input [(ngModel)]="currentItem.Date" type="text" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                    </div>

                    <div class="col-span-1">
                        <label class="block text-sm font-bold text-gray-700 mb-1">Gross Amount</label>
                        <input [(ngModel)]="currentItem.Gross" type="number" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                    </div>

                    <div class="col-span-1">
                        <label class="block text-sm font-bold text-gray-700 mb-1">Client</label>
                        <select [(ngModel)]="currentItem.Client_ID" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                            @for (client of excelService.clients(); track client.Client_ID) {
                                <option [value]="client.Client_ID">{{ client.Client_Name }}</option>
                            }
                        </select>
                    </div>

                    <div class="col-span-1">
                        <label class="block text-sm font-bold text-gray-700 mb-1">Product</label>
                        <select [(ngModel)]="currentItem.Product_ID" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                            @for (prod of excelService.products(); track prod.Product_ID) {
                                <option [value]="prod.Product_ID">{{ prod.Product_Name }}</option>
                            }
                        </select>
                    </div>

                     <div class="col-span-1">
                        <label class="block text-sm font-bold text-gray-700 mb-1">Country</label>
                        <select [(ngModel)]="currentItem.Country" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                             <option value="UAE">UAE</option>
                             <option value="KSA">KSA</option>
                        </select>
                    </div>

                    <div class="col-span-1">
                        <label class="block text-sm font-bold text-gray-700 mb-1">Status</label>
                        <select [(ngModel)]="currentItem.Status" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                             <option value="Active">Active</option>
                             <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div class="mt-8 flex justify-end gap-3">
                    <button (click)="closeModal()" class="px-6 py-3 rounded-lg text-gray-600 hover:bg-gray-100 font-bold">Cancel</button>
                    <button (click)="save()" class="px-6 py-3 rounded-lg bg-hawy-blue text-white shadow-lg hover:shadow-xl hover:bg-hawy-dark font-bold transition">
                        {{ isEditMode ? 'Update' : 'Save Record' }}
                    </button>
                </div>
            </div>
        </div>
    }
  `
})
export class RevenueManagerComponent {
  excelService = inject(ExcelService);

  // Signals للفلاتر
  searchText = signal('');
  filterYear = signal<number | null>(null);
  filterCountry = signal('ALL');

  showModal = false;
  isEditMode = false;
  editIndex = -1;
  currentItem: FactRevenue = this.getEmptyRevenue();

  // Computed Signal: تقوم بفلترة القائمة تلقائياً عند تغيير أي فلتر
  filteredRevenues = computed(() => {
    let data = this.excelService.revenues();

    // 1. فلترة السنة
    if (this.filterYear()) {
        data = data.filter(r => r.Year === this.filterYear());
    }

    // 2. فلترة الدولة
    if (this.filterCountry() !== 'ALL') {
        data = data.filter(r => r.Country === this.filterCountry());
    }

    // 3. فلترة النص (اسم العميل أو المنتج)
    const text = this.searchText().toLowerCase();
    if (text) {
        data = data.filter(r =>
            this.excelService.getClientName(r.Client_ID).toLowerCase().includes(text) ||
            this.excelService.getProductName(r.Product_ID).toLowerCase().includes(text)
        );
    }

    return data;
  });

  // حساب المجموع بناءً على البيانات المفلترة فقط
  totalGross = computed(() => {
    return this.filteredRevenues().reduce((sum, item) => sum + (item.Gross || 0), 0);
  });

  getEmptyRevenue(): FactRevenue {
    return { Date: '01/01/2026', Year: 2026, Month: 1, Product_ID: 1, Client_ID: 0, Country: 'UAE', Type: 'Actual', Status: 'Active', Gross: 0 };
  }

  openModal() {
    this.isEditMode = false;
    this.currentItem = this.getEmptyRevenue();
    this.showModal = true;
  }

  editItem(item: FactRevenue) {
    // نحتاج لإيجاد الـ index الأصلي للعنصر في المصفوفة الرئيسية للتعديل
    const originalIndex = this.excelService.revenues().indexOf(item);
    if (originalIndex > -1) {
        this.isEditMode = true;
        this.editIndex = originalIndex;
        this.currentItem = { ...item };
        this.showModal = true;
    }
  }

  closeModal() {
    this.showModal = false;
  }

  save() {
    if (this.isEditMode) {
        this.excelService.updateRevenue(this.editIndex, this.currentItem);
    } else {
        this.excelService.addRevenue(this.currentItem);
    }
    this.closeModal();
  }
}
