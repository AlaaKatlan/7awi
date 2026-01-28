import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevenueManagerComponent } from './components/revenue-manager/revenue-manager.component';
import { PipelineManagerComponent } from './components/pipeline-manager/pipeline-manager.component';
import { CostManagerComponent } from './components/cost-manager/cost-manager.component';
import { DataService } from './services/data.service';
import { TargetManagerComponent } from './components/TargetManagerComponent/target-manager.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RevenueManagerComponent,
    PipelineManagerComponent,
    TargetManagerComponent,
    CostManagerComponent,
    DashboardComponent
  ],
  template: `
    <div class="flex h-screen bg-surface font-sans text-slate-800">

      <!-- القائمة الجانبية مع transition -->
      <aside
        [class.sidebar-collapsed]="!sidebarOpen"
        class="sidebar bg-white shadow-xl flex flex-col z-20 border-r border-gray-100 transition-all duration-300">

        <div class="h-24 flex items-center justify-center border-b border-gray-100 p-4">
          <img
            *ngIf="sidebarOpen"
            src="assets/7awi_Logo.jpg"
            alt="7awi Logo"
            class="max-h-16 w-auto object-contain transition-opacity duration-300">
          <span
            *ngIf="!sidebarOpen"
            class="material-icons text-hawy-blue text-3xl">
            business
          </span>
        </div>

        <nav class="flex-1 p-4 space-y-2 mt-4">
          <button (click)="activeTab = 'dashboard'"
             [class]="activeTab === 'dashboard' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             [title]="!sidebarOpen ? 'Dashboard' : ''"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons" [class.mr-3]="sidebarOpen">dashboard</span>
             <span *ngIf="sidebarOpen">Dashboard</span>
          </button>

          <button (click)="activeTab = 'revenue'"
             [class]="activeTab === 'revenue' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             [title]="!sidebarOpen ? 'Revenue' : ''"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons" [class.mr-3]="sidebarOpen">attach_money</span>
             <span *ngIf="sidebarOpen">Revenue</span>
          </button>

          <button (click)="activeTab = 'pipeline'"
             [class]="activeTab === 'pipeline' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             [title]="!sidebarOpen ? 'Pipeline' : ''"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons" [class.mr-3]="sidebarOpen">insights</span>
             <span *ngIf="sidebarOpen">Pipeline</span>
          </button>

          <button (click)="activeTab = 'target'"
             [class]="activeTab === 'target' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             [title]="!sidebarOpen ? 'Targets' : ''"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons" [class.mr-3]="sidebarOpen">flag</span>
             <span *ngIf="sidebarOpen">Targets</span>
          </button>

          <button (click)="activeTab = 'cost'"
             [class]="activeTab === 'cost' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
             [title]="!sidebarOpen ? 'Costs' : ''"
             class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
             <span class="material-icons" [class.mr-3]="sidebarOpen">money_off</span>
             <span *ngIf="sidebarOpen">Costs</span>
          </button>
        </nav>

        <div *ngIf="sidebarOpen" class="p-4 bg-blue-50 border-t border-gray-100 text-center transition-opacity duration-300">
            <p class="text-xs text-hawy-blue font-bold uppercase tracking-widest">Live System</p>
            <p class="text-[10px] text-gray-400 mt-1">Connected to Supabase DB</p>
        </div>
      </aside>

      <!-- زر Toggle للقائمة الجانبية -->
      <button
        (click)="toggleSidebar()"
        class="fixed top-6 z-30 bg-hawy-blue text-white p-[5px] rounded-r-xl shadow-lg hover:bg-hawy-dark transition-all duration-300"
        [style.left]="sidebarOpen ? '256px' : '72px'">
        <span class="material-icons text-xl">
          {{ sidebarOpen ? 'chevron_left' : 'chevron_right' }}
        </span>
      </button>

      <main class="flex-1 overflow-auto p-8 relative transition-all duration-300">
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
  `,
  styles: [`
    .sidebar {
      width: 256px;
    }

    .sidebar-collapsed {
      width: 72px;
    }

    .sidebar-collapsed nav button span:not(.material-icons) {
      display: none;
    }

    .sidebar-collapsed nav button {
      justify-content: center;
    }
  `]
})
export class AppComponent {
  activeTab: 'dashboard' | 'revenue' | 'pipeline' | 'target' | 'cost' = 'dashboard';
  sidebarOpen = true; // متغير التحكم في حالة القائمة الجانبية
  dataService = inject(DataService);

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
