import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { DimClient, DimProduct, FactPipeline, FactRevenue, FactTarget, FactCost } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private supabase: SupabaseClient;

  revenues = signal<FactRevenue[]>([]);
  pipelines = signal<FactPipeline[]>([]);
  products = signal<DimProduct[]>([]);
  clients = signal<DimClient[]>([]);
  targets = signal<FactTarget[]>([]); // هذا الـ Signal موجود ولكن لا يتم تعبئته
  costs = signal<FactCost[]>([]);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.fetchInitialData();
  }

  async fetchInitialData() {
    // 1. جلب الإيرادات
    const { data: rev } = await this.supabase.from('fact_revenue').select('*');
    if (rev) this.revenues.set(rev);

    // 2. جلب المنتجات
    const { data: prod } = await this.supabase.from('dim_product').select('*');
    if (prod) this.products.set(prod);

    // 3. جلب العملاء
    const { data: cli } = await this.supabase.from('dim_client').select('*');
    if (cli) this.clients.set(cli);

    // 4. جلب التكاليف
    const { data: cst } = await this.supabase.from('fact_cost').select('*');
    if (cst) this.costs.set(cst);

    // 5. جلب الـ Pipeline
    const { data: pipe } = await this.supabase.from('fact_pipeline').select('*');
    if (pipe) this.pipelines.set(pipe);

    // --- الحل هنا: جلب بيانات الأهداف (Targets) ---
    const { data: targ } = await this.supabase.from('fact_target_annual').select('*');
    if (targ) {
      console.log('Targets loaded from DB:', targ); // للتأكد في Console المتصفح
      this.targets.set(targ);
    }
  }

  // دالة إضافة هدف جديد
  async addTarget(item: FactTarget) {
    const { data, error } = await this.supabase.from('fact_target_annual').insert([item]).select();
    if (data) {
      this.targets.update(v => [data[0], ...v]);
    }
    return { data, error };
  }

  // دالة إضافة تكلفة (تأكد من شمول الحقول الجديدة)
  async addCost(item: FactCost) {
    const { data, error } = await this.supabase.from('fact_cost').insert([item]).select();
    if (data) this.costs.update(v => [data[0], ...v]);
    return { data, error };
  }

  // تحديث تكلفة موجودة
  async updateCost(item: FactCost) {
    if (!item.id) return;
    const { data, error } = await this.supabase
      .from('fact_cost')
      .update(item)
      .eq('id', item.id)
      .select();
    if (data) {
      this.costs.update(v => v.map(c => c.id === item.id ? data[0] : c));
    }
    return { data, error };
  }

  // دوال الإضافة الأخرى...
  async addRevenue(item: FactRevenue) {
    const { data } = await this.supabase.from('fact_revenue').insert([item]).select();
    if (data) this.revenues.update(v => [data[0], ...v]);
  }

  // الخرائط المساعدة
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
