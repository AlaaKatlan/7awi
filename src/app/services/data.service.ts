import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { 
  DimClient, DimProduct, DimDepartment, DimEmployee,
  FactPipeline, FactRevenue, FactTarget, FactCost, FactSalary 
} from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private authService = inject(AuthService);
  private supabase: SupabaseClient;

  // Dimension Signals
  products = signal<DimProduct[]>([]);
  clients = signal<DimClient[]>([]);
  departments = signal<DimDepartment[]>([]);
  employees = signal<DimEmployee[]>([]);

  // Fact Signals
  revenues = signal<FactRevenue[]>([]);
  pipelines = signal<FactPipeline[]>([]);
  targets = signal<FactTarget[]>([]);
  costs = signal<FactCost[]>([]);
  salaries = signal<FactSalary[]>([]);

  // Loading state
  loading = signal(true);

  constructor() {
    this.supabase = this.authService.getClient();
    this.fetchInitialData();
  }

  // =============================================
  // Fetch Initial Data
  // =============================================
  async fetchInitialData() {
    this.loading.set(true);
    try {
      await Promise.all([
        this.fetchProducts(),
        this.fetchClients(),
        this.fetchDepartments(),
        this.fetchEmployees(),
        this.fetchRevenues(),
        this.fetchPipelines(),
        this.fetchTargets(),
        this.fetchCosts(),
        this.fetchSalaries()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchProducts() {
    const { data } = await this.supabase.from('dim_product').select('*').order('product_name');
    if (data) this.products.set(data);
  }

  private async fetchClients() {
    const { data } = await this.supabase.from('dim_client').select('*').order('client_name');
    if (data) this.clients.set(data);
  }

  private async fetchDepartments() {
    const { data } = await this.supabase.from('dim_department').select('*').order('department_name');
    if (data) this.departments.set(data);
  }

  private async fetchEmployees() {
    const { data } = await this.supabase.from('dim_employee').select('*').order('name');
    if (data) this.employees.set(data);
  }

  private async fetchRevenues() {
    const { data } = await this.supabase.from('fact_revenue').select('*').order('date', { ascending: false });
    if (data) this.revenues.set(data);
  }

  private async fetchPipelines() {
    const { data } = await this.supabase.from('fact_pipeline').select('*');
    if (data) this.pipelines.set(data);
  }

  private async fetchTargets() {
    const { data } = await this.supabase.from('fact_target_annual').select('*');
    if (data) this.targets.set(data);
  }

  private async fetchCosts() {
    const { data } = await this.supabase.from('fact_cost').select('*').order('date', { ascending: false });
    if (data) this.costs.set(data);
  }

  private async fetchSalaries() {
    const { data } = await this.supabase.from('fact_salary').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (data) this.salaries.set(data);
  }

  // =============================================
  // Client CRUD Operations
  // =============================================
  async addClient(item: DimClient) {
    const { data, error } = await this.supabase
      .from('dim_client')
      .insert([item])
      .select();
    if (data) this.clients.update(v => [...v, data[0]].sort((a, b) => a.client_name.localeCompare(b.client_name)));
    return { data, error };
  }

  async updateClient(item: DimClient) {
    if (!item.client_id) return { data: null, error: 'No ID provided' };
    const { data, error } = await this.supabase
      .from('dim_client')
      .update({
        client_name: item.client_name,
        country: item.country,
        contact_person: item.contact_person,
        contact_email: item.contact_email,
        contact_phone: item.contact_phone
      })
      .eq('client_id', item.client_id)
      .select();
    if (data) {
      this.clients.update(v => v.map(c => c.client_id === item.client_id ? data[0] : c));
    }
    return { data, error };
  }

  async deleteClient(id: number) {
    const { error } = await this.supabase
      .from('dim_client')
      .delete()
      .eq('client_id', id);
    if (!error) {
      this.clients.update(v => v.filter(c => c.client_id !== id));
    }
    return { error };
  }

  // =============================================
  // Employee CRUD Operations
  // =============================================
  async addEmployee(item: DimEmployee) {
    const { data, error } = await this.supabase
      .from('dim_employee')
      .insert([item])
      .select();
    if (data) this.employees.update(v => [...v, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
    return { data, error };
  }

  async updateEmployee(item: DimEmployee) {
    if (!item.employee_id) return { data: null, error: 'No ID provided' };
    const { data, error } = await this.supabase
      .from('dim_employee')
      .update({
        name: item.name,
        salary: item.salary,
        salary_aed: item.salary_aed,
        contract: item.contract,
        office: item.office,
        start_date: item.start_date,
        end_date: item.end_date,
        department_id: item.department_id,
        email: item.email,
        phone: item.phone
      })
      .eq('employee_id', item.employee_id)
      .select();
    if (data) {
      this.employees.update(v => v.map(e => e.employee_id === item.employee_id ? data[0] : e));
    }
    return { data, error };
  }

  async deleteEmployee(id: number) {
    const { error } = await this.supabase
      .from('dim_employee')
      .delete()
      .eq('employee_id', id);
    if (!error) {
      this.employees.update(v => v.filter(e => e.employee_id !== id));
    }
    return { error };
  }

  // =============================================
  // Revenue CRUD Operations (Updated with order_number)
  // =============================================
  async addRevenue(item: FactRevenue) {
    const { data, error } = await this.supabase
      .from('fact_revenue')
      .insert([item])
      .select();
    if (data) this.revenues.update(v => [data[0], ...v]);
    return { data, error };
  }

  async updateRevenue(item: FactRevenue) {
    if (!item.id) return { data: null, error: 'No ID provided' };
    const { data, error } = await this.supabase
      .from('fact_revenue')
      .update({
        date: item.date,
        product_id: item.product_id,
        client_id: item.client_id,
        country: item.country,
        gross_amount: item.gross_amount,
        order_number: item.order_number,
        notes: item.notes
      })
      .eq('id', item.id)
      .select();
    if (data) {
      this.revenues.update(v => v.map(r => r.id === item.id ? data[0] : r));
    }
    return { data, error };
  }

  async deleteRevenue(id: number) {
    const { error } = await this.supabase
      .from('fact_revenue')
      .delete()
      .eq('id', id);
    if (!error) {
      this.revenues.update(v => v.filter(r => r.id !== id));
    }
    return { error };
  }

  // Generate next order number
  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;
    
    // Get the latest order number for this year
    const { data } = await this.supabase
      .from('fact_revenue')
      .select('order_number')
      .like('order_number', `${prefix}%`)
      .order('order_number', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (data && data.length > 0 && data[0].order_number) {
      const lastNum = parseInt(data[0].order_number.replace(prefix, '')) || 0;
      nextNum = lastNum + 1;
    }
    
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  }

  // =============================================
  // Salary CRUD Operations
  // =============================================
  async addSalary(item: FactSalary) {
    const { data, error } = await this.supabase
      .from('fact_salary')
      .insert([item])
      .select();
    if (data) this.salaries.update(v => [data[0], ...v]);
    return { data, error };
  }

  async updateSalary(item: FactSalary) {
    if (!item.id) return { data: null, error: 'No ID provided' };
    const { data, error } = await this.supabase
      .from('fact_salary')
      .update({
        base_salary: item.base_salary,
        bonus: item.bonus,
        deductions: item.deductions,
        net_salary: item.net_salary,
        payment_date: item.payment_date,
        status: item.status,
        notes: item.notes
      })
      .eq('id', item.id)
      .select();
    if (data) {
      this.salaries.update(v => v.map(s => s.id === item.id ? data[0] : s));
    }
    return { data, error };
  }

  async deleteSalary(id: number) {
    const { error } = await this.supabase
      .from('fact_salary')
      .delete()
      .eq('id', id);
    if (!error) {
      this.salaries.update(v => v.filter(s => s.id !== id));
    }
    return { error };
  }

  // Generate salaries for a specific month
  async generateMonthlySalaries(year: number, month: number) {
    const employees = this.employees().filter(emp => {
      const startDate = new Date(emp.start_date);
      const endDate = emp.end_date ? new Date(emp.end_date) : null;
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      
      return startDate <= monthEnd && (!endDate || endDate >= monthStart);
    });

    const existingSalaries = this.salaries().filter(s => s.year === year && s.month === month);
    const existingEmpIds = existingSalaries.map(s => s.employee_id);

    const newSalaries = employees
      .filter(emp => !existingEmpIds.includes(emp.employee_id))
      .map(emp => ({
        employee_id: emp.employee_id,
        year,
        month,
        base_salary: emp.salary,
        bonus: 0,
        deductions: 0,
        net_salary: emp.salary,
        status: 'pending' as const
      }));

    if (newSalaries.length > 0) {
      const { data, error } = await this.supabase
        .from('fact_salary')
        .insert(newSalaries)
        .select();
      
      if (data) {
        this.salaries.update(v => [...data, ...v]);
      }
      return { data, error, generated: newSalaries.length };
    }

    return { data: null, error: null, generated: 0 };
  }

  // =============================================
  // Other CRUD Operations (Cost, Target, Pipeline)
  // =============================================
  async addCost(item: FactCost) {
    const { data, error } = await this.supabase.from('fact_cost').insert([item]).select();
    if (data) this.costs.update(v => [data[0], ...v]);
    return { data, error };
  }

  async updateCost(item: FactCost) {
    if (!item.id) return { data: null, error: 'No ID provided' };
    const { data, error } = await this.supabase
      .from('fact_cost')
      .update({
        date: item.date,
        year: item.year,
        month: item.month,
        amount: item.amount,
        description: item.description,
        client_id: item.client_id,
        product_id: item.product_id
      })
      .eq('id', item.id)
      .select();
    if (data) {
      this.costs.update(v => v.map(c => c.id === item.id ? data[0] : c));
    }
    return { data, error };
  }

  async addTarget(item: FactTarget) {
    const { data, error } = await this.supabase.from('fact_target_annual').insert([item]).select();
    if (data) this.targets.update(v => [data[0], ...v]);
    return { data, error };
  }

  async updateTarget(item: FactTarget) {
    if (!item.id) return { data: null, error: 'No ID provided' };
    const { data, error } = await this.supabase
      .from('fact_target_annual')
      .update({
        product_id: item.product_id,
        year: item.year,
        annual_target: item.annual_target,
        quarter: item.quarter
      })
      .eq('id', item.id)
      .select();
    if (data) {
      this.targets.update(v => v.map(t => t.id === item.id ? data[0] : t));
    }
    return { data, error };
  }

  async addPipeline(item: FactPipeline) {
    const { data, error } = await this.supabase.from('fact_pipeline').insert([item]).select();
    if (data) this.pipelines.update(v => [data[0], ...v]);
    return { data, error };
  }

  // =============================================
  // Helper Methods
  // =============================================
  productsMap = computed(() => {
    const map = new Map<number, string>();
    this.products().forEach(p => map.set(p.product_id, p.product_name));
    return map;
  });

  clientsMap = computed(() => {
    const map = new Map<number, string>();
    this.clients().forEach(c => map.set(c.client_id, c.client_name));
    return map;
  });

  departmentsMap = computed(() => {
    const map = new Map<number, string>();
    this.departments().forEach(d => map.set(d.department_id, d.department_name));
    return map;
  });

  employeesMap = computed(() => {
    const map = new Map<number, string>();
    this.employees().forEach(e => map.set(e.employee_id, e.name));
    return map;
  });

  getProductName(id: number): string { return this.productsMap().get(id) || `Product ${id}`; }
  getClientName(id: number): string { return this.clientsMap().get(id) || `Client ${id}`; }
  getDepartmentName(id: number): string { return this.departmentsMap().get(id) || `Department ${id}`; }
  getEmployeeName(id: number): string { return this.employeesMap().get(id) || `Employee ${id}`; }
}
