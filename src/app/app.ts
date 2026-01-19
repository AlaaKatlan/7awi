import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevenueManagerComponent } from './components/revenue-manager/revenue-manager.component';
import { PipelineManagerComponent } from './components/pipeline-manager/pipeline-manager.component';
import { CostManagerComponent } from './components/cost-manager/cost-manager.component';
import { DataService } from './services/data.service';
import { TargetManagerComponent } from './components/TargetManagerComponent/target-manager.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
// 1. استيراد الداشبورد الجديد

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RevenueManagerComponent,
    PipelineManagerComponent,
    TargetManagerComponent,
    CostManagerComponent,
    DashboardComponent // 2. إضافته هنا
  ],
  template: `
    <div class="flex h-screen bg-surface font-sans text-slate-800">

      <aside class="w-64 bg-white shadow-xl flex flex-col z-20 border-r border-gray-100">
        <div class="h-24 flex items-center justify-center border-b border-gray-100 p-4">
          <img src="assets/7awi_Logo.jpg" alt="7awi Logo" class="max-h-16 w-auto object-contain">
        </div>

        <nav class="flex-1 p-4 space-y-2 mt-4">
          <button (click)="activeTab = 'dashboard'"
             [class]="activeTab === 'dashboard' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons mr-3">dashboard</span> Dashboard
          </button>

          <button (click)="activeTab = 'revenue'"
             [class]="activeTab === 'revenue' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons mr-3">attach_money</span> Revenue
          </button>

          <button (click)="activeTab = 'pipeline'"
             [class]="activeTab === 'pipeline' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons mr-3">insights</span> Pipeline
          </button>

          <button (click)="activeTab = 'target'"
             [class]="activeTab === 'target' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons mr-3">flag</span> Targets
          </button>

          <button (click)="activeTab = 'cost'"
             [class]="activeTab === 'cost' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons mr-3">money_off</span> Costs
          </button>
        </nav>

        <div class="p-4 bg-blue-50 border-t border-gray-100 text-center">
            <p class="text-xs text-hawy-blue font-bold uppercase tracking-widest">Live System</p>
            <p class="text-[10px] text-gray-400 mt-1">Connected to Supabase DB</p>
        </div>
      </aside>

      <main class="flex-1 overflow-auto p-8 relative">
        <header class="flex justify-between items-center mb-8">
             <div>
                <h1 class="text-3xl font-bold text-gray-800 capitalize">{{ activeTab === 'dashboard' ? 'Insight' : activeTab }} Management</h1>
                <p class="text-gray-500">7awi Financial System</p>
             </div>
        </header>

        @switch (activeTab) {
            @case ('dashboard') { <app-dashboard></app-dashboard> }
            @case ('revenue') { <app-revenue-manager></app-revenue-manager> }
            @case ('pipeline') { <app-pipeline-manager></app-pipeline-manager> }
            @case ('target') { <app-target-manager></app-target-manager> }
            @case ('cost') { <app-cost-manager></app-cost-manager> }
        }
      </main>
    </div>
  `
})
export class AppComponent {
  // 5. جعل الداشبورد هو الصفحة الافتراضية
  activeTab: 'dashboard' | 'revenue' | 'pipeline' | 'target' | 'cost' = 'dashboard';
  dataService = inject(DataService);
}
