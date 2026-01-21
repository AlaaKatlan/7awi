import { Component, inject, computed, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactRevenue, FactCost, DimProduct, FactTarget } from '../../models/data.models';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-800">

      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 class="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Financial Command Center</h1>
        <div class="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <span class="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">Fiscal Year</span>
          <select [ngModel]="selectedYear()" (ngModelChange)="onYearChange($event)"
                  class="bg-slate-50 border-0 rounded-xl px-4 py-2 font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
            @for (year of yearsList(); track year) {
              <option [value]="year">{{ year }}</option>
            }
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-blue-500 transition-all duration-300">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-blue-50 rounded-2xl text-blue-600"><span class="material-icons">payments</span></div>
            <span class="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-lg uppercase">Gross</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Revenue</h3>
          <div class="text-2xl font-black mt-1">{{ stats().revenue | currency:'$ ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-rose-500 transition-all duration-300">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-rose-50 rounded-2xl text-rose-600"><span class="material-icons">shopping_cart</span></div>
            <span class="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-1 rounded-lg uppercase">Expenses</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Costs</h3>
          <div class="text-2xl font-black mt-1">{{ stats().cost | currency:'$ ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-emerald-500 transition-all duration-300">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><span class="material-icons">account_balance_wallet</span></div>
            <span class="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg uppercase">Net</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Profit</h3>
          <div class="text-2xl font-black" [class.text-rose-600]="stats().profit < 0">{{ stats().profit | currency:'$ ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-amber-500 transition-all duration-300">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-amber-50 rounded-2xl text-amber-600"><span class="material-icons">trending_up</span></div>
            <span class="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-lg uppercase">Ratio</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Profit Margin</h3>
          <div class="text-2xl font-black mt-1">{{ stats().margin }}%</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div class="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 flex items-center gap-2 italic uppercase text-sm tracking-widest"><span class="w-2 h-6 bg-blue-600 rounded-full"></span> Monthly Performance</h3>
           <div class="h-[300px]"><canvas id="mainChart"></canvas></div>
        </div>

        <div class="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 text-center italic uppercase text-sm tracking-widest">Revenue Mix</h3>
           <div class="h-[300px]"><canvas id="productProfitChart"></canvas></div>
        </div>

        <div class="lg:col-span-12 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 flex items-center gap-2 italic uppercase text-sm tracking-widest">
             <span class="w-2 h-6 bg-amber-500 rounded-full"></span> Performance vs Annual Target
           </h3>
           <div class="h-[350px]"><canvas id="targetVsActualChart"></canvas></div>
        </div>
      </div>

      <div class="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 mb-10">
        <div class="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-600 rounded-xl"><span class="material-icons text-sm">analytics</span></div>
            <h3 class="font-black tracking-widest uppercase text-sm">Annual Financial Matrix</h3>
          </div>
          <span class="text-[10px] font-black opacity-50 uppercase tracking-widest">AED Values</span>
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
                  <td class="p-5 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10">
                    <div class="flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      {{ p.name }}
                    </div>
                  </td>
                  @for (val of p.monthlyValues; track $index) {
                    <td class="p-3 text-center text-[11px] font-medium" [class.text-slate-300]="val === 0">
                      {{ val > 0 ? (val | number:'1.0-0') : '—' }}
                    </td>
                  }
                  <td class="p-3 text-center font-black text-blue-600 bg-blue-50/20 italic">{{ p.total | number:'1.0-0' }}</td>
                  <td class="p-3 text-center font-bold text-amber-600 bg-amber-50/20">{{ p.target | number:'1.0-0' }}</td>
                  <td class="p-3 text-center">
                    <span [class]="p.achievement >= 100 ? 'text-emerald-500' : 'text-rose-500'" class="font-black text-[11px]">
                      {{ p.achievement | number:'1.0-0' }}%
                    </span>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot class="bg-slate-900 text-white font-bold text-[11px]">
              <tr>
                <td class="p-5 uppercase tracking-widest opacity-60">Revenue</td>
                @for (rev of totals().monthlyRevenue; track $index) {
                  <td class="p-3 text-center border-l border-slate-800">{{ rev | number:'1.0-0' }}</td>
                }
                <td colspan="3" class="bg-slate-800"></td>
              </tr>
              <tr class="text-rose-400 border-t border-slate-800">
                <td class="p-5 uppercase tracking-widest opacity-80">Expenses</td>
                @for (cst of totals().monthlyCost; track $index) {
                  <td class="p-3 text-center border-l border-slate-800">({{ cst | number:'1.0-0' }})</td>
                }
                <td colspan="3" class="bg-slate-800"></td>
              </tr>
              <tr class="bg-blue-600 text-white font-black text-xs">
                <td class="p-5 rounded-bl-3xl uppercase tracking-widest">Net Profit</td>
                @for (net of totals().monthlyNet; track $index) {
                  <td class="p-3 text-center border-l border-blue-500">{{ net | number:'1.0-0' }}</td>
                }
                <td colspan="3" class="rounded-br-3xl bg-blue-700"></td>
              </tr>
            </tfoot>
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
      return { name: p.product_name, monthlyValues, total, target, achievement };
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
    // 1. Line Chart
    this.charts.main = new Chart('mainChart', {
      type: 'line',
      data: this.getMainChartData(),
      options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Donut Chart (Fixed Mix)
    this.charts.donut = new Chart('productProfitChart', {
      type: 'doughnut',
      data: this.getDonutData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } }
        }
      }
    });

    // 3. Performance Bar Chart (The Fix)
    this.charts.targetVsActual = new Chart('targetVsActualChart', {
      type: 'bar',
      data: this.getTargetVsActualData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
             callbacks: {
               label: (c) => `${c.dataset.label}: ${c.raw?.toLocaleString()} AED`
             }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => v.toLocaleString() }
          }
        }
      }
    });
  }

  private updateCharts() {
    if (this.charts.main) this.charts.main.data = this.getMainChartData();
    if (this.charts.donut) this.charts.donut.data = this.getDonutData();
    if (this.charts.targetVsActual) this.charts.targetVsActual.data = this.getTargetVsActualData();
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
        backgroundColor: ['#1e3a8a', '#2563eb', '#60a5fa', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'],
        borderWidth: 2
      }]
    };
  }

  private getTargetVsActualData() {
    // تصفية المنتجات التي تملك إيرادات أو أهداف للسنة المختارة لضمان بقاء الشارت نظيفاً
    const data = this.summaryData().filter(p => p.total > 0 || p.target > 0);
    return {
      labels: data.map(p => p.name),
      datasets: [
        {
          label: 'Annual Target',
          data: data.map(p => p.target),
          backgroundColor: 'rgba(245, 158, 11, 0.25)', // لون برتقالي شفاف (تارغت)
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.8
        },
        {
          label: 'Actual Revenue',
          data: data.map(p => p.total),
          backgroundColor: '#2563eb', // لون أزرق صريح (إيراد محقق)
          borderRadius: 6,
          barPercentage: 0.8
        }
      ]
    };
  }
}
