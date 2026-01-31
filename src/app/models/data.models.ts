// =============================================
// Dimension Tables
// =============================================

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
  contact_person?: string;      // NEW: Main contact person name
  contact_email?: string;       // NEW: Contact email
  contact_phone?: string;       // NEW: Contact phone
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
  email?: string;               // NEW: Employee email
  phone?: string;               // NEW: Employee phone
  created_at?: string;
}

// =============================================
// Fact Tables
// =============================================

export interface FactRevenue {
  id?: number;
  date: string;
  year?: number;
  month?: number;
  product_id: number;
  client_id?: number;           // NEW: Link to client
  country: string;
  gross_amount: number;
  order_number?: string;        // NEW: Order/Invoice number
  notes?: string;               // NEW: Optional notes
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

// NEW: Monthly Salary Records
export interface FactSalary {
  id?: number;
  employee_id: number;
  year: number;
  month: number;
  base_salary: number;          // Base monthly salary
  bonus?: number;               // Optional bonus
  deductions?: number;          // Optional deductions
  net_salary: number;           // Final net salary
  payment_date?: string;        // Date of payment
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  created_at?: string;
}

// =============================================
// Auth Types
// =============================================

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'manager' | 'viewer';
  created_at?: string;
}
