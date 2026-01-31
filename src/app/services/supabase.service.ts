import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import {
  FactRevenue,
  FactPipeline,
  FactTarget,
  FactCost,
  DimClient,
  DimEmployee,
  FactSalary,
  DimProduct
} from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Signals
  revenues = signal<FactRevenue[]>([]);
  pipelines = signal<FactPipeline[]>([]);
  targets = signal<FactTarget[]>([]);
  costs = signal<FactCost[]>([]);
  clients = signal<DimClient[]>([]);
  employees = signal<DimEmployee[]>([]);
  salaries = signal<FactSalary[]>([]);
  products = signal<DimProduct[]>([]);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.loadAllData();
  }

  async loadAllData() {
    this.getRevenues();
    this.getPipelines();
    this.getTargets();
    this.getCosts();
    this.getClients();
    this.getEmployees();
    this.getSalaries();
    this.getProducts();
  }

  // --- Products ---
  async getProducts() {
    const { data, error } = await this.supabase.from('dim_product').select('*');
    if (!error && data) this.products.set(data);
  }

  // --- REVENUE ---
  async getRevenues() {
    // جلب البيانات وترتيبها
    const { data, error } = await this.supabase
      .from('fact_revenue')
      .select('*')
      .order('date', { ascending: false }); // لاحظ: العمود اسمه date في قاعدتك

    if (!error && data) {
      // تحويل البيانات القادمة من السيرفر لتتوافق مع المودل في الفرونت إند
      const mappedData = data.map((item: any) => ({
        ...item,
        date_key: item.date,           // توحيد الاسم
        revenue_amount: item.gross_amount, // توحيد الاسم
        booking_order: item.order_number   // توحيد الاسم
      }));
      this.revenues.set(mappedData);
    }
  }
// 2. دالة توليد رقم الطلب الجديدة
  // Format: [Country2Char]-[ProductCode]-[Increment]
  generateBookingRef(country: string, productId: number): string {
    // A. Country Code (First 2 chars uppercase)
    const countryCode = (country || 'UA').substring(0, 2).toUpperCase();

    // B. Product Code
    const product = this.products().find(p => p.product_id == productId);
    const prodCode = product?.product_code || 'GEN';

    // C. Incremental Number
    // نعتمد على عدد الإيرادات الحالية + 1 (يمكن جعلها أدق عبر السيرفر لكن هذا يكفي حالياً)
    const nextId = this.revenues().length + 1;
    const increment = nextId.toString().padStart(4, '0'); // 0001

    return `${countryCode}-${prodCode}-${increment}`;
  }

  // 3. تحديث دالة إضافة الإيراد لتشمل الحقول الجديدة
  async addRevenue(item: any): Promise<{ success: boolean; error?: string }> {
    try {
      const dbPayload = {
        date: item.date_key,
        gross_amount: item.gross_amount, // Actual Value
        total_value: item.total_value,   // Total Value
        order_number: item.booking_order,
        product_id: item.product_id,
        country: item.country,
        lead_id: item.lead_id,
        owner_id: item.owner_id
      };

      const { data, error } = await this.supabase
        .from('fact_revenue')
        .insert([dbPayload])
        .select();

      if (error) return { success: false, error: error.message };

      if (data) {
        // تحديث الواجهة
        const newItem = {
           ...item,
           id: data[0].id,
           // Mapping values back for UI
           date_key: data[0].date,
           gross_amount: data[0].gross_amount,
           total_value: data[0].total_value,
           booking_order: data[0].order_number
        };
        this.revenues.update(v => [newItem, ...v]);
        return { success: true };
      }
      return { success: false, error: 'No data returned' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- PIPELINE ---
  async getPipelines() {
    const { data, error } = await this.supabase.from('fact_pipeline').select('*');
    if (!error && data) this.pipelines.set(data);
  }

  async addPipeline(item: Partial<FactPipeline>): Promise<{ success: boolean; error?: string }> {
    try {
      const { id, ...payload } = item as any;
      const { data, error } = await this.supabase.from('fact_pipeline').insert([payload]).select();
      if (error) return { success: false, error: error.message };
      if (data) {
        this.pipelines.update(v => [data[0], ...v]);
        return { success: true };
      }
      return { success: false, error: 'No data returned' };
    } catch (err: any) { return { success: false, error: err.message }; }
  }

  // --- TARGETS ---
  async getTargets() {
    const { data, error } = await this.supabase.from('fact_target_annual').select('*');
    if (!error && data) this.targets.set(data);
  }

  async addTarget(item: Partial<FactTarget>): Promise<{ success: boolean; error?: string }> {
    try {
      const { id, ...payload } = item as any;
      const { data, error } = await this.supabase.from('fact_target_annual').insert([payload]).select();
      if (error) return { success: false, error: error.message };
      if (data) {
        this.targets.update(v => [data[0], ...v]);
        return { success: true };
      }
      return { success: false, error: 'No data returned' };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  // --- COSTS ---
  async getCosts() {
    const { data, error } = await this.supabase.from('fact_cost').select('*');
    if (!error && data) this.costs.set(data);
  }

  async addCost(item: Partial<FactCost>): Promise<{ success: boolean; error?: string }> {
    try {
      const { id, ...payload } = item as any;
      const { data, error } = await this.supabase.from('fact_cost').insert([payload]).select();
      if (error) return { success: false, error: error.message };
      if (data) {
        this.costs.update(v => [data[0], ...v]);
        return { success: true };
      }
      return { success: false, error: 'No data returned' };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  // --- CLIENTS ---
  async getClients() {
    const { data, error } = await this.supabase.from('dim_client').select('*');
    if (!error && data) this.clients.set(data);
  }

  // --- EMPLOYEES ---
  // async getEmployees() {
  //   const { data, error } = await this.supabase.from('dim_employee').select('*');
  //   if (!error && data) this.employees.set(data);
  // }
// 1. تحديث جلب الموظفين ليكون مرتب أبجدياً
  async getEmployees() {
    const { data, error } = await this.supabase
      .from('dim_employee')
      .select('*')
      .order('name', { ascending: true }); // ترتيب أبجدي
    if (!error && data) this.employees.set(data);
  }
  // --- SALARIES ---
  async getSalaries() {
    const { data, error } = await this.supabase.from('fact_salary').select('*');
    if (!error && data) this.salaries.set(data);
  }
}
