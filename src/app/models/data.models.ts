export interface DimProduct {
  product_id: number;
  product_name: string;
  category?: string;
}

export interface DimClient {
  client_id: number;
  client_name: string;
  country: string;
}

export interface FactRevenue {
  id?: number;
  date: string;         // تم التوحيد للأحرف الصغيرة
  year?: number;
  month?: number;
  product_id: number;

  country: string;

  gross_amount: number; // تم التعديل ليطابق قاعدة البيانات
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
export interface FactTarget {
  id?: number;
  product_id: number;
  year: number;
  annual_target: number;
 }
export interface FactCost {
  id?: number;
  date: string;
  year: number;
  month: number;
  amount: number;
  product_id?: number;
  client_id?: number;
  description?: string;
}
