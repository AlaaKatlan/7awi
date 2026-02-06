import { Component, inject, computed, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactRevenue, FactCost, DimProduct, DimEmployee } from '../../models/data.models';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
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

  // 1. حساب الرواتب الشهرية الإجمالية
  monthlySalaries = computed(() => {
    const year = this.selectedYear();
    const employees = this.dataService.employees();

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const firstDayOfMonth = new Date(year, monthIndex, 1);
      const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

      return employees.filter(emp => {
        const start = new Date(emp.start_date);
        const end = emp.end_date ? new Date(emp.end_date) : null;
        return start <= lastDayOfMonth && (!end || end >= firstDayOfMonth);
      }).reduce((sum, emp) => sum + Number(emp.salary), 0);
    });
  });

  // 2. حساب الرواتب مع تنظيف البيانات لمنع التكرار
  salaryBreakdown = computed(() => {
    const year = this.selectedYear();
    const employees = this.dataService.employees();
    const breakdown: { [key: string]: number } = {};

    employees.forEach(emp => {
      let type = (emp.contract || 'Not Specified').trim();
      type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

      const totalEmpSalaryForYear = Array.from({ length: 12 }, (_, m) => {
        const d1 = new Date(year, m, 1);
        const d2 = new Date(year, m + 1, 0);
        const start = new Date(emp.start_date);
        const end = emp.end_date ? new Date(emp.end_date) : null;
        return (start <= d2 && (!end || end >= d1)) ? (Number(emp.salary) || 0) : 0;
      }).reduce((a, b) => a + b, 0);

      if (totalEmpSalaryForYear > 0) {
        breakdown[type] = (breakdown[type] || 0) + totalEmpSalaryForYear;
      }
    });

    return breakdown;
  });

  // 3. إحصائيات المنتجات مع الإنتاجية
  productStats = computed(() => {
    const year = this.selectedYear();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const products = this.dataService.products();
    const employees = this.dataService.employees();
    const revenues = this.dataService.revenues();

    return products.map(prod => {
      const empCount = employees.filter(e => e.product_id === prod.product_id && !e.end_date).length;

      const totalRev = revenues
        .filter(r => r.product_id === prod.product_id && new Date(r.date).getFullYear() === year)
        .reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);

      const monthsToCount = year < currentYear ? 12 : (year === currentYear ? currentMonth + 1 : 0);

      const totalSalaries = Array.from({ length: monthsToCount }, (_, m) => {
        const d1 = new Date(year, m, 1);
        const d2 = new Date(year, m + 1, 0);
        return employees
          .filter(e => e.product_id === prod.product_id && new Date(e.start_date) <= d2 && (!e.end_date || new Date(e.end_date) >= d1))
          .reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
      }).reduce((a, b) => a + b, 0);

      const profit = totalRev - totalSalaries;
      const productivity = (empCount > 0 && monthsToCount > 0) ? (profit / monthsToCount / empCount) : 0;

      return {
        name: prod.product_name,
        empCount,
        revenue: totalRev,
        salaries: totalSalaries,
        profit,
        productivity
      };
    });
  });

  // 4. الإحصائيات العامة
  stats = computed(() => {
    const year = this.selectedYear();
    const revs = this.dataService.revenues().filter(r => new Date(r.date).getFullYear() === year);
    const revenue = revs.reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);
    const totalCost = this.dataService.costs().filter(c => c.year === year).reduce((sum, c) => sum + Number(c.amount), 0);
    const salaries = this.monthlySalaries().reduce((a, b) => a + b, 0);
    const profit = revenue - totalCost;
    return { revenue, cost: totalCost, profit, margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0, salaries, opCost: totalCost - salaries };
  });

  // 5. بيانات الجدول السنوي
  summaryData = computed(() => {
    const year = this.selectedYear();
    const products = this.dataService.products();
    const revenues = this.dataService.revenues();
    const targets = this.dataService.targets();

    return products.map(p => {
      const monthlyValues = Array.from({ length: 12 }, (_, m) => revenues.filter(r => r.product_id === p.product_id && new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === m).reduce((s, r) => s + (Number(r.gross_amount) || 0), 0));
      const total = monthlyValues.reduce((a, b) => a + b, 0);
      const targetObj = targets.find(t => t.product_id === p.product_id && t.year === year);
      const target = targetObj ? Number(targetObj.annual_target) : 0;
      return { name: p.product_name, monthlyValues, total, target, achievement: target > 0 ? (total / target) * 100 : 0, product_id: p.product_id };
    });
  });

  totals = computed(() => {
    const data = this.summaryData();
    const monthlyRevenue = Array.from({ length: 12 }, (_, m) => data.reduce((s, p) => s + p.monthlyValues[m], 0));
    const monthlyOpCost = Array.from({ length: 12 }, (_, m) => this.dataService.costs().filter(c => c.year === this.selectedYear() && c.month === (m + 1)).reduce((s, c) => s + Number(c.amount), 0));
    return { monthlyRevenue, monthlyCost: monthlyOpCost, monthlyNet: monthlyRevenue.map((rev, i) => rev - monthlyOpCost[i]) };
  });

  ngAfterViewInit() { this.initCharts(); }

  onYearChange(year: any) {
    this.selectedYear.set(Number(year));
    this.updateCharts();
  }

  // ✅ Plugin لإظهار النسب المئوية داخل الـ Pie/Doughnut Charts
  private percentagePlugin = {
    id: 'percentagePlugin',
    afterDatasetsDraw: (chart: any) => {
      const ctx = chart.ctx;
      const datasets = chart.data.datasets;

      if (chart.config.type !== 'pie' && chart.config.type !== 'doughnut') return;

      datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        const total = dataset.data.reduce((a: number, b: number) => a + b, 0);

        if (total === 0) return;

        meta.data.forEach((element: any, index: number) => {
          const value = dataset.data[index];
          const percentage = ((value / total) * 100).toFixed(1);

          // لا تعرض إذا كانت النسبة صغيرة جداً
          if (parseFloat(percentage) < 3) return;

          const { x, y } = element.tooltipPosition();

          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // إضافة ظل للنص ليكون واضح
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;

          ctx.fillText(`${percentage}%`, x, y);
          ctx.restore();
        });
      });
    }
  };

  private initCharts() {
    // تسجيل الـ Plugin
    Chart.register(this.percentagePlugin);

    this.charts.main = new Chart('mainChart', {
      type: 'line',
      data: this.getMainChartData(),
      options: { responsive: true, maintainAspectRatio: false }
    });

    // ✅ Doughnut مع نسب مئوية
    this.charts.donut = new Chart('productProfitChart', {
      type: 'doughnut',
      data: this.getDonutData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const value = context.raw;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    this.charts.targetVsActual = new Chart('targetVsActualChart', {
      type: 'bar',
      data: this.getTargetVsActualData(),
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    this.charts.multiYear = new Chart('multiYearChart', {
      type: 'bar',
      data: this.getMultiYearData(),
      options: { responsive: true, maintainAspectRatio: false }
    });

    // ✅ Pie Chart مع نسب مئوية - Geographical
    this.charts.geo = new Chart('geoChart', {
      type: 'pie',
      data: this.getGeoData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const value = context.raw;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    this.charts.profitability = new Chart('profitabilityChart', {
      type: 'bar',
      data: this.getProfitabilityData(),
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });

    this.charts.allYearsMonthly = new Chart('allYearsMonthlyChart', {
      type: 'line',
      data: this.getAllYearsMonthlyData(),
      options: { responsive: true, maintainAspectRatio: false }
    });

    this.charts.productComparison = new Chart('productComparisonChart', {
      type: 'bar',
      data: this.getProductComparisonData(),
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // ✅ Doughnut مع نسب مئوية - Salary
    this.charts.salaryType = new Chart('salaryTypeChart', {
      type: 'doughnut',
      data: this.getSalaryTypeData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const value = context.raw;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    this.charts.productivity = new Chart('productProductivityChart', {
      type: 'bar',
      data: this.getProductProductivityData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { type: 'linear', position: 'left' },
          y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  private updateCharts() {
    if (this.charts.main) {
      this.charts.main.data = this.getMainChartData();
      this.charts.main.update();
    }

    if (this.charts.donut) {
      this.charts.donut.data = this.getDonutData();
      this.charts.donut.update();
    }

    if (this.charts.targetVsActual) {
      this.charts.targetVsActual.data = this.getTargetVsActualData();
      this.charts.targetVsActual.update();
    }

    if (this.charts.multiYear) {
      this.charts.multiYear.data = this.getMultiYearData();
      this.charts.multiYear.update();
    }

    if (this.charts.geo) {
      this.charts.geo.data = this.getGeoData();
      this.charts.geo.update();
    }

    if (this.charts.profitability) {
      this.charts.profitability.data = this.getProfitabilityData();
      this.charts.profitability.update();
    }

    if (this.charts.allYearsMonthly) {
      this.charts.allYearsMonthly.data = this.getAllYearsMonthlyData();
      this.charts.allYearsMonthly.update();
    }

    if (this.charts.productComparison) {
      this.charts.productComparison.data = this.getProductComparisonData();
      this.charts.productComparison.update();
    }

    if (this.charts.salaryType) {
      this.charts.salaryType.data = this.getSalaryTypeData();
      this.charts.salaryType.update();
    }

    if (this.charts.productivity) {
      this.charts.productivity.destroy();
      this.charts.productivity = new Chart('productProductivityChart', {
        type: 'bar',
        data: this.getProductProductivityData(),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: 'Staff Count' } },
            y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Productivity ($)' } }
          }
        }
      });
    }
  }

  private getSalaryTypeData() {
    const data = this.salaryBreakdown();
    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = ['#1e3a8a', '#2563eb', '#60a5fa', '#93c5fd', '#bae6fd', '#0ea5e9'];

    return {
      labels: labels,
      datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
    };
  }

  private getProductProductivityData() {
    const data = this.productStats().filter(d => d.empCount > 0);
    return {
      labels: data.map(d => d.name),
      datasets: [
        { label: 'Staff Count', data: data.map(d => d.empCount), backgroundColor: '#cbd5e1', yAxisID: 'y', order: 2 },
        { label: 'Monthly Productivity ($)', data: data.map(d => d.productivity), type: 'line' as const, borderColor: '#1e3a8a', backgroundColor: '#1e3a8a', yAxisID: 'y1', tension: 0.4, pointRadius: 4, order: 1 }
      ]
    };
  }

  private getProductComparisonData() {
    const data = this.productStats().filter(d => d.revenue > 0 || d.salaries > 0);
    return {
      labels: data.map(d => d.name),
      datasets: [
        { label: 'Revenue', data: data.map(d => d.revenue), backgroundColor: '#1e3a8a', borderRadius: 4 },
        { label: 'Salaries', data: data.map(d => d.salaries), backgroundColor: '#f59e0b', borderRadius: 4 },
        {
          label: 'Net Profit',
          data: data.map(d => d.profit),
          backgroundColor: data.map(d => d.profit >= 0 ? '#10b981' : '#ef4444'), // ✅ أخضر للموجب، أحمر للسالب
          borderRadius: 4
        }
      ]
    };
  }

  private getMainChartData() {
    return {
      labels: this.monthNames,
      datasets: [
        { label: 'Revenue', data: this.totals().monthlyRevenue, borderColor: '#2563eb', fill: true, backgroundColor: 'rgba(37, 99, 235, 0.05)', tension: 0.4 },
        { label: 'Total Cost', data: this.totals().monthlyCost, borderColor: '#f43f5e', borderDash: [5, 5], tension: 0.4 }
      ]
    };
  }

  private getDonutData() {
    const data = this.summaryData().filter(p => p.total > 0).sort((a, b) => b.total - a.total);
    return {
      labels: data.map(p => p.name),
      datasets: [{
        data: data.map(p => p.total),
        backgroundColor: ['#1e3a8a', '#2563eb', '#60a5fa', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']
      }]
    };
  }

  private getTargetVsActualData() {
    const data = this.summaryData().filter(p => p.total > 0 || p.target > 0);
    return {
      labels: data.map(p => p.name),
      datasets: [
        { label: 'Target', data: data.map(p => p.target), backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', borderWidth: 1 },
        { label: 'Actual', data: data.map(p => p.total), backgroundColor: '#2563eb' }
      ]
    };
  }

  private getAllYearsMonthlyData() {
    const years = [...this.yearsList()].reverse();
    const colors = ['#1e3a8a', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
    return {
      labels: this.monthNames,
      datasets: years.map((year, idx) => ({
        label: `Year ${year}`,
        data: Array.from({ length: 12 }, (_, m) => this.dataService.revenues().filter(r => new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === m).reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0)),
        borderColor: colors[idx % colors.length], tension: 0.4, fill: false, borderWidth: year === this.selectedYear() ? 4 : 2
      }))
    };
  }

  private getGeoData() {
    const revs = this.dataService.revenues().filter(r => new Date(r.date).getFullYear() === this.selectedYear());
    const uaeTotal = revs.filter(r => r.country === 'UAE').reduce((s, r) => s + Number(r.gross_amount), 0);
    const ksaTotal = revs.filter(r => r.country === 'KSA').reduce((s, r) => s + Number(r.gross_amount), 0);
    const syrTotal = revs.filter(r => r.country === 'SYR').reduce((s, r) => s + Number(r.gross_amount), 0);
    const jorTotal = revs.filter(r => r.country === 'JOR').reduce((s, r) => s + Number(r.gross_amount), 0);
    const otherTotal = revs.filter(r => !['UAE', 'KSA', 'SYR', 'JOR'].includes(r.country)).reduce((s, r) => s + Number(r.gross_amount), 0);

    const labels = [];
    const data = [];
    const colors = [];

    if (uaeTotal > 0) { labels.push('UAE'); data.push(uaeTotal); colors.push('#10b981'); }
    if (ksaTotal > 0) { labels.push('KSA'); data.push(ksaTotal); colors.push('#f59e0b'); }
    if (syrTotal > 0) { labels.push('SYR'); data.push(syrTotal); colors.push('#3b82f6'); }
    if (jorTotal > 0) { labels.push('JOR'); data.push(jorTotal); colors.push('#8b5cf6'); }
    if (otherTotal > 0) { labels.push('Other'); data.push(otherTotal); colors.push('#64748b'); }

    return {
      labels: labels,
      datasets: [{ data: data, backgroundColor: colors }]
    };
  }

  private getProfitabilityData() {
    const year = this.selectedYear();
    const data = this.dataService.products().map(p => {
      const rev = this.dataService.revenues().filter(r => r.product_id === p.product_id && new Date(r.date).getFullYear() === year).reduce((s, r) => s + (Number(r.gross_amount) || 0), 0);
      const cost = this.dataService.costs().filter(c => c.product_id === p.product_id && c.year === year).reduce((s, c) => s + (Number(c.amount) || 0), 0);
      return { name: p.product_name, margin: rev > 0 ? ((rev - cost) / rev) * 100 : 0 };
    }).filter(x => x.margin !== 0).sort((a, b) => b.margin - a.margin);

    return {
      labels: data.map(d => d.name),
      datasets: [{
        label: 'Margin %',
        data: data.map(d => d.margin),
        backgroundColor: data.map(d => d.margin >= 0 ? '#10b981' : '#ef4444') // ✅ أحمر للسالب
      }]
    };
  }

  private getMultiYearData() {
    const years = [...this.yearsList()].reverse();
    return {
      labels: years.map(String),
      datasets: [{
        label: 'Annual Revenue',
        data: years.map(year => this.dataService.revenues().filter(r => new Date(r.date).getFullYear() === year).reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0)),
        backgroundColor: '#1e3a8a',
        borderRadius: 10
      }]
    };
  }
}
