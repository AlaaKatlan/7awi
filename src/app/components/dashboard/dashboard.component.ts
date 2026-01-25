import { Component, inject, computed, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactRevenue, FactCost, DimProduct } from '../../models/data.models';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-800">

      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Financial Insight Engine</h1>
          <p class="text-slate-500 text-sm font-medium">Comprehensive Multi-Year Performance Analytics</p>
        </div>
        <div class="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <span class="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">Focused Year</span>
          <select [ngModel]="selectedYear()" (ngModelChange)="onYearChange($event)"
                  class="bg-slate-50 border-0 rounded-xl px-4 py-2 font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
            @for (year of yearsList(); track year) {
              <option [value]="year">{{ year }}</option>
            }
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-blue-500 transition-all">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-blue-50 rounded-2xl text-blue-600"><span class="material-icons">payments</span></div>
            <span class="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-lg uppercase italic">Revenue</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Gross</h3>
          <div class="text-2xl font-black mt-1">{{ stats().revenue | currency:'USD ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-rose-500 transition-all">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-rose-50 rounded-2xl text-rose-600"><span class="material-icons">shopping_cart</span></div>
            <span class="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-1 rounded-lg uppercase italic">Expenses</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Cost</h3>
          <div class="text-2xl font-black mt-1">{{ stats().cost | currency:'USD ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-emerald-500 transition-all">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><span class="material-icons">account_balance_wallet</span></div>
            <span class="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg uppercase italic">Profit</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Profit</h3>
          <div class="text-2xl font-black" [class.text-rose-600]="stats().profit < 0">{{ stats().profit | currency:'USD ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-amber-500 transition-all">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-amber-50 rounded-2xl text-amber-600"><span class="material-icons">trending_up</span></div>
            <span class="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-lg uppercase italic">Efficiency</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Gross Margin</h3>
          <div class="text-2xl font-black mt-1">{{ stats().margin }}%</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

        <div class="lg:col-span-12 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 flex items-center gap-2 italic uppercase text-sm tracking-widest">
             <span class="w-2 h-6 bg-indigo-600 rounded-full"></span> Monthly Revenue Trends (Year-over-Year)
           </h3>
           <div class="h-[350px]"><canvas id="allYearsMonthlyChart"></canvas></div>
        </div>

        <div class="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 flex items-center gap-2 italic uppercase text-sm tracking-widest">
             <span class="w-2 h-6 bg-blue-600 rounded-full"></span> Monthly Cash Flow ({{selectedYear()}})
           </h3>
           <div class="h-[300px]"><canvas id="mainChart"></canvas></div>
        </div>

        <div class="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
           <h3 class="font-black text-slate-800 mb-6 italic uppercase text-sm tracking-widest">Geographical Mix</h3>
           <div class="h-[300px]"><canvas id="geoChart"></canvas></div>
        </div>

        <div class="lg:col-span-12 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 flex items-center gap-2 italic uppercase text-sm tracking-widest">
             <span class="w-2 h-6 bg-amber-500 rounded-full"></span> Performance vs Annual Target
           </h3>
           <div class="h-[350px]"><canvas id="targetVsActualChart"></canvas></div>
        </div>

        <div class="lg:col-span-12 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 flex items-center gap-2 italic uppercase text-sm tracking-widest">
             <span class="w-2 h-6 bg-slate-900 rounded-full"></span> Annual Revenue Growth History
           </h3>
           <div class="h-[300px]"><canvas id="multiYearChart"></canvas></div>
        </div>

        <div class="lg:col-span-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 italic uppercase text-sm tracking-widest text-center">Product Contribution</h3>
           <div class="h-[300px]"><canvas id="productProfitChart"></canvas></div>
        </div>

        <div class="lg:col-span-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 italic uppercase text-sm tracking-widest text-center">Product Profitability Index</h3>
           <div class="h-[300px]"><canvas id="profitabilityChart"></canvas></div>
        </div>
      </div>

      <div class="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 mb-10">
        <div class="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-600 rounded-xl"><span class="material-icons text-sm">analytics</span></div>
            <h3 class="font-black tracking-widest uppercase text-sm">Annual Financial Matrix</h3>
          </div>
          <span class="text-[10px] font-black opacity-50 uppercase tracking-widest">Values in USD</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                <th class="p-5 sticky left-0 bg-slate-50 z-10 min-w-[180px]">Category / Product</th>
                @for (m of monthNames; track m) {
                  <th class="p-3 text-center">{{ m }}</th>
                }
                <th class="p-3 text-center bg-blue-50 text-blue-700">Total</th>
                <th class="p-3 text-center bg-amber-50 text-amber-700">Target</th>
                <th class="p-3 text-center">Ach %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (p of summaryData(); track p.name) {
                <tr class="hover:bg-blue-50/30 transition-all duration-200 group">
                  <td class="p-5 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 text-xs">
                    <div class="flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      {{ p.name }}
                    </div>
                  </td>
                  @for (val of p.monthlyValues; track $index) {
                    <td class="p-3 text-center text-[10px] font-medium" [class.text-slate-300]="val === 0">
                      {{ val > 0 ? (val | number:'1.0-0') : '—' }}
                    </td>
                  }
                  <td class="p-3 text-center font-black text-blue-600 bg-blue-50/20 italic text-[10px]">{{ p.total | number:'1.0-0' }}</td>
                  <td class="p-3 text-center font-bold text-amber-600 bg-amber-50/20 text-[10px]">{{ p.target | number:'1.0-0' }}</td>
                  <td class="p-3 text-center">
                    <span [class]="p.achievement >= 100 ? 'text-emerald-500' : 'text-rose-500'" class="font-black text-[10px]">
                      {{ p.achievement | number:'1.0-0' }}%
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements AfterViewInit {
  private dataService = inject(DataService);
  selectedYear = signal(new Date().getFullYear());
  charts: any = {};
  monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  yearsList = computed(() => {
    const dbYears = this.dataService.revenues().map(r => new Date(r.date).getFullYear());
    return Array.from(new Set([...dbYears, new Date().getFullYear()])).sort((a, b) => b - a);
  });

  stats = computed(() => {
    const year = this.selectedYear();
    const revs = this.dataService.revenues().filter(r => new Date(r.date).getFullYear() === year);
    const costs = this.dataService.costs().filter(c => c.year === year);
    const revenue = revs.reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);
    const cost = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { revenue, cost, profit, margin };
  });

  summaryData = computed(() => {
    const year = this.selectedYear();
    const products = this.dataService.products();
    const revenues = this.dataService.revenues();
    const targets = this.dataService.targets();

    return products.map(p => {
      const monthlyValues = Array.from({ length: 12 }, (_, m) =>
        revenues.filter(r => r.product_id === p.product_id && new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === m)
                .reduce((s, r) => s + Number(r.gross_amount), 0)
      );
      const total = monthlyValues.reduce((a, b) => a + b, 0);
      const targetObj = targets.find(t => t.product_id === p.product_id && t.year === year);
      const target = targetObj ? Number(targetObj.annual_target) : 0;
      const achievement = target > 0 ? (total / target) * 100 : 0;
      return { name: p.product_name, monthlyValues, total, target, achievement, product_id: p.product_id };
    });
  });

  totals = computed(() => {
    const data = this.summaryData();
    const monthlyRevenue = Array.from({ length: 12 }, (_, m) => data.reduce((s, p) => s + p.monthlyValues[m], 0));
    const monthlyCost = Array.from({ length: 12 }, (_, m) =>
      this.dataService.costs().filter(c => c.year === this.selectedYear() && c.month === (m + 1)).reduce((s, c) => s + Number(c.amount), 0)
    );
    const monthlyNet = monthlyRevenue.map((rev, i) => rev - monthlyCost[i]);
    return { monthlyRevenue, monthlyCost, monthlyNet };
  });

  ngAfterViewInit() {
    this.initCharts();
  }

  onYearChange(year: any) {
    this.selectedYear.set(Number(year));
    this.updateCharts();
  }

  private initCharts() {
    // 1. Line Chart: Monthly Cash Flow (Current Year)
    this.charts.main = new Chart('mainChart', {
      type: 'line',
      data: this.getMainChartData(),
      options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Donut: Product Contribution
    this.charts.donut = new Chart('productProfitChart', {
      type: 'doughnut',
      data: this.getDonutData(),
      options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } } } }
    });

    // 3. Bar: Performance vs Target
    this.charts.targetVsActual = new Chart('targetVsActualChart', {
      type: 'bar',
      data: this.getTargetVsActualData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => '$' + v.toLocaleString() } } }
      }
    });

    // 4. Bar: Multi-Year Annual Growth
    this.charts.multiYear = new Chart('multiYearChart', {
      type: 'bar',
      data: this.getMultiYearData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => '$' + v.toLocaleString() } } }
      }
    });

    // 5. Pie: Geographical Mix
    this.charts.geo = new Chart('geoChart', {
      type: 'pie',
      data: this.getGeoData(),
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // 6. Horizontal Bar: Profitability Analysis
    this.charts.profitability = new Chart('profitabilityChart', {
      type: 'bar',
      data: this.getProfitabilityData(),
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });

    // 7. NEW Line Chart: Monthly Trends (Year-over-Year)
    this.charts.allYearsMonthly = new Chart('allYearsMonthlyChart', {
        type: 'line',
        data: this.getAllYearsMonthlyData(),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { callback: (v) => '$' + v.toLocaleString() } }
          }
        }
      });
  }

  private updateCharts() {
    if (this.charts.main) this.charts.main.data = this.getMainChartData();
    if (this.charts.donut) this.charts.donut.data = this.getDonutData();
    if (this.charts.targetVsActual) this.charts.targetVsActual.data = this.getTargetVsActualData();
    if (this.charts.multiYear) this.charts.multiYear.data = this.getMultiYearData();
    if (this.charts.geo) this.charts.geo.data = this.getGeoData();
    if (this.charts.profitability) this.charts.profitability.data = this.getProfitabilityData();
    if (this.charts.allYearsMonthly) this.charts.allYearsMonthly.data = this.getAllYearsMonthlyData();
    Object.values(this.charts).forEach((c: any) => c?.update());
  }

  private getMainChartData() {
    return {
      labels: this.monthNames,
      datasets: [
        { label: 'Revenue', data: this.totals().monthlyRevenue, borderColor: '#2563eb', fill: true, backgroundColor: 'rgba(37, 99, 235, 0.05)', tension: 0.4 },
        { label: 'Cost', data: this.totals().monthlyCost, borderColor: '#f43f5e', borderDash: [5, 5], tension: 0.4 }
      ]
    };
  }

  private getDonutData() {
    const data = this.summaryData().filter(p => p.total > 0).sort((a,b) => b.total - a.total);
    return {
      labels: data.map(p => p.name),
      datasets: [{
        data: data.map(p => p.total),
        backgroundColor: ['#1e3a8a', '#2563eb', '#60a5fa', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']
      }]
    };
  }

  private getTargetVsActualData() {
    const data = this.summaryData().filter(p => p.total > 0 || p.target > 0);
    return {
      labels: data.map(p => p.name),
      datasets: [
        { label: 'Annual Target', data: data.map(p => p.target), backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 6 },
        { label: 'Actual Revenue', data: data.map(p => p.total), backgroundColor: '#2563eb', borderRadius: 6 }
      ]
    };
  }

  private getMultiYearData() {
    const years = [...this.yearsList()].reverse();
    const data = years.map(year => {
      return this.dataService.revenues()
        .filter(r => new Date(r.date).getFullYear() === year)
        .reduce((sum, r) => sum + Number(r.gross_amount), 0);
    });

    return {
      labels: years.map(String),
      datasets: [{
        label: 'Annual Revenue',
        data: data,
        backgroundColor: years.map(y => y === this.selectedYear() ? '#1e3a8a' : '#e2e8f0'),
        borderRadius: 10
      }]
    };
  }

  private getGeoData() {
    const revs = this.dataService.revenues().filter(r => new Date(r.date).getFullYear() === this.selectedYear());
    const uae = revs.filter(r => r.country === 'UAE').reduce((s, r) => s + Number(r.gross_amount), 0);
    const ksa = revs.filter(r => r.country === 'KSA').reduce((s, r) => s + Number(r.gross_amount), 0);

    return {
      labels: ['UAE', 'KSA'],
      datasets: [{
        data: [uae, ksa],
        backgroundColor: ['#10b981', '#f59e0b'],
        hoverOffset: 15
      }]
    };
  }

  private getProfitabilityData() {
    const year = this.selectedYear();
    const data = this.dataService.products().map(p => {
      const rev = this.dataService.revenues()
        .filter(r => r.product_id === p.product_id && new Date(r.date).getFullYear() === year)
        .reduce((s, r) => s + Number(r.gross_amount), 0);
      const cost = this.dataService.costs()
        .filter(c => c.product_id === p.product_id && c.year === year)
        .reduce((s, c) => s + Number(c.amount), 0);

      const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
      return { name: p.product_name, margin };
    }).filter(x => x.margin !== 0).sort((a,b) => b.margin - a.margin);

    return {
      labels: data.map(d => d.name),
      datasets: [{
        label: 'Margin %',
        data: data.map(d => d.margin),
        backgroundColor: data.map(d => d.margin > 0 ? '#10b981' : '#f43f5e'),
        borderRadius: 5
      }]
    };
  }

  private getAllYearsMonthlyData() {
    const years = [...this.yearsList()].reverse();
    const colors = ['#1e3a8a', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

    const datasets = years.map((year, idx) => {
      const monthlyData = Array.from({ length: 12 }, (_, m) => {
        return this.dataService.revenues()
          .filter(r => new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === m)
          .reduce((sum, r) => sum + Number(r.gross_amount), 0);
      });

      return {
        label: `Year ${year}`,
        data: monthlyData,
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '10',
        tension: 0.4,
        borderWidth: year === this.selectedYear() ? 4 : 2,
        pointRadius: year === this.selectedYear() ? 5 : 2,
        fill: false
      };
    });

    return {
      labels: this.monthNames,
      datasets: datasets
    };
  }
}
