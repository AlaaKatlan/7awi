// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        7AWI SYSTEM - DATA MODELS                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// --- Types & Enums ---
export type UserRole = 'admin' | 'manager' | 'finance' | 'viewer' | 'sales';
export type SalaryStatus = 'pending' | 'paid' | 'cancelled';
export type ContractType = 'Full Time Contractor' | 'Part Time Contractor' | 'Permanent' | 'Internship' | 'Freelance';

// --- Interfaces ---

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

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
  product_id?: number;
  lead_id?: number; // ✅ ضروري للـ Booking Order
  relationship_manager_id?: number;
  created_at?: string;
  // CRM Fields
  company_type?: 'Direct' | 'Agency';
  first_contact_date?: string;
  account_manager_id?: number;
  poc_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
  lead_source?: string;
  industry?: string;
  estimated_deal_value?: number;
  expected_closing_date?: string;
  notes?: string;
  last_followup_date?: string;
  next_action_date?: string;
  contact_person?: string;
}

export interface DimEmployee {
  employee_id: number;
  name: string;
  salary: number;
  salary_aed: number;
  contract: ContractType;
  office: string;
  start_date: string;
  end_date?: string | null;
  email?: string;
  phone?: string;
  product_id?: number; // القسم الحالي
  created_at?: string;
}

// ✅ FactRevenue (كاملة لضمان عمل Booking Order)
export interface FactRevenue {
  id?: number;
  date: string;
  product_id: number;
  country: string;
  gross_amount: number;
  estimated_revenue?: number;
  order_number?: string;
  bo_name?: string;
  campaign_name?: string;
  description?: string;
  project_type?: string;
  booking_order_type?: 'One Time' | 'Multi Retainer';
  client_id?: number;
  owner_id?: number;
  lead_id?: number; // ✅ ضروري
  bo_submission_date?: string;
  start_date?: string | null;
  end_date?: string | null;
  payment_date?: string;
  order_seq?: number;

  // Costs
  direct_cost_labor?: number;
  direct_cost_material?: number;
  direct_cost_equipment?: number;
  direct_cost_tools?: number;
  direct_cost_other?: number;
  one_time_marketing?: number;
  one_time_consultation?: number;
  one_time_misc?: number;

  // Payment Terms (Added recently)
  payment_terms?: 'Upfront' | 'Upon Completion' | 'Custom' | 'Retainer';
  payment_custom_percentage?: number;
  payment_retainer_start?: string | null;
  payment_retainer_end?: string | null;

  // Approval
  comments?: string;
  approval_status?: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: number;
  approved_at?: string;
  approval_notes?: string;

  // Legacy fields protection
  total_value?: number;
  year?: number;
  month?: number;
  booking_order?: string;
}

export interface FactRevenueMonthly {
  id?: number;
  revenue_id: number;
  year: number;
  month: number;
  estimated_revenue: number;
  actual_revenue: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FactCost {
  id?: number;
  date: string;
  year: number;
  month: number;
  amount: number;
  product_id?: number;
  client_id?: number;
  revenue_id?: number;
  description?: string;
}

export interface FactPipeline {
  id?: number;
  product_id: number;
  client_id: number;
  target_amount: number;
  quarter: number;
  year: number;
  status: string;
  lead_id?: number;
  owner_id?: number;
  created_at?: string;
}

export interface FactTarget {
  id?: number;
  year: number;
  product_id: number;
  annual_target: number;
  quarter?: number | null;
}

// ✅ FactSalary (محدثة مع حقول التتبع والقسم التاريخي)
export interface FactSalary {
  id?: number;
  employee_id: number;
  year: number;
  month: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  payment_date?: string;
  status: SalaryStatus;
  notes?: string;
  created_at?: string;

  // الحقول الجديدة (Database v2.0)
  product_id?: number; // القسم التاريخي وقت الراتب
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  updated_at?: string;
}

// واجهة مساعدة للعرض في الجدول
export interface SalaryWithDetails extends FactSalary {
  effective_product_id?: number;
  department_name?: string;
  employee_name?: string;
  employee_email?: string;
  employee_contract?: string;
  employee_office?: string;
}

// ✅ سجلات التتبع (Audit Logs)
export interface EmployeeChangeLog {
  id?: number;
  employee_id: number;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_user_id?: string;
  changed_by_name?: string;
  changed_at?: string;
  change_reason?: string;
}

export interface SalaryChangeLog {
  id?: number;
  salary_id: number;
  employee_id: number;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_user_id?: string;
  changed_by_name?: string;
  changed_at?: string;
  change_reason?: string;
}

// --- Helper Functions ---

export function calculateNetSalary(base: number, bonus: number, deductions: number): number {
  return (base || 0) + (bonus || 0) - (deductions || 0);
}

export function convertUsdToAed(usd: number): number {
  return Math.round(usd * 3.67 * 100) / 100;
}

export function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || 'Unknown';
}
