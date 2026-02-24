import { Component, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { RevenueManagerComponent } from '../revenue-manager/revenue-manager.component';
import { BookingOrderManagerComponent } from '../booking-order-manager/booking-order-manager.component';
import { PipelineManagerComponent } from '../pipeline-manager/pipeline-manager.component';
import { TargetManagerComponent } from '../target manager/target-manager.component';
import { CostManagerComponent } from '../cost-manager/cost-manager.component';
import { ClientManagerComponent } from '../client-manager/client-manager.component';
import { EmployeeManagerComponent } from '../employee-manager/employee-manager.component';
import { SalaryManagerComponent } from '../salary-manager/salary-manager.component';
import { DepartmentPerformanceComponent } from '../department-performance/department-performance.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DashboardComponent, RevenueManagerComponent,
    BookingOrderManagerComponent, PipelineManagerComponent, TargetManagerComponent, 
    CostManagerComponent, ClientManagerComponent, EmployeeManagerComponent, SalaryManagerComponent,
    DepartmentPerformanceComponent
  ],
  template: `
    <div class="flex h-screen bg-surface font-sans text-slate-800">

      <aside [class.sidebar-collapsed]="!sidebarOpen"
             class="sidebar bg-white shadow-xl flex flex-col z-20 border-r border-gray-100 transition-all duration-300">

        <div class="h-24 flex items-center justify-center border-b border-gray-100 p-4">
          <img *ngIf="sidebarOpen" src="assets/7awi_Logo.jpg" alt="7awi Logo" class="max-h-16 w-auto object-contain transition-opacity duration-300">
          <span *ngIf="!sidebarOpen" class="material-icons text-hawy-blue text-3xl">business</span>
        </div>

        <nav class="flex-1 p-4 space-y-1 mt-4 overflow-y-auto">

          <button (click)="activeTab = 'dashboard'"
                  [class]="activeTab === 'dashboard' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                  class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
            <span class="material-icons" [class.mr-3]="sidebarOpen">dashboard</span>
            <span *ngIf="sidebarOpen">Dashboard</span>
          </button>

          <!-- ✅ NEW: Department Performance - Admin Only -->
          <button *ngIf="authService.isAdmin()"
                  (click)="activeTab = 'dept-performance'"
                  [class]="activeTab === 'dept-performance' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                  class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
            <span class="material-icons" [class.mr-3]="sidebarOpen">leaderboard</span>
            <span *ngIf="sidebarOpen">Dept. Performance</span>
          </button>

          <div *ngIf="sidebarOpen" class="pt-4 pb-2">
            <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Financial</span>
          </div>

          <!-- ✅ Booking Orders Button -->
          <button (click)="activeTab = 'booking-orders'"
                  [class]="activeTab === 'booking-orders' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                  class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
            <span class="material-icons" [class.mr-3]="sidebarOpen">receipt_long</span>
            <span *ngIf="sidebarOpen">Booking Orders</span>
          </button>

          <button (click)="activeTab = 'revenue'"
                  [class]="activeTab === 'revenue' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                  class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
            <span class="material-icons" [class.mr-3]="sidebarOpen">attach_money</span>
            <span *ngIf="sidebarOpen">Revenue (Legacy)</span>
          </button>

          <button (click)="activeTab = 'pipeline'"
                  [class]="activeTab === 'pipeline' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                  class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
            <span class="material-icons" [class.mr-3]="sidebarOpen">insights</span>
            <span *ngIf="sidebarOpen">Pipeline</span>
          </button>

          <button (click)="activeTab = 'target'"
                  [class]="activeTab === 'target' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                  class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
            <span class="material-icons" [class.mr-3]="sidebarOpen">flag</span>
            <span *ngIf="sidebarOpen">Targets</span>
          </button>

          <button (click)="activeTab = 'cost'"
                  [class]="activeTab === 'cost' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                  class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
            <span class="material-icons" [class.mr-3]="sidebarOpen">money_off</span>
            <span *ngIf="sidebarOpen">Costs</span>
          </button>

          <ng-container *ngIf="authService.isAdmin() || authService.isFinance()">
            <div *ngIf="sidebarOpen" class="pt-4 pb-2">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">People</span>
            </div>

            <button (click)="activeTab = 'clients'"
                    [class]="activeTab === 'clients' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                    class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
              <span class="material-icons" [class.mr-3]="sidebarOpen">business</span>
              <span *ngIf="sidebarOpen">Clients</span>
            </button>

            <button *ngIf="authService.isAdmin()"
                    (click)="activeTab = 'employees'"
                    [class]="activeTab === 'employees' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                    class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
              <span class="material-icons" [class.mr-3]="sidebarOpen">people</span>
              <span *ngIf="sidebarOpen">Employees</span>
            </button>

            <button *ngIf="authService.isAdmin()"
                    (click)="activeTab = 'salaries'"
                    [class]="activeTab === 'salaries' ? 'bg-hawy-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'"
                    class="w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium">
              <span class="material-icons" [class.mr-3]="sidebarOpen">account_balance_wallet</span>
              <span *ngIf="sidebarOpen">Salaries</span>
            </button>
          </ng-container>

        </nav>

        <div class="p-4 border-t border-gray-100">
          <div *ngIf="sidebarOpen" class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              {{ getUserInitial() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-slate-700 truncate" [title]="getUserDisplayName()">
                {{ getUserDisplayName() }}
              </p>
              <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                {{ authService.userProfile()?.role || 'Viewer' }}
              </p>
            </div>
          </div>
          <button (click)="logout()"
                  class="w-full flex items-center justify-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-xl transition font-medium border border-transparent hover:border-rose-100">
            <span class="material-icons text-sm">logout</span>
            <span *ngIf="sidebarOpen">Logout</span>
          </button>
        </div>
      </aside>

      <button (click)="toggleSidebar()"
              class="fixed top-6 z-30 bg-hawy-blue text-white p-[5px] rounded-r-xl shadow-lg hover:bg-hawy-dark transition-all duration-300"
              [style.left]="sidebarOpen ? '256px' : '72px'">
        <span class="material-icons text-xl">{{ sidebarOpen ? 'chevron_left' : 'chevron_right' }}</span>
      </button>

      <main class="flex-1 overflow-auto p-8 relative transition-all duration-300">
        <header class="flex justify-between items-center mb-8">
             <div>
                <h1 class="text-3xl font-black text-gray-800 capitalize tracking-tight">{{ getPageTitle() }}</h1>
                <p class="text-gray-500 font-medium text-sm mt-1">7awi Financial System</p>
             </div>
             <button (click)="showProfileModal.set(true)"
                     class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition text-slate-600 font-bold text-xs uppercase tracking-wider">
               <span class="material-icons text-hawy-blue">manage_accounts</span>
               Settings
             </button>
        </header>

        @switch (activeTab) {
            @case ('dashboard') { <app-dashboard></app-dashboard> }
            
            @case ('dept-performance') {
              @if (authService.isAdmin()) {
                <app-department-performance></app-department-performance>
              } @else {
                <div class="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <span class="material-icons text-6xl text-red-200">lock</span>
                  <h2 class="text-xl font-bold text-slate-700 mt-4">Access Denied</h2>
                  <p class="text-slate-400 mt-2">You don't have permission to view this page.</p>
                </div>
              }
            }
            
            @case ('booking-orders') { <app-booking-order-manager></app-booking-order-manager> }
            @case ('revenue') { <app-revenue-manager></app-revenue-manager> }
            @case ('pipeline') { <app-pipeline-manager></app-pipeline-manager> }
            @case ('target') { <app-target-manager></app-target-manager> }
            @case ('cost') { <app-cost-manager></app-cost-manager> }

            @case ('clients') {
              @if (authService.isAdmin() || authService.isFinance()) {
                <app-client-manager></app-client-manager>
              } @else {
                <div class="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <span class="material-icons text-6xl text-red-200">lock</span>
                  <h2 class="text-xl font-bold text-slate-700 mt-4">Access Denied</h2>
                  <p class="text-slate-400 mt-2">You don't have permission to view this page.</p>
                </div>
              }
            }

            @case ('employees') {
              @if (authService.isAdmin()) {
                <app-employee-manager></app-employee-manager>
              } @else {
                <div class="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <span class="material-icons text-6xl text-red-200">lock</span>
                  <h2 class="text-xl font-bold text-slate-700 mt-4">Access Denied</h2>
                  <p class="text-slate-400 mt-2">You don't have permission to view this page.</p>
                </div>
              }
            }

            @case ('salaries') {
              @if (authService.isAdmin()) {
                <app-salary-manager></app-salary-manager>
              } @else {
                <div class="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <span class="material-icons text-6xl text-red-200">lock</span>
                  <h2 class="text-xl font-bold text-slate-700 mt-4">Access Denied</h2>
                  <p class="text-slate-400 mt-2">You don't have permission to view this page.</p>
                </div>
              }
            }
        }
      </main>

      <div *ngIf="showProfileModal()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-md rounded-2.5xl p-8 shadow-2xl animate-fade-in">
          <div class="flex justify-between items-center mb-8">
            <h2 class="text-xl font-black text-slate-800 uppercase tracking-tight">User Profile</h2>
            <button (click)="closeProfileModal()" class="text-slate-300 hover:text-rose-500 transition-colors">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="space-y-6">
            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div class="mb-4">
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Full Name</label>
                <div class="font-black text-slate-700">{{ userProfile()?.full_name || 'N/A' }}</div>
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Email Address</label>
                <div class="font-black text-slate-700">{{ currentUser()?.email }}</div>
              </div>
            </div>
            <div class="space-y-4">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Password</label>
              <input [(ngModel)]="newPassValue" type="password" placeholder="New Password"
                     class="w-full p-4 bg-slate-50 rounded-2xl border-0 outline-none font-bold focus:ring-2 focus:ring-hawy-blue">
              <input [(ngModel)]="confirmPassValue" type="password" placeholder="Confirm Password"
                     class="w-full p-4 bg-slate-50 rounded-2xl border-0 outline-none font-bold focus:ring-2 focus:ring-hawy-blue">
              <button (click)="handleUpdatePassword()"
                      [disabled]="!newPassValue || isUpdatingPassword()"
                      class="w-full py-4 bg-hawy-blue text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-hawy-dark transition-all flex justify-center items-center gap-2">
                <span *ngIf="isUpdatingPassword()" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .sidebar { width: 256px; }
    .sidebar-collapsed { width: 72px; }
    .sidebar-collapsed nav button span:not(.material-icons) { display: none; }
    .sidebar-collapsed nav button { justify-content: center; }
  `]
})
export class MainLayoutComponent {
  activeTab: 'dashboard' | 'dept-performance' | 'booking-orders' | 'revenue' | 'pipeline' | 'target' | 'cost' | 'clients' | 'employees' | 'salaries' = 'dashboard';
  sidebarOpen = true;

  dataService = inject(DataService);
  authService = inject(AuthService);

  showProfileModal = signal(false);
  isUpdatingPassword = signal(false);
  newPassValue = '';
  confirmPassValue = '';

  userProfile = this.authService.userProfile;
  currentUser = this.authService.currentUser;

  constructor() {
    effect(() => {
      console.log('Layout Profile Updated:', this.userProfile());
    });
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }

  getPageTitle(): string {
    const titles: Record<string, string> = {
      'dashboard': 'Insight Dashboard',
      'dept-performance': 'Department Performance',
      'booking-orders': 'Booking Order Management',
      'revenue': 'Revenue Management (Legacy)',
      'pipeline': 'Pipeline Management',
      'target': 'Target Management',
      'cost': 'Cost Management',
      'clients': 'Client Management',
      'employees': 'Employee Management',
      'salaries': 'Salary Management'
    };
    return titles[this.activeTab] || 'Management';
  }

  getUserDisplayName(): string {
    return this.userProfile()?.full_name || this.currentUser()?.email || 'Loading...';
  }

  getUserInitial(): string {
    const name = this.getUserDisplayName();
    return name.charAt(0).toUpperCase();
  }

  async logout() { await this.authService.signOut(); }

  async handleUpdatePassword() {
    if (this.newPassValue !== this.confirmPassValue) {
      alert('Passwords do not match!');
      return;
    }
    this.isUpdatingPassword.set(true);
    const result = await this.authService.updatePassword(this.newPassValue);
    this.isUpdatingPassword.set(false);
    if (result.success) {
      alert('Password updated successfully!');
      this.closeProfileModal();
    } else {
      alert('Error: ' + result.error);
    }
  }

  closeProfileModal() {
    this.showProfileModal.set(false);
    this.newPassValue = '';
    this.confirmPassValue = '';
  }
}
