import { Component, computed, inject, signal } from "@angular/core";
import { FactTarget } from "../../models/data.models";
import { DataService } from "../../services/data.service";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-target-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-800">Target Goals Management</h2>
            <div class="flex gap-4">
                 <select [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event)" class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <option [ngValue]="null">All Years</option>
                    <option [ngValue]="2024">2024</option>
                    <option [ngValue]="2025">2025</option>
                    <option [ngValue]="2026">2026</option>
                 </select>
                 <button (click)="openModal()" class="bg-hawy-blue text-white px-5 py-2 rounded-lg hover:bg-hawy-dark transition">+ Add Target</button>
            </div>
        </div>

        <table class="w-full text-left">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                    <th class="p-4">Product</th>
                    <th class="p-4">Year</th>
                    <th class="p-4 text-right">Target Amount</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm">
                @for (item of filteredTargets(); track item.id) {
                    <tr class="hover:bg-blue-50">
                        <td class="p-4 font-bold">{{ dataService.getProductName(item.product_id) }}</td>
                        <td class="p-4">{{ item.year }}</td>
                        <td class="p-4 text-right font-bold text-hawy-blue">{{ item.annual_target | currency:'AED ':'symbol':'1.0-0' }}</td>
                    </tr>
                }
            </tbody>
        </table>
    </div>

    @if (showModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
                <h3 class="font-bold text-xl mb-4">Set New Target</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Product</label>
                        <select [(ngModel)]="newItem.product_id" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                             @for (p of dataService.products(); track p.product_id) {
                                <option [value]="p.product_id">{{ p.product_name }}</option>
                             }
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                        <input type="number" [(ngModel)]="newItem.year" class="w-full p-3 bg-gray-50 rounded-lg border-0">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Target Amount</label>
                        <input type="number" [(ngModel)]="newItem.annual_target" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                    </div>
                </div>
                <div class="mt-6 flex justify-end gap-3">
                    <button (click)="showModal=false" class="px-4 py-2 text-gray-500">Cancel</button>
                    <button (click)="save()" class="px-6 py-2 bg-hawy-blue text-white rounded-lg">Save</button>
                </div>
            </div>
        </div>
    }
  `
})
export class TargetManagerComponent {
  public dataService = inject(DataService);
  showModal = false;
  selectedYear = signal<number|null>(2026); // عرض 2026 كإعداد افتراضي

  // البنية المحدثة بدون country
  newItem: FactTarget = { product_id: 1, year: 2026, annual_target: 0 };

  filteredTargets = computed(() => {
    const data = this.dataService.targets();
    const year = this.selectedYear();
    if (!year) return data;
    return data.filter(t => t.year === year);
  });

  openModal() {
    this.newItem = { product_id: 1, year: 2026, annual_target: 0 };
    this.showModal = true;
  }

  async save() {
    const { data, error } = await this.dataService.addTarget({ ...this.newItem });
    if (data) {
      this.showModal = false;
    } else if (error) {
      console.error('Error:', error);
      alert('Failed to save.');
    }
  }
}
