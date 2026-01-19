import { Component, inject, computed, signal, AfterViewInit } from '@angular/core'; // الإصلاح هنا
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactRevenue, FactCost, DimProduct } from '../../models/data.models'; // استيراد الموديلات
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-[#f8fafc] min-h-screen font-sans">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-800 tracking-tight">FINANCIAL COMMAND CENTER</h1>
          <p class="text-slate-500 text-sm font-medium">Detailed performance analytics for {{ selectedYear() }}</p>
        </div>

        <div class="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <span class="text-xs font-bold text-slate-400 ml-3">SELECT YEAR</span>
          <select [ngModel]="selectedYear()" (ngModelChange)="onYearChange($event)"
                  class="bg-slate-50 border-0 rounded-xl px-4 py-2 font-bold text-hawy-blue outline-none focus:ring-2 focus:ring-hawy-blue transition-all">
            <option [value]="2024">2024</option>
            <option [value]="2025">2025</option>
            <option [value]="2026">2026</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:border-blue-500 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="p-3 bg-blue-50 rounded-2xl text-blue-600"><span class="material-icons">payments</span></div>
            <span class="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">GROSS</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Revenue</h3>
          <div class="text-2xl font-black text-slate-800 mt-1">{{ stats().revenue | currency:'AED ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:border-red-500 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="p-3 bg-red-50 rounded-2xl text-red-600"><span class="material-icons">shopping_cart</span></div>
            <span class="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded-lg">EXPENSES</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Costs</h3>
          <div class="text-2xl font-black text-slate-800 mt-1">{{ stats().cost | currency:'AED ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:border-emerald-500 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><span class="material-icons">account_balance_wallet</span></div>
            <span class="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">NET PROFIT</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Profit</h3>
          <div class="text-2xl font-black text-slate-800 mt-1" [class.text-red-600]="stats().profit < 0">
            {{ stats().profit | currency:'AED ':'symbol':'1.0-0' }}
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:border-orange-500 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="p-3 bg-orange-50 rounded-2xl text-orange-600"><span class="material-icons">trending_up</span></div>
            <span class="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">MARGIN</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Profit Margin</h3>
          <div class="text-2xl font-black text-slate-800 mt-1">{{ stats().margin }}%</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-8 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div class="h-[400px]"><canvas id="mainChart"></canvas></div>
        </div>
        <div class="lg:col-span-4 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div class="h-[400px]"><canvas id="productProfitChart"></canvas></div>
        </div>
        <div class="lg:col-span-6 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div class="h-[300px]"><canvas id="quarterlyChart"></canvas></div>
        </div>
        <div class="lg:col-span-6 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div class="h-[300px]"><canvas id="rankingChart"></canvas></div>
        </div>
      </div>
    </div>
   `
})
export class DashboardComponent implements AfterViewInit {
  dataService = inject(DataService);
  selectedYear = signal(2025);
  charts: any = {};

  stats = computed(() => {
    const year = this.selectedYear();
    const revs = this.dataService.revenues().filter((r: FactRevenue) => new Date(r.date).getFullYear() === year);
    const costs = this.dataService.costs().filter((c: FactCost) => c.year === year);

    const revenue = revs.reduce((sum: number, r: FactRevenue) => sum + (Number(r.gross_amount) || 0), 0);
    const cost = costs.reduce((sum: number, c: FactCost) => sum + (Number(c.amount) || 0), 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return { revenue, cost, profit, margin };
  });

  ngAfterViewInit() {
    this.initAllCharts();
  }

  onYearChange(year: any) {
    this.selectedYear.set(Number(year));
    this.updateAllCharts();
  }

  initAllCharts() {
    this.charts.main = new Chart('mainChart', {
      type: 'line',
      data: this.getMainChartData(),
      options: { responsive: true, maintainAspectRatio: false }
    });

    this.charts.productProfit = new Chart('productProfitChart', {
      type: 'doughnut',
      data: this.getProductProfitData(),
      options: { responsive: true, maintainAspectRatio: false }
    });

    this.charts.quarterly = new Chart('quarterlyChart', {
      type: 'bar',
      data: this.getQuarterlyData(),
      options: { responsive: true, maintainAspectRatio: false }
    });

    this.charts.ranking = new Chart('rankingChart', {
      type: 'bar',
      data: this.getRankingData(),
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
  }

  updateAllCharts() {
    if (this.charts.main) this.charts.main.data = this.getMainChartData();
    if (this.charts.productProfit) this.charts.productProfit.data = this.getProductProfitData();
    if (this.charts.quarterly) this.charts.quarterly.data = this.getQuarterlyData();
    if (this.charts.ranking) this.charts.ranking.data = this.getRankingData();

    Object.values(this.charts).forEach((c: any) => c?.update());
  }

  getMainChartData() {
    const year = this.selectedYear();
    const revMonths = new Array(12).fill(0);
    const costMonths = new Array(12).fill(0);

    this.dataService.revenues().filter((r: FactRevenue) => new Date(r.date).getFullYear() === year)
      .forEach((r: FactRevenue) => revMonths[new Date(r.date).getMonth()] += Number(r.gross_amount));

    this.dataService.costs().filter((c: FactCost) => c.year === year)
      .forEach((c: FactCost) => costMonths[c.month - 1] += Number(c.amount));

    return {
      labels: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      datasets: [
        { label: 'Revenue', data: revMonths, borderColor: '#3b82f6', tension: 0.4 },
        { label: 'Cost', data: costMonths, borderColor: '#ef4444', tension: 0.4 }
      ]
    };
  }

  getProductProfitData() {
    const year = this.selectedYear();
    const profitMap: any = {};

    this.dataService.products().forEach((p: DimProduct) => {
      const pRev = this.dataService.revenues()
        .filter((r: FactRevenue) => r.product_id === p.product_id && new Date(r.date).getFullYear() === year)
        .reduce((s: number, r: FactRevenue) => s + Number(r.gross_amount), 0);

      const pCost = this.dataService.costs()
        .filter((c: FactCost) => c.product_id === p.product_id && c.year === year)
        .reduce((s: number, c: FactCost) => s + Number(c.amount), 0);

      const profit = pRev - pCost;
      if (profit !== 0) profitMap[p.product_name] = profit;
    });

    return {
      labels: Object.keys(profitMap),
      datasets: [{
        data: Object.values(profitMap),
        backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4']
      }]
    };
  }

  getQuarterlyData() {
    const year = this.selectedYear();
    const qProfits = new Array(4).fill(0);

    for (let m = 0; m < 12; m++) {
      const qIndex = Math.floor(m / 3);
      const rev = this.dataService.revenues()
        .filter((r: FactRevenue) => new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === m)
        .reduce((s: number, r: FactRevenue) => s + Number(r.gross_amount), 0);

      const cost = this.dataService.costs()
        .filter((c: FactCost) => c.year === year && c.month === (m + 1))
        .reduce((s: number, c: FactCost) => s + Number(c.amount), 0);

      qProfits[qIndex] += (rev - cost);
    }

    return {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{
        label: 'Net Profit',
        data: qProfits,
        backgroundColor: qProfits.map((v: number) => v >= 0 ? '#10b981' : '#ef4444')
      }]
    };
  }

  getRankingData() {
    const year = this.selectedYear();
    const ranking = this.dataService.products().map((p: DimProduct) => ({
      name: p.product_name,
      total: this.dataService.revenues()
        .filter((r: FactRevenue) => r.product_id === p.product_id && new Date(r.date).getFullYear() === year)
        .reduce((s: number, r: FactRevenue) => s + Number(r.gross_amount), 0)
    })).sort((a: any, b: any) => b.total - a.total).slice(0, 5);

    return {
      labels: ranking.map((r: any) => r.name),
      datasets: [{
        label: 'Gross Revenue',
        data: ranking.map((r: any) => r.total),
        backgroundColor: '#6366f1'
      }]
    };
  }
}
