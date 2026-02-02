import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactPipeline } from '../../models/data.models';

@Component({
  selector: 'app-pipeline-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-700">Pipeline Tracking</h2>
          <button (click)="openModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg shadow transition font-bold flex items-center gap-2">
              <span class="material-icons text-sm">add</span> New Pipeline
          </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left">
            <thead class="text-xs text-gray-400 uppercase border-b bg-gray-50/50">
                <tr>
                    <th class="py-3 px-4">Client</th>
                    <th class="py-3 px-4">Product</th>
                    <th class="py-3 px-4">Target</th>
                    <th class="py-3 px-4">Quarter</th>
                    <th class="py-3 px-4">Status</th>
                </tr>
            </thead>
            <tbody class="text-sm text-gray-600">
                @for (pipe of dataService.pipelines(); track pipe.id) {
                    <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td class="py-4 px-4 font-bold text-slate-700">{{ dataService.getClientName(pipe.client_id) }}</td>
                        <td class="py-4 px-4">
                            <span class="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase">
                                {{ dataService.getProductName(pipe.product_id) }}
                            </span>
                        </td>
                        <td class="py-4 px-4 font-mono font-medium">{{ pipe.target_amount | currency }}</td>
                        <td class="py-4 px-4">
                            <span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold mr-1">Q{{ pipe.quarter }}</span>
                            <span class="text-gray-400 text-xs">{{ pipe.year }}</span>
                        </td>
                        <td class="py-4 px-4">
                            <span [class]="getStatusColor(pipe.status)" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide">
                                {{ pipe.status }}
                            </span>
                        </td>
                    </tr>
                } @empty {
                    <tr>
                        <td colspan="5" class="py-8 text-center text-slate-400 italic">No pipeline data available.</td>
                    </tr>
                }
            </tbody>
        </table>
      </div>
    </div>

    @if (showModal) {
       <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-fade-in">
              <div class="flex justify-between items-center mb-6">
                  <h3 class="font-black text-xl text-slate-800 uppercase tracking-tight">New Pipeline Item</h3>
                  <button (click)="closeModal()" class="text-slate-400 hover:text-rose-500 transition">
                      <span class="material-icons">close</span>
                  </button>
              </div>

              <div class="space-y-4">
                  <div>
                      <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Client</label>
                      <select [(ngModel)]="newItem.client_id" class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer">
                           <option [ngValue]="null" disabled selected>Select Client</option>
                           @for (c of sortedClients(); track c.client_id) {
                              <option [value]="c.client_id">{{ c.client_name }}</option>
                           }
                      </select>
                  </div>

                  <div>
                      <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Product</label>
                      <select [(ngModel)]="newItem.product_id" class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer">
                           <option [ngValue]="null" disabled selected>Select Product</option>
                           @for (p of dataService.products(); track p.product_id) {
                              <option [value]="p.product_id">{{ p.product_name }}</option>
                           }
                      </select>
                  </div>

                  <div>
                      <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Target Amount</label>
                      <input type="number" [(ngModel)]="newItem.target_amount" class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-purple-500 font-bold">
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                      <div>
                          <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Quarter</label>
                          <select [(ngModel)]="newItem.quarter" class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer">
                              <option [ngValue]="1">Q1 (Jan-Mar)</option>
                              <option [ngValue]="2">Q2 (Apr-Jun)</option>
                              <option [ngValue]="3">Q3 (Jul-Sep)</option>
                              <option [ngValue]="4">Q4 (Oct-Dec)</option>
                          </select>
                      </div>
                      <div>
                          <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Year</label>
                          <input type="number" [(ngModel)]="newItem.year" class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-purple-500 text-center font-bold">
                      </div>
                  </div>

                  <div>
                      <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</label>
                      <select [(ngModel)]="newItem.status" class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer">
                          <option value="Pending">Pending</option>
                          <option value="Done">Done</option>
                          <option value="Completed">Completed</option>
                      </select>
                  </div>
              </div>

              <div class="mt-8 flex gap-3">
                  <button (click)="closeModal()" class="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition">Cancel</button>
                  <button (click)="save()" class="flex-[2] py-3 bg-purple-600 text-white rounded-xl font-black shadow-lg shadow-purple-200 uppercase text-[10px] tracking-widest hover:bg-purple-700 transition">Save Pipeline</button>
              </div>
          </div>
       </div>
    }
  `
})
export class PipelineManagerComponent {
    public dataService = inject(DataService);
    showModal = false;

    newItem: FactPipeline = this.getEmptyPipeline();

    // Computed property for sorted clients (A-Z)
    sortedClients = computed(() => {
        return this.dataService.clients().slice().sort((a, b) =>
            a.client_name.localeCompare(b.client_name)
        );
    });

    getEmptyPipeline(): FactPipeline {
        return {
            // التغيير هنا: نضع القيمة null بدلاً من أول عنصر
            product_id: null as any,
            client_id: null as any,
            target_amount: 0,
            quarter: 1,
            year: new Date().getFullYear(),
            status: 'Pending'
        };
    }

    getStatusColor(status: string) {
        switch(status) {
            case 'Done': return 'bg-emerald-100 text-emerald-700';
            case 'Pending': return 'bg-amber-100 text-amber-700';
            case 'Completed': return 'bg-blue-100 text-blue-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    }

    openModal() {
        this.newItem = this.getEmptyPipeline();
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.newItem = this.getEmptyPipeline();
    }

    async save() {
        if (!this.newItem.client_id || !this.newItem.product_id) {
            alert('Please select a client and product.');
            return;
        }

        const { success, error } = await this.dataService.addPipeline(this.newItem);

        if (success) {
            this.closeModal();
        } else {
            console.error('Error saving pipeline:', error);
            alert('Failed to save pipeline item: ' + error);
        }
    }
}
