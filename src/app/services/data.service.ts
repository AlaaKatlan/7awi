import { Injectable, signal, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import {
  DimClient, DimProduct, DimEmployee,
  FactPipeline, FactRevenue, FactTarget, FactCost, FactSalary,
  FactRevenueMonthly
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

  // =============================================
  // Helper: Fetch all rows with pagination
  // =============================================
  private async fetchAllRows<T>(
    tableName: string,
    orderBy?: { column: string; ascending: boolean }
  ): Promise<T[]> {
    const PAGE_SIZE = 1000;
    let allData: T[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let query = this.supabase
        .from(tableName)
        .select('*')
        .range(from, from + PAGE_SIZE - 1);

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += PAGE_SIZE;
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`[DataService] Fetched ${allData.length} rows from ${tableName}`);
    return allData;
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
    const data = await this.fetchAllRows<DimProduct>('dim_product');
    if (data) this.products.set(data);
  }

  async fetchClients() {
    const data = await this.fetchAllRows<DimClient>('dim_client');
    if (data) this.clients.set(data);
  }

  async fetchEmployees() {
    const data = await this.fetchAllRows<DimEmployee>('dim_employee', { column: 'name', ascending: true });
    if (data) this.employees.set(data);
  }

  async fetchRevenues() {
    const data = await this.fetchAllRows<FactRevenue>('fact_revenue', { column: 'date', ascending: false });
    if (data) this.revenues.set(data);
  }

  async fetchPipelines() {
    const data = await this.fetchAllRows<FactPipeline>('fact_pipeline', { column: 'created_at', ascending: false });
    if (data) this.pipelines.set(data);
  }

  async fetchTargets() {
    const data = await this.fetchAllRows<FactTarget>('fact_target_annual');
    if (data) this.targets.set(data);
  }

  async fetchCosts() {
    const data = await this.fetchAllRows<FactCost>('fact_cost');
    if (data) this.costs.set(data);
  }

  async fetchSalaries() {
    const data = await this.fetchAllRows<FactSalary>('fact_salary', { column: 'year', ascending: false });
    if (data) this.salaries.set(data);
  }

  // =============================================
  // Helper Methods
  // =============================================
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

  // =============================================
  // Booking Order Number Generation
  // =============================================
  generateBookingRef(country: string, productId: number): string {
    const countryCode = (country || 'UAE').substring(0, 3).toUpperCase();
    const product = this.products().find(p => p.product_id == productId);
    const prodCode = product?.product_code || 'GEN';
    const nextSeq = this.getNextSequentialNumber();
    const increment = nextSeq.toString().padStart(4, '0');
    return `${countryCode}-${prodCode}-${increment}`;
  }

  private getNextSequentialNumber(): number {
    const allRevenues = this.revenues();
    if (allRevenues.length === 0) return 1;

    const sequenceNumbers = allRevenues
      .map(r => {
        if (!r.order_number) return 0;
        const parts = r.order_number.split('-');
        if (parts.length >= 3) {
          const numPart = parts[parts.length - 1];
          const num = parseInt(numPart, 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter(n => n > 0);

    if (sequenceNumbers.length === 0) return 1;
    return Math.max(...sequenceNumbers) + 1;
  }

  regenerateBookingRefForEdit(country: string, productId: number, currentOrderNumber: string): string {
    const countryCode = (country || 'UAE').substring(0, 3).toUpperCase();
    const product = this.products().find(p => p.product_id == productId);
    const prodCode = product?.product_code || 'GEN';

    let seqNum = '0001';
    if (currentOrderNumber) {
      const parts = currentOrderNumber.split('-');
      if (parts.length >= 3) {
        seqNum = parts[parts.length - 1];
      }
    }

    return `${countryCode}-${prodCode}-${seqNum}`;
  }

  // =============================================
  // REVENUE / BOOKING ORDER CRUD
  // =============================================
  async addRevenue(item: Partial<FactRevenue>) {
    const payload: any = {
      date: item.date,
      gross_amount: item.gross_amount || 0,
      total_value: item.total_value || 0,
      order_number: item.order_number,
      product_id: item.product_id,
      country: item.country,
      lead_id: item.lead_id || null,
      owner_id: item.owner_id || null,
      start_date: item.start_date || null,
      end_date: item.end_date || null,
      // New fields
      bo_name: item.bo_name || null,
      campaign_name: item.campaign_name || null,
      description: item.description || null,
      project_type: item.project_type || null,
      booking_order_type: item.booking_order_type || 'One Time',
      client_id: item.client_id || null,
      bo_submission_date: item.bo_submission_date || null,
      payment_date: item.payment_date || null,
      estimated_revenue: item.estimated_revenue || 0,
      direct_cost_labor: item.direct_cost_labor || 0,
      direct_cost_material: item.direct_cost_material || 0,
      direct_cost_equipment: item.direct_cost_equipment || 0,
      direct_cost_tools: item.direct_cost_tools || 0,
      direct_cost_other: item.direct_cost_other || 0,
      one_time_marketing: item.one_time_marketing || 0,
      one_time_consultation: item.one_time_consultation || 0,
      one_time_misc: item.one_time_misc || 0,
      comments: item.comments || null,
      approval_status: item.approval_status || 'Pending',
      // Payment Terms fields
      payment_terms: item.payment_terms || 'Upfront',
      payment_custom_percentage: item.payment_custom_percentage || 50,
      payment_retainer_start: item.payment_retainer_start || null,
      payment_retainer_end: item.payment_retainer_end || null
    };

    const { data, error } = await this.supabase.from('fact_revenue').insert([payload]).select();

    if (data) {
      this.revenues.update(v => [data[0], ...v]);
    }

    return { success: !error, error: error?.message, data };
  }

  async updateRevenue(item: Partial<FactRevenue>) {
    const { id, ...rest } = item;

    const payload: any = {};

    // Basic fields
    if (rest.date !== undefined) payload.date = rest.date;
    if (rest.gross_amount !== undefined) payload.gross_amount = rest.gross_amount;
    if (rest.total_value !== undefined) payload.total_value = rest.total_value;
    if (rest.order_number !== undefined) payload.order_number = rest.order_number;
    if (rest.product_id !== undefined) payload.product_id = rest.product_id;
    if (rest.country !== undefined) payload.country = rest.country;
    if (rest.lead_id !== undefined) payload.lead_id = rest.lead_id || null;
    if (rest.owner_id !== undefined) payload.owner_id = rest.owner_id || null;
    if (rest.start_date !== undefined) payload.start_date = rest.start_date || null;
    if (rest.end_date !== undefined) payload.end_date = rest.end_date || null;

    // New fields
    if (rest.bo_name !== undefined) payload.bo_name = rest.bo_name;
    if (rest.campaign_name !== undefined) payload.campaign_name = rest.campaign_name;
    if (rest.description !== undefined) payload.description = rest.description;
    if (rest.project_type !== undefined) payload.project_type = rest.project_type;
    if (rest.booking_order_type !== undefined) payload.booking_order_type = rest.booking_order_type;
    if (rest.client_id !== undefined) payload.client_id = rest.client_id || null;
    if (rest.bo_submission_date !== undefined) payload.bo_submission_date = rest.bo_submission_date;
    if (rest.payment_date !== undefined) payload.payment_date = rest.payment_date;
    if (rest.estimated_revenue !== undefined) payload.estimated_revenue = rest.estimated_revenue;
    if (rest.direct_cost_labor !== undefined) payload.direct_cost_labor = rest.direct_cost_labor;
    if (rest.direct_cost_material !== undefined) payload.direct_cost_material = rest.direct_cost_material;
    if (rest.direct_cost_equipment !== undefined) payload.direct_cost_equipment = rest.direct_cost_equipment;
    if (rest.direct_cost_tools !== undefined) payload.direct_cost_tools = rest.direct_cost_tools;
    if (rest.direct_cost_other !== undefined) payload.direct_cost_other = rest.direct_cost_other;
    if (rest.one_time_marketing !== undefined) payload.one_time_marketing = rest.one_time_marketing;
    if (rest.one_time_consultation !== undefined) payload.one_time_consultation = rest.one_time_consultation;
    if (rest.one_time_misc !== undefined) payload.one_time_misc = rest.one_time_misc;
    if (rest.comments !== undefined) payload.comments = rest.comments;
    if (rest.approval_status !== undefined) payload.approval_status = rest.approval_status;
    // Payment Terms fields
    if (rest.payment_terms !== undefined) payload.payment_terms = rest.payment_terms;
    if (rest.payment_custom_percentage !== undefined) payload.payment_custom_percentage = rest.payment_custom_percentage;
    if (rest.payment_retainer_start !== undefined) payload.payment_retainer_start = rest.payment_retainer_start || null;
    if (rest.payment_retainer_end !== undefined) payload.payment_retainer_end = rest.payment_retainer_end || null;

    const { data, error } = await this.supabase.from('fact_revenue').update(payload).eq('id', id).select();

    if (data) {
      this.revenues.update(v => v.map(r => r.id === id ? data[0] : r));
    }

    return { success: !error, error: error?.message, data };
  }

  async deleteRevenue(id: number) {
    // First delete monthly data
    await this.supabase.from('fact_revenue_monthly').delete().eq('revenue_id', id);

    // Then delete revenue
    const { error } = await this.supabase.from('fact_revenue').delete().eq('id', id);
    if (!error) {
      this.revenues.update(v => v.filter(r => r.id !== id));
    }
    return { success: !error, error: error?.message };
  }

  // =============================================
  // APPROVAL SYSTEM
  // =============================================
  async approveRevenue(revenueId: number, notes?: string) {
    const currentUser = this.authService.currentUser();
    const employee = this.employees().find(e => e.email === currentUser?.email);

    const payload = {
      approval_status: 'Approved',
      approved_by: employee?.employee_id || null,
      approved_at: new Date().toISOString(),
      approval_notes: notes || null
    };

    const { data, error } = await this.supabase
      .from('fact_revenue')
      .update(payload)
      .eq('id', revenueId)
      .select();

    if (data) {
      this.revenues.update(v => v.map(r => r.id === revenueId ? data[0] : r));
    }

    return { success: !error, error: error?.message, data };
  }

  async rejectRevenue(revenueId: number, notes?: string) {
    const currentUser = this.authService.currentUser();
    const employee = this.employees().find(e => e.email === currentUser?.email);

    const payload = {
      approval_status: 'Rejected',
      approved_by: employee?.employee_id || null,
      approved_at: new Date().toISOString(),
      approval_notes: notes || null
    };

    const { data, error } = await this.supabase
      .from('fact_revenue')
      .update(payload)
      .eq('id', revenueId)
      .select();

    if (data) {
      this.revenues.update(v => v.map(r => r.id === revenueId ? data[0] : r));
    }

    return { success: !error, error: error?.message, data };
  }

  // =============================================
  // MONTHLY DISTRIBUTION (Multi-Retainer)
  // =============================================
  async getRevenueMonthlyData(revenueId: number): Promise<FactRevenueMonthly[]> {
    const { data, error } = await this.supabase
      .from('fact_revenue_monthly')
      .select('*')
      .eq('revenue_id', revenueId)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching monthly data:', error);
      return [];
    }

    return data || [];
  }

  async saveRevenueMonthly(monthly: FactRevenueMonthly): Promise<{ success: boolean; error?: string }> {
    if (monthly.id) {
      const { error } = await this.supabase
        .from('fact_revenue_monthly')
        .update({
          estimated_revenue: monthly.estimated_revenue,
          actual_revenue: monthly.actual_revenue,
          notes: monthly.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', monthly.id);

      return { success: !error, error: error?.message };
    } else {
      const { error } = await this.supabase
        .from('fact_revenue_monthly')
        .insert([{
          revenue_id: monthly.revenue_id,
          year: monthly.year,
          month: monthly.month,
          estimated_revenue: monthly.estimated_revenue,
          actual_revenue: monthly.actual_revenue,
          notes: monthly.notes
        }]);

      return { success: !error, error: error?.message };
    }
  }

  async updateRevenueMonthly(monthly: FactRevenueMonthly): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('fact_revenue_monthly')
      .update({
        actual_revenue: monthly.actual_revenue,
        updated_at: new Date().toISOString()
      })
      .eq('id', monthly.id);

    return { success: !error, error: error?.message };
  }

  async deleteRevenueMonthly(revenueId: number): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('fact_revenue_monthly')
      .delete()
      .eq('revenue_id', revenueId);

    return { success: !error, error: error?.message };
  }

  // =============================================
  // EMPLOYEE CRUD
  // =============================================
  async addEmployee(item: Partial<DimEmployee>) {
    const { employee_id, created_at, ...payload } = item as any;

    const { data, error } = await this.supabase
      .from('dim_employee')
      .insert([payload])
      .select();

    if (data && data.length > 0) {
      this.employees.update(v => [...v, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
    }

    return { success: !error, error: error?.message, data };
  }

  async updateEmployee(item: Partial<DimEmployee>) {
    const { employee_id, created_at, ...payload } = item as any;

    if (!employee_id) {
      return { success: false, error: 'No employee_id provided', data: null };
    }

    const { data, error } = await this.supabase
      .from('dim_employee')
      .update(payload)
      .eq('employee_id', employee_id)
      .select();

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

  // =============================================
  // CLIENT CRUD (Updated with all CRM fields)
  // =============================================
  async addClient(item: Partial<DimClient>) {
    const payload: any = {
      client_name: item.client_name,
      country: item.country || 'UAE'
    };

    // Assigned Team fields
    if (item.lead_id) payload.lead_id = item.lead_id;
    if (item.relationship_manager_id) payload.relationship_manager_id = item.relationship_manager_id;
    
    // Company Info fields
    if (item.product_id) payload.product_id = item.product_id;
    if (item.company_type) payload.company_type = item.company_type;
    if (item.industry) payload.industry = item.industry;
    
    // Contact Info fields
    if (item.poc_name) payload.poc_name = item.poc_name;
    if (item.contact_email) payload.contact_email = item.contact_email;
    if (item.contact_phone) payload.contact_phone = item.contact_phone;
    if (item.contact_person) payload.contact_person = item.contact_person;
    
    // Sales Pipeline fields
    if (item.status) payload.status = item.status;
    if (item.lead_source) payload.lead_source = item.lead_source;
    if (item.account_manager_id) payload.account_manager_id = item.account_manager_id;
    
    // Deal Info fields
    if (item.estimated_deal_value) payload.estimated_deal_value = item.estimated_deal_value;
    if (item.expected_closing_date) payload.expected_closing_date = item.expected_closing_date;
    
    // Key Dates fields
    if (item.first_contact_date) payload.first_contact_date = item.first_contact_date;
    if (item.last_followup_date) payload.last_followup_date = item.last_followup_date;
    if (item.next_action_date) payload.next_action_date = item.next_action_date;
    
    // Notes
    if (item.notes) payload.notes = item.notes;

    const { data, error } = await this.supabase.from('dim_client').insert([payload]).select();

    if (data && data.length > 0) {
      this.clients.update(v => [data[0], ...v]);
    }

    return { success: !error, error: error?.message, data };
  }

  async updateClient(item: Partial<DimClient>) {
    const { client_id, created_at, ...rest } = item as any;

    if (!client_id) {
      return { success: false, error: 'No client_id provided', data: null };
    }

    const payload: any = {};
    Object.keys(rest).forEach(key => {
      if (rest[key] !== undefined) {
        payload[key] = rest[key] || null;
      }
    });

    const { data, error } = await this.supabase.from('dim_client').update(payload).eq('client_id', client_id).select();

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

  // =============================================
  // PIPELINE CRUD
  // =============================================
  async addPipeline(item: Partial<FactPipeline>) {
    const { id, created_at, ...payload } = item as any;
    const { data, error } = await this.supabase.from('fact_pipeline').insert([payload]).select();
    if (data) this.pipelines.update(v => [data[0], ...v]);
    return { success: !error, error: error?.message, data };
  }

  async updatePipeline(item: Partial<FactPipeline>) {
    const { id, created_at, ...payload } = item as any;
    if (!id) return { success: false, error: 'No pipeline id provided', data: null };

    const { data, error } = await this.supabase.from('fact_pipeline').update(payload).eq('id', id).select();
    if (data) this.pipelines.update(v => v.map(p => p.id === id ? data[0] : p));
    return { success: !error, error: error?.message, data };
  }

  async deletePipeline(id: number) {
    const { error } = await this.supabase.from('fact_pipeline').delete().eq('id', id);
    if (!error) this.pipelines.update(v => v.filter(p => p.id !== id));
    return { success: !error, error: error?.message };
  }

  // =============================================
  // COST CRUD
  // =============================================
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

  async deleteCost(id: number) {
    const { error } = await this.supabase.from('fact_cost').delete().eq('id', id);
    if (!error) this.costs.update(v => v.filter(c => c.id !== id));
    return { success: !error, error: error?.message };
  }

  async addCostsBulk(items: Partial<FactCost>[]) {
    const { data, error } = await this.supabase
      .from('fact_cost')
      .insert(items)
      .select();

    if (data) {
      this.costs.update(current => [...data, ...current]);
    }

    return {
      success: !error,
      error: error?.message,
      count: data?.length || 0
    };
  }

  async generateZeroCostsForMonth(year: number, month: number): Promise<{ success: boolean; generated: number; error?: string }> {
    try {
      const allProducts = this.products();
      if (allProducts.length === 0) return { success: false, generated: 0, error: 'No departments found' };

      const currentCosts = this.costs().filter(c => c.year === year && c.month === month);
      const existingProductIds = new Set(currentCosts.map(c => c.product_id));

      const missingProducts = allProducts.filter(p => !existingProductIds.has(p.product_id));

      if (missingProducts.length === 0) {
        return { success: true, generated: 0 };
      }

      const dateStr = `${year}-${month.toString().padStart(2, '0')}-01`;

      const newCosts = missingProducts.map(prod => ({
        year: year,
        month: month,
        date: dateStr,
        amount: 0,
        product_id: prod.product_id,
        description: `Monthly Cost - ${prod.product_name}`,
        client_id: null
      }));

      const { data, error } = await this.supabase
        .from('fact_cost')
        .insert(newCosts)
        .select();

      if (error) throw error;

      if (data) {
        this.costs.update(current => [...data, ...current]);
      }

      return { success: true, generated: data?.length || 0 };

    } catch (error: any) {
      console.error('Generate zero costs error:', error);
      return { success: false, generated: 0, error: error.message };
    }
  }

  // =============================================
  // SALARY CRUD
  // =============================================
  async updateSalary(item: Partial<FactSalary>) {
    const { id, created_at, ...payload } = item as any;
    const { data, error } = await this.supabase.from('fact_salary').update(payload).eq('id', id).select();
    if (data) this.salaries.update(v => v.map(s => s.id === id ? data[0] : s));
    return { success: !error, error: error?.message, data };
  }

  async generateMonthlySalaries(year: number, month: number): Promise<{ success: boolean; error?: any; generated: number }> {
    try {
      const allEmployees = this.employees();
      const activeEmployees = allEmployees.filter(emp => !emp.end_date);

      if (activeEmployees.length === 0) {
        return { success: true, generated: 0 };
      }

      const localSalaries = this.salaries();
      const existingForThisMonth = localSalaries.filter(s => s.year === year && s.month === month);
      const existingEmployeeIds = new Set(existingForThisMonth.map(s => s.employee_id));

      const employeesNeedingSalary = activeEmployees.filter(
        emp => !existingEmployeeIds.has(emp.employee_id)
      );

      if (employeesNeedingSalary.length === 0) {
        return { success: true, generated: 0 };
      }

      const newSalaryRecords = employeesNeedingSalary.map(emp => {
        const finalSalary = Math.round((Number(emp.salary) || 0) * 100) / 100;

        return {
          employee_id: emp.employee_id,
          year: year,
          month: month,
          base_salary: finalSalary,
          bonus: 0,
          deductions: 0,
          net_salary: finalSalary,
          status: 'pending' as const
        };
      });

      const BATCH_SIZE = 50;
      let totalInserted = 0;
      const allInsertedData: any[] = [];

      for (let i = 0; i < newSalaryRecords.length; i += BATCH_SIZE) {
        const batch = newSalaryRecords.slice(i, i + BATCH_SIZE);

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
        }
      }

      if (allInsertedData.length > 0) {
        this.salaries.update(current => [...allInsertedData, ...current]);
      }

      return { success: true, generated: totalInserted };

    } catch (error: any) {
      console.error('Unexpected error in generateMonthlySalaries:', error);
      return { success: false, error: error.message, generated: 0 };
    }
  }

  // =============================================
  // TARGET CRUD
  // =============================================
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
