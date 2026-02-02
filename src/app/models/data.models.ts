export interface DimProduct {
  product_id: number;
  product_name: string;
  category?: string;
  product_code?: string;
  department_type?: 'Revenue' | 'Cost';
}

export interface DimClient {
  client_id: number;
  client_name: string;
  country: string;
  lead_id?: number;              // Lead - تم إضافته
  relationship_manager_id?: number;  // Relationship Manager - تم إضافته
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
  product_id: number;
  email?: string;
  phone?: string;
  created_at?: string;
}

export interface FactRevenue {
  id?: number;
  date: string;
  year?: number;
  month?: number;
  product_id: number;
  client_id?: number;
  country: string;
  gross_amount: number;
  total_value?: number;
  order_number?: string;
  lead_id?: number;
  owner_id?: number;
  booking_order?: string;
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
  lead_id?: number;      // Lead - تم إضافته
  owner_id?: number;     // Owner - تم إضافته
  created_at?: string;
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
