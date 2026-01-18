// src/app/services/supabase.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
 import { FactRevenue, FactCost, DimProduct, DimClient } from '../models/data.models';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Signals
  revenues = signal<FactRevenue[]>([]);
  products = signal<DimProduct[]>([]);
  clients = signal<DimClient[]>([]);
  costs = signal<FactCost[]>([]);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // دالة جلب العملاء التي كانت مفقودة
  async fetchClients() {
    const { data, error } = await this.supabase.from('dim_client').select('*');
    if (data) this.clients.set(data);
    return { data, error };
  }

  async fetchRevenues() {
    const { data, error } = await this.supabase.from('fact_revenue').select('*');
    if (data) this.revenues.set(data);
    return { data, error };
  }

  // تحديث دالة إضافة الإيرادات لتناسب الأسماء الجديدة
  async addRevenue(item: FactRevenue) {
    const { data, error } = await this.supabase.from('fact_revenue').insert([item]).select();
    if (data) {
      this.revenues.update(v => [data[0], ...v]);
    }
    return { data, error };
  }
}
