import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactSalary } from '../../models/data.models';

@Component({
  selector: 'app-salary-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './salary-manager.component.html'
})
export class SalaryManagerComponent {
  dataService = inject(DataService);

  searchText = signal('');
  selectedYear = signal(new Date().getFullYear());
  selectedMonth = signal<number | null>(new Date().getMonth() + 1);
  filterStatus = signal('all');
  filterProduct = signal<number | null>(null);

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
    const years = this.dataService.salaries().map(s => s.year);
    const allYears = [...years, new Date().getFullYear()];
    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  });

  // Computed: المنتجات مرتبة أبجدياً مع Other في النهاية
  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) => {
      if (a.product_name.toLowerCase() === 'others') return 1;
      if (b.product_name.toLowerCase() === 'others') return -1;
      return a.product_name.localeCompare(b.product_name);
    });
  });

  filteredSalaries = computed(() => {
    let data = this.dataService.salaries();

    data = data.filter(s => s.year === this.selectedYear());

    if (this.selectedMonth() !== null) {
      data = data.filter(s => s.month === this.selectedMonth());
    }

    if (this.filterStatus() !== 'all') {
      data = data.filter(s => s.status === this.filterStatus());
    }

    if (this.filterProduct() !== null) {
      data = data.filter(s => {
        const emp = this.dataService.employees().find(e => e.employee_id === s.employee_id);
        return emp?.product_id === this.filterProduct();
      });
    }

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

  getEmployeeDepartment(empId: number): string {
    const emp = this.dataService.employees().find(e => e.employee_id === empId);
    return this.dataService.getProductName(emp?.product_id);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700';
      case 'pending': return 'bg-amber-50 text-amber-700';
      case 'cancelled': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  exportToCSV() {
    const data = this.filteredSalaries().map(s => ({
      'Employee': this.dataService.getEmployeeName(s.employee_id),
      'Department': this.getEmployeeDepartment(s.employee_id),
      'Year': s.year,
      'Month': this.getMonthName(s.month),
      'Base Salary': s.base_salary,
      'Bonus': s.bonus || 0,
      'Deductions': s.deductions || 0,
      'Net Salary': s.net_salary,
      'Status': s.status,
      'Payment Date': s.payment_date || ''
    }));

    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private convertToCSV(objArray: any[]): string {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = '';

    let row = '';
    for (let index in objArray[0]) {
        row += index + ',';
    }
    row = row.slice(0, -1);
    str += row + '\r\n';

    for (let i = 0; i < array.length; i++) {
        let line = '';
        for (let index in array[i]) {
            if (line !== '') line += ',';
            line += array[i][index];
        }
        str += line + '\r\n';
    }
    return str;
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
