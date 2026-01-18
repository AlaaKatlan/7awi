import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
 import { FactCost } from '../../models/data.models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-cost-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-800">Monthly Costs</h2>
            <button (click)="openModal()" class="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition shadow-md flex items-center">
                <span class="material-icons mr-2 text-sm">add</span> Add Cost
            </button>
        </div>

        <table class="w-full text-left">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                    <th class="p-4">Date</th>
                    <th class="p-4">Year / Month</th>
                    <th class="p-4 text-right">Cost</th>
                    <th class="p-4 text-center">Action</th> </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm">
                @for (item of excelService.costs(); track $index) {
                    <tr class="hover:bg-red-50 transition">
                        <td class="p-4 font-mono text-gray-600">{{ item.Date }}</td>
                        <td class="p-4">
                            <span class="font-bold">{{ item.Year }}</span> - <span class="text-gray-500">M{{ item.Month }}</span>
                        </td>
                        <td class="p-4 text-right font-bold text-red-600">{{ item.Monthly_Cost | currency:'AED ':'symbol':'1.0-0' }}</td>
                        <td class="p-4 text-center">
                            <button (click)="editItem(item, $index)" class="text-blue-600 hover:text-blue-800 font-medium text-xs uppercase cursor-pointer">
                                Edit
                            </button>
                        </td>
                    </tr>
                }
            </tbody>
        </table>
    </div>

    @if (showModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
                <h3 class="font-bold text-xl mb-4 text-gray-800">{{ isEditMode ? 'Edit Cost' : 'Add New Cost' }}</h3>

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                        <input type="date" [(ngModel)]="inputDate" (change)="onDateChange()" class="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none">
                    </div>

                    <div class="flex gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div class="text-center w-1/2">
                            <div class="text-xs text-gray-400 uppercase">Year</div>
                            <div class="font-bold text-lg text-gray-700">{{ newItem.Year }}</div>
                        </div>
                        <div class="text-center w-1/2 border-l border-gray-200">
                            <div class="text-xs text-gray-400 uppercase">Month</div>
                            <div class="font-bold text-lg text-gray-700">{{ newItem.Month }}</div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Cost Amount</label>
                        <input type="number" [(ngModel)]="newItem.Monthly_Cost" class="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none">
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-3">
                    <button (click)="showModal=false" class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition">Cancel</button>
                    <button (click)="save()" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg transition">
                        {{ isEditMode ? 'Update' : 'Save' }}
                    </button>
                </div>
            </div>
        </div>
    }
  `
})
export class CostManagerComponent {
  excelService = inject(DataService);
  showModal = false;
  isEditMode = false;
  editIndex = -1;

  inputDate: string = '';
  newItem: FactCost = { Date: '', Year: 2026, Month: 1, Monthly_Cost: 0 };

  openModal() {
    this.isEditMode = false;
    this.inputDate = new Date().toISOString().split('T')[0];
    this.onDateChange(); // Set initial Year/Month
    this.showModal = true;
  }

  editItem(item: FactCost, index: number) {
    this.isEditMode = true;
    this.editIndex = index;
    this.newItem = { ...item }; // Copy object

    // تحويل التاريخ من dd/mm/yyyy إلى yyyy-mm-dd ليظهر في الـ input
    if (item.Date) {
        const parts = item.Date.split('/'); // Assuming format dd/mm/yyyy
        if (parts.length === 3) {
            // HTML date input needs yyyy-mm-dd
            this.inputDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    this.showModal = true;
  }

  onDateChange() {
    if (this.inputDate) {
        const d = new Date(this.inputDate);
        this.newItem.Year = d.getFullYear();
        this.newItem.Month = d.getMonth() + 1;
        // حفظ التاريخ بصيغة الإكسل المعتادة لديك dd/mm/yyyy
        this.newItem.Date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }
  }

  save() {
    if (this.isEditMode) {
        this.excelService.updateCost(this.editIndex, this.newItem);
    } else {
        this.excelService.addCost({...this.newItem});
    }
    this.showModal = false;
  }
}
