import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service'; // تم تغيير المسار والاسم
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
                @for (pipe of dataService.pipelines(); track pipe.id) {
                    <tr class="border-b border-gray-50 hover:bg-gray-50">
                        <td class="py-4 font-bold">{{ dataService.getClientName(pipe.client_id) }}</td>
                        <td class="py-4">{{ dataService.getProductName(pipe.product_id) }}</td>
                        <td class="py-4">{{ pipe.target_amount | currency }}</td>
                        <td class="py-4">
                            <span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold mr-1"> {{ pipe.quarter }}</span>
                            <span class="text-gray-400 text-xs">{{ pipe.year }}</span>
                        </td>
                        <td class="py-4">
                            <span [class]="getStatusColor(pipe.status)" class="px-3 py-1 rounded text-xs font-medium">
                                {{ pipe.status }}
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
                        <select [(ngModel)]="newItem.client_id" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                             <option [ngValue]="null" disabled>Select Client</option>
                             @for (c of dataService.clients(); track c.client_id) {
                                <option [value]="c.client_id">{{ c.client_name }}</option>
                             }
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Product</label>
                        <select [(ngModel)]="newItem.product_id" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                             @for (p of dataService.products(); track p.product_id) {
                                <option [value]="p.product_id">{{ p.product_name }}</option>
                             }
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Target Amount</label>
                        <input type="number" [(ngModel)]="newItem.target_amount" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Quarter</label>
                            <select [(ngModel)]="newItem.quarter" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                                <option [ngValue]="1">Q1 (Jan-Mar)</option>
                                <option [ngValue]="2">Q2 (Apr-Jun)</option>
                                <option [ngValue]="3">Q3 (Jul-Sep)</option>
                                <option [ngValue]="4">Q4 (Oct-Dec)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                            <input type="number" [(ngModel)]="newItem.year" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                        <select [(ngModel)]="newItem.status" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                            <option value="Pending">Pending</option>
                            <option value="Done">Done</option>
                            <option value="Completed">Completed</option>
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
    public dataService = inject(DataService); // تحديث الخدمة
    showModal = false;

    // تهيئة كائن جديد بأسماء الحقول الصغيرة
    newItem: FactPipeline = {
        product_id: 1,
        client_id: 1,
        target_amount: 0,
        quarter: 1,
        year: 2026,
        status: 'Pending'
    };

    getStatusColor(status: string) {
        switch(status) {
            case 'Done': return 'bg-green-100 text-green-700';
            case 'Pending': return 'bg-orange-100 text-orange-700';
            case 'Completed': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    async save() {
        // نفترض وجود دالة addPipeline في DataService مشابهة لـ addRevenue
        // إذا لم تكن موجودة، تأكد من إضافتها في خدمة البيانات
        const { data, error } = await (this.dataService as any).supabase
            .from('fact_pipeline')
            .insert([{ ...this.newItem }])
            .select();

        if (data) {
            this.dataService.pipelines.update(v => [data[0], ...v]);
            this.showModal = false;
            // إعادة تعيين القيم الافتراضية
            this.newItem = {
                product_id: 1,
                client_id: 1,
                target_amount: 0,
                quarter: 1,
                year: 2026,
                status: 'Pending'
            };
        } else if (error) {
            console.error('Error saving pipeline:', error);
            alert('Failed to save pipeline item.');
        }
    }
}
