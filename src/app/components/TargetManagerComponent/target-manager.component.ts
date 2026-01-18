import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExcelService } from '../../services/data.service';
import { FactTarget } from '../../models/data.models';

@Component({
  selector: 'app-target-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-800">Target Goals Management</h2>
            <div class="flex gap-4">
                 <select [(ngModel)]="selectedYear" class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
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
                    <th class="p-4">Country</th>
                    <th class="p-4">Year</th>
                    <th class="p-4 text-right">Target Amount</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm">
                @for (item of filteredTargets(); track $index) {
                    <tr class="hover:bg-blue-50">
                        <td class="p-4 font-bold">{{ excelService.getProductName(item.Product_ID) }}</td>
                        <td class="p-4">
                             <span [class]="item.Country === 'UAE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'" class="px-2 py-1 rounded text-xs font-bold">{{ item.Country }}</span>
                        </td>
                        <td class="p-4">{{ item.Year }}</td>
                        <td class="p-4 text-right font-bold text-hawy-blue">{{ item.Target_Amount | currency:'USD':'symbol':'1.0-0' }}</td>
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
                        <select [(ngModel)]="newItem.Product_ID" class="w-full p-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-hawy-blue">
                             @for (p of excelService.products(); track p.Product_ID) {
                                <option [value]="p.Product_ID">{{ p.Product_Name }}</option>
                             }
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
                            <select [(ngModel)]="newItem.Country" class="w-full p-3 bg-gray-50 rounded-lg">
                                <option value="UAE">UAE</option>
                                <option value="KSA">KSA</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                            <input type="number" [(ngModel)]="newItem.Year" class="w-full p-3 bg-gray-50 rounded-lg">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Target Amount</label>
                        <input type="number" [(ngModel)]="newItem.Target_Amount" class="w-full p-3 bg-gray-50 rounded-lg focus:ring-2 focus:ring-hawy-blue">
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
  excelService = inject(ExcelService);
  showModal = false;
  selectedYear = signal<number|null>(null);

  newItem: FactTarget = { Product_ID: 1, Country: 'UAE', Year: 2026, Target_Amount: 0 };

  filteredTargets = computed(() => {
    let data = this.excelService.targets();
    if (this.selectedYear()) {
        data = data.filter(t => t.Year === this.selectedYear());
    }
    return data;
  });

  openModal() { this.newItem = { Product_ID: 1, Country: 'UAE', Year: 2026, Target_Amount: 0 }; this.showModal = true; }
  save() {
    this.excelService.addTarget({...this.newItem});
    this.showModal = false;
  }
}
