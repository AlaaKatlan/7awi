// // ╔══════════════════════════════════════════════════════════════════════════════╗
// // ║                    7AWI SYSTEM - BOOKING ORDER V2 MODELS                    ║
// // ║  أضف هذا المحتوى لملف data.models.ts الموجود                                ║
// // ╚══════════════════════════════════════════════════════════════════════════════╝

// // ════════════════════════════════════════════════════════════════════════════════
// // أنواع الدفع الجديدة
// // ════════════════════════════════════════════════════════════════════════════════

// export type PaymentType = 'one_time' | 'multiple' | 'multi_retainer';

// export type PaymentTerms = 'Upfront' | 'Upon Completion' | 'Custom' | 'Retainer' | 'Multiple';

// export type BookingOrderStatus =
//   | 'Pending'
//   | 'Approved'
//   | 'Rejected'
//   | 'Completed'
//   | 'Canceled'
//   | 'RFP Received'
//   | 'RFP Responded';

// export type MilestoneStatus = 'pending' | 'paid' | 'overdue';

// // ════════════════════════════════════════════════════════════════════════════════
// // بند الطلب (Booking Order Item)
// // ════════════════════════════════════════════════════════════════════════════════

// export interface BookingOrderItem {
//   id?: number;
//   revenue_id: number;
//   item_order: number;
//   item_name: string;
//   quantity: number;
//   unit_price: number;
//   discount: number;
//   net_amount?: number; // محسوب تلقائياً
//   notes?: string;
//   created_at?: string;
// }

// // ════════════════════════════════════════════════════════════════════════════════
// // دفعة (Payment Milestone)
// // ════════════════════════════════════════════════════════════════════════════════

// export interface PaymentMilestone {
//   id?: number;
//   revenue_id: number;
//   milestone_order: number;
//   milestone_name: string;
//   percentage: number;
//   amount: number;
//   due_date?: string;
//   status: MilestoneStatus;
//   paid_date?: string;
//   notes?: string;
//   created_at?: string;
// }

// // ════════════════════════════════════════════════════════════════════════════════
// // FactRevenue المحدث (أضف هذه الحقول للـ interface الموجود)
// // ════════════════════════════════════════════════════════════════════════════════

// export interface FactRevenueV2 {
//   id?: number;
//   date: string;
//   product_id: number;
//   country: string;
//   gross_amount: number;
//   estimated_revenue?: number;
//   order_number?: string;
//   bo_name?: string;
//   campaign_name?: string;
//   description?: string;
//   project_type?: string;
//   booking_order_type?: 'One Time' | 'Multi Retainer';
//   client_id?: number;
//   owner_id?: number;
//   lead_id?: number;
//   bo_submission_date?: string;
//   start_date?: string | null;
//   end_date?: string | null;
//   order_seq?: number;

//   // ✅ الحقول الجديدة

//   // VAT / الضريبة
//   vat_enabled?: boolean;
//   vat_percentage?: number;
//   vat_amount?: number;
//   grand_total?: number;
//   items_subtotal?: number;

//   // نوع الدفع
//   payment_type?: PaymentType;
//   payment_terms?: PaymentTerms;
//   payment_custom_percentage?: number;
//   payment_retainer_start?: string | null;
//   payment_retainer_end?: string | null;
//   expected_payment_date?: string; // كان payment_date

//   // التكاليف
//   direct_cost_labor?: number;
//   direct_cost_material?: number;
//   direct_cost_equipment?: number;
//   direct_cost_tools?: number;
//   direct_cost_other?: number;
//   one_time_marketing?: number;
//   one_time_consultation?: number;
//   one_time_misc?: number;

//   // الموافقة والحالة
//   comments?: string;
//   approval_status?: BookingOrderStatus;
//   approved_by?: number;
//   approved_at?: string;
//   approval_notes?: string;
//   requires_approval?: boolean;
//   approval_required_reason?: string;

//   // Legacy
//   total_value?: number;
//   year?: number;
//   month?: number;
//   booking_order?: string;
// }

// // ════════════════════════════════════════════════════════════════════════════════
// // واجهة العرض الكامل للطلب
// // ════════════════════════════════════════════════════════════════════════════════

// export interface BookingOrderFull extends FactRevenueV2 {
//   // بيانات مرتبطة
//   client_name?: string;
//   department_name?: string;
//   owner_name?: string;
//   lead_name?: string;

//   // البنود
//   items?: BookingOrderItem[];

//   // الدفعات
//   milestones?: PaymentMilestone[];

//   // حسابات
//   total_cost?: number;
//   net_profit?: number;
//   profit_margin?: number;
// }

// // ════════════════════════════════════════════════════════════════════════════════
// // Helper Functions
// // ════════════════════════════════════════════════════════════════════════════════

// /**
//  * حساب صافي البند
//  */
// export function calculateItemNet(quantity: number, unitPrice: number, discount: number = 0): number {
//   return (quantity * unitPrice) - discount;
// }

// /**
//  * حساب مجموع البنود
//  */
// export function calculateItemsSubtotal(items: BookingOrderItem[]): number {
//   return items.reduce((sum, item) => {
//     const net = item.net_amount ?? calculateItemNet(item.quantity, item.unit_price, item.discount);
//     return sum + net;
//   }, 0);
// }

// /**
//  * حساب الضريبة
//  */
// export function calculateVAT(subtotal: number, vatPercentage: number, vatEnabled: boolean): number {
//   if (!vatEnabled) return 0;
//   return Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
// }

// /**
//  * حساب المجموع الكلي
//  */
// export function calculateGrandTotal(subtotal: number, vatAmount: number): number {
//   return subtotal + vatAmount;
// }

// /**
//  * حساب هامش الربح
//  */
// export function calculateProfitMargin(revenue: number, totalCost: number): number {
//   if (revenue <= 0) return 0;
//   return ((revenue - totalCost) / revenue) * 100;
// }

// /**
//  * الحصول على لون هامش الربح
//  */
// export function getProfitMarginColor(margin: number): 'red' | 'orange' | 'green' {
//   if (margin < 25) return 'red';
//   if (margin < 30) return 'orange';
//   return 'green';
// }

// /**
//  * التحقق إذا كان الطلب يحتاج موافقة
//  */
// export function requiresApproval(margin: number): boolean {
//   return margin < 30;
// }

// /**
//  * حساب التكلفة الإجمالية
//  */
// export function calculateTotalCost(revenue: FactRevenueV2): number {
//   return (revenue.direct_cost_labor || 0) +
//          (revenue.direct_cost_material || 0) +
//          (revenue.direct_cost_equipment || 0) +
//          (revenue.direct_cost_tools || 0) +
//          (revenue.direct_cost_other || 0) +
//          (revenue.one_time_marketing || 0) +
//          (revenue.one_time_consultation || 0) +
//          (revenue.one_time_misc || 0);
// }

// /**
//  * توزيع الدفعات على المراحل
//  */
// export function distributeMilestoneAmounts(
//   totalAmount: number,
//   percentages: number[]
// ): number[] {
//   return percentages.map(p => Math.round(totalAmount * (p / 100) * 100) / 100);
// }

// /**
//  * توزيع الريتينر على الأشهر
//  */
// export function distributeRetainerMonths(
//   totalAmount: number,
//   startDate: string,
//   endDate: string
// ): { year: number; month: number; amount: number }[] {
//   const start = new Date(startDate);
//   const end = new Date(endDate);
//   const months: { year: number; month: number; amount: number }[] = [];

//   const current = new Date(start);
//   while (current <= end) {
//     months.push({
//       year: current.getFullYear(),
//       month: current.getMonth() + 1,
//       amount: 0
//     });
//     current.setMonth(current.getMonth() + 1);
//   }

//   const monthlyAmount = months.length > 0 ? Math.round(totalAmount / months.length * 100) / 100 : 0;
//   return months.map(m => ({ ...m, amount: monthlyAmount }));
// }

// /**
//  * التحقق من أن مجموع النسب = 100%
//  */
// export function validateMilestonePercentages(percentages: number[]): boolean {
//   const sum = percentages.reduce((a, b) => a + b, 0);
//   return Math.abs(sum - 100) < 0.01; // تسامح بسيط للأرقام العشرية
// }

// /**
//  * الحصول على اسم الحالة بالعربي
//  */
// export function getStatusArabicName(status: BookingOrderStatus): string {
//   const names: Record<BookingOrderStatus, string> = {
//     'Pending': 'قيد الانتظار',
//     'Approved': 'موافق عليه',
//     'Rejected': 'مرفوض',
//     'Completed': 'مكتمل',
//     'Canceled': 'ملغي',
//     'RFP Received': 'تم استلام طلب العرض',
//     'RFP Responded': 'تم الرد على طلب العرض'
//   };
//   return names[status] || status;
// }

// /**
//  * الحصول على لون الحالة
//  */
// export function getStatusColor(status: BookingOrderStatus): string {
//   const colors: Record<BookingOrderStatus, string> = {
//     'Pending': 'amber',
//     'Approved': 'emerald',
//     'Rejected': 'red',
//     'Completed': 'blue',
//     'Canceled': 'slate',
//     'RFP Received': 'purple',
//     'RFP Responded': 'indigo'
//   };
//   return colors[status] || 'slate';
// }
