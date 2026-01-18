// src/app/models/data.models.ts

export interface DimProduct {
  product_id: number;
  product_name: string;
  category: string;
}

export interface DimClient {
  client_id: number;
  client_name: string;
  country: string;
}

export interface FactRevenue {
  id?: number;
  date: string;
  product_id: number;
  client_id: number;
  country: string;
  type?: string;
  status?: string;
  gross_amount: number; // تأكد من مطابقة الاسم في قاعدة البيانات
}

export interface FactTarget {
  id?: number;
  product_id: number;
  year: number;
  annual_target: number;
}

export interface FactCost {
  id?: number;
  date: string;
  product_id: number;
  amount: number;
  description: string;
}

export interface FactPipeline {
  id?: number;
  product_id: number;
  client_id: number;
  target_amount: number;
  quarter: number;
  year: number;
  status: string;
}
