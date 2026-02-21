import { Component, inject, computed, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { FactRevenue, FactRevenueMonthly } from '../../models/data.models';

declare var flatpickr: any;

@Component({
  selector: 'app-booking-order-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-order-manager.component.html'
})
export class BookingOrderManagerComponent implements AfterViewInit, OnDestroy {
  dataService = inject(DataService);
  authService = inject(AuthService);

  // View State
  currentView = signal<'list' | 'form'>('list');

  // Filters
  searchText = signal('');
  filterYear = signal<number | null>(new Date().getFullYear());
  filterMonth = signal<number | null>(null);
  filterProduct = signal<number | null>(null);
  filterClient = signal<number | null>(null);
  filterStatus = signal<string>('ALL');
  filterApproval = signal<string>('ALL');
  filterType = signal<string>('ALL');

  // UI State
  saving = signal(false);
  showDeleteModal = false;
  showApprovalModal = false;
  isEditMode = false;
  revenueToDelete: FactRevenue | null = null;
  revenueToApprove: FactRevenue | null = null;
  approvalNotes = '';

  // Expanded rows for Multi-Retainer
  expandedRows = signal<Set<number>>(new Set());

  // Monthly distribution data
  monthlyData = signal<Map<number, FactRevenueMonthly[]>>(new Map());



  // Profit margin thresholds (editable)
  marginThreshold1 = signal(20);
  marginThreshold2 = signal(25);
  marginThreshold3 = signal(30);

  // Flatpickr instances
  private flatpickrInstances: any[] = [];

  // Dropdown Options
  projectTypes = [
    'Social Media Management',
    'Production',
    'Distribution',
    'Event',
    'SEO Content',
    'Others'
  ];

  bookingOrderTypes = ['One Time', 'Multi Retainer'];

  approvalStatuses = ['Pending', 'Approved', 'Rejected'];

  countries = ['UAE', 'KSA', 'JOR', 'SYR', 'EGY', 'QAT', 'KWT', 'BHR', 'OMN', 'Other'];

  months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  // Computed Lists
  yearsList = computed(() => {
    const years = new Set(this.dataService.revenues().map(r => new Date(r.date).getFullYear()));
    years.add(new Date().getFullYear());
    years.add(new Date().getFullYear() + 1);
    return Array.from(years).sort((a, b) => b - a);
  });

  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) => {
      if (a.product_name.toLowerCase() === 'others') return 1;
      if (b.product_name.toLowerCase() === 'others') return -1;
      return a.product_name.localeCompare(b.product_name);
    });
  });

  sortedClients = computed(() => {
    return this.dataService.clients().slice().sort((a, b) => {
      if (a.client_name.toLowerCase() === 'others') return 1;
      if (b.client_name.toLowerCase() === 'others') return -1;
      return a.client_name.localeCompare(b.client_name);
    });
  });

  sortedEmployees = computed(() => {
    return this.dataService.employees()
      .filter(e => !e.end_date)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Filtered Revenues
  filteredRevenues = computed(() => {
    let data = this.dataService.revenues();

    if (this.filterYear()) {
      data = data.filter(r => new Date(r.date).getFullYear() === this.filterYear());
    }

    if (this.filterMonth()) {
      data = data.filter(r => new Date(r.date).getMonth() + 1 === this.filterMonth());
    }

    if (this.filterProduct()) {
      data = data.filter(r => r.product_id === this.filterProduct());
    }

    if (this.filterClient()) {
      data = data.filter(r => r.client_id === this.filterClient());
    }

    if (this.filterStatus() !== 'ALL') {
      data = data.filter(r => r.project_type === this.filterStatus());
    }

    if (this.filterApproval() !== 'ALL') {
      data = data.filter(r => r.approval_status === this.filterApproval());
    }

    if (this.filterType() !== 'ALL') {
      data = data.filter(r => r.booking_order_type === this.filterType());
    }

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

  // Stats
  totalRevenues = computed(() => this.filteredRevenues().length);
  totalEstimatedRevenue = computed(() =>
    this.filteredRevenues().reduce((sum, r) => sum + (r.estimated_revenue || r.gross_amount || 0), 0)
  );
  totalActualRevenue = computed(() =>
    this.filteredRevenues().reduce((sum, r) => sum + (r.gross_amount || 0), 0)
  );
  pendingApprovalCount = computed(() =>
    this.filteredRevenues().filter(r => r.approval_status === 'Pending').length
  );
  multiRetainerCount = computed(() =>
    this.filteredRevenues().filter(r => r.booking_order_type === 'Multi Retainer').length
  );
currentItem: FactRevenue = this.getEmptyRevenue();
  ngAfterViewInit() {
    this.loadFlatpickrStyles();
  }

  ngOnDestroy() {
    this.destroyFlatpickrInstances();
  }

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
      script.onload = () => {
        if (this.currentView() === 'form') {
          this.initializeFlatpickr();
        }
      };
      document.head.appendChild(script);
    }
  }

  private initializeFlatpickr() {
    this.destroyFlatpickrInstances();

    setTimeout(() => {
      if (typeof flatpickr === 'undefined') return;

      const config = {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'F j, Y',
        animate: true,
        disableMobile: true
      };

      const dateInputs = [
        { id: 'bo_submission_date', field: 'bo_submission_date' },
        { id: 'start_date', field: 'start_date' },
        { id: 'end_date', field: 'end_date' },
        { id: 'payment_date', field: 'payment_date' }
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
              }
            }
          });
          this.flatpickrInstances.push(instance);
        }
      });
    }, 150);
  }

  private destroyFlatpickrInstances() {
    this.flatpickrInstances.forEach(instance => {
      if (instance && instance.destroy) {
        instance.destroy();
      }
    });
    this.flatpickrInstances = [];
  }

  getEmptyRevenue(): FactRevenue {
    const today = new Date();
    return {
      date: today.toISOString().split('T')[0],
      product_id: this.sortedProducts()[0]?.product_id || 1,
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
      bo_submission_date: today.toISOString().split('T')[0],
      start_date: null,
      end_date: null,
      payment_date: undefined,
      direct_cost_labor: 0,
      direct_cost_material: 0,
      direct_cost_equipment: 0,
      direct_cost_tools: 0,
      direct_cost_other: 0,
      one_time_marketing: 0,
      one_time_consultation: 0,
      one_time_misc: 0,
      comments: '',
      approval_status: 'Pending'
    };
  }

  // =============================================
  // PROFITABILITY CALCULATIONS
  // =============================================

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

  // Calculate required revenue for target margin: Total Cost / (1 - margin%)
  calculateRequiredRevenue(totalCost: number, marginPercent: number): number {
    if (marginPercent >= 100) return 0;
    return totalCost / (1 - marginPercent / 100);
  }

  isProfitMarginLow(item: FactRevenue): boolean {
    return this.calculateProfitMargin(item) < 30;
  }

  // =============================================
  // BO NAME GENERATION
  // =============================================

  generateBoName(): void {
    const country = this.currentItem.country || 'UAE';
    const client = this.sortedClients().find(c => c.client_id === this.currentItem.client_id);
    const product = this.sortedProducts().find(p => p.product_id === this.currentItem.product_id);
    const campaign = this.currentItem.campaign_name || 'Project';

    const dateStr = this.currentItem.bo_submission_date || this.currentItem.date || new Date().toISOString().split('T')[0];

    const countryCode = country.substring(0, 3).toUpperCase();
    const clientCode = (client?.client_name || 'CLIENT').split(' ')[0].substring(0, 10).toUpperCase();
    const productCode = (product?.product_name || 'DEPT').replace(/\s/g, '').substring(0, 15).toUpperCase();
    const campaignCode = campaign.replace(/\s/g, '').substring(0, 20).toUpperCase();
    const dateCode = dateStr.substring(5, 7) + dateStr.substring(0, 4); // MMYYYY

    // ✅ جلب التسلسل: إذا كان طلب موجود نأخذ رقمه، وإذا كان جديد نجلب الماكس + 1
    const nextSeq = this.currentItem.order_seq || this.dataService.getNextSequentialNumber();
    const seqCode = nextSeq.toString().padStart(3, '0');

    this.currentItem.bo_name = `${countryCode}_${clientCode}_${productCode}_${campaignCode}_${dateCode}_${seqCode}`;

    // تحديث order_number أيضاً
    this.currentItem.order_number = this.dataService.generateBookingRef(country, this.currentItem.product_id);
  }

  // =============================================
  // MULTI-RETAINER MONTHLY DISTRIBUTION
  // =============================================

 // =============================================
  // MULTI-RETAINER MONTHLY DISTRIBUTION
  // =============================================

  generateMonthlyDistribution(): void {
    if (this.currentItem.booking_order_type !== 'Multi Retainer') return;
    if (!this.currentItem.start_date || !this.currentItem.end_date) return;

    const startDate = new Date(this.currentItem.start_date);
    const endDate = new Date(this.currentItem.end_date);

    // استخدام دالة getMonthsCount الموثوقة لحساب عدد الأشهر بدلاً من loop التواريخ
    const totalMonths = this.getMonthsCount();
    if (totalMonths <= 0) return;

    const months: { year: number; month: number }[] = [];
    let curYear = startDate.getFullYear();
    let curMonth = startDate.getMonth() + 1;

    // توليد الأشهر بشكل آمن لتجنب مشكلة (31 يناير -> 3 مارس)
    for (let i = 0; i < totalMonths; i++) {
      months.push({ year: curYear, month: curMonth });
      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }

    // ✅ التعديل الأهم: الاعتماد على gross_amount أو estimated_revenue أيهما متوفر
    const totalRevenue = this.currentItem.estimated_revenue || this.currentItem.gross_amount || 0;
    const monthlyRevenue = totalMonths > 0 ? totalRevenue / totalMonths : 0;

    // Update local monthly data signal
    const distribution: FactRevenueMonthly[] = months.map(m => ({
      revenue_id: this.currentItem.id || 0,
      year: m.year,
      month: m.month,
      estimated_revenue: Math.round(monthlyRevenue * 100) / 100, // تقريب لخانين
      actual_revenue: 0
    }));

    const currentMap = new Map(this.monthlyData());
    currentMap.set(this.currentItem.id || 0, distribution);
    this.monthlyData.set(currentMap);
  }

  // ✅ دالة جديدة تُستدعى عند تغيير أي مبلغ في واجهة المستخدم
  onAmountChange(): void {
    if (this.currentItem.booking_order_type === 'Multi Retainer') {
      this.generateMonthlyDistribution();
    }
  }
  getMonthsCount(): number {
    if (!this.currentItem.start_date || !this.currentItem.end_date) return 0;

    const start = new Date(this.currentItem.start_date);
    const end = new Date(this.currentItem.end_date);

    return (end.getFullYear() - start.getFullYear()) * 12 +
           (end.getMonth() - start.getMonth()) + 1;
  }

  // =============================================
  // ROW EXPANSION FOR MULTI-RETAINER
  // =============================================

  toggleRowExpansion(revenueId: number): void {
    const expanded = new Set(this.expandedRows());
    if (expanded.has(revenueId)) {
      expanded.delete(revenueId);
    } else {
      expanded.add(revenueId);
      // Load monthly data if not already loaded
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

  // =============================================
  // APPROVAL SYSTEM
  // =============================================

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

  // =============================================
  // NAVIGATION & CRUD
  // =============================================

  openAddForm(): void {
    this.isEditMode = false;
    this.currentItem = this.getEmptyRevenue();
    this.currentView.set('form');
    setTimeout(() => this.initializeFlatpickr(), 250);
  }

  editRevenue(revenue: FactRevenue): void {
    this.isEditMode = true;
    this.currentItem = { ...revenue };
    this.currentView.set('form');
    setTimeout(() => this.initializeFlatpickr(), 250);
  }

  goBackToList(): void {
    this.destroyFlatpickrInstances();
    this.currentView.set('list');
    this.currentItem = this.getEmptyRevenue();
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

    // Generate BO Name if not set
    if (!this.currentItem.bo_name) {
      this.generateBoName();
    }

    // ✅ التعديل هنا: فحص هامش الربح وتحديد الحالة تلقائياً
    const margin = this.calculateProfitMargin(this.currentItem);
    if (margin < 30) {
      this.currentItem.approval_status = 'Pending';
    } else {
      this.currentItem.approval_status = 'Approved'; // موافقة تلقائية إذا كان 30% أو أكثر
    }

    this.saving.set(true);

    try {
      let result;

      if (this.isEditMode) {
        result = await this.dataService.updateRevenue(this.currentItem);
      } else {
        result = await this.dataService.addRevenue(this.currentItem);
      }

      if (result.success) {
        // Save monthly distribution for Multi Retainer
        if (this.currentItem.booking_order_type === 'Multi Retainer' && result.data?.[0]?.id) {
          const monthlyDistribution = this.monthlyData().get(this.currentItem.id || 0) || [];
          for (const monthly of monthlyDistribution) {
            monthly.revenue_id = result.data[0].id;
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

  // =============================================
  // HELPERS
  // =============================================

  getApprovalStatusClass(status: string | undefined): string {
    if (!status) return 'bg-slate-100 text-slate-600';

    const classes: Record<string, string> = {
      'Pending': 'bg-amber-100 text-amber-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-red-100 text-red-700'
    };

    return classes[status] || 'bg-slate-100 text-slate-600';
  }

  getProjectTypeClass(type: string | undefined): string {
    if (!type) return 'bg-slate-100 text-slate-600';

    const classes: Record<string, string> = {
      'Social Media Management': 'bg-blue-50 text-blue-700',
      'Production': 'bg-purple-50 text-purple-700',
      'Distribution': 'bg-cyan-50 text-cyan-700',
      'Event': 'bg-pink-50 text-pink-700',
      'SEO Content': 'bg-indigo-50 text-indigo-700',
      'Others': 'bg-slate-100 text-slate-600'
    };

    return classes[type] || 'bg-slate-100 text-slate-600';
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
