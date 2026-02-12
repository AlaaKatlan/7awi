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

  // 1. حساب الرواتب الشهرية الإجمالية من fact_salary
  monthlySalaries = computed(() => {
    const year = this.selectedYear();
    const salaries = this.dataService.salaries();

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const month = monthIndex + 1;
      return salaries
        .filter(s => s.year === year && s.month === month)
        .reduce((sum, s) => sum + Number(s.net_salary || 0), 0);
    });
  });

  // 2. حساب الرواتب حسب نوع العقد من fact_salary
  salaryBreakdown = computed(() => {
    const year = this.selectedYear();
    const salaries = this.dataService.salaries();
    const employees = this.dataService.employees();
    const breakdown: { [key: string]: number } = {};

    const yearSalaries = salaries.filter(s => s.year === year);

    yearSalaries.forEach(salary => {
      const emp = employees.find(e => e.employee_id === salary.employee_id);
      if (!emp) return;

      let type = (emp.contract || 'Not Specified').trim();
      type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

      breakdown[type] = (breakdown[type] || 0) + Number(salary.net_salary || 0);
    });

    return breakdown;
  });

  // 3. إحصائيات المنتجات مع الإنتاجية والتكاليف التشغيلية
  productStats = computed(() => {
    const year = this.selectedYear();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const products = this.dataService.products();
    const salaries = this.dataService.salaries();
    const revenues = this.dataService.revenues();
    const costs = this.dataService.costs();

    return products.map(prod => {
      // عدد الموظفين الفريدين من fact_salary لهذا القسم في السنة المحددة
      const productSalaries = salaries.filter(s => {
        const emp = this.dataService.employees().find(e => e.employee_id === s.employee_id);
        return emp?.product_id === prod.product_id && s.year === year;
      });

      const uniqueEmployeeIds = new Set(productSalaries.map(s => s.employee_id));
      const empCount = uniqueEmployeeIds.size;

      const totalRev = revenues
        .filter(r => r.product_id === prod.product_id && new Date(r.date).getFullYear() === year)
        .reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);

      const monthsToCount = year < currentYear ? 12 : (year === currentYear ? currentMonth + 1 : 0);

      // حساب الرواتب من fact_salary
      const totalSalaries = productSalaries.reduce((sum, s) => sum + Number(s.net_salary || 0), 0);

      // ✅ حساب التكاليف التشغيلية من fact_cost للقسم
      const totalOpCost = costs
        .filter(c => c.product_id === prod.product_id && c.year === year)
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);

      // ✅ إجمالي التكلفة = الرواتب + التكاليف التشغيلية
      const totalCost = totalSalaries + totalOpCost;

      const profit = totalRev - totalCost;
      const productivity = (empCount > 0 && monthsToCount > 0) ? (profit / monthsToCount / empCount) : 0;

      return {
        name: prod.product_name,
        empCount,
        revenue: Math.round(totalRev),
        salaries: Math.round(totalSalaries),
        opCost: Math.round(totalOpCost),
        totalCost: Math.round(totalCost),
        profit: Math.round(profit),
        productivity: Math.round(productivity)
      };
    });
  });

  // 4. الإحصائيات العامة - Cost = Salaries + Operational Cost
  stats = computed(() => {
    const year = this.selectedYear();
    const revs = this.dataService.revenues().filter(r => new Date(r.date).getFullYear() === year);
    const revenue = revs.reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);

    // الرواتب من fact_salary
    const salaries = this.monthlySalaries().reduce((a, b) => a + b, 0);

    // التكاليف التشغيلية من fact_cost
    const opCost = this.dataService.costs().filter(c => c.year === year).reduce((sum, c) => sum + Number(c.amount), 0);

    // إجمالي التكلفة = الرواتب + التكاليف التشغيلية
    const totalCost = salaries + opCost;

    const profit = revenue - totalCost;
    return {
      revenue: Math.round(revenue),
      cost: Math.round(totalCost),
      profit: Math.round(profit),
      margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
      salaries: Math.round(salaries),
      opCost: Math.round(opCost)
    };
  });

  // 5. بيانات الجدول السنوي
  summaryData = computed(() => {
    const year = this.selectedYear();
    const products = this.dataService.products();
    const revenues = this.dataService.revenues();
    const targets = this.dataService.targets();

    return products.map(p => {
      const monthlyValues = Array.from({ length: 12 }, (_, m) => {
        const val = revenues
          .filter(r => r.product_id === p.product_id && new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === m)
          .reduce((s, r) => s + (Number(r.gross_amount) || 0), 0);
        return Math.round(val);
      });
      const total = monthlyValues.reduce((a, b) => a + b, 0);
      const targetObj = targets.find(t => t.product_id === p.product_id && t.year === year);
      const target = targetObj ? Math.round(Number(targetObj.annual_target)) : 0;
      return {
        name: p.product_name,
        monthlyValues,
        total,
        target,
        achievement: target > 0 ? Math.round((total / target) * 100) : 0,
        product_id: p.product_id
      };
    });
  });

  totals = computed(() => {
    const data = this.summaryData();
    const year = this.selectedYear();
    const monthlyRevenue = Array.from({ length: 12 }, (_, m) => data.reduce((s, p) => s + p.monthlyValues[m], 0));

    // التكاليف الشهرية = الرواتب من fact_salary + التكاليف التشغيلية من fact_cost
    const monthlySalariesData = this.monthlySalaries();
    const monthlyOpCost = Array.from({ length: 12 }, (_, m) =>
      this.dataService.costs().filter(c => c.year === year && c.month === (m + 1)).reduce((s, c) => s + Number(c.amount), 0)
    );
    const monthlyCost = Array.from({ length: 12 }, (_, m) => Math.round(monthlySalariesData[m] + monthlyOpCost[m]));

    return {
      monthlyRevenue,
      monthlyCost,
      monthlyNet: monthlyRevenue.map((rev, i) => Math.round(rev - monthlyCost[i]))
    };
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

          if (parseFloat(percentage) < 3) return;

          const { x, y } = element.tooltipPosition();

          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

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

  // ✅ دالة تنسيق الأرقام الكبيرة
  private formatNumber(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(0) + 'K';
    }
    return value.toFixed(0);
  }

  private initCharts() {
    // تسجيل الـ Plugin
    Chart.register(this.percentagePlugin);

    this.charts.main = new Chart('mainChart', {
      type: 'line',
      data: this.getMainChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              callback: (value: any) => '$' + this.formatNumber(value)
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context: any) => `${context.dataset.label}: $${context.raw.toLocaleString()}`
            }
          }
        }
      }
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
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: {
            ticks: {
              callback: (value: any) => '$' + this.formatNumber(value)
            }
          }
        }
      }
    });

    this.charts.multiYear = new Chart('multiYearChart', {
      type: 'bar',
      data: this.getMultiYearData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              callback: (value: any) => '$' + this.formatNumber(value)
            }
          }
        }
      }
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
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context: any) => `Margin: ${context.raw.toFixed(1)}%`
            }
          }
        }
      }
    });

    this.charts.allYearsMonthly = new Chart('allYearsMonthlyChart', {
      type: 'line',
      data: this.getAllYearsMonthlyData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              callback: (value: any) => '$' + this.formatNumber(value)
            }
          }
        }
      }
    });

    // ✅ Department Financial Performance Analysis - مع Cost
    this.charts.productComparison = new Chart('productComparisonChart', {
      type: 'bar',
      data: this.getProductComparisonData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: {
            ticks: {
              callback: (value: any) => '$' + this.formatNumber(value)
            }
          }
        }
      }
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
          y: { type: 'linear', position: 'left', title: { display: true, text: 'Staff Count' } },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Productivity ($)' },
            ticks: {
              callback: (value: any) => '$' + this.formatNumber(value)
            }
          }
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
            y1: {
              type: 'linear',
              position: 'right',
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Productivity ($)' },
              ticks: {
                callback: (value: any) => '$' + this.formatNumber(value)
              }
            }
          }
        }
      });
    }
  }

  private getSalaryTypeData() {
    const data = this.salaryBreakdown();
    const labels = Object.keys(data).sort((a, b) => {
      if (a.toLowerCase() === 'other') return 1;
      if (b.toLowerCase() === 'other') return -1;
      return a.localeCompare(b);
    });
    const values = labels.map(l => Math.round(data[l]));
    const colors = ['#1e3a8a', '#2563eb', '#60a5fa', '#93c5fd', '#bae6fd', '#0ea5e9'];

    return {
      labels: labels,
      datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
    };
  }

  private getProductProductivityData() {
    const data = this.productStats().filter(d => d.empCount > 0).sort((a, b) => a.name.localeCompare(b.name));
    return {
      labels: data.map(d => d.name),
      datasets: [
        { label: 'Staff Count', data: data.map(d => d.empCount), backgroundColor: '#cbd5e1', yAxisID: 'y', order: 2 },
        { label: 'Monthly Productivity ($)', data: data.map(d => d.productivity), type: 'line' as const, borderColor: '#1e3a8a', backgroundColor: '#1e3a8a', yAxisID: 'y1', tension: 0.4, pointRadius: 4, order: 1 }
      ]
    };
  }

  // ✅ Department Financial Performance Analysis - مع Cost (رواتب + تكاليف تشغيلية)
  private getProductComparisonData() {
    const data = this.productStats().filter(d => d.revenue > 0 || d.totalCost > 0).sort((a, b) => a.name.localeCompare(b.name));
    return {
      labels: data.map(d => d.name),
      datasets: [
        { label: 'Revenue', data: data.map(d => d.revenue), backgroundColor: '#1e3a8a', borderRadius: 4 },
        { label: 'Salaries', data: data.map(d => d.salaries), backgroundColor: '#f59e0b', borderRadius: 4 },
        { label: 'Op. Cost', data: data.map(d => d.opCost), backgroundColor: '#8b5cf6', borderRadius: 4 },
        {
          label: 'Net Profit',
          data: data.map(d => d.profit),
          backgroundColor: data.map(d => d.profit >= 0 ? '#10b981' : '#ef4444'),
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
    const data = this.summaryData().filter(p => p.total > 0 || p.target > 0).sort((a, b) => a.name.localeCompare(b.name));
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
        data: Array.from({ length: 12 }, (_, m) => {
          const val = this.dataService.revenues()
            .filter(r => new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === m)
            .reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);
          return Math.round(val);
        }),
        borderColor: colors[idx % colors.length],
        tension: 0.4,
        fill: false,
        borderWidth: year === this.selectedYear() ? 4 : 2
      }))
    };
  }

  private getGeoData() {
    const revs = this.dataService.revenues().filter(r => new Date(r.date).getFullYear() === this.selectedYear());
    const geoTotals: { [key: string]: number } = {};

    revs.forEach(r => {
      const country = r.country || 'Other';
      geoTotals[country] = (geoTotals[country] || 0) + Number(r.gross_amount || 0);
    });

    const sortedKeys = Object.keys(geoTotals).filter(k => geoTotals[k] > 0).sort((a, b) => {
      if (a.toLowerCase() === 'other') return 1;
      if (b.toLowerCase() === 'other') return -1;
      return a.localeCompare(b);
    });

    const colorMap: { [key: string]: string } = {
      'UAE': '#10b981',
      'KSA': '#f59e0b',
      'SYR': '#3b82f6',
      'JOR': '#8b5cf6',
      'Other': '#64748b'
    };

    const labels = sortedKeys;
    const data = sortedKeys.map(k => Math.round(geoTotals[k]));
    const colors = sortedKeys.map(k => colorMap[k] || '#64748b');

    return {
      labels: labels,
      datasets: [{ data: data, backgroundColor: colors }]
    };
  }

  // Department Profitability Index - حساب الكوست من fact_salary + fact_cost
  private getProfitabilityData() {
    const year = this.selectedYear();
    const products = this.dataService.products();
    const salaries = this.dataService.salaries();
    const revenues = this.dataService.revenues();
    const costs = this.dataService.costs();

    const data = products.map(p => {
      const rev = revenues
        .filter(r => r.product_id === p.product_id && new Date(r.date).getFullYear() === year)
        .reduce((s, r) => s + (Number(r.gross_amount) || 0), 0);

      // حساب الرواتب من fact_salary للقسم
      const productSalaries = salaries.filter(s => {
        const emp = this.dataService.employees().find(e => e.employee_id === s.employee_id);
        return emp?.product_id === p.product_id && s.year === year;
      });
      const salaryTotal = productSalaries.reduce((s, sal) => s + (Number(sal.net_salary) || 0), 0);

      // ✅ حساب التكاليف التشغيلية من fact_cost
      const opCostTotal = costs
        .filter(c => c.product_id === p.product_id && c.year === year)
        .reduce((s, c) => s + (Number(c.amount) || 0), 0);

      const totalCost = salaryTotal + opCostTotal;

      return {
        name: p.product_name,
        margin: rev > 0 ? ((rev - totalCost) / rev) * 100 : 0
      };
    }).filter(x => x.margin !== 0).sort((a, b) => {
      if (a.name.toLowerCase() === 'other') return 1;
      if (b.name.toLowerCase() === 'other') return -1;
      return a.name.localeCompare(b.name);
    });

    return {
      labels: data.map(d => d.name),
      datasets: [{
        label: 'Margin %',
        data: data.map(d => Math.round(d.margin * 10) / 10),
        backgroundColor: data.map(d => d.margin >= 0 ? '#10b981' : '#ef4444')
      }]
    };
  }

  private getMultiYearData() {
    const years = [...this.yearsList()].reverse();
    return {
      labels: years.map(String),
      datasets: [{
        label: 'Annual Revenue',
        data: years.map(year => {
          const val = this.dataService.revenues()
            .filter(r => new Date(r.date).getFullYear() === year)
            .reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);
          return Math.round(val);
        }),
        backgroundColor: '#1e3a8a',
        borderRadius: 10
      }]
    };
  }
}
