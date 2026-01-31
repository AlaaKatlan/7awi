export interface DimProduct {
  product_id: number;
  product_name: string;
  category?: string;
  department_id?: number;
  product_code?: string; // الكود الجديد للمنتج
}

export interface DimClient {
  client_id: number;
  client_name: string;
  country: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at?: string;
}

export interface DimDepartment {
  department_id: number;
  department_name: string;
  created_at?: string;
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
  email?: string;
  phone?: string;
  created_at?: string;
}

export interface FactRevenue {
  id?: number;
  date: string;          // رجعناها date عشان ما تضرب الداشبورد
  year?: number;
  month?: number;
  product_id: number;
  client_id?: number;
  country: string;
  gross_amount: number;
  // الحقول الجديدة المطلوبة
  total_value?: number;
  order_number?: string; // رجعناها order_number
  lead_id?: number;
  owner_id?: number;
  booking_order?: string; // حقل احتياطي للعرض اذا لزم
  notes?: string;
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

export interface FactSalary {
  id?: number;
  employee_id: number;
  year: number;
  month: number;
  base_salary: number;
  bonus?: number;
  deductions?: number;
  net_salary: number;
  payment_date?: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'viewer';
  created_at?: string;
}
