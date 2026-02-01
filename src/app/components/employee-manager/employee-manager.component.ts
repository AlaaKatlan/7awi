import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { DimEmployee } from '../../models/data.models';

@Component({
  selector: 'app-employee-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-[#f8fafc] min-h-screen">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-[#1e3a8a]">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Active Employees</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ activeEmployeesCount() }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Total Payroll (USD)</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ totalPayroll() | currency:'USD':'symbol':'1.0-0' }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-amber-500">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Full Time</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ fullTimeCount() }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-purple-500">
          <h3 class="text-gray-400 text-sm font-medium uppercase">Departments</h3>
          <p class="text-3xl font-black text-gray-800 mt-2">{{ departmentsCount() }}</p>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100 flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[250px]">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Search Employees</label>
          <input type="text" [ngModel]="searchText()" (ngModelChange)="searchText.set($event)"
                 placeholder="Search by name, email..."
                 class="w-full bg-slate-50 border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1e3a8a] outline-none">
        </div>

        <div class="w-44">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Department</label>
          <select [ngModel]="filterDepartment()" (ngModelChange)="filterDepartment.set($event)"
                  class="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 outline-none cursor-pointer">
            <option [ngValue]="null">All Departments</option>
            @for (dept of dataService.departments(); track dept.department_id) {
              <option [ngValue]="dept.department_id">{{ dept.department_name }}</option>
            }
          </select>
        </div>

        <div class="w-36">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Contract</label>
          <select [ngModel]="filterContract()" (ngModelChange)="filterContract.set($event)"
                  class="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 outline-none cursor-pointer">
            <option value="ALL">All Types</option>
            <option value="Full Time Contractor">Full-time</option>
            <option value="Part Time Contractor">Part-time</option>
            <option value="Permanent">Permanent</option>
          </select>
        </div>

        <div class="w-32">
          <label class="text-[10px] font-black text-gray-400 uppercase mb-1 block">Status</label>
          <select [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)"
                  class="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 outline-none cursor-pointer">
            <option value="active">Active</option>
            <option value="all">All</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button (click)="openModal()"
                class="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-blue-900 transition flex items-center gap-2">
          <span class="material-icons text-sm">person_add</span> Add Employee
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (emp of filteredEmployees(); track emp.employee_id) {
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
            <div class="p-6 border-b border-gray-50">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {{ emp.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-800 text-lg">{{ emp.name }}</h3>
                    <span class="text-xs text-slate-400 font-medium">{{ dataService.getDepartmentName(emp.department_id) }}</span>
                  </div>
                </div>
                <span [class]="!emp.end_date ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
                      class="px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                  {{ !emp.end_date ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>

            <div class="p-6 space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-400 uppercase font-bold">Salary (USD)</span>
                <span class="font-black text-lg text-[#1e3a8a]">{{ emp.salary | currency:'USD':'symbol':'1.0-0' }}</span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-400 uppercase font-bold">Contract</span>
                <span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">{{ emp.contract }}</span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-400 uppercase font-bold">Office</span>
                <span class="text-sm text-slate-600">{{ emp.office }}</span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-[10px] text-slate-400 uppercase font-bold">Start Date</span>
                <span class="text-sm text-slate-600 font-mono">{{ emp.start_date | date:'MMM yyyy' }}</span>
              </div>

              @if (emp.email) {
                <div class="pt-3 border-t border-slate-50">
                  <a [href]="'mailto:' + emp.email" class="text-blue-600 hover:underline text-sm flex items-center gap-1">
                    <span class="material-icons text-sm">email</span>
                    {{ emp.email }}
                  </a>
                </div>
              }
            </div>

            <div class="px-6 py-4 bg-slate-50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button (click)="editEmployee(emp)" class="p-2 hover:bg-white rounded-lg transition">
                <span class="material-icons text-slate-400 hover:text-[#1e3a8a]">edit</span>
              </button>
              <button (click)="confirmDelete(emp)" class="p-2 hover:bg-white rounded-lg transition">
                <span class="material-icons text-slate-400 hover:text-red-500">delete</span>
              </button>
            </div>
          </div>
        } @empty {
          <div class="col-span-full bg-white rounded-2xl p-12 text-center">
            <span class="material-icons text-6xl text-slate-200">person_off</span>
            <p class="text-slate-400 mt-4">No employees found matching your criteria.</p>
          </div>
        }
      </div>
    </div>

    @if (showModal) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div class="bg-white p-8 rounded-[2rem] w-full max-w-2xl shadow-2xl my-8">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-black text-xl text-slate-800 uppercase tracking-tight">
              {{ isEditMode ? 'Update Employee' : 'New Employee' }}
            </h3>
            <button (click)="closeModal()" class="text-slate-400 hover:text-rose-500 transition">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Full Name *</label>
                <input type="text" [(ngModel)]="currentEmployee.name"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                       placeholder="Employee name">
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Department *</label>
                <select [(ngModel)]="currentEmployee.department_id"
                        class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer">
                  @for (dept of dataService.departments(); track dept.department_id) {
                    <option [ngValue]="dept.department_id">{{ dept.department_name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Email</label>
                <input type="email" [(ngModel)]="currentEmployee.email"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                       placeholder="email@example.com">
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Phone</label>
                <input type="tel" [(ngModel)]="currentEmployee.phone"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                       placeholder="+971 50 000 0000">
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Salary (USD) *</label>
                <input type="number" [(ngModel)]="currentEmployee.salary"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] font-bold">
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Salary (AED)</label>
                <input type="number" [(ngModel)]="currentEmployee.salary_aed"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]">
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Contract Type</label>
                <select [(ngModel)]="currentEmployee.contract"
                        class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer">
                  <option value="Full Time Contractor">Full-time Contractor</option>
                  <option value="Part Time Contractor">Part-time Contractor</option>
                  <option value="Permanent">Permanent</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Office</label>
                <select [(ngModel)]="currentEmployee.office"
                        class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a] cursor-pointer">
                  <option value="UAE">UAE</option>
                  <option value="KSA">KSA</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Start Date *</label>
                <input type="date" [(ngModel)]="currentEmployee.start_date"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]">
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">End Date (if applicable)</label>
                <input type="date" [(ngModel)]="currentEmployee.end_date"
                       class="w-full p-3 bg-slate-50 rounded-xl border-0 outline-none focus:ring-2 focus:ring-[#1e3a8a]">
              </div>
            </div>
          </div>

          <div class="mt-8 flex gap-3">
            <button (click)="closeModal()"
                    class="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition">
              Cancel
            </button>
            <button (click)="save()"
                    [disabled]="!currentEmployee.name || !currentEmployee.salary || saving()"
                    class="flex-[2] py-3 bg-[#1e3a8a] text-white rounded-xl font-black shadow-lg shadow-blue-200 uppercase text-[10px] tracking-widest hover:bg-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              @if (saving()) {
                <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Saving...</span>
              } @else {
                <span>{{ isEditMode ? 'Update Employee' : 'Save Employee' }}</span>
              }
            </button>
          </div>
        </div>
      </div>
    }

    @if (showDeleteModal) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-red-500 text-3xl">warning</span>
          </div>
          <h3 class="font-black text-xl text-slate-800 mb-2">Delete Employee?</h3>
          <p class="text-slate-500 mb-6">
            Are you sure you want to delete <strong>{{ employeeToDelete?.name }}</strong>?
            This will also delete all related salary records.
          </p>
          <div class="flex gap-3">
            <button (click)="showDeleteModal = false"
                    class="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition">
              Cancel
            </button>
            <button (click)="deleteEmployee()"
                    class="flex-1 py-3 bg-red-500 text-white rounded-xl font-black shadow-lg uppercase text-[10px] tracking-widest hover:bg-red-600 transition">
              Delete
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class EmployeeManagerComponent {
  dataService = inject(DataService);

  searchText = signal('');
  filterDepartment = signal<number | null>(null);
  filterContract = signal('ALL');
  filterStatus = signal('active');
  saving = signal(false);

  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  employeeToDelete: DimEmployee | null = null;

  currentEmployee: DimEmployee = this.getEmptyEmployee();

  filteredEmployees = computed(() => {
    let data = this.dataService.employees();

    if (this.filterStatus() === 'active') {
      data = data.filter(e => !e.end_date);
    } else if (this.filterStatus() === 'inactive') {
      data = data.filter(e => !!e.end_date);
    }

    if (this.filterDepartment() !== null) {
      data = data.filter(e => e.department_id === this.filterDepartment());
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

    return data;
  });

  activeEmployeesCount = computed(() => this.dataService.employees().filter(e => !e.end_date).length);
  totalPayroll = computed(() => this.dataService.employees().filter(e => !e.end_date).reduce((sum, e) => sum + Number(e.salary), 0));
  fullTimeCount = computed(() => this.dataService.employees().filter(e => !e.end_date && (e.contract === 'Full Time Contractor' || e.contract === 'Permanent')).length);
  departmentsCount = computed(() => new Set(this.dataService.employees().map(e => e.department_id)).size);

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
      department_id: this.dataService.departments()[0]?.department_id || 1,
      email: '',
      phone: ''
    };
  }

  openModal() {
    this.isEditMode = false;
    this.currentEmployee = this.getEmptyEmployee();
    this.showModal = true;
  }

  editEmployee(emp: DimEmployee) {
    console.log('Editing employee:', emp);
    this.isEditMode = true;
    // Deep copy to avoid reference issues
    this.currentEmployee = {
      employee_id: emp.employee_id,
      name: emp.name,
      salary: emp.salary,
      salary_aed: emp.salary_aed || 0,
      contract: emp.contract,
      office: emp.office,
      start_date: emp.start_date,
      end_date: emp.end_date,
      department_id: emp.department_id,
      email: emp.email || '',
      phone: emp.phone || ''
    };
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
    console.log('=== SAVE CALLED ===');
    console.log('isEditMode:', this.isEditMode);
    console.log('currentEmployee:', JSON.stringify(this.currentEmployee, null, 2));

    // Validation
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

      if (this.isEditMode) {
        console.log('Calling updateEmployee with ID:', this.currentEmployee.employee_id);

        // Prepare clean payload
        const updatePayload: Partial<DimEmployee> = {
          employee_id: this.currentEmployee.employee_id,
          name: this.currentEmployee.name.trim(),
          salary: Number(this.currentEmployee.salary),
          salary_aed: Number(this.currentEmployee.salary_aed) || 0,
          contract: this.currentEmployee.contract,
          office: this.currentEmployee.office,
          start_date: this.currentEmployee.start_date,
          end_date: this.currentEmployee.end_date || null,
          department_id: Number(this.currentEmployee.department_id),
          // email: this.currentEmployee.email?.trim() || null,
          // phone: this.currentEmployee.phone?.trim() || null
        };

        console.log('Update payload:', JSON.stringify(updatePayload, null, 2));
        result = await this.dataService.updateEmployee(updatePayload);

      } else {
        console.log('Calling addEmployee');

        // Prepare clean payload for new employee (without employee_id)
        const addPayload: Partial<DimEmployee> = {
          name: this.currentEmployee.name.trim(),
          salary: Number(this.currentEmployee.salary),
          salary_aed: Number(this.currentEmployee.salary_aed) || 0,
          contract: this.currentEmployee.contract,
          office: this.currentEmployee.office,
          start_date: this.currentEmployee.start_date,
          end_date: this.currentEmployee.end_date || null,
          department_id: Number(this.currentEmployee.department_id),
          // email: this.currentEmployee.email?.trim() || null,
          // phone: this.currentEmployee.phone?.trim() || null
        };

        result = await this.dataService.addEmployee(addPayload);
      }

      console.log('Save result:', result);

      if (result.success) {
        console.log('Success! Closing modal...');
        this.closeModal();
      } else {
        console.error('Save failed:', result.error);
        alert('Error saving employee: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Unexpected error in save:', error);
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
      console.error('Delete error:', error);
      alert('Error deleting employee: ' + error.message);
    }

    this.showDeleteModal = false;
    this.employeeToDelete = null;
  }
}
