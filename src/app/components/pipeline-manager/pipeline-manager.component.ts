import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExcelService } from '../../services/data.service';
import { FactPipeline } from '../../models/data.models';

@Component({
    selector: 'app-pipeline-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
      <div class="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-700">Pipeline Tracking</h2>
            <button (click)="showModal = true" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg shadow transition">
                + New Pipeline
            </button>
        </div>

        <table class="w-full text-left">
            <thead class="text-xs text-gray-400 uppercase border-b">
                <tr>
                    <th class="py-3">Client</th>
                    <th class="py-3">Product</th>
                    <th class="py-3">Target</th>
                    <th class="py-3">Quarter</th>
                    <th class="py-3">Status</th>
                </tr>
            </thead>
            <tbody class="text-sm text-gray-600">
                @for (pipe of excelService.pipelines(); track $index) {
                    <tr class="border-b border-gray-50 hover:bg-gray-50">
                        <td class="py-4 font-bold">{{ excelService.getClientName(pipe.Client_ID) }}</td>
                        <td class="py-4">{{ excelService.getProductName(pipe.Product_ID) }}</td>
                        <td class="py-4">{{ pipe.Target_Amount | currency }}</td>
                        <td class="py-4">
                            <span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold mr-1"> {{ pipe.Quarter }}</span>
                            <span class="text-gray-400 text-xs">{{ pipe.Year }}</span>
                        </td>
                        <td class="py-4">
                            <span [class]="getStatusColor(pipe.Status)" class="px-3 py-1 rounded text-xs font-medium">
                                {{ pipe.Status }}
                            </span>
                        </td>
                    </tr>
                }
            </tbody>
        </table>
      </div>

      @if (showModal) {
         <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-xl text-gray-800">Add Pipeline Item</h3>
                    <button (click)="showModal = false" class="text-gray-400 hover:text-gray-600">
                        <span class="material-icons">close</span>
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Client</label>
                        <select [(ngModel)]="newItem.Client_ID" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                             <option [ngValue]="null" disabled>Select Client</option>
                             @for (c of excelService.clients(); track c.Client_ID) {
                                <option [value]="c.Client_ID">{{ c.Client_Name }}</option>
                             }
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Product</label>
                        <select [(ngModel)]="newItem.Product_ID" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                             @for (p of excelService.products(); track p.Product_ID) {
                                <option [value]="p.Product_ID">{{ p.Product_Name }}</option>
                             }
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Target Amount</label>
                        <input type="number" [(ngModel)]="newItem.Target_Amount" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Quarter</label>
                            <select [(ngModel)]="newItem.Quarter" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                                <option [ngValue]="1">Q1 (Jan-Mar)</option>
                                <option [ngValue]="2">Q2 (Apr-Jun)</option>
                                <option [ngValue]="3">Q3 (Jul-Sep)</option>
                                <option [ngValue]="4">Q4 (Oct-Dec)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                            <input type="number" [(ngModel)]="newItem.Year" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                        <select [(ngModel)]="newItem.Status" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="Pending">Pending</option>
                            <option value="Done">Done</option>
                            <option value="Complitaed">Completed</option>
                        </select>
                    </div>
                </div>

                <div class="mt-8 flex justify-end gap-3">
                    <button (click)="showModal = false" class="px-5 py-2 rounded-lg text-gray-500 hover:bg-gray-100 font-bold">Cancel</button>
                    <button (click)="save()" class="px-5 py-2 rounded-lg bg-purple-600 text-white shadow-lg hover:bg-purple-700 font-bold transition">Save Item</button>
                </div>
            </div>
         </div>
      }
    `
})
export class PipelineManagerComponent {
    excelService = inject(ExcelService);
    showModal = false;

    newItem: FactPipeline = {
        Product_ID: 1, Client_ID: 1, Target_Amount: 0, Quarter: 1, Year: 2026, Status: 'Pending'
    };

    getStatusColor(status: string) {
        switch(status) {
            case 'Done': return 'bg-green-100 text-green-700';
            case 'Pending': return 'bg-orange-100 text-orange-700';
            case 'Complitaed': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    save() {
        this.excelService.addPipeline({...this.newItem});
        this.showModal = false;
        // إعادة تعيين القيم الافتراضية
        this.newItem = { Product_ID: 1, Client_ID: 1, Target_Amount: 0, Quarter: 1, Year: 2026, Status: 'Pending' };
    }
}
