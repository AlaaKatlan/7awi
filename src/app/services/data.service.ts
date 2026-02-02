import { Injectable, signal, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import {
  DimClient, DimProduct, DimEmployee,
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
  
  async fetchEmployees() {
    const { data } = await this.supabase.from('dim_employee').select('*').order('name', { ascending: true });
    if (data) this.employees.set(data);
  }
  
  async fetchRevenues() {
    const { data } = await this.supabase.from('fact_revenue').select('*').order('date', { ascending: false });
    if (data) this.revenues.set(data);
  }
  
  async fetchPipelines() {
    const { data } = await this.supabase.from('fact_pipeline').select('*').order('created_at', { ascending: false });
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
    const { data } = await this.supabase.from('fact_salary').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (data) this.salaries.set(data);
  }

  // --- Helper Methods ---
  getClientName(id: number | undefined): string {
    if (!id) return '-';
    return this.clients().find(c => c.client_id == id)?.client_name || 'Unknown';
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

  // =============================================
  // GENERATE MONTHLY SALARIES
  // =============================================
  async generateMonthlySalaries(year: number, month: number): Promise<{ success: boolean; error?: any; generated: number }> {
    console.log('=== generateMonthlySalaries START ===');
    console.log('Year:', year, 'Month:', month);

    try {
      const allEmployees = this.employees();
      const activeEmployees = allEmployees.filter(emp => !emp.end_date);

      console.log('Total employees:', allEmployees.length);
      console.log('Active employees (no end_date):', activeEmployees.length);

      if (activeEmployees.length === 0) {
        console.log('No active employees found!');
        return { success: true, generated: 0 };
      }

      console.log('Checking existing salaries from local signal...');
      const localSalaries = this.salaries();
      const existingForThisMonth = localSalaries.filter(s => s.year === year && s.month === month);

      console.log('Total salaries in signal:', localSalaries.length);
      console.log('Existing salary records for this month:', existingForThisMonth.length);

      const existingEmployeeIds = new Set(existingForThisMonth.map(s => s.employee_id));

      const employeesNeedingSalary = activeEmployees.filter(
        emp => !existingEmployeeIds.has(emp.employee_id)
      );

      console.log('Employees needing salary records:', employeesNeedingSalary.length);

      if (employeesNeedingSalary.length === 0) {
        console.log('All active employees already have salary records for this period.');
        return { success: true, generated: 0 };
      }

      const newSalaryRecords = employeesNeedingSalary.map(emp => ({
        employee_id: emp.employee_id,
        year: year,
        month: month,
        base_salary: Number(emp.salary) || 0,
        bonus: 0,
        deductions: 0,
        net_salary: Number(emp.salary) || 0,
        status: 'pending' as const
      }));

      console.log('New salary records to insert:', newSalaryRecords.length);

      const BATCH_SIZE = 50;
      let totalInserted = 0;
      const allInsertedData: any[] = [];

      for (let i = 0; i < newSalaryRecords.length; i += BATCH_SIZE) {
        const batch = newSalaryRecords.slice(i, i + BATCH_SIZE);
        console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(newSalaryRecords.length/BATCH_SIZE)} (${batch.length} records)...`);

        const { data: insertedData, error: insertError } = await this.supabase
          .from('fact_salary')
          .insert(batch)
          .select();

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          continue;
        }

        if (insertedData) {
          totalInserted += insertedData.length;
          allInsertedData.push(...insertedData);
          console.log(`Batch inserted successfully: ${insertedData.length} records`);
        }
      }

      console.log('Total successfully inserted:', totalInserted, 'records');

      if (allInsertedData.length > 0) {
        this.salaries.update(current => [...allInsertedData, ...current]);
        console.log('Local salaries signal updated');
      }

      console.log('=== generateMonthlySalaries END ===');
      return { success: true, generated: totalInserted };

    } catch (error: any) {
      console.error('Unexpected error in generateMonthlySalaries:', error);
      return { success: false, error: error.message, generated: 0 };
    }
  }

  // =============================================
  // CRUD Operations
  // =============================================

  // --- REVENUE ---
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

  // --- EMPLOYEE ---
  async addEmployee(item: Partial<DimEmployee>) {
    console.log('[DataService] addEmployee called with:', item);
    const { employee_id, created_at, ...payload } = item as any;

    const { data, error } = await this.supabase
      .from('dim_employee')
      .insert([payload])
      .select();

    console.log('[DataService] addEmployee result - data:', data, 'error:', error);

    if (data && data.length > 0) {
      this.employees.update(v => [...v, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
    }

    return { success: !error, error: error?.message, data };
  }

  async updateEmployee(item: Partial<DimEmployee>) {
    console.log('[DataService] updateEmployee called with:', item);

    const { employee_id, created_at, ...payload } = item as any;

    if (!employee_id) {
      console.error('[DataService] updateEmployee: No employee_id provided!');
      return { success: false, error: 'No employee_id provided', data: null };
    }

    const { data, error } = await this.supabase
      .from('dim_employee')
      .update(payload)
      .eq('employee_id', employee_id)
      .select();

    console.log('[DataService] updateEmployee result - data:', data, 'error:', error);

    if (data && data.length > 0) {
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

  // --- CLIENT (معدّل) ---
  async addClient(item: Partial<DimClient>) {
    console.log('[DataService] addClient called with:', item);
    
    // تنظيف الـ payload - إزالة القيم الفارغة
    const payload: any = {
      client_name: item.client_name,
      country: item.country || 'UAE'
    };
    
    // إضافة الحقول الاختيارية فقط إذا كانت موجودة
    if (item.product_id) payload.product_id = item.product_id;
    if (item.lead_id) payload.lead_id = item.lead_id;
    if (item.relationship_manager_id) payload.relationship_manager_id = item.relationship_manager_id;
    
    console.log('[DataService] Clean payload:', payload);
    
    const { data, error } = await this.supabase.from('dim_client').insert([payload]).select();
    
    console.log('[DataService] addClient result - data:', data, 'error:', error);
    
    if (data && data.length > 0) {
      this.clients.update(v => [data[0], ...v]);
    }
    
    return { success: !error, error: error?.message, data };
  }

  async updateClient(item: Partial<DimClient>) {
    console.log('[DataService] updateClient called with:', item);
    
    const { client_id, created_at, ...rest } = item as any;
    
    if (!client_id) {
      return { success: false, error: 'No client_id provided', data: null };
    }
    
    // تنظيف الـ payload
    const payload: any = {};
    if (rest.client_name !== undefined) payload.client_name = rest.client_name;
    if (rest.country !== undefined) payload.country = rest.country;
    if (rest.product_id !== undefined) payload.product_id = rest.product_id || null;
    if (rest.lead_id !== undefined) payload.lead_id = rest.lead_id || null;
    if (rest.relationship_manager_id !== undefined) payload.relationship_manager_id = rest.relationship_manager_id || null;
    
    console.log('[DataService] Update payload:', payload);
    
    const { data, error } = await this.supabase.from('dim_client').update(payload).eq('client_id', client_id).select();
    
    console.log('[DataService] updateClient result - data:', data, 'error:', error);
    
    if (data && data.length > 0) {
      this.clients.update(v => v.map(c => c.client_id === client_id ? data[0] : c));
    }
    
    return { success: !error, error: error?.message, data };
  }

  async deleteClient(id: number) {
    const { error } = await this.supabase.from('dim_client').delete().eq('client_id', id);
    if (!error) this.clients.update(v => v.filter(c => c.client_id !== id));
    return { success: !error, error: error?.message };
  }

  // --- PIPELINE (معدّل - إضافة lead_id و owner_id) ---
  async addPipeline(item: Partial<FactPipeline>) {
    const { id, created_at, ...payload } = item as any;
    const { data, error } = await this.supabase.from('fact_pipeline').insert([payload]).select();
    if (data) this.pipelines.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }

  async updatePipeline(item: Partial<FactPipeline>) {
    const { id, created_at, ...payload } = item as any;
    
    if (!id) {
      return { success: false, error: 'No pipeline id provided', data: null };
    }
    
    const { data, error } = await this.supabase.from('fact_pipeline').update(payload).eq('id', id).select();
    if (data) this.pipelines.update(v => v.map(p => p.id === id ? data[0] : p));
    return { success: !error, error: error?.message, data };
  }

  async deletePipeline(id: number) {
    const { error } = await this.supabase.from('fact_pipeline').delete().eq('id', id);
    if (!error) this.pipelines.update(v => v.filter(p => p.id !== id));
    return { success: !error, error: error?.message };
  }

  // --- COST ---
  async addCost(item: Partial<FactCost>) {
    const { id, ...payload } = item as any;
    const { data, error } = await this.supabase.from('fact_cost').insert([payload]).select();
    if (data) this.costs.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }

  async updateCost(item: Partial<FactCost>) {
    const { id, ...payload } = item as any;
    const { data, error } = await this.supabase.from('fact_cost').update(payload).eq('id', id).select();
    if (data) this.costs.update(v => v.map(c => c.id === id ? data[0] : c));
    return { success: !error, error: error?.message, data };
  }

  // --- SALARY ---
  async updateSalary(item: Partial<FactSalary>) {
    const { id, created_at, ...payload } = item as any;
    const { data, error } = await this.supabase.from('fact_salary').update(payload).eq('id', id).select();
    if (data) this.salaries.update(v => v.map(s => s.id === id ? data[0] : s));
    return { success: !error, error: error?.message, data };
  }

  // --- TARGET ---
  async addTarget(item: Partial<FactTarget>) {
    const { id, ...payload } = item as any;
    const { data, error } = await this.supabase.from('fact_target_annual').insert([payload]).select();
    if (data) this.targets.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }

  async updateTarget(item: Partial<FactTarget>) {
    const { id, ...payload } = item as any;
    const { data, error } = await this.supabase.from('fact_target_annual').update(payload).eq('id', id).select();
    if (data) this.targets.update(v => v.map(t => t.id === id ? data[0] : t));
    return { success: !error, error: error?.message, data };
  }
}
