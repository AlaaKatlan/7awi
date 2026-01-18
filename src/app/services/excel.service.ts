import { Injectable, signal, computed } from '@angular/core';
import * as XLSX from 'xlsx';
import { DimClient, DimProduct, FactPipeline, FactRevenue, FactTarget, FactCost } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  // Signals البيانات القديمة والجديدة
  revenues = signal<FactRevenue[]>([]);
  pipelines = signal<FactPipeline[]>([]);
  products = signal<DimProduct[]>([]);
  clients = signal<DimClient[]>([]);

  // القوائم الجديدة
  targets = signal<FactTarget[]>([]);
  costs = signal<FactCost[]>([]);

  // متغير للاحتفاظ بنسخة الملف الأصلي (للحفاظ على الستايل والشيتات الأخرى)
  private originalWorkbook: XLSX.WorkBook | null = null;
  private fileHandle: any = null;

  // Computed Maps (للربط)
  productsMap = computed(() => {
    const map = new Map<number, string>();
    this.products().forEach(p => map.set(p.Product_ID, p.Product_Name));
    return map;
  });

  clientsMap = computed(() => {
    const map = new Map<number, string>();
    this.clients().forEach(c => map.set(c.Client_ID, c.Client_Name));
    return map;
  });

  async openFileFromSystem() {
    try {
      // @ts-ignore
      [this.fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Excel Files', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        multiple: false
      });
      const file = await this.fileHandle.getFile();
      this.readExcelFile(file);
    } catch (err) { console.error(err); }
  }

  private readExcelFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const binaryString = e.target.result;
      // قراءة الملف وحفظه في المتغير
      this.originalWorkbook = XLSX.read(binaryString, { type: 'binary', cellDates: true });

      // قراءة الشيتات
      if (this.originalWorkbook.Sheets['Fact_Revenue']) this.revenues.set(XLSX.utils.sheet_to_json(this.originalWorkbook.Sheets['Fact_Revenue']));
      if (this.originalWorkbook.Sheets['Fact_Pipeline']) this.pipelines.set(XLSX.utils.sheet_to_json(this.originalWorkbook.Sheets['Fact_Pipeline']));
      if (this.originalWorkbook.Sheets['Dim_Product']) this.products.set(XLSX.utils.sheet_to_json(this.originalWorkbook.Sheets['Dim_Product']));
      if (this.originalWorkbook.Sheets['Dim_Client']) this.clients.set(XLSX.utils.sheet_to_json(this.originalWorkbook.Sheets['Dim_Client']));

      // قراءة الجداول الجديدة
      if (this.originalWorkbook.Sheets['Fact_Target']) this.targets.set(XLSX.utils.sheet_to_json(this.originalWorkbook.Sheets['Fact_Target']));
      if (this.originalWorkbook.Sheets['Fact_Cost']) this.costs.set(XLSX.utils.sheet_to_json(this.originalWorkbook.Sheets['Fact_Cost']));
    };
    reader.readAsBinaryString(file);
  }

  async saveChangesToOriginalFile() {
    if (!this.fileHandle || !this.originalWorkbook) {
      alert('Please open a file first.');
      return;
    }

    // بدلاً من إنشاء كتاب جديد، نعدل الشيتات الموجودة في الكتاب الأصلي
    // ملاحظة: json_to_sheet تعيد بناء البيانات، وهذا يحافظ على البيانات لكن قد يعيد ضبط تنسيق الخلايا (الألوان) في الشيتات المعدلة فقط.
    // الشيتات التي لم نلمسها ستبقى كما هي 100%.

    this.originalWorkbook.Sheets['Fact_Revenue'] = XLSX.utils.json_to_sheet(this.revenues());
    this.originalWorkbook.Sheets['Fact_Pipeline'] = XLSX.utils.json_to_sheet(this.pipelines());
    this.originalWorkbook.Sheets['Dim_Product'] = XLSX.utils.json_to_sheet(this.products());
    this.originalWorkbook.Sheets['Dim_Client'] = XLSX.utils.json_to_sheet(this.clients());

    // حفظ الجداول الجديدة
    this.originalWorkbook.Sheets['Fact_Target'] = XLSX.utils.json_to_sheet(this.targets());
    this.originalWorkbook.Sheets['Fact_Cost'] = XLSX.utils.json_to_sheet(this.costs());

    const wbout = XLSX.write(this.originalWorkbook, { bookType: 'xlsx', type: 'array' });

    try {
      const writable = await this.fileHandle.createWritable();
      await writable.write(new Blob([wbout], { type: 'application/octet-stream' }));
      await writable.close();
      alert('File Saved Successfully!');
    } catch (error) { console.error(error); alert('Error saving file.'); }
  }
updateCost(index: number, item: FactCost) {
  this.costs.update(v => {
    const n = [...v];
    n[index] = item;
    return n;
  });
}
  // دوال الإضافة (CRUD)
  addRevenue(item: FactRevenue) { this.revenues.update(v => [item, ...v]); }
  updateRevenue(i: number, item: FactRevenue) { this.revenues.update(v => { const n = [...v]; n[i] = item; return n; }); }

  addPipeline(item: FactPipeline) { this.pipelines.update(v => [item, ...v]); }

  // دوال الجداول الجديدة
  addTarget(item: FactTarget) { this.targets.update(v => [item, ...v]); }
  addCost(item: FactCost) { this.costs.update(v => [item, ...v]); }

  getProductName(id: number): string { return this.productsMap().get(id) || `${id}`; }
  getClientName(id: number): string { return this.clientsMap().get(id) || `${id}`; }
}
