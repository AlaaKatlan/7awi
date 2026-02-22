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
  lead_id?: number;
  relationship_manager_id?: number;
  created_at?: string;

  // CRM Fields
  company_type?: 'Direct' | 'Agency';
  first_contact_date?: string;
  account_manager_id?: number;
  poc_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: 'New Lead' | 'Attempted Contact' | 'Contacted' | 'Qualified' | 'Meeting Scheduled' | 'Proposal Out' | 'Follow Up' | 'Negotiation' | 'Verbal Commitment' | 'PO Received' | 'Closed Won' | 'Closed Lost' | 'On Hold';
  lead_source?: 'Research' | 'Referral' | 'Database' | 'Website' | 'Inbound Inquiry' | 'Event' | 'Social Media';
  industry?: 'Research' | 'Banking' | 'Automotive' | 'FMCG' | 'Real Estate' | 'Technology' | 'Healthcare' | 'Retail' | 'Others';
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
  contract: string;
  office: string;
  start_date: string;
  end_date: string | null;
  product_id: number;
  email?: string;
  phone?: string;
  created_at?: string;
}

// ✅ Enhanced Booking Order / Revenue Interface
export interface FactRevenue {
  id?: number;
  
  // Project Info
  order_seq?: number;           // Auto-generated sequential number
  order_number?: string;        // Project ID (legacy field)
  bo_name?: string;             // Full BO Name: Country_Client_BizUnit_CampaignName_Date_Sequential#
  campaign_name?: string;
  description?: string;
  project_type?: string;        // Flexible string type
  booking_order_type?: string;  // Flexible string type
  
  // Relations
  owner_id?: number;            // Employee (Owner)
  product_id: number;           // Department
  client_id?: number;           // Client
  lead_id?: number;             // Lead (legacy)
  
  // Location
  country: string;
  
  // Dates
  date: string;                 // Legacy booking date
  bo_submission_date?: string;
  start_date?: string | null;
  end_date?: string | null;
  payment_date?: string;
  
  // ✅ Payment Terms - Using flexible string type to avoid TypeScript assignment errors
  payment_terms?: string;                   // 'Upfront' | 'Upon Completion' | 'Custom' | 'Retainer'
  payment_custom_percentage?: number;       // For Custom payment type (1-100)
  payment_retainer_start?: string | null;   // For Retainer payment type
  payment_retainer_end?: string | null;     // For Retainer payment type
  
  // Revenue
  estimated_revenue?: number;
  gross_amount: number;         // Actual Revenue
  total_value?: number;         // Legacy total value
  
  // Direct Costs
  direct_cost_labor?: number;
  direct_cost_material?: number;
  direct_cost_equipment?: number;
  direct_cost_tools?: number;
  direct_cost_other?: number;
  
  // One Time Costs
  one_time_marketing?: number;
  one_time_consultation?: number;
  one_time_misc?: number;
  
  // Comments
  comments?: string;
  notes?: string;               // Legacy notes
  
  // Approval System
  approval_status?: string;     // 'Pending' | 'Approved' | 'Rejected'
  approved_by?: number;         // Employee ID who approved
  approved_at?: string;         // Timestamp of approval
  approval_notes?: string;
  
  // Legacy fields
  year?: number;
  month?: number;
  booking_order?: string;
}

// ✅ Monthly Distribution for Multi-Retainer
export interface FactRevenueMonthly {
  id?: number;
  revenue_id: number;           // FK to fact_revenue
  year: number;
  month: number;
  estimated_revenue: number;
  actual_revenue: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ✅ Profitability View (Calculated)
export interface RevenueProfitability {
  id: number;
  order_number?: string;
  bo_name?: string;
  campaign_name?: string;
  estimated_revenue: number;
  actual_revenue: number;
  total_direct_cost: number;
  total_one_time_cost: number;
  total_cost: number;
  net_profit: number;
  profit_margin_percent: number;
  approval_status?: string;
  approved_by?: number;
  approved_at?: string;
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
  role: 'admin' | 'manager' | 'viewer' | 'finance';
  created_at?: string;
}
