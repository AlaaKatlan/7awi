// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║              7AWI SYSTEM - BOOKING ORDER MANAGER V2                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { Component, inject, computed, signal, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { FactRevenue, FactRevenueMonthly, BookingOrderItem, PaymentMilestone, PaymentType } from '../../models/data.models';

declare var flatpickr: any;
declare var XLSX: any;
declare var jspdf: any;

@Component({
  selector: 'app-booking-order-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-order-manager.component.html',
  styleUrls: ['./booking-order-manager.component.scss']
})
export class BookingOrderManagerComponent implements OnInit, AfterViewInit, OnDestroy {
  dataService = inject(DataService);
  authService = inject(AuthService);

  // ════════════════════════════════════════════════════════════════════════════
  // View State & Filters
  // ════════════════════════════════════════════════════════════════════════════
  currentView = signal<'list' | 'form'>('list');

  searchText = signal('');
  filterYear = signal<number | null>(new Date().getFullYear());
  filterMonth = signal<number | null>(null);
  filterProduct = signal<number | null>(null);
  filterClient = signal<number | null>(null);
  filterStatus = signal<string>('ALL');
  filterApproval = signal<string>('ALL');
  filterType = signal<string>('ALL');

  // ════════════════════════════════════════════════════════════════════════════
  // UI State
  // ════════════════════════════════════════════════════════════════════════════
  saving = signal(false);
  exporting = signal(false);
  generatingPdf = signal(false);
  showDeleteModal = false;
  showApprovalModal = false;
  isEditMode = false;

  revenueToDelete: FactRevenue | null = null;
  revenueToApprove: FactRevenue | null = null;
  approvalNotes = '';

  private flatpickrInstances: any[] = [];

  // Data initialization
  currentItem: FactRevenue = {} as FactRevenue;

  orderItems = signal<BookingOrderItem[]>([]);
  paymentMilestones = signal<PaymentMilestone[]>([]);
  expandedRows = signal<Set<number>>(new Set());
  monthlyData = signal<Map<number, FactRevenueMonthly[]>>(new Map());

  // ════════════════════════════════════════════════════════════════════════════
  // Editable Profit Margin Thresholds
  // ════════════════════════════════════════════════════════════════════════════
  marginThreshold1 = signal(25);
  marginThreshold2 = signal(30);
  marginThreshold3 = signal(35);

  // ════════════════════════════════════════════════════════════════════════════
  // Dropdown Options
  // ════════════════════════════════════════════════════════════════════════════
  projectTypes = ['Social Media Management', 'Production', 'Distribution', 'Event', 'SEO Content', 'Others'];
  bookingOrderTypes = ['One Time', 'Multiple Payment', 'Multi Retainer'];

  approvalStatuses = ['Pending', 'RFP Received', 'RFP Responded', 'Approved', 'Completed', 'Canceled', 'Rejected'];

  orderStatuses = [
    { value: 'Pending', label: 'Pending', color: 'amber' },
    { value: 'RFP Received', label: 'RFP Received', color: 'purple' },
    { value: 'RFP Responded', label: 'RFP Responded', color: 'indigo' },
    { value: 'Approved', label: 'Approved', color: 'emerald' },
    { value: 'Completed', label: 'Completed', color: 'blue' },
    { value: 'Canceled', label: 'Canceled', color: 'slate' },
    { value: 'Rejected', label: 'Rejected', color: 'red' }
  ];

  paymentTypes: { value: PaymentType; label: string; icon: string; description: string }[] = [
    { value: 'one_time', label: 'One Time', icon: 'bolt', description: 'Single payment (Upfront or Upon Completion)' },
    { value: 'multiple', label: 'Multiple Payment', icon: 'view_list', description: 'Milestone-based payments (percentages)' },
    { value: 'multi_retainer', label: 'Multi Retainer', icon: 'autorenew', description: 'Monthly distribution over contract period' }
  ];

  oneTimePaymentTerms = [
    { value: 'Upfront', label: 'Upfront (100%)' },
    { value: 'Upon Completion', label: 'Upon Completion' }
  ];

  countries = ['UAE', 'KSA', 'JOR', 'SYR', 'EGY', 'QAT', 'KWT', 'BHR', 'OMN', 'Other'];
  months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // Computed Lists
  // ════════════════════════════════════════════════════════════════════════════
  yearsList = computed(() => {
    const years = new Set(this.dataService.revenues().map(r => r.date ? new Date(r.date).getFullYear() : new Date().getFullYear()));
    years.add(new Date().getFullYear());
    years.add(new Date().getFullYear() + 1);
    return Array.from(years).sort((a, b) => b - a);
  });

  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) => a.product_name.localeCompare(b.product_name));
  });
  sortedClients = computed(() => {
    return this.dataService.clients().slice().sort((a, b) => a.client_name.localeCompare(b.client_name));
  });
  sortedEmployees = computed(() => {
    return this.dataService.employees().filter(e => !e.end_date).slice().sort((a, b) => a.name.localeCompare(b.name));
  });

  filteredRevenues = computed(() => {
    let data = this.dataService.revenues();

    if (this.filterYear()) data = data.filter(r => r.date && new Date(r.date).getFullYear() === this.filterYear());
    if (this.filterMonth()) data = data.filter(r => r.date && new Date(r.date).getMonth() + 1 === this.filterMonth());
    if (this.filterProduct()) data = data.filter(r => r.product_id === this.filterProduct());
    if (this.filterClient()) data = data.filter(r => r.client_id === this.filterClient());
    if (this.filterStatus() !== 'ALL') data = data.filter(r => r.project_type === this.filterStatus());
    if (this.filterApproval() !== 'ALL') data = data.filter(r => r.approval_status === this.filterApproval());
    if (this.filterType() !== 'ALL') data = data.filter(r => r.booking_order_type === this.filterType());

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(r =>
        r.order_number?.toLowerCase().includes(text) ||
        r.bo_name?.toLowerCase().includes(text) ||
        r.campaign_name?.toLowerCase().includes(text) ||
        this.dataService.getClientName(r.client_id).toLowerCase().includes(text)
      );
    }
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  totalRevenues = computed(() => this.filteredRevenues().length);
  totalEstimatedRevenue = computed(() => this.filteredRevenues().reduce((sum, r) => sum + (r.estimated_revenue || r.gross_amount || 0), 0));
  totalActualRevenue = computed(() => this.filteredRevenues().reduce((sum, r) => sum + (r.gross_amount || 0), 0));
  pendingApprovalCount = computed(() => this.filteredRevenues().filter(r => r.approval_status === 'Pending').length);
  multiRetainerCount = computed(() => this.filteredRevenues().filter(r => r.booking_order_type === 'Multi Retainer').length);

  // ════════════════════════════════════════════════════════════════════════════
  // ⚡ تم تحويلها لدوال عادية لكي تتحدث الواجهة فوراً عند تغيير النسبة
  // ════════════════════════════════════════════════════════════════════════════
  itemsSubtotal() { return this.currentItem.items_subtotal || 0; }
  vatAmount() { return this.currentItem.vat_amount || 0; }
  grandTotal() { return this.currentItem.grand_total || 0; }

  milestonesTotal = computed(() => this.paymentMilestones().reduce((sum, m) => sum + (m.percentage || 0), 0));
  milestonesValid = computed(() => Math.abs(this.milestonesTotal() - 100) < 0.01);

  // ════════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ════════════════════════════════════════════════════════════════════════════
  ngOnInit() {
    this.currentItem = this.getEmptyRevenue();
  }

  ngAfterViewInit() {
    this.loadFlatpickrStyles();
    this.loadXLSXLibrary();
    this.loadJsPDFLibrary();
  }

  ngOnDestroy() {
    this.destroyFlatpickrInstances();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Library Loading
  // ════════════════════════════════════════════════════════════════════════════
  private loadFlatpickrStyles() {
    if (!document.getElementById('flatpickr-css')) {
      const link = document.createElement('link');
      link.id = 'flatpickr-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('flatpickr-js')) {
      const script = document.createElement('script');
      script.id = 'flatpickr-js';
      script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
      script.onload = () => { if (this.currentView() === 'form') this.initializeFlatpickr(); };
      document.head.appendChild(script);
    }
  }

  private loadXLSXLibrary() {
    if (!document.getElementById('xlsx-js')) {
      const script = document.createElement('script');
      script.id = 'xlsx-js';
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      document.head.appendChild(script);
    }
  }

  private loadJsPDFLibrary() {
    if (!document.getElementById('jspdf-js')) {
      const script = document.createElement('script');
      script.id = 'jspdf-js';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script);
    }
    if (!document.getElementById('jspdf-autotable-js')) {
      const script = document.createElement('script');
      script.id = 'jspdf-autotable-js';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
      document.head.appendChild(script);
    }
  }

  private initializeFlatpickr() {
    this.destroyFlatpickrInstances();
    setTimeout(() => {
      if (typeof flatpickr === 'undefined') return;
      const config = { dateFormat: 'Y-m-d', altInput: true, altFormat: 'F j, Y', animate: true };
      const dateInputs = [
        { id: 'bo_submission_date', field: 'bo_submission_date' },
        { id: 'start_date', field: 'start_date' },
        { id: 'end_date', field: 'end_date' },
        { id: 'expected_payment_date', field: 'expected_payment_date' },
        { id: 'payment_retainer_start', field: 'payment_retainer_start' },
        { id: 'payment_retainer_end', field: 'payment_retainer_end' }
      ];

      dateInputs.forEach(input => {
        const el = document.getElementById(input.id);
        if (el) {
          const instance = flatpickr(el, {
            ...config,
            defaultDate: (this.currentItem as any)[input.field] || null,
            onChange: (selectedDates: Date[], dateStr: string) => {
              (this.currentItem as any)[input.field] = dateStr || null;
              if (input.field === 'start_date' || input.field === 'end_date') {
                this.generateMonthlyDistribution();
                if (this.currentItem.payment_type === 'multi_retainer') {
                  this.syncRetainerDatesFromProject();
                }
              }
            }
          });
          this.flatpickrInstances.push(instance);
        }
      });
    }, 150);
  }

  private destroyFlatpickrInstances() {
    this.flatpickrInstances.forEach(instance => { if (instance && instance.destroy) instance.destroy(); });
    this.flatpickrInstances = [];
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Empty Revenue
  // ════════════════════════════════════════════════════════════════════════════
  getEmptyRevenue(): FactRevenue {
    const today = new Date().toISOString().split('T')[0];
    let defaultProductId = 1;

    try {
      if (this.sortedProducts && typeof this.sortedProducts === 'function') {
        const products = this.sortedProducts();
        if (products && products.length > 0) defaultProductId = products[0].product_id;
      }
    } catch (e) { }

    return {
      date: today,
      product_id: defaultProductId,
      country: 'UAE',
      gross_amount: 0,
      estimated_revenue: 0,
      order_number: '',
      bo_name: '',
      campaign_name: '',
      description: '',
      project_type: 'Social Media Management',
      booking_order_type: 'One Time',
      client_id: undefined,
      owner_id: undefined,
      bo_submission_date: today,
      start_date: null,
      end_date: null,
      expected_payment_date: undefined,
      vat_enabled: false,
      vat_percentage: 5,
      vat_amount: 0,
      grand_total: 0,
      items_subtotal: 0,
      payment_type: 'one_time',
      payment_terms: 'Upfront',
      payment_custom_percentage: 50,
      payment_retainer_start: null,
      payment_retainer_end: null,
      direct_cost_labor: 0,
      direct_cost_material: 0,
      direct_cost_equipment: 0,
      direct_cost_tools: 0,
      direct_cost_other: 0,
      one_time_marketing: 0,
      one_time_consultation: 0,
      one_time_misc: 0,
      comments: '',
      approval_status: 'Pending',
      requires_approval: false
    } as FactRevenue;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Items Table Methods
  // ════════════════════════════════════════════════════════════════════════════
  addItem(): void {
    const items = this.orderItems();
    const newItem: BookingOrderItem = {
      item_order: items.length + 1,
      item_name: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      net_amount: 0
    };
    this.orderItems.set([...items, newItem]);
    this.updateItemsTotals();
  }

  removeItem(index: number): void {
    const items = this.orderItems();
    items.splice(index, 1);
    items.forEach((item, i) => item.item_order = i + 1);
    this.orderItems.set([...items]);
    this.updateItemsTotals();
  }

  updateItemNet(item: BookingOrderItem): void {
    item.net_amount = (item.quantity * item.unit_price) - (item.discount || 0);
    this.orderItems.set([...this.orderItems()]);
    this.updateItemsTotals();
  }

  updateItemsTotals(): void {
    const subtotal = this.orderItems().reduce((sum, item) => sum + (item.net_amount || 0), 0);

    this.currentItem.items_subtotal = subtotal;
    this.currentItem.estimated_revenue = subtotal; // الدخل للشركة هو الصافي قبل الضريبة

    if (this.currentItem.vat_enabled) {
      const vatPercent = Number(this.currentItem.vat_percentage) || 0;
      this.currentItem.vat_amount = Math.round(subtotal * (vatPercent / 100) * 100) / 100;
    } else {
      this.currentItem.vat_amount = 0;
    }

    this.currentItem.grand_total = subtotal + (this.currentItem.vat_amount || 0);

    // تحديث مبالغ الدفعات المتعددة تلقائياً بناءً على السعر الجديد الشامل
    if (this.currentItem.payment_type === 'multiple' && this.paymentMilestones().length > 0) {
      this.updateMilestoneAmounts();
    }
  }

  onVatChange(): void {
    this.updateItemsTotals();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Payment Milestones Methods
  // ════════════════════════════════════════════════════════════════════════════
  addMilestone(): void {
    const milestones = this.paymentMilestones();
    const remaining = 100 - this.milestonesTotal();

    const newMilestone: PaymentMilestone = {
      milestone_order: milestones.length + 1,
      milestone_name: `Milestone ${milestones.length + 1}`,
      percentage: remaining > 0 ? remaining : 0,
      amount: 0,
      status: 'pending'
    };

    this.paymentMilestones.set([...milestones, newMilestone]);
    this.updateMilestoneAmounts();
  }

  removeMilestone(index: number): void {
    const milestones = this.paymentMilestones();
    milestones.splice(index, 1);
    milestones.forEach((m, i) => m.milestone_order = i + 1);
    this.paymentMilestones.set([...milestones]);
    this.updateMilestoneAmounts();
  }

  updateMilestoneAmounts(): void {
    const totalAmount = this.currentItem.grand_total || this.currentItem.estimated_revenue || 0;
    const milestones = this.paymentMilestones();

    milestones.forEach(m => {
      m.amount = Math.round(totalAmount * (m.percentage / 100) * 100) / 100;
    });

    this.paymentMilestones.set([...milestones]);
  }

  onPaymentTypeChange(): void {
    const paymentType = this.currentItem.payment_type;
    this.paymentMilestones.set([]);

    if (paymentType === 'one_time') {
      this.currentItem.booking_order_type = 'One Time';
      this.currentItem.payment_terms = 'Upfront';
    } else if (paymentType === 'multiple') {
      this.currentItem.booking_order_type = 'Multiple Payment';
      this.currentItem.payment_terms = 'Multiple';
      this.addMilestone();
      this.addMilestone();
    } else if (paymentType === 'multi_retainer') {
      this.currentItem.booking_order_type = 'Multi Retainer';
      this.currentItem.payment_terms = 'Retainer';
      this.syncRetainerDatesFromProject();
    }
  }

  syncRetainerDatesFromProject(): void {
    if (this.currentItem.start_date) {
      this.currentItem.payment_retainer_start = this.currentItem.start_date;
    }
    if (this.currentItem.end_date) {
      this.currentItem.payment_retainer_end = this.currentItem.end_date;
    }
    this.generateMonthlyDistribution();
  }

  setPaymentType(value: string): void {
    this.currentItem.payment_type = value as PaymentType;
    this.onPaymentTypeChange();
  }

  onBookingOrderTypeChange(type: string): void {
    if (type === 'One Time') {
      this.currentItem.payment_type = 'one_time';
      this.currentItem.payment_terms = 'Upfront';
      this.paymentMilestones.set([]);
    } else if (type === 'Multiple Payment') {
      this.currentItem.payment_type = 'multiple';
      this.currentItem.payment_terms = 'Multiple';
      this.paymentMilestones.set([]);
      this.addMilestone();
      this.addMilestone();
    } else if (type === 'Multi Retainer') {
      this.currentItem.payment_type = 'multi_retainer';
      this.currentItem.payment_terms = 'Retainer';
      this.paymentMilestones.set([]);
      this.syncRetainerDatesFromProject();
    }
  }

  isActualRevenueEnabled(): boolean {
    return this.currentItem.approval_status === 'Completed';
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Profitability Calculations
  // ════════════════════════════════════════════════════════════════════════════
  calculateTotalDirectCost(item: FactRevenue): number {
    return (item.direct_cost_labor || 0) +
      (item.direct_cost_material || 0) +
      (item.direct_cost_equipment || 0) +
      (item.direct_cost_tools || 0) +
      (item.direct_cost_other || 0);
  }

  calculateTotalOneTimeCost(item: FactRevenue): number {
    return (item.one_time_marketing || 0) +
      (item.one_time_consultation || 0) +
      (item.one_time_misc || 0);
  }

  calculateTotalCost(item: FactRevenue): number {
    return this.calculateTotalDirectCost(item) + this.calculateTotalOneTimeCost(item);
  }

  calculateNetProfit(item: FactRevenue): number {
    const revenue = item.estimated_revenue || item.gross_amount || 0;
    return revenue - this.calculateTotalCost(item);
  }

  calculateProfitMargin(item: FactRevenue): number {
    const revenue = item.estimated_revenue || item.gross_amount || 0;
    if (revenue <= 0) return 0;
    return ((revenue - this.calculateTotalCost(item)) / revenue) * 100;
  }

  calculateRequiredRevenue(totalCost: number, marginPercent: number): number {
    if (marginPercent >= 100) return 0;
    return totalCost / (1 - marginPercent / 100);
  }

  getProfitMarginColor(item: FactRevenue): string {
    const margin = this.calculateProfitMargin(item);
    if (margin < this.marginThreshold1()) return 'red';
    if (margin < this.marginThreshold2()) return 'orange';
    return 'green';
  }

  getProfitMarginColorClass(item: FactRevenue): string {
    const color = this.getProfitMarginColor(item);
    const colorMap: Record<string, string> = {
      'red': 'bg-red-100 text-red-700 border-red-300',
      'orange': 'bg-amber-100 text-amber-700 border-amber-300',
      'green': 'bg-emerald-100 text-emerald-700 border-emerald-300'
    };
    return colorMap[color] || 'bg-slate-100 text-slate-700 border-slate-300';
  }

  isProfitMarginLow(item: FactRevenue): boolean {
    return this.calculateProfitMargin(item) < this.marginThreshold2();
  }

  canApproveOrder(item: FactRevenue): boolean {
    const margin = this.calculateProfitMargin(item);
    return margin >= this.marginThreshold2() || this.authService.isAdmin();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BO Name Generation
  // ════════════════════════════════════════════════════════════════════════════
  generateBoName(): void {
    const country = this.currentItem.country || 'UAE';
    const client = this.sortedClients().find(c => c.client_id === this.currentItem.client_id);
    const product = this.sortedProducts().find(p => p.product_id === this.currentItem.product_id);
    const campaign = this.currentItem.campaign_name || 'Project';
    const date = this.currentItem.bo_submission_date || new Date().toISOString().split('T')[0];

    const countryCode = country.substring(0, 3).toUpperCase();
    const clientCode = (client?.client_name || 'CLIENT').split(' ')[0].substring(0, 10).toUpperCase();
    const productCode = (product?.product_name || 'DEPT').replace(/\s/g, '').substring(0, 15).toUpperCase();
    const campaignCode = campaign.replace(/\s/g, '').substring(0, 20).toUpperCase();
    const dateCode = date.substring(5, 7) + date.substring(0, 4);

    const allRevenues = this.dataService.revenues();
    const maxSeq = allRevenues.length > 0 ? Math.max(...allRevenues.map(r => r.order_seq || 0)) : 0;
    const nextSeq = this.currentItem.order_seq || (maxSeq + 1);
    const seqCode = nextSeq.toString().padStart(3, '0');

    this.currentItem.bo_name = `${countryCode}_${clientCode}_${productCode}_${campaignCode}_${dateCode}_${seqCode}`;

    if (this.dataService.generateBookingRef) {
      this.currentItem.order_number = this.dataService.generateBookingRef(country, this.currentItem.product_id);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Multi-Retainer Monthly Distribution
  // ════════════════════════════════════════════════════════════════════════════
  generateMonthlyDistribution(): void {
    if (this.currentItem.payment_type !== 'multi_retainer') return;

    const startDateStr = this.currentItem.payment_retainer_start || this.currentItem.start_date;
    const endDateStr = this.currentItem.payment_retainer_end || this.currentItem.end_date;

    if (!startDateStr || !endDateStr) return;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (startDate >= endDate) return;

    const months: { year: number; month: number }[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1
      });
      current.setMonth(current.getMonth() + 1);
    }

    const totalRevenue = this.currentItem.estimated_revenue || 0;
    const monthlyRevenue = months.length > 0 ? totalRevenue / months.length : 0;

    const distribution: FactRevenueMonthly[] = months.map(m => ({
      revenue_id: this.currentItem.id || 0,
      year: m.year,
      month: m.month,
      estimated_revenue: Math.round(monthlyRevenue * 100) / 100,
      actual_revenue: 0
    }));

    const currentMap = new Map(this.monthlyData());
    currentMap.set(this.currentItem.id || 0, distribution);
    this.monthlyData.set(currentMap);
  }

  getMonthsCount(): number {
    const startDateStr = this.currentItem.payment_retainer_start || this.currentItem.start_date;
    const endDateStr = this.currentItem.payment_retainer_end || this.currentItem.end_date;

    if (!startDateStr || !endDateStr) return 0;

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    return (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) + 1;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Row Expansion
  // ════════════════════════════════════════════════════════════════════════════
  toggleRowExpansion(revenueId: number): void {
    const expanded = new Set(this.expandedRows());
    if (expanded.has(revenueId)) {
      expanded.delete(revenueId);
    } else {
      expanded.add(revenueId);
      this.loadMonthlyData(revenueId);
    }
    this.expandedRows.set(expanded);
  }

  isRowExpanded(revenueId: number): boolean {
    return this.expandedRows().has(revenueId);
  }

  async loadMonthlyData(revenueId: number): Promise<void> {
    const data = await this.dataService.getRevenueMonthlyData(revenueId);
    if (data) {
      const currentMap = new Map(this.monthlyData());
      currentMap.set(revenueId, data);
      this.monthlyData.set(currentMap);
    }
  }

  getMonthlyDataForRevenue(revenueId: number): FactRevenueMonthly[] {
    return this.monthlyData().get(revenueId) || [];
  }

  async updateMonthlyActual(monthly: FactRevenueMonthly, newValue: number): Promise<void> {
    monthly.actual_revenue = newValue;
    await this.dataService.updateRevenueMonthly(monthly);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Approval System
  // ════════════════════════════════════════════════════════════════════════════
  canApprove(): boolean {
    return this.authService.isAdmin();
  }

  openApprovalModal(revenue: FactRevenue): void {
    this.revenueToApprove = revenue;
    this.approvalNotes = '';
    this.showApprovalModal = true;
  }

  async approveRevenue(): Promise<void> {
    if (!this.revenueToApprove) return;

    const margin = this.calculateProfitMargin(this.revenueToApprove);
    if (margin < this.marginThreshold2() && !this.authService.isAdmin()) {
      alert(`Cannot approve: Profit margin is below ${this.marginThreshold2()}%. Admin approval required.`);
      return;
    }

    const result = await this.dataService.approveRevenue(
      this.revenueToApprove.id!,
      this.approvalNotes
    );

    if (result.success) {
      this.showApprovalModal = false;
      this.revenueToApprove = null;
    } else {
      alert('Error approving: ' + result.error);
    }
  }

  async rejectRevenue(): Promise<void> {
    if (!this.revenueToApprove) return;

    const result = await this.dataService.rejectRevenue(
      this.revenueToApprove.id!,
      this.approvalNotes
    );

    if (result.success) {
      this.showApprovalModal = false;
      this.revenueToApprove = null;
    } else {
      alert('Error rejecting: ' + result.error);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PDF Export (Print Quotation)
  // ════════════════════════════════════════════════════════════════════════════
  async exportToPDF(): Promise<void> {
    if (typeof jspdf === 'undefined') {
      alert('PDF library is still loading. Please try again.');
      return;
    }

    this.generatingPdf.set(true);

    try {
      const { jsPDF } = jspdf;
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('QUOTATION', 105, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('7awi Company', 20, 35);
      doc.text('Dubai, UAE', 20, 40);

      doc.text(`BO Number: ${this.currentItem.bo_name || '-'}`, 140, 35);
      doc.text(`Date: ${this.currentItem.bo_submission_date || '-'}`, 140, 40);
      doc.text(`Valid Until: ${this.currentItem.expected_payment_date || '-'}`, 140, 45);

      const clientName = this.dataService.getClientName(this.currentItem.client_id);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To:', 20, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(clientName, 20, 60);
      doc.text(this.currentItem.country || '-', 20, 65);

      doc.setFont('helvetica', 'bold');
      doc.text('Campaign:', 20, 75);
      doc.setFont('helvetica', 'normal');
      doc.text(this.currentItem.campaign_name || '-', 50, 75);

      const items = this.orderItems();
      if (items.length > 0) {
        const tableData = items.map((item, index) => [
          (item.item_order || index + 1).toString(),
          item.item_name,
          item.quantity.toString(),
          this.formatCurrency(item.unit_price),
          this.formatCurrency(item.discount),
          this.formatCurrency(item.net_amount)
        ]);

        (doc as any).autoTable({
          startY: 85,
          head: [['#', 'Item', 'Qty', 'Unit Price', 'Discount', 'Net']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 138] },
          styles: { fontSize: 9 }
        });
      }

      const finalY = (doc as any).lastAutoTable?.finalY || 120;

      doc.setFont('helvetica', 'bold');
      doc.text('Subtotal:', 130, finalY + 10);
      doc.text(this.formatCurrency(this.currentItem.items_subtotal || 0), 180, finalY + 10, { align: 'right' });

      if (this.currentItem.vat_enabled) {
        doc.text(`VAT (${this.currentItem.vat_percentage}%):`, 130, finalY + 17);
        doc.text(this.formatCurrency(this.currentItem.vat_amount || 0), 180, finalY + 17, { align: 'right' });
      }

      doc.setFontSize(12);
      doc.text('Grand Total:', 130, finalY + 27);
      doc.text(this.formatCurrency(this.currentItem.grand_total || this.currentItem.estimated_revenue || 0), 180, finalY + 27, { align: 'right' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Payment Terms: ${this.getPaymentTermsDisplay(this.currentItem)}`, 20, finalY + 40);

      doc.setFontSize(8);
      doc.text('Thank you for your business!', 105, 280, { align: 'center' });

      const fileName = `Quotation_${this.currentItem.bo_name || 'draft'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error: any) {
      console.error('PDF export error:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      this.generatingPdf.set(false);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Excel Export
  // ════════════════════════════════════════════════════════════════════════════
  async exportToExcel(): Promise<void> {
    if (typeof XLSX === 'undefined') {
      alert('Excel library is still loading. Please try again.');
      return;
    }

    this.exporting.set(true);

    try {
      const data = this.filteredRevenues();

      const excelData = data.map(r => ({
        'BO Name': r.bo_name || '-',
        'Campaign': r.campaign_name || '-',
        'Client': this.dataService.getClientName(r.client_id),
        'Department': this.dataService.getProductName(r.product_id),
        'Country': r.country,
        'Project Type': r.project_type || '-',
        'Payment Type': r.payment_type || '-',
        'Status': r.approval_status || '-',
        'Estimated Revenue': r.estimated_revenue || 0,
        'Actual Revenue': r.gross_amount || 0,
        'Total Cost': this.calculateTotalCost(r),
        'Net Profit': this.calculateNetProfit(r),
        'Profit Margin %': Math.round(this.calculateProfitMargin(r) * 100) / 100
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Booking Orders');

      const colWidths = Object.keys(excelData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
      ws['!cols'] = colWidths;

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Booking_Orders_${today}.xlsx`);

    } catch (error: any) {
      console.error('Export error:', error);
      alert('Error exporting: ' + error.message);
    } finally {
      this.exporting.set(false);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Navigation & CRUD
  // ════════════════════════════════════════════════════════════════════════════
  openAddForm(): void {
    this.isEditMode = false;
    this.currentItem = this.getEmptyRevenue();
    this.orderItems.set([]);
    this.paymentMilestones.set([]);
    this.currentView.set('form');
    setTimeout(() => this.initializeFlatpickr(), 250);
  }

  editRevenue(revenue: FactRevenue): void {
    this.isEditMode = true;
    this.currentItem = { ...revenue };
    this.orderItems.set(revenue.booking_order_items || []);
    this.paymentMilestones.set(revenue.payment_milestones || []);
    this.currentView.set('form');
    setTimeout(() => this.initializeFlatpickr(), 250);
  }

  goBackToList(): void {
    this.destroyFlatpickrInstances();
    this.currentView.set('list');
    this.currentItem = this.getEmptyRevenue();
    this.orderItems.set([]);
    this.paymentMilestones.set([]);
  }

  confirmDelete(revenue: FactRevenue): void {
    this.revenueToDelete = revenue;
    this.showDeleteModal = true;
  }

  async save(): Promise<void> {
    if (!this.currentItem.campaign_name?.trim()) {
      alert('Campaign Name is required');
      return;
    }

    if (this.currentItem.payment_type === 'multiple' && !this.milestonesValid()) {
      alert('Payment milestones must total 100%');
      return;
    }

    if (!this.currentItem.bo_name) {
      this.generateBoName();
    }

    this.updateItemsTotals();

    const margin = this.calculateProfitMargin(this.currentItem);
    if (margin < this.marginThreshold2()) {
      this.currentItem.requires_approval = true;
      this.currentItem.approval_required_reason = `Profit margin (${margin.toFixed(1)}%) is below ${this.marginThreshold2()}%`;

      if (this.currentItem.approval_status === 'Approved') {
        this.currentItem.approval_status = 'Pending';
      }
    }

    this.saving.set(true);

    try {
      let result: any;

      this.currentItem.booking_order_items = this.orderItems();
      this.currentItem.payment_milestones = this.paymentMilestones();

      if (this.isEditMode) {
        result = await this.dataService.updateRevenue(this.currentItem);
      } else {
        result = await this.dataService.addRevenue(this.currentItem);
      }

      if (result.success) {
        const savedId = this.isEditMode ? this.currentItem.id : result.data?.[0]?.id;

        if (this.currentItem.payment_type === 'multi_retainer' && savedId) {
          const monthlyDistribution = this.monthlyData().get(this.currentItem.id || 0) || [];
          for (const monthly of monthlyDistribution) {
            monthly.revenue_id = savedId;
            await this.dataService.saveRevenueMonthly(monthly);
          }
        }
        this.goBackToList();
      } else {
        alert('Error saving: ' + result.error);
      }
    } catch (error: any) {
      alert('Unexpected error: ' + error.message);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteRevenue(): Promise<void> {
    if (!this.revenueToDelete?.id) return;

    const result = await this.dataService.deleteRevenue(this.revenueToDelete.id);
    if (!result.success) {
      alert('Error deleting: ' + result.error);
    }

    this.showDeleteModal = false;
    this.revenueToDelete = null;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Helpers
  // ════════════════════════════════════════════════════════════════════════════
  trackByRevenue(index: number, revenue: FactRevenue): any {
    return revenue.id;
  }

  trackByItem(index: number, item: BookingOrderItem): number {
    return item.item_order || index;
  }

  trackByMilestone(index: number, milestone: PaymentMilestone): number {
    return milestone.milestone_order || index;
  }

  getApprovalStatusClass(status: string | undefined): string {
    if (!status) return 'bg-slate-100 text-slate-600';

    const classes: Record<string, string> = {
      'Pending': 'bg-amber-100 text-amber-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Completed': 'bg-blue-100 text-blue-700',
      'Canceled': 'bg-slate-100 text-slate-600',
      'RFP Received': 'bg-purple-100 text-purple-700',
      'RFP Responded': 'bg-indigo-100 text-indigo-700'
    };

    return classes[status] || 'bg-slate-100 text-slate-600';
  }

  getPaymentTermsDisplay(item: FactRevenue): string {
    if (!item.payment_type) return item.payment_terms || '-';

    switch (item.payment_type) {
      case 'one_time':
        return item.payment_terms || 'Upfront';
      case 'multiple':
        const milestones = this.paymentMilestones();
        if (milestones.length > 0) {
          return milestones.map(m => `${m.percentage}%`).join(' - ');
        }
        return 'Multiple Payments';
      case 'multi_retainer':
        const months = this.getMonthsCount();
        return `Retainer (${months} months)`;
      default:
        return item.payment_terms || '-';
    }
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.name || '';
  }
}
