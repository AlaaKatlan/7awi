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
    <div class="p-6 bg-[#f0f4f8] min-h-screen font-sans text-slate-800">

      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 class="text-2xl font-black text-[#1e3a8a] tracking-tight">FINANCIAL COMMAND CENTER</h1>
          <p class="text-slate-500 text-sm font-medium italic">Detailed performance analytics for {{ selectedYear() }}</p>
        </div>
        <div class="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <span class="text-[10px] font-black text-slate-400 ml-3 uppercase">Fiscal Year</span>
          <select [ngModel]="selectedYear()" (ngModelChange)="onYearChange($event)"
                  class="bg-slate-50 border-0 rounded-xl px-4 py-2 font-bold text-[#1e3a8a] outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
            <option [value]="2024">2024</option>
            <option [value]="2025">2025</option>
            <option [value]="2026">2026</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-b-4 border-b-blue-500">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-blue-50 rounded-2xl text-blue-600"><span class="material-icons">payments</span></div>
            <span class="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-lg uppercase">Gross</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Revenue</h3>
          <div class="text-2xl font-black mt-1">{{ stats().revenue | currency:'AED ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-b-4 border-b-red-500">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-red-50 rounded-2xl text-red-600"><span class="material-icons">shopping_cart</span></div>
            <span class="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded-lg uppercase">Cost</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Expenses</h3>
          <div class="text-2xl font-black mt-1">{{ stats().cost | currency:'AED ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-b-4 border-b-emerald-500">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><span class="material-icons">account_balance_wallet</span></div>
            <span class="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg uppercase">Profit</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Profit</h3>
          <div class="text-2xl font-black" [class.text-red-600]="stats().profit < 0">{{ stats().profit | currency:'AED ':'symbol':'1.0-0' }}</div>
        </div>

        <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-b-4 border-b-orange-500">
          <div class="flex justify-between items-center mb-4">
            <div class="p-3 bg-orange-50 rounded-2xl text-orange-600"><span class="material-icons">trending_up</span></div>
            <span class="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-1 rounded-lg uppercase">Margin</span>
          </div>
          <h3 class="text-slate-400 text-xs font-bold uppercase tracking-wider">Profit Margin</h3>
          <div class="text-2xl font-black mt-1">{{ stats().margin }}%</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div class="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 class="font-black text-slate-800 mb-6 flex items-center gap-2 italic"><span class="w-2 h-6 bg-blue-600 rounded-full"></span> MONTHLY CASH FLOW</h3>
           <div class="h-[350px]"><canvas id="mainChart"></canvas></div>
        </div>
        <div class="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
           <h3 class="font-black text-slate-800 mb-6 italic">PROFIT DISTRIBUTION</h3>
           <div class="h-[350px]"><canvas id="productProfitChart"></canvas></div>
        </div>
      </div>

      <div class="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 mb-10">
        <div class="bg-[#1e3a8a] p-6 text-white flex justify-between items-center">
          <h3 class="font-black tracking-widest uppercase flex items-center gap-2 text-sm">
            <span class="material-icons">grid_on</span> Detailed Annual Performance Breakdown
          </h3>
          <div class="flex items-center gap-4 text-[10px] font-bold">
            <span class="bg-white/20 px-3 py-1 rounded-full uppercase">Currency: AED</span>
          </div>
        </div>

        <div class="overflow-x-auto p-4">
          <table class="w-full text-[10px] border-collapse">
            <thead>
              <tr class="bg-slate-100 text-[#1e3a8a] uppercase font-black border-b-2 border-slate-200">
                <th class="p-4 text-left min-w-[150px] sticky left-0 bg-slate-100 z-10">Item / Product</th>
                <th class="p-2 text-center border-l border-slate-200">Country</th>
                @for (m of monthNames; track m) {
                  <th class="p-2 text-center border-l border-slate-200">{{ m }}</th>
                }
                <th class="p-2 text-center bg-blue-100/50 text-blue-900 border-l border-slate-200">Total</th>
                <th class="p-2 text-center bg-emerald-100/50 text-emerald-900 border-l border-slate-200">KSA+UAE</th>
                <th class="p-2 text-center bg-orange-100/50 text-orange-900 border-l border-slate-200">Target</th>
                <th class="p-2 text-center border-l border-slate-200">Ach %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              @for (p of reportData(); track p.name) {
                <tr class="hover:bg-slate-50 transition-colors group">
                  <td rowspan="2" class="p-4 font-black text-slate-800 text-sm border-r border-slate-100 bg-white sticky left-0 z-10">
                    {{ p.name }}
                  </td>
                  <td class="p-2 text-center font-bold text-slate-400 bg-slate-50/50">KSA</td>
                  @for (val of p.ksaMonthly; track $index) {
                    <td class="p-2 text-center text-slate-500">{{ val > 0 ? (val | number:'1.0-0') : '-' }}</td>
                  }
                  <td class="p-2 text-center font-bold text-blue-700 bg-blue-50/30 border-l border-slate-100 italic">{{ p.ksaTotal | number:'1.0-0' }}</td>
                  <td rowspan="2" class="p-2 text-center font-black text-emerald-700 bg-emerald-50/50 border-l border-slate-200">
                    {{ (p.ksaTotal + p.uaeTotal) | number:'1.0-0' }}
                  </td>
                  <td rowspan="2" class="p-2 text-center font-black text-orange-700 bg-orange-50/50 border-l border-slate-200">
                    {{ p.annualTarget | number:'1.0-0' }}
                  </td>
                  <td rowspan="2" class="p-2 text-center border-l border-slate-200">
                    <span [class]="p.achievement >= 100 ? 'text-green-600' : 'text-red-500'" class="font-black text-xs">
                      {{ p.achievement | number:'1.1-1' }}%
                    </span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                  <td class="p-2 text-center font-bold text-slate-400 bg-slate-50/50">UAE</td>
                  @for (val of p.uaeMonthly; track $index) {
                    <td class="p-2 text-center text-slate-500">{{ val > 0 ? (val | number:'1.0-0') : '-' }}</td>
                  }
                  <td class="p-2 text-center font-bold text-blue-700 bg-blue-50/30 border-l border-slate-100 italic">{{ p.uaeTotal | number:'1.0-0' }}</td>
                </tr>
              }
            </tbody>
            <tfoot class="border-t-4 border-slate-300">
              <tr class="bg-slate-800 text-white font-black">
                <td colspan="2" class="p-4 text-xs">MONTHLY REVENUE</td>
                @for (rev of totals().monthlyRevenueSum; track $index) {
                  <td class="p-2 text-center border-l border-slate-700">{{ rev | number:'1.0-0' }}</td>
                }
                <td colspan="4" class="bg-slate-900"></td>
              </tr>
              <tr class="bg-red-600 text-white font-black">
                <td colspan="2" class="p-4 text-xs">MONTHLY COST</td>
                @for (cst of totals().monthlyCostSum; track $index) {
                  <td class="p-2 text-center border-l border-red-500">({{ cst | number:'1.0-0' }})</td>
                }
                <td colspan="4" class="bg-red-700"></td>
              </tr>
              <tr class="bg-[#10b981] text-white font-black text-sm">
                <td colspan="2" class="p-4 rounded-bl-3xl">MONTHLY NET PROFIT</td>
                @for (net of totals().monthlyNet; track $index) {
                  <td class="p-2 text-center border-l border-emerald-400 font-mono tracking-tighter">{{ net | number:'1.0-0' }}</td>
                }
                <td colspan="4" class="bg-emerald-600 rounded-br-3xl"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements AfterViewInit {
  dataService = inject(DataService);
  selectedYear = signal(2025);
  charts: any = {};
  monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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

  reportData = computed(() => {
    const year = this.selectedYear();
    const products = this.dataService.products();
    const revenues = this.dataService.revenues();
    const targets = this.dataService.targets();

    return products.map(product => {
      const targetObj = targets.find(t => t.product_id === product.product_id && t.year === year);
      const annualTarget = targetObj ? Number(targetObj.annual_target) : 0;

      const getMonthly = (country: string) => Array.from({ length: 12 }, (_, m) =>
        revenues.filter(r => r.product_id === product.product_id && r.country === country && new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === m)
                .reduce((sum, r) => sum + Number(r.gross_amount), 0)
      );

      const ksaMonthly = getMonthly('KSA');
      const uaeMonthly = getMonthly('UAE');
      const ksaTotal = ksaMonthly.reduce((a, b) => a + b, 0);
      const uaeTotal = uaeMonthly.reduce((a, b) => a + b, 0);
      const grandTotal = ksaTotal + uaeTotal;
      const achievement = annualTarget > 0 ? (grandTotal / annualTarget) * 100 : 0;

      return { name: product.product_name, ksaMonthly, uaeMonthly, ksaTotal, uaeTotal, annualTarget, achievement };
    });
  });

  totals = computed(() => {
    const data = this.reportData();
    const year = this.selectedYear();
    const monthlyRevenueSum = Array.from({ length: 12 }, (_, m) => data.reduce((sum, item) => sum + item.ksaMonthly[m] + item.uaeMonthly[m], 0));
    const monthlyCostSum = Array.from({ length: 12 }, (_, m) =>
      this.dataService.costs().filter(c => c.year === year && c.month === (m + 1)).reduce((sum, c) => sum + Number(c.amount), 0)
    );
    const monthlyNet = monthlyRevenueSum.map((rev, i) => rev - monthlyCostSum[i]);
    return { monthlyRevenueSum, monthlyCostSum, monthlyNet };
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
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
    this.charts.productProfit = new Chart('productProfitChart', {
      type: 'doughnut',
      data: this.getProductProfitData(),
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });
  }

  updateAllCharts() {
    if (this.charts.main) this.charts.main.data = this.getMainChartData();
    if (this.charts.productProfit) this.charts.productProfit.data = this.getProductProfitData();
    Object.values(this.charts).forEach((c: any) => c?.update());
  }

  getMainChartData() {
    const year = this.selectedYear();
    const revMonths = this.totals().monthlyRevenueSum;
    const costMonths = this.totals().monthlyCostSum;
    return {
      labels: this.monthNames,
      datasets: [
        { label: 'Revenue', data: revMonths, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, fill: true },
        { label: 'Cost', data: costMonths, borderColor: '#ef4444', borderDash: [5, 5], tension: 0.4 }
      ]
    };
  }

  getProductProfitData() {
    const year = this.selectedYear();
    const labels: string[] = [];
    const data: number[] = [];
    this.reportData().forEach(p => {
      if (p.ksaTotal + p.uaeTotal > 0) {
        labels.push(p.name);
        data.push(p.ksaTotal + p.uaeTotal);
      }
    });
    return { labels, datasets: [{ data, backgroundColor: ['#1e3a8a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'] }] };
  }
}
