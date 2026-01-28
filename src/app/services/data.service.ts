import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { DimClient, DimProduct, FactPipeline, FactRevenue, FactTarget, FactCost, DimDepartment, DimEmployee } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private supabase: SupabaseClient;

  // الـ Signals التي تعتمد عليها الواجهات
  revenues = signal<FactRevenue[]>([]);
  pipelines = signal<FactPipeline[]>([]);
  products = signal<DimProduct[]>([]);
  clients = signal<DimClient[]>([]);
  targets = signal<FactTarget[]>([]);
  costs = signal<FactCost[]>([]);
  departments = signal<DimDepartment[]>([]);
  employees = signal<DimEmployee[]>([]);
  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.fetchInitialData();
  }

  // جلب البيانات الأولية عند تشغيل التطبيق
  async fetchInitialData() {
    try {
      const { data: rev } = await this.supabase.from('fact_revenue').select('*');
      if (rev) this.revenues.set(rev);

      const { data: prod } = await this.supabase.from('dim_product').select('*');
      if (prod) this.products.set(prod);

      const { data: cli } = await this.supabase.from('dim_client').select('*');
      if (cli) this.clients.set(cli);

      const { data: cst } = await this.supabase.from('fact_cost').select('*');
      if (cst) this.costs.set(cst);

      const { data: pipe } = await this.supabase.from('fact_pipeline').select('*');
      if (pipe) this.pipelines.set(pipe);

      const { data: targ } = await this.supabase.from('fact_target_annual').select('*');
      if (targ) this.targets.set(targ);

      const { data: dept } = await this.supabase.from('dim_department').select('*');
      if (dept) this.departments.set(dept);

      const { data: empl } = await this.supabase.from('dim_employee').select('*');
      if (empl) this.employees.set(empl);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  // --- دوال الإضافة (Create) ---
  async addRevenue(item: FactRevenue) {
    const { data, error } = await this.supabase.from('fact_revenue').insert([item]).select();
    if (data) this.revenues.update(v => [data[0], ...v]);
    return { data, error };
  }

  async addCost(item: FactCost) {
    const { data, error } = await this.supabase.from('fact_cost').insert([item]).select();
    if (data) this.costs.update(v => [data[0], ...v]);
    return { data, error };
  }

  async addTarget(item: FactTarget) {
    const { data, error } = await this.supabase.from('fact_target_annual').insert([item]).select();
    if (data) this.targets.update(v => [data[0], ...v]);
    return { data, error };
  }

  // --- دوال التحديث (Update) ---

  // 1. تحديث التارجت (حل المشكلة المطلوبة)
  async updateTarget(item: FactTarget) {
    if (!item.id) return { data: null, error: 'No ID provided' };
    const { data, error } = await this.supabase
      .from('fact_target_annual')
      .update({
        product_id: item.product_id,
        year: item.year,
        annual_target: item.annual_target
      })
      .eq('id', item.id)
      .select();

    if (data) {
      this.targets.update(v => v.map(t => t.id === item.id ? data[0] : t));
    }
    return { data, error };
  }

  // 2. تحديث التكاليف
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

  // 3. تحديث الإيرادات
  async updateRevenue(item: FactRevenue) {
    if (!item.id) return { data: null, error: 'No ID provided' };
    const { data, error } = await this.supabase
      .from('fact_revenue')
      .update({
        date: item.date,
        product_id: item.product_id,
        country: item.country,
        gross_amount: item.gross_amount
      })
      .eq('id', item.id)
      .select();

    if (data) {
      this.revenues.update(v => v.map(r => r.id === item.id ? data[0] : r));
    }
    return { data, error };
  }

  // --- مساعدة استخراج الأسماء ---
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

  getProductName(id: number): string { return this.productsMap().get(id) || `Product ${id}`; }
  getClientName(id: number): string { return this.clientsMap().get(id) || `Client ${id}`; }
}
