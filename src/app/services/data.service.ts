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
  // ✅ تم إضافة `selectQuery` لدعم جلب الجداول المرتبطة (مثل البنود والدفعات)
  private async fetchAllRows<T>(
    tableName: string,
    orderBy?: { column: string; ascending: boolean },
    selectQuery: string = '*'
  ): Promise<T[]> {
    const PAGE_SIZE = 1000;
    let allData: T[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let query = this.supabase
        .from(tableName)
        .select(selectQuery)
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
        // ✅ الإصلاح هنا: استخدام as any[] لتخطي مشكلة GenericStringError
        allData = [...allData, ...(data as any[])];
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
    // ✅ جلب الطلب الأساسي مع الجداول المرتبطة به (البنود والدفعات)
    const selectQuery = '*, booking_order_items(*), payment_milestones(*)';
    const data = await this.fetchAllRows<FactRevenue>('fact_revenue', { column: 'id', ascending: false }, selectQuery);
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

  // ✅ الدالة التي كانت مفقودة وتسببت بالخطأ
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
  // REVENUE / BOOKING ORDER CRUD (UPDATED FOR ERP)
  // =============================================
  async addRevenue(item: Partial<FactRevenue>) {
    // 1. استخراج الجداول المرتبطة من الـ Payload
    const { booking_order_items, payment_milestones, ...mainPayload } = item;

    // تجهيز بيانات الجدول الرئيسي (بدون الجداول المرتبطة)
    const payload: any = {
      ...mainPayload,
      expected_payment_date: item.expected_payment_date || item.payment_date || null, // التوافق مع الاسم الجديد
      payment_type: item.payment_type || 'one_time',
      vat_enabled: item.vat_enabled ?? true,
      vat_percentage: item.vat_percentage ?? 5,
    };

    // إزالة الحقول المؤقتة أو القديمة إن وجدت
    delete payload.id;
    delete payload.payment_date;

    // 2. إدخال الطلب الأساسي
    const { data: revData, error: revError } = await this.supabase
      .from('fact_revenue')
      .insert([payload])
      .select()
      .single();

    if (revError) return { success: false, error: revError.message };

    const newRevenueId = revData.id;

    // 3. إدخال البنود المرتبطة (إن وجدت)
    if (booking_order_items && booking_order_items.length > 0) {
      const itemsToInsert = booking_order_items.map((i, idx) => ({
        revenue_id: newRevenueId,
        item_order: idx + 1,
        item_name: i.item_name,
        quantity: i.quantity || 1,
        unit_price: i.unit_price || 0,
        discount: i.discount || 0
      }));
      await this.supabase.from('booking_order_items').insert(itemsToInsert);
    }

    // 4. إدخال الدفعات المتعددة (إن وجدت)
    if (payment_milestones && payment_milestones.length > 0) {
      const milestonesToInsert = payment_milestones.map((m, idx) => ({
        revenue_id: newRevenueId,
        milestone_order: idx + 1,
        milestone_name: m.milestone_name, // ✅ الإصلاح هنا
        percentage: m.percentage || 0,
        amount: m.amount || 0,
        status: m.status || 'pending'
      }));
      await this.supabase.from('payment_milestones').insert(milestonesToInsert);
    }

    // 5. إعادة الجلب لتحديث الـ Signal والـ Triggers
    await this.fetchRevenues();
    return { success: true, data: [revData] };
  }

  async updateRevenue(item: Partial<FactRevenue>) {
    const { id, booking_order_items, payment_milestones, ...rest } = item;

    if (!id) return { success: false, error: 'No ID provided' };

    const payload: any = { ...rest };
    delete payload.payment_date; // التأكد من عدم إرسال الحقل القديم

    // 1. تحديث الطلب الأساسي
    const { error: revError } = await this.supabase
      .from('fact_revenue')
      .update(payload)
      .eq('id', id);

    if (revError) return { success: false, error: revError.message };

    // 2. تحديث البنود (مسح القديم وإدخال الجديد لتفادي التعقيد)
    if (booking_order_items) {
      await this.supabase.from('booking_order_items').delete().eq('revenue_id', id);
      if (booking_order_items.length > 0) {
        const itemsToInsert = booking_order_items.map((i, idx) => ({
          revenue_id: id,
          item_order: idx + 1,
          item_name: i.item_name,
          quantity: i.quantity || 1,
          unit_price: i.unit_price || 0,
          discount: i.discount || 0
        }));
        await this.supabase.from('booking_order_items').insert(itemsToInsert);
      }
    }

    // 3. تحديث الدفعات (مسح القديم وإدخال الجديد)
    if (payment_milestones) {
      await this.supabase.from('payment_milestones').delete().eq('revenue_id', id);
      if (payment_milestones.length > 0) {
        const milestonesToInsert = payment_milestones.map((m, idx) => ({
          revenue_id: id,
          milestone_order: idx + 1,
          milestone_name: m.milestone_name, // ✅ الإصلاح هنا
          percentage: m.percentage || 0,
          amount: m.amount || 0,
          status: m.status || 'pending'
        }));
        await this.supabase.from('payment_milestones').insert(milestonesToInsert);
      }
    }

    // إعادة الجلب لتحديث الـ Signal والـ Triggers
    await this.fetchRevenues();
    return { success: true };
  }

  async deleteRevenue(id: number) {
    // بفضل ON DELETE CASCADE في قاعدة البيانات، حذف الأساسي يحذف البنود والدفعات تلقائياً
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
    const userProfile = this.authService.userProfile();
    const employee = this.employees().find(e => e.email === userProfile?.email);

    const payload = {
      approval_status: 'Approved',
      approved_by: employee?.employee_id || null,
      approved_at: new Date().toISOString(),
      approval_notes: notes || null
    };

    const { error } = await this.supabase.from('fact_revenue').update(payload).eq('id', revenueId);
    if (!error) await this.fetchRevenues();
    return { success: !error, error: error?.message };
  }

  async rejectRevenue(revenueId: number, notes?: string) {
    const userProfile = this.authService.userProfile();
    const employee = this.employees().find(e => e.email === userProfile?.email);

    const payload = {
      approval_status: 'Rejected',
      approved_by: employee?.employee_id || null,
      approved_at: new Date().toISOString(),
      approval_notes: notes || null
    };

    const { error } = await this.supabase.from('fact_revenue').update(payload).eq('id', revenueId);
    if (!error) await this.fetchRevenues();
    return { success: !error, error: error?.message };
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
      .update({ actual_revenue: monthly.actual_revenue, updated_at: new Date().toISOString() })
      .eq('id', monthly.id);
    return { success: !error, error: error?.message };
  }

  async deleteRevenueMonthly(revenueId: number): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.from('fact_revenue_monthly').delete().eq('revenue_id', revenueId);
    return { success: !error, error: error?.message };
  }

  // =============================================
  // EMPLOYEE CRUD
  // =============================================
  async addEmployee(item: Partial<DimEmployee>) {
    const { employee_id, created_at, ...payload } = item as any;
    const { data, error } = await this.supabase.from('dim_employee').insert([payload]).select();
    if (data && data.length > 0) {
      this.employees.update(v => [...v, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return { success: !error, error: error?.message, data };
  }

  async updateEmployee(item: Partial<DimEmployee>) {
    const { employee_id, created_at, ...payload } = item as any;
    if (!employee_id) return { success: false, error: 'No employee_id provided', data: null };

    const { data, error } = await this.supabase.from('dim_employee').update(payload).eq('employee_id', employee_id).select();
    if (data && data.length > 0) {
      this.employees.update(list => list.map(e => e.employee_id === employee_id ? data[0] : e));
    }
    return { success: !error, error: error?.message, data };
  }

  async deleteEmployee(id: number) {
    const { error } = await this.supabase.from('dim_employee').delete().eq('employee_id', id);
    if (!error) this.employees.update(v => v.filter(e => e.employee_id !== id));
    return { success: !error, error: error?.message };
  }

  // =============================================
  // CLIENT CRUD (Updated with User Audit)
  // =============================================
  async addClient(item: Partial<DimClient>) {
    const user = this.authService.currentUser();
    const profile = this.authService.userProfile();

    const payload: any = {
      ...item,
      country: item.country || 'UAE',
      // ✅ تتبع من أنشأ العميل
      created_by: user?.id,
      created_by_name: profile?.full_name || user?.email || 'Unknown'
    };

    delete payload.client_id;
    delete payload.created_at;

    const { data, error } = await this.supabase.from('dim_client').insert([payload]).select();
    if (data && data.length > 0) {
      this.clients.update(v => [data[0], ...v]);
    }
    return { success: !error, error: error?.message, data };
  }

  async updateClient(item: Partial<DimClient>) {
    const { client_id, created_at, created_by, created_by_name, ...rest } = item as any;
    if (!client_id) return { success: false, error: 'No client_id provided', data: null };

    const { data, error } = await this.supabase.from('dim_client').update(rest).eq('client_id', client_id).select();
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
    const { data, error } = await this.supabase.from('fact_cost').insert(items).select();
    if (data) this.costs.update(current => [...data, ...current]);
    return { success: !error, error: error?.message, count: data?.length || 0 };
  }

  async generateZeroCostsForMonth(year: number, month: number): Promise<{ success: boolean; generated: number; error?: string }> {
    try {
      const allProducts = this.products();
      if (allProducts.length === 0) return { success: false, generated: 0, error: 'No departments found' };

      const currentCosts = this.costs().filter(c => c.year === year && c.month === month);
      const existingProductIds = new Set(currentCosts.map(c => c.product_id));
      const missingProducts = allProducts.filter(p => !existingProductIds.has(p.product_id));

      if (missingProducts.length === 0) return { success: true, generated: 0 };

      const dateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
      const newCosts = missingProducts.map(prod => ({
        year: year, month: month, date: dateStr, amount: 0,
        product_id: prod.product_id, description: `Monthly Cost - ${prod.product_name}`, client_id: null
      }));

      const { data, error } = await this.supabase.from('fact_cost').insert(newCosts).select();
      if (error) throw error;
      if (data) this.costs.update(current => [...data, ...current]);
      return { success: true, generated: data?.length || 0 };
    } catch (error: any) {
      return { success: false, generated: 0, error: error.message };
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

  // =============================================
  // SALARY MANAGEMENT
  // =============================================
  async addManualSalary(salary: Partial<FactSalary>) {
    const employee = this.employees().find(e => e.employee_id === salary.employee_id);
    const payload = { ...salary, product_id: employee?.product_id, status: 'pending' };
    const { data, error } = await this.supabase.from('fact_salary').insert([payload]).select();
    if (data) {
      this.salaries.update(current => [...data, ...current]);
      return { success: true, data: data[0] };
    }
    return { success: false, error: error?.message };
  }

  async updateSalary(salary: FactSalary) {
    const { id, created_by_name, updated_by_name, ...cleanPayload } = salary as any;
    const { data, error } = await this.supabase.from('fact_salary').update(cleanPayload).eq('id', id).select();
    if (data) {
      this.salaries.update(list => list.map(s => s.id === id ? (data[0] as FactSalary) : s));
      return { success: true, data: data[0] };
    }
    return { success: false, error: error?.message };
  }

  async generateMonthlySalaries(year: number, month: number) {
    try {
      const activeEmployees = this.employees().filter(e => !e.end_date);
      const existingSalaries = this.salaries().filter(s => s.year === year && s.month === month);
      const employeesToPay = activeEmployees.filter(e => !existingSalaries.some(s => s.employee_id === e.employee_id));

      if (employeesToPay.length === 0) return { success: true, generated: 0 };

      const newSalaries = employeesToPay.map(emp => ({
        employee_id: emp.employee_id, year: year, month: month,
        base_salary: emp.salary, net_salary: emp.salary,
        status: 'pending', product_id: emp.product_id
      }));

      const { data, error } = await this.supabase.from('fact_salary').insert(newSalaries).select();
      if (data) {
        this.salaries.update(current => [...data, ...current]);
        return { success: true, generated: data.length };
      }
      return { success: false, error: error?.message, generated: 0 };
    } catch (error: any) {
      return { success: false, error: error.message, generated: 0 };
    }
  }
}
