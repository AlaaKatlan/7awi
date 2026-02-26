import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service'; // ✅
import { ChangeTrackingService } from '../../services/change-tracking.service'; // ✅
import { DimEmployee, convertUsdToAed } from '../../models/data.models';

@Component({
  selector: 'app-employee-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-manager.component.html'
})
export class EmployeeManagerComponent {
  dataService = inject(DataService);
  authService = inject(AuthService); // لجعل الزر يعمل
  changeTracker = inject(ChangeTrackingService); // لتسجيل التعديلات

  searchText = signal('');
  filterProduct = signal<number | null>(null);
  filterContract = signal('ALL');
  filterStatus = signal('active');
  saving = signal(false);

  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  employeeToDelete: DimEmployee | null = null;

  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) => {
      if (a.product_name.toLowerCase() === 'others') return 1;
      if (b.product_name.toLowerCase() === 'others') return -1;
      return a.product_name.localeCompare(b.product_name);
    });
  });

  sortedContracts = computed(() => {
    return ['Full Time', 'Part Time', 'Contract', 'Intern', 'Freelance'].sort();
  });

  currentEmployee: DimEmployee = this.getEmptyEmployee();

  filteredEmployees = computed(() => {
    let data = this.dataService.employees();
    if (this.filterStatus() === 'active') data = data.filter(e => !e.end_date);
    else if (this.filterStatus() === 'inactive') data = data.filter(e => !!e.end_date);
    if (this.filterProduct() !== null) data = data.filter(e => e.product_id === this.filterProduct());
    if (this.filterContract() !== 'ALL') data = data.filter(e => e.contract === this.filterContract());

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(e => e.name.toLowerCase().includes(text) || (e.email?.toLowerCase().includes(text)));
    }
    return data.sort((a, b) => a.name.localeCompare(b.name));
  });

  activeEmployeesCount = computed(() => this.filteredEmployees().filter(e => !e.end_date).length);
  totalPayroll = computed(() => this.filteredEmployees().filter(e => !e.end_date).reduce((sum, e) => sum + Number(e.salary), 0));
  fullTimeCount = computed(() => this.filteredEmployees().filter(e => !e.end_date && e.contract.includes('Full Time')).length);
  productsCount = computed(() => new Set(this.filteredEmployees().map(e => e.product_id)).size);

  getEmptyEmployee(): DimEmployee {
    return {
      employee_id: 0, name: '', salary: 0, salary_aed: 0, contract: 'Full Time Contractor',
      office: 'UAE', start_date: new Date().toISOString().split('T')[0], end_date: null,
      product_id: this.sortedProducts()[0]?.product_id || 0, email: '', phone: ''
    };
  }

  // ✅ وظيفة جديدة: تحويل العملة عند الكتابة
  calculateAed() {
    if (this.currentEmployee.salary) {
      this.currentEmployee.salary_aed = convertUsdToAed(this.currentEmployee.salary);
    }
  }

  openModal() {
    this.isEditMode = false;
    this.currentEmployee = this.getEmptyEmployee();
    this.showModal = true;
  }

  editEmployee(emp: DimEmployee) {
    this.isEditMode = true;
    this.currentEmployee = { ...emp };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.currentEmployee = this.getEmptyEmployee();
  }

  confirmDelete(emp: DimEmployee) {
    this.employeeToDelete = emp;
    this.showDeleteModal = true;
  }

  async save() {
    if (!this.currentEmployee.name?.trim()) return alert('Name required');
    if (!this.currentEmployee.salary) return alert('Salary required');

    this.saving.set(true);
    try {
      const payload: DimEmployee = { ...this.currentEmployee };
      let result;

      if (this.isEditMode) {
        // ✅ هنا تم دمج التتبع
        const oldEmp = this.dataService.employees().find(e => e.employee_id === payload.employee_id);
        result = await this.dataService.updateEmployee(payload);
        if (result.success && oldEmp) {
          await this.changeTracker.trackEmployeeUpdate(oldEmp, payload);
        }
      } else {
        result = await this.dataService.addEmployee(payload);
      }

      if (result.success) this.closeModal();
      else alert('Error: ' + result.error);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteEmployee() {
    if (!this.employeeToDelete) return;
    const result = await this.dataService.deleteEmployee(this.employeeToDelete.employee_id);
    if (!result.success) alert('Error: ' + result.error);
    this.showDeleteModal = false;
  }
}
