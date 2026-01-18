import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
import { FactCost, FactRevenue } from '../models/data.models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // جلب البيانات من جدول الإيرادات
  async getRevenues() {
    const { data, error } = await this.supabase
      .from('fact_revenue')
      .select('*');

    if (data) this.revenues.set(data);
    return { data, error };
  }

  // إضافة إيراد جديد
  async addRevenue(item: FactRevenue) {
    const { data, error } = await this.supabase
      .from('fact_revenue')
      .insert([item]);

    if (!error) {
      this.revenues.update(v => [item, ...v]);
    }
  }

  // تحديث التكاليف
  async updateCost(id: number, item: FactCost) {
    const { error } = await this.supabase
      .from('fact_cost')
      .update(item)
      .eq('id', id);
  }
}
