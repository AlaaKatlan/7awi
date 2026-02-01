import { Injectable, signal, inject } from '@angular/core';
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

  // Signals
  products = signal<DimProduct[]>([]);
  clients = signal<DimClient[]>([]);
  departments = signal<DimDepartment[]>([]);
  employees = signal<DimEmployee[]>([]);
  revenues = signal<FactRevenue[]>([]);
  pipelines = signal<FactPipeline[]>([]);
  targets = signal<FactTarget[]>([]);
  costs = signal<FactCost[]>([]);
  salaries = signal<FactSalary[]>([]);

  loading = signal(true);

  constructor() {
    this.supabase = this.authService.getClient();
    this.fetchInitialData();
  }

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

  // --- Fetch Methods ---
  async fetchProducts() {
    const { data } = await this.supabase.from('dim_product').select('*');
    if (data) this.products.set(data);
  }
  async fetchClients() {
    const { data } = await this.supabase.from('dim_client').select('*');
    if (data) this.clients.set(data);
  }
  async fetchDepartments() {
    const { data } = await this.supabase.from('dim_department').select('*');
    if (data) this.departments.set(data);
  }
  async fetchEmployees() {
    const { data } = await this.supabase.from('dim_employee').select('*').order('name', { ascending: true });
    if (data) this.employees.set(data);
  }
  async fetchRevenues() {
    const { data } = await this.supabase.from('fact_revenue').select('*').order('date', { ascending: false });
    if (data) this.revenues.set(data);
  }
  async fetchPipelines() {
    const { data } = await this.supabase.from('fact_pipeline').select('*');
    if (data) this.pipelines.set(data);
  }
  async fetchTargets() {
    const { data } = await this.supabase.from('fact_target_annual').select('*');
    if (data) this.targets.set(data);
  }
  async fetchCosts() {
    const { data } = await this.supabase.from('fact_cost').select('*');
    if (data) this.costs.set(data);
  }
  async fetchSalaries() {
    const { data } = await this.supabase.from('fact_salary').select('*');
    if (data) this.salaries.set(data);
  }

  // --- Helper Methods ---

  getClientName(id: number | undefined): string {
    if (!id) return '-';
    return this.clients().find(c => c.client_id == id)?.client_name || 'Unknown';
  }

  getDepartmentName(id: number | undefined): string {
    if (!id) return '-';
    return this.departments().find(d => d.department_id == id)?.department_name || 'Unknown';
  }

  getEmployeeName(id: number | undefined): string {
    if (!id) return '-';
    return this.employees().find(e => e.employee_id == id)?.name || 'Unknown';
  }

  getProductName(id: number | undefined): string {
    if (!id) return '-';
    return this.products().find(p => p.product_id == id)?.product_name || `Product ${id}`;
  }

  // --- Logic Methods ---
  generateBookingRef(country: string, productId: number): string {
    const countryCode = (country || 'UA').substring(0, 2).toUpperCase();
    const product = this.products().find(p => p.product_id == productId);
    const prodCode = product?.product_code || 'GEN';
    const nextId = this.revenues().length + 1;
    const increment = nextId.toString().padStart(4, '0');
    return `${countryCode}-${prodCode}-${increment}`;
  }

  async generateMonthlySalaries(year: number, month: number) {
    const employees = this.employees();
    const existing = this.salaries().filter(s => s.year === year && s.month === month);
    const newSalaries: any[] = [];
    employees.forEach(emp => {
      if (!existing.find(s => s.employee_id === emp.employee_id)) {
        newSalaries.push({
          employee_id: emp.employee_id,
          year,
          month,
          base_salary: emp.salary,
          net_salary: emp.salary,
          status: 'pending'
        });
      }
    });
    let generatedCount = 0;
    if (newSalaries.length > 0) {
      const { data, error } = await this.supabase.from('fact_salary').insert(newSalaries).select();
      if (data) {
        this.salaries.update(current => [...data, ...current]);
        generatedCount = data.length;
      }
      return { success: !error, error, generated: generatedCount };
    }
    return { success: true, generated: 0 };
  }

  // --- CRUD Operations ---
  async addRevenue(item: Partial<FactRevenue>) {
    const payload = {
      date: item.date,
      gross_amount: item.gross_amount,
      total_value: item.total_value,
      order_number: item.order_number,
      product_id: item.product_id,
      country: item.country,
      lead_id: item.lead_id,
      owner_id: item.owner_id
    };
    const { data, error } = await this.supabase.from('fact_revenue').insert([payload]).select();
    if (data) this.revenues.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }

  async updateRevenue(item: Partial<FactRevenue>) {
    const { id, ...payload } = item;
    const { data, error } = await this.supabase.from('fact_revenue').update(payload).eq('id', id).select();
    if (data) this.revenues.update(v => v.map(r => r.id === id ? data[0] : r));
    return { success: !error, error: error?.message, data };
  }

  // Employee
  async addEmployee(item: Partial<DimEmployee>) {
    const { data, error } = await this.supabase.from('dim_employee').insert([item]).select();
    if (data) this.employees.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }
async updateEmployee(item: Partial<DimEmployee>) {
    // نستبعد المعرف من البيانات المرسلة للتحديث
    const { employee_id, ...payload } = item;
   
    const { data, error } = await this.supabase
      .from('dim_employee')
      .update(payload)
      .eq('employee_id', employee_id)
      .select(); // مهم جداً: select() يعيد الصف المحدث

    if (data && data.length > 0) {
      // تحديث الـ Signal محلياً ليعكس التغيير فوراً في الواجهة
      this.employees.update(currentList =>
        currentList.map(e => e.employee_id === employee_id ? data[0] : e)
      );
    }

    return { success: !error, error: error?.message, data };
  }
  async deleteEmployee(id: number) {
    const { error } = await this.supabase.from('dim_employee').delete().eq('employee_id', id);
    if (!error) this.employees.update(v => v.filter(e => e.employee_id !== id));
    return { success: !error, error: error?.message };
  }

  // Client
  async addClient(item: Partial<DimClient>) {
    const { data, error } = await this.supabase.from('dim_client').insert([item]).select();
    if (data) this.clients.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }
  async updateClient(item: Partial<DimClient>) {
    const { client_id, ...payload } = item;
    const { data, error } = await this.supabase.from('dim_client').update(payload).eq('client_id', client_id).select();
    if (data) this.clients.update(v => v.map(c => c.client_id === client_id ? data[0] : c));
    return { success: !error, error: error?.message, data };
  }
  async deleteClient(id: number) {
    const { error } = await this.supabase.from('dim_client').delete().eq('client_id', id);
    if (!error) this.clients.update(v => v.filter(c => c.client_id !== id));
    return { success: !error, error: error?.message };
  }

  // Cost
  async addCost(item: Partial<FactCost>) {
    const { data, error } = await this.supabase.from('fact_cost').insert([item]).select();
    if (data) this.costs.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }
  async updateCost(item: Partial<FactCost>) {
    const { id, ...payload } = item;
    const { data, error } = await this.supabase.from('fact_cost').update(payload).eq('id', id).select();
    if (data) this.costs.update(v => v.map(c => c.id === id ? data[0] : c));
    return { success: !error, error: error?.message, data };
  }

  // Salary
  async updateSalary(item: Partial<FactSalary>) {
    const { id, ...payload } = item;
    const { data, error } = await this.supabase.from('fact_salary').update(payload).eq('id', id).select();
    if (data) this.salaries.update(v => v.map(s => s.id === id ? data[0] : s));
    return { success: !error, error: error?.message, data };
  }

  // Target
  async addTarget(item: Partial<FactTarget>) {
    const { data, error } = await this.supabase.from('fact_target_annual').insert([item]).select();
    if (data) this.targets.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }
  async updateTarget(item: Partial<FactTarget>) {
    const { id, ...payload } = item;
    const { data, error } = await this.supabase.from('fact_target_annual').update(payload).eq('id', id).select();
    if (data) this.targets.update(v => v.map(t => t.id === id ? data[0] : t));
    return { success: !error, error: error?.message, data };
  }

  // Pipeline
  async addPipeline(item: Partial<FactPipeline>) {
    const { data, error } = await this.supabase.from('fact_pipeline').insert([item]).select();
    if (data) this.pipelines.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }
}
