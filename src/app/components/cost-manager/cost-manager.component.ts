import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { FactCost } from '../../models/data.models';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import * as fs from 'file-saver';
@Component({
  selector: 'app-cost-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cost-manager.component.html'
})
export class CostManagerComponent {
  dataService = inject(DataService);

  // --- Filters ---
  searchText = signal('');
  filterYear = signal<number | null>(new Date().getFullYear());
  filterMonth = signal<number | null>(new Date().getMonth() + 1);
  filterProduct = signal<number | null>(null);
  filterClient = signal<number | null>(null);

  // --- UI State ---
  showModal = false;
  showDeleteModal = false;
  showGenerateModal = false;
  isEditMode = false;
  loading = signal(false);
  generating = signal(false);

  costToDelete: FactCost | null = null;
  currentCost: FactCost = this.getEmptyCost();

  // ✅ Signal لتتبع القسم المختار في Modal (منفصل عن currentCost)
  selectedProductIdForDropdown = signal<number | undefined>(undefined);

  // --- Generate Options ---
  generateTargetYear = new Date().getFullYear();
  generateTargetMonth = new Date().getMonth() + 1;

  // --- Constants ---
  months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  // --- Computed Lists ---
  yearsList = computed(() => {
    const years = this.dataService.costs().map(c => c.year);
    const allYears = [...years, new Date().getFullYear(), new Date().getFullYear() + 1];
    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  });

  sortedProducts = computed(() => {
    return this.dataService.products().slice().sort((a, b) =>
      a.product_name.localeCompare(b.product_name)
    );
  });

  sortedClients = computed(() => {
    return this.dataService.clients().slice().sort((a, b) =>
      a.client_name.localeCompare(b.client_name)
    );
  });

  // ✅ قائمة الـ Revenues المفلترة حسب القسم المختار - استخدام Signal منفصل
  filteredRevenuesForDropdown = computed(() => {
    let revenues = this.dataService.revenues();
    const productId = this.selectedProductIdForDropdown();

    // فلترة حسب القسم المختار إذا وجد
    if (productId) {
      revenues = revenues.filter(r => r.product_id === productId);
    }

    // ترتيب حسب التاريخ (الأحدث أولاً) + فقط التي لها order_number
    return revenues
      .filter(r => r.order_number)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50); // أول 50 فقط للأداء
  });

  // --- Filter Logic ---
  filteredCosts = computed(() => {
    let data = this.dataService.costs();

    if (this.filterYear() !== null) {
      data = data.filter(c => c.year === this.filterYear());
    }
    if (this.filterMonth() !== null) {
      data = data.filter(c => c.month === this.filterMonth());
    }
    if (this.filterProduct() !== null) {
      data = data.filter(c => c.product_id === this.filterProduct());
    }
    if (this.filterClient() !== null) {
      data = data.filter(c => c.client_id === this.filterClient());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(c =>
        (c.description?.toLowerCase().includes(text)) ||
        (this.dataService.getProductName(c.product_id).toLowerCase().includes(text)) ||
        (this.dataService.getClientName(c.client_id).toLowerCase().includes(text)) ||
        (this.getRevenueOrderNumber(c.revenue_id).toLowerCase().includes(text))
      );
    }

    return data.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (a.product_id || 0) - (b.product_id || 0);
    });
  });

  totalCost = computed(() => {
    return this.filteredCosts().reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  });

  // --- Helpers ---
  getEmptyCost(): FactCost {
    const today = new Date();
    return {
      date: today.toISOString().split('T')[0],
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      amount: 0,
      description: '',
      product_id: undefined,
      client_id: undefined,
      revenue_id: undefined
    };
  }

  getMonthName(m: number) {
    return this.months.find(x => x.value === m)?.name || m;
  }

  // ✅ جلب رقم الطلب من revenue_id
  getRevenueOrderNumber(revenueId: number | undefined): string {
    if (!revenueId) return '-';
    const revenue = this.dataService.revenues().find(r => r.id === revenueId);
    return revenue?.order_number || '-';
  }

  // ✅ عند تغيير القسم - تحديث Signal وإعادة تعيين الـ revenue_id
  onProductChange() {
    this.selectedProductIdForDropdown.set(this.currentCost.product_id);
    this.currentCost.revenue_id = undefined;
  }

  // --- Actions ---
  openModal() {
    this.isEditMode = false;
    this.currentCost = this.getEmptyCost();

    // ✅ تعيين المنتج الافتراضي وتحديث Signal
    const products = this.sortedProducts();
    if (products.length > 0) {
      this.currentCost.product_id = products[0].product_id;
      this.selectedProductIdForDropdown.set(products[0].product_id);
    } else {
      this.selectedProductIdForDropdown.set(undefined);
    }

    this.showModal = true;
  }

  editCost(cost: FactCost) {
    this.isEditMode = true;
    this.currentCost = { ...cost };
    // ✅ تحديث Signal عند التعديل
    this.selectedProductIdForDropdown.set(cost.product_id);
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedProductIdForDropdown.set(undefined);
  }

  confirmDelete(cost: FactCost) {
    this.costToDelete = cost;
    this.showDeleteModal = true;
  }

  // --- Generate Zero Costs Logic ---
  openGenerateModal() {
    const today = new Date();
    this.generateTargetYear = today.getFullYear();
    this.generateTargetMonth = today.getMonth() + 1;
    this.showGenerateModal = true;
  }

  async generateCosts() {
    this.generating.set(true);

    const result = await this.dataService.generateZeroCostsForMonth(
      this.generateTargetYear,
      this.generateTargetMonth
    );

    this.generating.set(false);
    this.showGenerateModal = false;

    if (result.success) {
      if (result.generated > 0) {
        alert(`Success! Generated ${result.generated} records with 0 amount for ${this.getMonthName(this.generateTargetMonth)}.`);
        this.filterYear.set(this.generateTargetYear);
        this.filterMonth.set(this.generateTargetMonth);
      } else {
        alert('All departments already have cost records for this month.');
      }
    } else {
      alert('Error: ' + result.error);
    }
  }

  // --- Excel Export ---
  exportToExcel() {
    const data = this.filteredCosts().map(c => ({
      'Date': c.date,
      'Description': c.description,
      'Department': this.dataService.getProductName(c.product_id),
      'Booking Order': this.getRevenueOrderNumber(c.revenue_id),
      'Client': this.dataService.getClientName(c.client_id),
      'Amount': c.amount,
      'Year': c.year,
      'Month': this.getMonthName(c.month)
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Costs');
    XLSX.writeFile(wb, `Costs_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  // =========================================================
  // 1. دالة تنزيل القالب (Template) - تصميم ذكي صفحة واحدة
  // =========================================================
  async downloadTemplate() {
    const workbook = new ExcelJS.Workbook();

    // 1. ورقة الإدخال الرئيسية
    const worksheet = workbook.addWorksheet('Cost Entry');

    // 2. ورقة البيانات المرجعية (مخفية)
    const refSheet = workbook.addWorksheet('ReferenceData');
    refSheet.state = 'hidden'; // إخفاء الورقة حتى لا يغيرها المستخدم

    // --- تحضير البيانات ---
    const departments = this.dataService.products().map(p => p.product_name);
    const clients = this.dataService.clients().map(c => c.client_name);
    const orders = this.dataService.revenues()
      .filter(r => r.order_number)
      .map(r => r.order_number);

    // ملء ورقة المراجع بالبيانات (كل قائمة في عمود)
    refSheet.getColumn(1).values = ['Departments', ...departments]; // Column A
    refSheet.getColumn(2).values = ['Clients', ...clients];       // Column B
    refSheet.getColumn(3).values = ['Orders', ...orders];         // Column C

    // --- تصميم ورقة الإدخال ---
    worksheet.columns = [
      { header: 'Date (YYYY-MM-DD)', key: 'date', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Booking Order', key: 'order', width: 25 }
    ];

    // إضافة سطر مثال (اختياري)
    worksheet.addRow({
      date: new Date().toISOString().split('T')[0],
      amount: 1000,
      description: 'Server Hosting Fees',
      department: departments[0] || '',
      client: clients[0] || '',
      order: orders[0] || ''
    });

    // --- إضافة القوائم المنسدلة (Data Validation) ---
    // نطبقها على أول 100 سطر مثلاً
    for (let i = 2; i <= 100; i++) {

      // عمود Department (D)
      worksheet.getCell(`D${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        // الإشارة إلى العمود A في الورقة المخفية
        formulae: [`=ReferenceData!$A$2:$A$${departments.length + 1}`]
      };

      // عمود Client (E)
      worksheet.getCell(`E${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`=ReferenceData!$B$2:$B$${clients.length + 1}`]
      };

      // عمود Booking Order (F)
      worksheet.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`=ReferenceData!$C$2:$C$${orders.length + 1}`]
      };
    }

    // تنسيق الهيدر
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // الحفظ والتنزيل
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fs.saveAs(blob, 'Smart_Cost_Template.xlsx');
  }
  // --- Save & Delete ---
  async save() {
    if (this.currentCost.amount === undefined || this.currentCost.amount === null) {
      alert('Valid amount is required');
      return;
    }

    this.loading.set(true);
    const d = new Date(this.currentCost.date);
    this.currentCost.year = d.getFullYear();
    this.currentCost.month = d.getMonth() + 1;

    try {
      let result;
      if (this.isEditMode) {
        result = await this.dataService.updateCost(this.currentCost);
      } else {
        result = await this.dataService.addCost(this.currentCost);
      }
      if (result.success) {
        this.closeModal();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (e: any) {
      alert('Unexpected error: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteCost() {
    if (!this.costToDelete?.id) return;
    try {
      const result = await this.dataService.deleteCost(this.costToDelete.id);
      if (!result.success) {
        alert('Error deleting: ' + result.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }

    this.showDeleteModal = false;
    this.costToDelete = null;
  }

  // =========================================================
  // ✅ 2. دالة الاستيراد (Import) - قراءة الملف وربط البيانات
  // =========================================================
  onFileChange(evt: any) {
    // 1. التأكد من وجود ملف
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) return;

    this.loading.set(true);

    const reader: FileReader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        // 2. قراءة البيانات الخام
        const bstr: string = e.target.result;
        const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

        // قراءة الورقة الأولى (Cost Entry)
        const wsname: string = wb.SheetNames[0];
        const ws: XLSX.WorkSheet = wb.Sheets[wsname];

        // تحويل البيانات إلى JSON (مصفوفة كائنات)
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const costsToInsert: Partial<FactCost>[] = [];

        // 3. تحضير قوائم البيانات الموجودة للمطابقة (Mapping)
        // نقوم بتنظيف النصوص (trim + lowercase) لضمان دقة البحث
        const productsList = this.dataService.products();
        const clientsList = this.dataService.clients();
        const revenuesList = this.dataService.revenues();

        // 4. المرور على كل سطر في الإكسل
        data.forEach((row) => {
          // A. معالجة التاريخ (إكسل يخزن التاريخ أحياناً كرقم)
          let dateStr = row['Date (YYYY-MM-DD)'] || row['Date'];

          if (typeof dateStr === 'number') {
            // معادلة تحويل تاريخ إكسل الرقمي إلى تاريخ JS
            const jsDate = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
            dateStr = jsDate.toISOString().split('T')[0];
          } else if (dateStr) {
            // محاولة تنسيق النص إذا كان تاريخاً نصياً
            try {
              dateStr = new Date(dateStr).toISOString().split('T')[0];
            } catch {
              dateStr = null;
            }
          }

          // إذا لم يوجد تاريخ أو مبلغ، نتجاهل السطر (أو كان سطراً فارغاً)
          if (!dateStr || !row['Amount']) return;

          // B. البحث عن ID القسم (Department)
          // نأخذ الاسم من الإكسل ونبحث عن الـ ID المقابل له في النظام
          const deptName = (row['Department'] || '').toString().trim().toLowerCase();
          const matchedProduct = productsList.find(p => p.product_name.toLowerCase().trim() === deptName);

          // C. البحث عن ID العميل (Client)
          const clientName = (row['Client'] || '').toString().trim().toLowerCase();
          const matchedClient = clientsList.find(c => c.client_name.toLowerCase().trim() === clientName);

          // D. البحث عن ID الطلب (Booking Order)
          const orderRef = (row['Booking Order'] || '').toString().trim().toLowerCase();
          const matchedRevenue = revenuesList.find(r => (r.order_number || '').toLowerCase().trim() === orderRef);

          // E. بناء كائن التكلفة الجاهز للإرسال
          const newCost: Partial<FactCost> = {
            date: dateStr,
            year: new Date(dateStr).getFullYear(),
            month: new Date(dateStr).getMonth() + 1,
            amount: Number(row['Amount']), // ضمان أنه رقم
            description: row['Description'] || '',
            product_id: matchedProduct?.product_id, // ✅ نستخدم الـ ID الذي وجدناه (أو undefined)
            client_id: matchedClient?.client_id,    // ✅
            revenue_id: matchedRevenue?.id          // ✅
          };

          costsToInsert.push(newCost);
        });

        // 5. إرسال البيانات للمعالجة
        if (costsToInsert.length > 0) {
          const result = await this.dataService.addCostsBulk(costsToInsert);

          if (result.success) {
            alert(`Success! Imported ${result.count} costs successfully.`);
            evt.target.value = ''; // تصفير حقل الملف ليسمح برفع ملف آخر
          } else {
            alert('Database Error: ' + result.error);
          }
        } else {
          alert('No valid data found in the file. Please use the Template.');
        }

      } catch (error: any) {
        console.error(error);
        alert('File Error: ' + error.message);
      } finally {
        this.loading.set(false);
      }
    };
    reader.readAsBinaryString(target.files[0]);
  }
}
