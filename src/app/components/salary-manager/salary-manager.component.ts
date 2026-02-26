import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { ChangeTrackingService } from '../../services/change-tracking.service';
import { FactSalary, calculateNetSalary } from '../../models/data.models';

@Component({
  selector: 'app-salary-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './salary-manager.component.html'
})
export class SalaryManagerComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);
  changeTracker = inject(ChangeTrackingService);

  // State
  searchText = signal('');
  selectedYear = signal(new Date().getFullYear());
  selectedMonth = signal<number | null>(new Date().getMonth() + 1);
  filterProduct = signal<number | null>(null);
  filterStatus = signal('all');

  generating = signal(false);
  saving = signal(false);

  // Modals
  showGenerateModal = false;
  showEditModal = false;
  showAddModal = false;

  // ✅ تم تعريف المتغير المفقود هنا
  isEditMode = false;

  // Data Placeholders
  currentSalary: Partial<FactSalary> = {};
  generateYear = new Date().getFullYear();
  generateMonth = new Date().getMonth() + 1;

  // Options
  months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  // Computed Lists
  yearsList = computed(() => {
    const years = new Set(this.dataService.salaries().map(s => s.year));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  });

  sortedProducts = computed(() => this.dataService.products().slice().sort((a, b) => a.product_name.localeCompare(b.product_name)));
  employees = this.dataService.employees;

  filteredSalaries = computed(() => {
    let data = this.dataService.salaries();

    if (this.selectedYear()) data = data.filter(s => s.year === this.selectedYear());
    if (this.selectedMonth()) data = data.filter(s => s.month === this.selectedMonth());

    if (this.filterProduct()) {
      data = data.filter(s => {
        const emp = this.employees().find(e => e.employee_id === s.employee_id);
        const salaryDept = s.product_id || emp?.product_id;
        return salaryDept === this.filterProduct();
      });
    }

    if (this.filterStatus() !== 'all') data = data.filter(s => s.status === this.filterStatus());

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(s =>
        this.dataService.getEmployeeName(s.employee_id).toLowerCase().includes(text)
      );
    }

    return data.sort((a, b) => b.year - a.year || b.month - a.month);
  });

  // Stats
  currentMonthCount = computed(() => this.filteredSalaries().length);
  paidTotal = computed(() => this.filteredSalaries().filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.net_salary || 0), 0));
  pendingTotal = computed(() => this.filteredSalaries().filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.net_salary || 0), 0));
  totalPayroll = computed(() => this.filteredSalaries().reduce((sum, s) => sum + (s.net_salary || 0), 0));
  pendingCount = computed(() => this.filteredSalaries().filter(s => s.status === 'pending').length);

  // Helpers
  getEmployeeInitial(id: number) { return this.dataService.getEmployeeName(id).charAt(0).toUpperCase(); }

  getEmployeeDepartment(id: number, salary?: FactSalary) {
    if (salary?.product_id) {
       return this.dataService.getProductName(salary.product_id);
    }
    const emp = this.dataService.employees().find(e => e.employee_id === id);
    return emp ? this.dataService.getProductName(emp.product_id) : '-';
  }

  getMonthName(m: number) { return this.months.find(mon => mon.value === m)?.name || ''; }

  getStatusClass(status: string) {
    switch(status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  calculateNet() {
    this.currentSalary.net_salary = calculateNetSalary(
      Number(this.currentSalary.base_salary) || 0,
      Number(this.currentSalary.bonus) || 0,
      Number(this.currentSalary.deductions) || 0
    );
  }

  // --- Actions ---

  openGenerateModal() {
    this.generateYear = new Date().getFullYear();
    this.generateMonth = new Date().getMonth() + 1;
    this.showGenerateModal = true;
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentSalary = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      base_salary: 0, bonus: 0, deductions: 0, net_salary: 0,
      status: 'pending'
    };
    this.showAddModal = true;
  }

  editSalary(salary: FactSalary) {
    this.isEditMode = true;
    this.currentSalary = { ...salary };

    // إذا لم يكن للراتب قسم محفوظ، نضع القسم الحالي للموظف كقيمة افتراضية في الفورم
    if (!this.currentSalary.product_id) {
      const emp = this.employees().find(e => e.employee_id === salary.employee_id);
      if (emp) this.currentSalary.product_id = emp.product_id;
    }

    this.showEditModal = true;
  }

  async generateSalaries() {
    this.generating.set(true);
    const result = await this.dataService.generateMonthlySalaries(this.generateYear, this.generateMonth);
    this.generating.set(false);
    if (result.success) {
      this.showGenerateModal = false;
      this.selectedYear.set(this.generateYear);
      this.selectedMonth.set(this.generateMonth);
    } else {
      alert('Error: ' + result.error);
    }
  }

  async saveSalary() {
    if (this.currentSalary.net_salary === undefined) this.calculateNet();

    this.saving.set(true);
    try {
      const oldSalary = this.dataService.salaries().find(s => s.id === this.currentSalary.id);

      const result = await this.dataService.updateSalary(this.currentSalary as FactSalary);

      if (result.success && oldSalary) {
        // تتبع تغيير الراتب الصافي
        if (oldSalary.net_salary !== this.currentSalary.net_salary) {
           await this.changeTracker.logSalaryChange(
             oldSalary.id!, oldSalary.employee_id, 'net_salary',
             oldSalary.net_salary, this.currentSalary.net_salary, 'Amount Updated'
           );
        }
        // تتبع تغيير القسم (الميزة الجديدة)
        if (oldSalary.product_id !== this.currentSalary.product_id) {
           const oldDept = this.dataService.getProductName(oldSalary.product_id || 0);
           const newDept = this.dataService.getProductName(this.currentSalary.product_id || 0);
           await this.changeTracker.logSalaryChange(
             oldSalary.id!, oldSalary.employee_id, 'product_id',
             oldDept, newDept, 'Department Allocation Updated'
           );
        }
      }

      if (result.success) {
        this.showEditModal = false;
      } else {
        alert('Error updating: ' + result.error);
      }
    } finally {
      this.saving.set(false);
    }
  }

  async saveNewSalary() {
    if (!this.currentSalary.employee_id) return alert('Select Employee');
    if (this.currentSalary.net_salary === undefined) this.calculateNet();

    this.saving.set(true);
    try {
      const result = await this.dataService.addManualSalary(this.currentSalary);
      if (result.success && result.data) {
        await this.changeTracker.trackSalaryCreation(result.data.id!, result.data.employee_id, this.currentSalary);
        this.showAddModal = false;
      } else {
        alert('Error adding: ' + result.error);
      }
    } finally {
      this.saving.set(false);
    }
  }

  async markAsPaid(salary: FactSalary) {
    if (!confirm('Mark as Paid?')) return;
    const updated = { ...salary, status: 'paid' as const, payment_date: new Date().toISOString().split('T')[0] };
    await this.dataService.updateSalary(updated);
  }

  async markAllAsPaid() {
    if (!confirm(`Mark all ${this.pendingCount()} pending salaries as PAID?`)) return;
    const pending = this.filteredSalaries().filter(s => s.status === 'pending');
    for (const s of pending) {
      await this.dataService.updateSalary({ ...s, status: 'paid', payment_date: new Date().toISOString().split('T')[0] });
    }
  }
}
