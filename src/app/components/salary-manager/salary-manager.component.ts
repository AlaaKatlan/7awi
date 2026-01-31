import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactSalary } from '../../models/data.models';

@Component({
  selector: 'app-salary-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-[#f8fafc] min-h-screen">
      <!-- Header with Generate Action -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Monthly Payroll Management</h1>
          <p class="text-slate-500 text-sm">Manage and track employee salaries month by month</p>
        </div>
        <button (click)="openGenerateModal()"
                class="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition flex items-center gap-2">
          <span class="material-icons">auto_fix_high</span> Generate Monthly Salaries
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-[#1e3a8a]">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Records This Month</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ currentMonthCount() }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Paid</h3>
          <p class="text-3xl font-black text-emerald-600 mt-2">{{ paidTotal() | currency:'USD':'symbol':'1.0-0' }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-amber-500">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Pending</h3>
          <p class="text-3xl font-black text-amber-600 mt-2">{{ pendingTotal() | currency:'USD':'symbol':'1.0-0' }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-rose-500">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Total Payroll</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ totalPayroll() | currency:'USD':'symbol':'1.0-0' }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100 flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[200px]">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Search Employee</label>
          <input type="text" [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" 
                 placeholder="Search by name..."
                 class="w-full bg-slate-50 border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1e3a8a] outline-none">
        </div>

        <div class="w-32">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Year</label>
          <select [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event)"
                  class="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 outline-none cursor-pointer">
            @for (year of yearsList(); track year) {
              <option [ngValue]="year">{{ year }}</option>
            }
          </select>
        </div>

        <div class="w-36">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Month</label>
          <select [ngModel]="selectedMonth()" (ngModelChange)="selectedMonth.set($event)"
                  class="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 outline-none cursor-pointer">
            <option [ngValue]="null">All Months</option>
            @for (m of months; track m.value) {
              <option [ngValue]="m.value">{{ m.name }}</option>
            }
          </select>
        </div>

        <div class="w-32">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Status</label>
          <select [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)"
                  class="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 outline-none cursor-pointer">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button (click)="markAllAsPaid()" [disabled]="pendingCount() === 0"
                class="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <span class="material-icons text-sm">check_circle</span> Mark All Paid
        </button>
      </div>

      <!-- Salary Table -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th class="p-5">Employee</th>
              <th class="p-5 text-center">Period</th>
              <th class="p-5 text-right">Base Salary</th>
              <th class="p-5 text-right">Bonus</th>
              <th class="p-5 text-right">Deductions</th>
              <th class="p-5 text-right">Net Salary</th>
              <th class="p-5 text-center">Status</th>
              <th class="p-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-sm">
            @for (salary of filteredSalaries(); track salary.id) {
              <tr class="hover:bg-blue-50/50 transition duration-150">
                <td class="p-5">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {{ getEmployeeInitial(salary.employee_id) }}
                    </div>
                    <span class="font-bold text-slate-700">{{ dataService.getEmployeeName(salary.employee_id) }}</span>
                  </div>
                </td>
                <td class="p-5 text-center">
                  <span class="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
                    {{ getMonthName(salary.month) }} {{ salary.year }}
                  </span>
                </td>
                <td class="p-5 text-right font-mono">{{ salary.base_salary | currency:'USD':'symbol':'1.0-0' }}</td>
                <td class="p-5 text-right font-mono text-emerald-600">
                  {{ salary.bonus ? ('+' + (salary.bonus | currency:'USD':'symbol':'1.0-0')) : '—' }}
                </td>
                <td class="p-5 text-right font-mono text-rose-500">
                  {{ salary.deductions ? ('-' + (salary.deductions | currency:'USD':'symbol':'1.0-0')) : '—' }}
                </td>
                <td class="p-5 text-right font-black text-[#1e3a8a]">{{ salary.net_salary | currency:'USD':'symbol':'1.0-0' }}</td>
                <td class="p-5 text-center">
                  <span [class]="getStatusClass(salary.status)"
                        class="px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {{ salary.status }}
                  </span>
                </td>
                <td class="p-5 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button (click)="editSalary(salary)" class="text-slate-400 hover:text-[#1e3a8a] transition p-2"
                            title="Edit">
                      <span class="material-icons text-base">edit</span>
                    </button>
                    @if (salary.status === 'pending') {
                      <button (click)="markAsPaid(salary)" class="text-slate-400 hover:text-emerald-500 transition p-2"
                              title="Mark as Paid">
                        <span class="material-icons text-base">check_circle</span>
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="p-10 text-center text-slate-400">
                  <span class="material-icons text-5xl text-slate-200 block mb-3">account_balance_wallet</span>
                  <p class="italic">No salary records found for this period.</p>
                  <button (click)="openGenerateModal()" class="mt-4 text-blue-600 hover:underline font-bold">
                    Generate salaries for this month →
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Generate Salaries Modal -->
    @if (showGenerateModal) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-black text-xl text-slate-800 uppercase tracking-tight">Generate Monthly Salaries</h3>
            <button (click)="showGenerateModal = false" class="text-slate-400 hover:text-rose-500 transition">
              <span class="material-icons">close</span>
            </button>
          </div>

          <p class="text-slate-500 text-sm mb-6">
            This will create salary records for all active employees for the selected month. 
            Existing records will not be overwritten.
          </p>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Year</label>
              <select [(ngModel)]="generateYear"
                      class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer">
                @for (year of yearsList(); track year) {
                  <option [ngValue]="year">{{ year }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Month</label>
              <select [(ngModel)]="generateMonth"
                      class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer">
                @for (m of months; track m.value) {
                  <option [ngValue]="m.value">{{ m.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="flex gap-3">
            <button (click)="showGenerateModal = false"
                    class="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition">
              Cancel
            </button>
            <button (click)="generateSalaries()" [disabled]="generating()"
                    class="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition disabled:opacity-50">
              {{ generating() ? 'Generating...' : 'Generate Salaries' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit Salary Modal -->
    @if (showEditModal) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white p-8 rounded-[2rem] w-full max-w-lg shadow-2xl">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-black text-xl text-slate-800 uppercase tracking-tight">
              Edit Salary - {{ dataService.getEmployeeName(currentSalary.employee_id) }}
            </h3>
            <button (click)="showEditModal = false" class="text-slate-400 hover:text-rose-500 transition">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl mb-6">
            <span class="text-[10px] font-black text-slate-400 uppercase">Period</span>
            <p class="text-lg font-bold text-slate-700">{{ getMonthName(currentSalary.month) }} {{ currentSalary.year }}</p>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Base Salary</label>
                <input type="number" [(ngModel)]="currentSalary.base_salary" (ngModelChange)="calculateNet()"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] font-bold">
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Bonus (+)</label>
                <input type="number" [(ngModel)]="currentSalary.bonus" (ngModelChange)="calculateNet()"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-600">
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Deductions (-)</label>
                <input type="number" [(ngModel)]="currentSalary.deductions" (ngModelChange)="calculateNet()"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-rose-500 text-rose-500">
              </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-xl">
              <span class="text-[10px] font-black text-blue-400 uppercase">Net Salary</span>
              <p class="text-2xl font-black text-[#1e3a8a]">{{ currentSalary.net_salary | currency:'USD':'symbol':'1.0-0' }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</label>
                <select [(ngModel)]="currentSalary.status"
                        class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Payment Date</label>
                <input type="date" [(ngModel)]="currentSalary.payment_date"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]">
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Notes</label>
              <textarea [(ngModel)]="currentSalary.notes" rows="2"
                        class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                        placeholder="Optional notes..."></textarea>
            </div>
          </div>

          <div class="mt-8 flex gap-3">
            <button (click)="showEditModal = false"
                    class="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition">
              Cancel
            </button>
            <button (click)="saveSalary()"
                    class="flex-[2] py-3 bg-[#1e3a8a] text-white rounded-xl font-black shadow-lg shadow-blue-200 uppercase text-[10px] tracking-widest hover:bg-blue-900 transition">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SalaryManagerComponent {
  dataService = inject(DataService);

  searchText = signal('');
  selectedYear = signal(new Date().getFullYear());
  selectedMonth = signal<number | null>(new Date().getMonth() + 1);
  filterStatus = signal('all');

  showGenerateModal = false;
  showEditModal = false;
  generating = signal(false);

  generateYear = new Date().getFullYear();
  generateMonth = new Date().getMonth() + 1;

  currentSalary: FactSalary = this.getEmptySalary();

  months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  yearsList = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];
  });

  filteredSalaries = computed(() => {
    let data = this.dataService.salaries();

    // Filter by year
    data = data.filter(s => s.year === this.selectedYear());

    // Filter by month
    if (this.selectedMonth() !== null) {
      data = data.filter(s => s.month === this.selectedMonth());
    }

    // Filter by status
    if (this.filterStatus() !== 'all') {
      data = data.filter(s => s.status === this.filterStatus());
    }

    // Search filter
    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(s =>
        this.dataService.getEmployeeName(s.employee_id).toLowerCase().includes(text)
      );
    }

    return data;
  });

  currentMonthCount = computed(() => this.filteredSalaries().length);
  paidTotal = computed(() => this.filteredSalaries().filter(s => s.status === 'paid').reduce((sum, s) => sum + Number(s.net_salary), 0));
  pendingTotal = computed(() => this.filteredSalaries().filter(s => s.status === 'pending').reduce((sum, s) => sum + Number(s.net_salary), 0));
  totalPayroll = computed(() => this.filteredSalaries().reduce((sum, s) => sum + Number(s.net_salary), 0));
  pendingCount = computed(() => this.filteredSalaries().filter(s => s.status === 'pending').length);

  getEmptySalary(): FactSalary {
    return {
      employee_id: 0,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      base_salary: 0,
      bonus: 0,
      deductions: 0,
      net_salary: 0,
      status: 'pending'
    };
  }

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.name || '';
  }

  getEmployeeInitial(empId: number): string {
    const name = this.dataService.getEmployeeName(empId);
    return name.charAt(0).toUpperCase();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700';
      case 'pending': return 'bg-amber-50 text-amber-700';
      case 'cancelled': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  openGenerateModal() {
    this.generateYear = this.selectedYear();
    this.generateMonth = this.selectedMonth() || new Date().getMonth() + 1;
    this.showGenerateModal = true;
  }

  async generateSalaries() {
    this.generating.set(true);
    try {
      const result = await this.dataService.generateMonthlySalaries(this.generateYear, this.generateMonth);
      if (result.generated > 0) {
        alert(`Successfully generated ${result.generated} salary records!`);
        this.selectedYear.set(this.generateYear);
        this.selectedMonth.set(this.generateMonth);
      } else {
        alert('No new records to generate. All employees already have salary records for this period.');
      }
    } catch (error) {
      alert('Error generating salaries: ' + error);
    } finally {
      this.generating.set(false);
      this.showGenerateModal = false;
    }
  }

  editSalary(salary: FactSalary) {
    this.currentSalary = { ...salary };
    this.showEditModal = true;
  }

  calculateNet() {
    this.currentSalary.net_salary = 
      Number(this.currentSalary.base_salary || 0) + 
      Number(this.currentSalary.bonus || 0) - 
      Number(this.currentSalary.deductions || 0);
  }

  async saveSalary() {
    const { error } = await this.dataService.updateSalary(this.currentSalary);
    if (error) {
      alert('Error saving salary: ' + error);
      return;
    }
    this.showEditModal = false;
  }

  async markAsPaid(salary: FactSalary) {
    salary.status = 'paid';
    salary.payment_date = new Date().toISOString().split('T')[0];
    await this.dataService.updateSalary(salary);
  }

  async markAllAsPaid() {
    const pending = this.filteredSalaries().filter(s => s.status === 'pending');
    for (const salary of pending) {
      salary.status = 'paid';
      salary.payment_date = new Date().toISOString().split('T')[0];
      await this.dataService.updateSalary(salary);
    }
  }
}
