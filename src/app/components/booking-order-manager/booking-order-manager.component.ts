import { Component, inject, computed, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { FactRevenue, FactRevenueMonthly } from '../../models/data.models';

declare var flatpickr: any;
declare var XLSX: any;

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
  exporting = signal(false);
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

  // ✅ NEW: Payment Terms Options
 // ✅ التعديل الوحيد هنا: تحديد النوع بدقة ليقبله TypeScript
  paymentTermsOptions: { value: 'Upfront' | 'Upon Completion' | 'Custom' | 'Retainer'; label: string; icon: string }[] = [
    { value: 'Upfront', label: 'Upfront', icon: 'bolt' },
    { value: 'Upon Completion', label: 'Upon Completion', icon: 'check_circle' },
    { value: 'Custom', label: 'Custom (%)', icon: 'tune' },
    { value: 'Retainer', label: 'Retainer', icon: 'autorenew' }
  ];
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
  // Current item being edited
  currentItem: FactRevenue = this.getEmptyRevenue();
  ngAfterViewInit() {
    this.loadFlatpickrStyles();
    this.loadXLSXLibrary();
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

  // ✅ NEW: Load XLSX library for Excel export
  private loadXLSXLibrary() {
    if (!document.getElementById('xlsx-js')) {
      const script = document.createElement('script');
      script.id = 'xlsx-js';
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
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
        { id: 'payment_date', field: 'payment_date' },
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
      // ✅ NEW: Payment Terms defaults
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
// =============================================
  // BO NAME GENERATION
  // =============================================

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
    const dateCode = date.substring(5, 7) + date.substring(0, 4); // MMYYYY

    // ✅ التعديل هنا: جلب أعلى رقم order_seq من كل الطلبات، وإضافة 1 للطلب الجديد
    const allRevenues = this.dataService.revenues();
    const maxSeq = allRevenues.length > 0 ? Math.max(...allRevenues.map(r => r.order_seq || 0)) : 0;

    // إذا كان الطلب موجود مسبقاً (تعديل) نأخذ رقمه الحالي، وإذا كان جديد نأخذ (الماكس + 1)
    const nextSeq = this.currentItem.order_seq || (maxSeq + 1);
    const seqCode = nextSeq.toString().padStart(3, '0');

    this.currentItem.bo_name = `${countryCode}_${clientCode}_${productCode}_${campaignCode}_${dateCode}_${seqCode}`;

    // Also update order_number for legacy compatibility
    if(this.dataService.generateBookingRef) {
        this.currentItem.order_number = this.dataService.generateBookingRef(country, this.currentItem.product_id);
    }
  }
  // =============================================
  // MULTI-RETAINER MONTHLY DISTRIBUTION
  // =============================================

  generateMonthlyDistribution(): void {
    if (this.currentItem.booking_order_type !== 'Multi Retainer') return;
    if (!this.currentItem.start_date || !this.currentItem.end_date) return;

    const startDate = new Date(this.currentItem.start_date);
    const endDate = new Date(this.currentItem.end_date);

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

    // Update local monthly data signal
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
  // ✅ NEW: EXCEL EXPORT
  // =============================================

  async exportToExcel(): Promise<void> {
    if (typeof XLSX === 'undefined') {
      alert('Excel library is still loading. Please try again in a moment.');
      return;
    }

    this.exporting.set(true);

    try {
      const data = this.filteredRevenues();

      // Prepare data for Excel
      const excelData = data.map(r => ({
        'BO Name': r.bo_name || '-',
        'Campaign': r.campaign_name || '-',
        'Client': this.dataService.getClientName(r.client_id),
        'Department': this.dataService.getProductName(r.product_id),
        'Country': r.country,
        'Project Type': r.project_type || '-',
        'Booking Type': r.booking_order_type || '-',
        'Owner': this.dataService.getEmployeeName(r.owner_id),
        'BO Submission Date': r.bo_submission_date || '-',
        'Start Date': r.start_date || '-',
        'End Date': r.end_date || '-',
        'Payment Date': r.payment_date || '-',
        'Payment Terms': this.getPaymentTermsDisplay(r),
        'Estimated Revenue': r.estimated_revenue || 0,
        'Actual Revenue': r.gross_amount || 0,
        'Direct Cost (Labor)': r.direct_cost_labor || 0,
        'Direct Cost (Material)': r.direct_cost_material || 0,
        'Direct Cost (Equipment)': r.direct_cost_equipment || 0,
        'Direct Cost (Tools)': r.direct_cost_tools || 0,
        'Direct Cost (Other)': r.direct_cost_other || 0,
        'Total Direct Cost': this.calculateTotalDirectCost(r),
        'One Time (Marketing)': r.one_time_marketing || 0,
        'One Time (Consultation)': r.one_time_consultation || 0,
        'One Time (Misc)': r.one_time_misc || 0,
        'Total One Time Cost': this.calculateTotalOneTimeCost(r),
        'Total Cost': this.calculateTotalCost(r),
        'Net Profit': this.calculateNetProfit(r),
        'Profit Margin %': Math.round(this.calculateProfitMargin(r) * 100) / 100,
        'Approval Status': r.approval_status || '-',
        'Comments': r.comments || '-'
      }));

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Booking Orders');

      // Auto-size columns
      const colWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      // Generate filename with date
      const today = new Date().toISOString().split('T')[0];
      const filename = `Booking_Orders_${today}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

    } catch (error: any) {
      console.error('Export error:', error);
      alert('Error exporting: ' + error.message);
    } finally {
      this.exporting.set(false);
    }
  }

  // =============================================
  // ✅ NEW: PAYMENT TERMS HELPER
  // =============================================

  getPaymentTermsDisplay(item: FactRevenue): string {
    if (!item.payment_terms) return '-';

    switch (item.payment_terms) {
      case 'Custom':
        return `Custom (${item.payment_custom_percentage || 0}%)`;
      case 'Retainer':
        const start = item.payment_retainer_start ? this.formatDate(item.payment_retainer_start) : '?';
        const end = item.payment_retainer_end ? this.formatDate(item.payment_retainer_end) : '?';
        return `Retainer (${start} - ${end})`;
      default:
        return item.payment_terms;
    }
  }

  getPaymentTermsIcon(terms: string): string {
    const option = this.paymentTermsOptions.find(o => o.value === terms);
    return option?.icon || 'payments';
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

    // Check profit margin for approval status
    const margin = this.calculateProfitMargin(this.currentItem);
    if (margin < 30) {
      this.currentItem.approval_status = 'Pending';
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
  trackByRevenue(index: number, revenue: FactRevenue): any {
    return revenue.id;
  }
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
