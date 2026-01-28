export interface DimProduct {
  product_id: number;
  product_name: string;
  category?: string;
  department_id?: number;
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
  year: number;
  product_id: number;
  annual_target: number;
 quarter?: number | null;
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
export interface DimDepartment {
  department_id: number;
  department_name: string;
}

export interface DimEmployee {
  employee_id: number;
  name: string;
  salary: number;
  salary_aed: number;
  contract: string;
  office: string;
  start_date: string;
  end_date: string | null;
  department_id: number;
}
