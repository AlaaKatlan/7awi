import { Component, inject, computed, signal, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';

declare var Chart: any;

interface ClientPerformance {
  client_id: number;
  client_name: string;
  country: string;
  account_manager_id?: number;
  account_manager_name: string;
  previous_year_spend: number;
  ytd_spend: number;
  current_month_spend: number;
  previous_month_spend: number;
  current_quarter_spend: number;
  previous_quarter_spend: number;
  previous_year_same_period_spend: number;
  mom_change: number;  // Month over Month %
  qoq_change: number;  // Quarter over Quarter %
  yoy_change: number;  // Year over Year %
}

interface DepartmentSummary {
  product_id: number;
  product_name: string;
  total_clients: number;
  total_ytd_spend: number;
  total_previous_year_spend: number;
  avg_mom_change: number;
  avg_qoq_change: number;
  avg_yoy_change: number;
}

@Component({
  selector: 'app-department-performance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './department-performance.component.html'
})
export class DepartmentPerformanceComponent implements OnInit, AfterViewInit, OnDestroy {
  dataService = inject(DataService);
  authService = inject(AuthService);

  // Current date info
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  currentQuarter = Math.ceil(this.currentMonth / 3);

  // Filters
  selectedDepartment = signal<number | null>(null);
  selectedCountry = signal<string>('ALL');
  searchText = signal('');
  sortColumn = signal<string>('ytd_spend');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Charts
  private charts: any[] = [];
  private chartsInitialized = false;

  // Computed: Get all departments
  departments = computed(() => {
    return this.dataService.products()
      .filter(p => p.department_type === 'Revenue')
      .sort((a, b) => a.product_name.localeCompare(b.product_name));
  });

  // Computed: Get unique countries
  countries = computed(() => {
    const countrySet = new Set(this.dataService.clients().map(c => c.country).filter(Boolean));
    return Array.from(countrySet).sort();
  });

  // Computed: Client performance data
  clientPerformance = computed((): ClientPerformance[] => {
    const revenues = this.dataService.revenues();
    const clients = this.dataService.clients();
    const employees = this.dataService.employees();
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const currentQuarter = Math.ceil(currentMonth / 3);
    const previousQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
    const previousQuarterYear = currentQuarter === 1 ? currentYear - 1 : currentYear;

    // Group revenues by client
    const clientMap = new Map<number, ClientPerformance>();

    clients.forEach(client => {
      // Get account manager name
      const accountManager = employees.find(e => e.employee_id === client.account_manager_id);
      
      // Filter revenues for this client
      const clientRevenues = revenues.filter(r => r.client_id === client.client_id);

      // Calculate spends
      let previousYearSpend = 0;
      let ytdSpend = 0;
      let currentMonthSpend = 0;
      let previousMonthSpend = 0;
      let currentQuarterSpend = 0;
      let previousQuarterSpend = 0;
      let previousYearSamePeriodSpend = 0;

      clientRevenues.forEach(rev => {
        const revDate = new Date(rev.date);
        const revYear = revDate.getFullYear();
        const revMonth = revDate.getMonth() + 1;
        const revQuarter = Math.ceil(revMonth / 3);
        const amount = rev.gross_amount || 0;

        // Previous year total
        if (revYear === currentYear - 1) {
          previousYearSpend += amount;
        }

        // YTD (current year)
        if (revYear === currentYear) {
          ytdSpend += amount;
        }

        // Current month
        if (revYear === currentYear && revMonth === currentMonth) {
          currentMonthSpend += amount;
        }

        // Previous month
        if (revYear === previousMonthYear && revMonth === previousMonth) {
          previousMonthSpend += amount;
        }

        // Current quarter
        if (revYear === currentYear && revQuarter === currentQuarter) {
          currentQuarterSpend += amount;
        }

        // Previous quarter
        if (revYear === previousQuarterYear && revQuarter === previousQuarter) {
          previousQuarterSpend += amount;
        }

        // Previous year same period (YTD comparison)
        if (revYear === currentYear - 1 && revMonth <= currentMonth) {
          previousYearSamePeriodSpend += amount;
        }
      });

      // Calculate percentage changes
      const momChange = previousMonthSpend > 0 
        ? ((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100 
        : (currentMonthSpend > 0 ? 100 : 0);

      const qoqChange = previousQuarterSpend > 0 
        ? ((currentQuarterSpend - previousQuarterSpend) / previousQuarterSpend) * 100 
        : (currentQuarterSpend > 0 ? 100 : 0);

      const yoyChange = previousYearSamePeriodSpend > 0 
        ? ((ytdSpend - previousYearSamePeriodSpend) / previousYearSamePeriodSpend) * 100 
        : (ytdSpend > 0 ? 100 : 0);

      // Only include clients with some activity
      if (previousYearSpend > 0 || ytdSpend > 0) {
        clientMap.set(client.client_id, {
          client_id: client.client_id,
          client_name: client.client_name,
          country: client.country || '-',
          account_manager_id: client.account_manager_id,
          account_manager_name: accountManager?.name || '-',
          previous_year_spend: previousYearSpend,
          ytd_spend: ytdSpend,
          current_month_spend: currentMonthSpend,
          previous_month_spend: previousMonthSpend,
          current_quarter_spend: currentQuarterSpend,
          previous_quarter_spend: previousQuarterSpend,
          previous_year_same_period_spend: previousYearSamePeriodSpend,
          mom_change: Math.round(momChange * 100) / 100,
          qoq_change: Math.round(qoqChange * 100) / 100,
          yoy_change: Math.round(yoyChange * 100) / 100
        });
      }
    });

    return Array.from(clientMap.values());
  });

  // Computed: Filtered and sorted performance data
  filteredPerformance = computed(() => {
    let data = this.clientPerformance();

    // Filter by department if selected
    if (this.selectedDepartment()) {
      const deptClients = this.dataService.clients()
        .filter(c => c.product_id === this.selectedDepartment())
        .map(c => c.client_id);
      data = data.filter(p => deptClients.includes(p.client_id));
    }

    // Filter by country
    if (this.selectedCountry() !== 'ALL') {
      data = data.filter(p => p.country === this.selectedCountry());
    }

    // Filter by search
    const search = this.searchText().toLowerCase();
    if (search) {
      data = data.filter(p => 
        p.client_name.toLowerCase().includes(search) ||
        p.account_manager_name.toLowerCase().includes(search) ||
        p.country.toLowerCase().includes(search)
      );
    }

    // Sort
    const column = this.sortColumn();
    const direction = this.sortDirection();
    data = [...data].sort((a, b) => {
      let aVal = (a as any)[column];
      let bVal = (b as any)[column];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  });

  // Computed: Department summaries (respects country filter)
  departmentSummaries = computed((): DepartmentSummary[] => {
    const performance = this.clientPerformance();
    const products = this.dataService.products().filter(p => p.department_type === 'Revenue');
    const clients = this.dataService.clients();
    const selectedCountry = this.selectedCountry();

    return products.map(product => {
      let deptClients = clients
        .filter(c => c.product_id === product.product_id)
        .map(c => c.client_id);
      
      let deptPerformance = performance.filter(p => deptClients.includes(p.client_id));
      
      // Apply country filter to summaries too
      if (selectedCountry !== 'ALL') {
        deptPerformance = deptPerformance.filter(p => p.country === selectedCountry);
      }

      const totalYtd = deptPerformance.reduce((sum, p) => sum + p.ytd_spend, 0);
      const totalPrevYear = deptPerformance.reduce((sum, p) => sum + p.previous_year_spend, 0);
      const avgMom = deptPerformance.length > 0 
        ? deptPerformance.reduce((sum, p) => sum + p.mom_change, 0) / deptPerformance.length 
        : 0;
      const avgQoq = deptPerformance.length > 0 
        ? deptPerformance.reduce((sum, p) => sum + p.qoq_change, 0) / deptPerformance.length 
        : 0;
      const avgYoy = deptPerformance.length > 0 
        ? deptPerformance.reduce((sum, p) => sum + p.yoy_change, 0) / deptPerformance.length 
        : 0;

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        total_clients: deptPerformance.length,
        total_ytd_spend: totalYtd,
        total_previous_year_spend: totalPrevYear,
        avg_mom_change: Math.round(avgMom * 100) / 100,
        avg_qoq_change: Math.round(avgQoq * 100) / 100,
        avg_yoy_change: Math.round(avgYoy * 100) / 100
      };
    }).filter(d => d.total_clients > 0).sort((a, b) => b.total_ytd_spend - a.total_ytd_spend);
  });

  // Stats
  totalClients = computed(() => this.filteredPerformance().length);
  totalYtdSpend = computed(() => this.filteredPerformance().reduce((sum, p) => sum + p.ytd_spend, 0));
  totalPreviousYearSpend = computed(() => this.filteredPerformance().reduce((sum, p) => sum + p.previous_year_spend, 0));
  avgMomChange = computed(() => {
    const data = this.filteredPerformance();
    return data.length > 0 ? data.reduce((sum, p) => sum + p.mom_change, 0) / data.length : 0;
  });
  avgYoyChange = computed(() => {
    const data = this.filteredPerformance();
    return data.length > 0 ? data.reduce((sum, p) => sum + p.yoy_change, 0) / data.length : 0;
  });

  ngOnInit() {
    this.loadChartLibrary();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initializeCharts(), 500);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  private loadChartLibrary() {
    if (!document.getElementById('chartjs')) {
      const script = document.createElement('script');
      script.id = 'chartjs';
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => setTimeout(() => this.initializeCharts(), 100);
      document.head.appendChild(script);
    }
  }

  private destroyCharts() {
    this.charts.forEach(chart => {
      if (chart && chart.destroy) {
        chart.destroy();
      }
    });
    this.charts = [];
  }

  private initializeCharts() {
    if (typeof Chart === 'undefined') return;
    this.destroyCharts();

    // Check if we have any active filters
    const hasFilters = this.selectedDepartment() || this.selectedCountry() !== 'ALL' || this.searchText();

    // Get data based on filters
    const filteredData = this.filteredPerformance();
    const allPerformanceData = this.clientPerformance();
    const summaries = this.departmentSummaries();
    
    // Use all data for charts when no filters, filtered data when filters active
    const chartData = hasFilters ? filteredData : allPerformanceData;

    // Department Comparison Bar Chart - always uses summaries (respects country filter)
    const deptCtx = document.getElementById('deptComparisonChart') as HTMLCanvasElement;
    if (deptCtx) {
      this.charts.push(new Chart(deptCtx, {
        type: 'bar',
        data: {
          labels: summaries.map(d => d.product_name),
          datasets: [
            {
              label: 'Previous Year',
              data: summaries.map(d => d.total_previous_year_spend),
              backgroundColor: 'rgba(148, 163, 184, 0.8)',
              borderRadius: 8
            },
            {
              label: 'YTD ' + this.currentYear,
              data: summaries.map(d => d.total_ytd_spend),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Department Revenue Comparison' + (this.selectedCountry() !== 'ALL' ? ' (' + this.selectedCountry() + ')' : ''), font: { size: 14, weight: 'bold' } }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value: number) => '$' + (value / 1000).toFixed(0) + 'K'
              }
            }
          }
        }
      }));
    }

    // YoY Change Doughnut Chart
    const yoyCtx = document.getElementById('yoyChangeChart') as HTMLCanvasElement;
    if (yoyCtx) {
      const growing = chartData.filter(p => p.yoy_change > 0).length;
      const declining = chartData.filter(p => p.yoy_change < 0).length;
      const stable = chartData.filter(p => p.yoy_change === 0).length;

      this.charts.push(new Chart(yoyCtx, {
        type: 'doughnut',
        data: {
          labels: ['Growing (' + growing + ')', 'Declining (' + declining + ')', 'Stable (' + stable + ')'],
          datasets: [{
            data: [growing, declining, stable],
            backgroundColor: [
              'rgba(16, 185, 129, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(148, 163, 184, 0.8)'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            title: { display: true, text: 'Client YoY Growth Distribution (' + chartData.length + ' clients' + (hasFilters ? ' - Filtered' : '') + ')', font: { size: 14, weight: 'bold' } }
          }
        }
      }));
    }

    // Top Clients Bar Chart
    const topCtx = document.getElementById('topClientsChart') as HTMLCanvasElement;
    if (topCtx) {
      const topClients = [...chartData]
        .sort((a, b) => b.ytd_spend - a.ytd_spend)
        .slice(0, 10);

      this.charts.push(new Chart(topCtx, {
        type: 'bar',
        data: {
          labels: topClients.map(c => c.client_name.length > 15 ? c.client_name.substring(0, 15) + '...' : c.client_name),
          datasets: [{
            label: 'YTD Spend',
            data: topClients.map(c => c.ytd_spend),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 8
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Top 10 Clients by YTD Spend' + (hasFilters ? ' (Filtered)' : ''), font: { size: 14, weight: 'bold' } }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                callback: (value: number) => '$' + (value / 1000).toFixed(0) + 'K'
              }
            }
          }
        }
      }));
    }

    // Monthly Trend Line Chart - respects department & country filters
    const trendCtx = document.getElementById('monthlyTrendChart') as HTMLCanvasElement;
    if (trendCtx) {
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenues = this.dataService.revenues();
      
      // Check if we need to filter or show all data
      const hasFilters = this.selectedDepartment() || this.selectedCountry() !== 'ALL' || this.searchText();
      
      // Get client IDs that match current filters (only if filters are active)
      let filteredClientIds: number[] = [];
      if (hasFilters) {
        filteredClientIds = filteredData.map(p => p.client_id);
      }
      
      const currentYearData = new Array(12).fill(0);
      const previousYearData = new Array(12).fill(0);

      revenues.forEach(rev => {
        // If filters are active, only include if client is in filtered list
        if (hasFilters && !filteredClientIds.includes(rev.client_id || 0)) return;
        
        const date = new Date(rev.date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const amount = rev.gross_amount || 0;

        if (year === this.currentYear) {
          currentYearData[month] += amount;
        } else if (year === this.currentYear - 1) {
          previousYearData[month] += amount;
        }
      });

      const chartTitle = hasFilters 
        ? 'Monthly Revenue Trend (Filtered)' 
        : 'Monthly Revenue Trend (All Data)';

      this.charts.push(new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: monthLabels.slice(0, this.currentMonth),
          datasets: [
            {
              label: String(this.currentYear - 1),
              data: previousYearData.slice(0, this.currentMonth),
              borderColor: 'rgba(148, 163, 184, 1)',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: String(this.currentYear),
              data: currentYearData.slice(0, this.currentMonth),
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: chartTitle, font: { size: 14, weight: 'bold' } }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value: number) => '$' + (value / 1000).toFixed(0) + 'K'
              }
            }
          }
        }
      }));
    }
    
    this.chartsInitialized = true;
  }

  // Sorting
  sort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn() !== column) return 'unfold_more';
    return this.sortDirection() === 'asc' ? 'expand_less' : 'expand_more';
  }

  // Formatting helpers
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercent(value: number): string {
    const prefix = value > 0 ? '+' : '';
    return prefix + value.toFixed(1) + '%';
  }

  getChangeClass(value: number): string {
    if (value > 0) return 'text-emerald-600 bg-emerald-50';
    if (value < 0) return 'text-red-600 bg-red-50';
    return 'text-slate-500 bg-slate-50';
  }

  getChangeIcon(value: number): string {
    if (value > 0) return 'trending_up';
    if (value < 0) return 'trending_down';
    return 'trending_flat';
  }

  // Helper to get selected department name (can't use arrow function in template)
  getSelectedDepartmentName(): string {
    const deptId = this.selectedDepartment();
    if (!deptId) return '';
    const dept = this.departments().find(d => d.product_id === deptId);
    return dept?.product_name || '';
  }

  // Export to Excel
  exportToExcel() {
    const data = this.filteredPerformance();
    
    // Create CSV content
    const headers = [
      'Client Name',
      'Country',
      'Account Manager',
      'Previous Year Spend',
      'YTD Spend',
      'MoM %',
      'QoQ %',
      'YoY %'
    ];

    const rows = data.map(p => [
      p.client_name,
      p.country,
      p.account_manager_name,
      p.previous_year_spend,
      p.ytd_spend,
      p.mom_change,
      p.qoq_change,
      p.yoy_change
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(val => typeof val === 'string' && val.includes(',') ? `"${val}"` : val).join(',') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Department_Performance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  refreshCharts() {
    setTimeout(() => this.initializeCharts(), 100);
  }
}
