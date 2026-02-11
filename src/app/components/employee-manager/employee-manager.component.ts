import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { DimEmployee } from '../../models/data.models';

@Component({
  selector: 'app-employee-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-manager.component.html'
})
export class EmployeeManagerComponent {
  dataService = inject(DataService);

  searchText = signal('');
  filterProduct = signal<number | null>(null);
  filterContract = signal('ALL');
  filterStatus = signal('active');
  saving = signal(false);

  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  employeeToDelete: DimEmployee | null = null;

  // Computed: المنتجات مرتبة أبجدياً مع Other في النهاية
  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) => {
      if (a.product_name.toLowerCase() === 'others') return 1;
      if (b.product_name.toLowerCase() === 'others') return -1;
      return a.product_name.localeCompare(b.product_name);
    });
  });

  // Computed: أنواع العقود مرتبة أبجدياً
  sortedContracts = computed(() => {
    return ['Full Time Contractor', 'Part Time Contractor', 'Permanent'].sort((a, b) => a.localeCompare(b));
  });

  currentEmployee: DimEmployee = this.getEmptyEmployee();

  filteredEmployees = computed(() => {
    let data = this.dataService.employees();

    if (this.filterStatus() === 'active') {
      data = data.filter(e => !e.end_date);
    } else if (this.filterStatus() === 'inactive') {
      data = data.filter(e => !!e.end_date);
    }

    if (this.filterProduct() !== null) {
      data = data.filter(e => e.product_id === this.filterProduct());
    }

    if (this.filterContract() !== 'ALL') {
      data = data.filter(e => e.contract === this.filterContract());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(e =>
        e.name.toLowerCase().includes(text) ||
        (e.email?.toLowerCase().includes(text))
      );
    }

    return data.sort((a, b) => a.name.localeCompare(b.name));
  });

  activeEmployeesCount = computed(() => this.filteredEmployees().filter(e => !e.end_date).length);
  totalPayroll = computed(() => this.filteredEmployees().filter(e => !e.end_date).reduce((sum, e) => sum + Number(e.salary), 0));
  fullTimeCount = computed(() => this.filteredEmployees().filter(e => !e.end_date && (e.contract === 'Full Time Contractor' || e.contract === 'Permanent')).length);
  productsCount = computed(() => new Set(this.filteredEmployees().map(e => e.product_id)).size);

  getEmptyEmployee(): DimEmployee {
    return {
      employee_id: 0,
      name: '',
      salary: 0,
      salary_aed: 0,
      contract: 'Full Time Contractor',
      office: 'UAE',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      product_id: 0,
      email: '',
      phone: ''
    };
  }

  openModal() {
    this.isEditMode = false;
    this.currentEmployee = this.getEmptyEmployee();
    const products = this.sortedProducts();
    if (products.length > 0) {
        this.currentEmployee.product_id = products[0].product_id;
    }
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
    if (!this.currentEmployee.name?.trim()) {
      alert('Employee Name is required');
      return;
    }
    if (!this.currentEmployee.salary || this.currentEmployee.salary <= 0) {
      alert('Valid Salary is required');
      return;
    }

    this.saving.set(true);

    try {
      let result;
      const payload: Partial<DimEmployee> = {
          name: this.currentEmployee.name.trim(),
          salary: Number(this.currentEmployee.salary),
          salary_aed: Number(this.currentEmployee.salary_aed) || 0,
          contract: this.currentEmployee.contract,
          office: this.currentEmployee.office,
          start_date: this.currentEmployee.start_date,
          end_date: this.currentEmployee.end_date || null,
          product_id: Number(this.currentEmployee.product_id),
          email: this.currentEmployee.email || '',
          phone: this.currentEmployee.phone || ''
      };

      if (this.isEditMode) {
        payload.employee_id = this.currentEmployee.employee_id;
        result = await this.dataService.updateEmployee(payload);
      } else {
        result = await this.dataService.addEmployee(payload);
      }

      if (result.success) {
        this.closeModal();
      } else {
        alert('Error saving employee: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('An unexpected error occurred: ' + error.message);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteEmployee() {
    if (!this.employeeToDelete) return;

    try {
      const result = await this.dataService.deleteEmployee(this.employeeToDelete.employee_id);
      if (!result.success) {
        alert('Error deleting employee: ' + result.error);
      }
    } catch (error: any) {
      alert('Error deleting employee: ' + error.message);
    }

    this.showDeleteModal = false;
    this.employeeToDelete = null;
  }
}
