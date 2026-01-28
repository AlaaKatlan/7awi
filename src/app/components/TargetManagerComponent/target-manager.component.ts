import { Component, computed, inject, signal } from "@angular/core";
import { FactTarget } from "../../models/data.models";
import { DataService } from "../../services/data.service";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-target-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './target-manager.component.html',
})
export class TargetManagerComponent {
  public dataService = inject(DataService);

  showModal = false;
  isEditMode = false;
  searchText = signal('');
  selectedYear = signal<number | null>(new Date().getFullYear());

  // سيجنال للتحكم في فلتر الربع السنوي
  selectedQuarter = signal<number | null>(null);

  // قائمة السنوات المستخرجة من البيانات
  yearsList = computed(() => {
    const data = this.dataService.targets();
    const currentYear = new Date().getFullYear();
    const dbYears = data.map(t => t.year);
    const allYears = Array.from(new Set([...dbYears, currentYear]));
    return allYears.sort((a, b) => b - a);
  });

  // كائن الهدف الحالي (للإضافة أو التعديل)
  currentItem: FactTarget = {
    product_id: 1,
    year: new Date().getFullYear(),
    quarter: null, // null تعني هدف سنوي بشكل افتراضي
    annual_target: 0
  };

  // تصفية الأهداف بناءً على السنة، الربع، والبحث
  filteredTargets = computed(() => {
    let data = this.dataService.targets();

    if (this.selectedYear()) {
      data = data.filter(t => t.year === this.selectedYear());
    }

    // فلترة حسب الربع السنوي
    if (this.selectedQuarter() !== null) {
      data = data.filter(t => t.quarter === this.selectedQuarter());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(t =>
        this.dataService.getProductName(t.product_id).toLowerCase().includes(text)
      );
    }
    return data;
  });

  // مجموع مبالغ التارجت في الفلتر الحالي
  totalTargetAmount = computed(() =>
    this.filteredTargets().reduce((sum, item) => sum + (Number(item.annual_target) || 0), 0)
  );

  openModal() {
    this.isEditMode = false;
    // قيم افتراضية للإضافة الجديدة
    this.currentItem = {
      product_id: this.dataService.products()[0]?.product_id || 1,
      year: this.selectedYear() || new Date().getFullYear(),
      quarter: null,
      annual_target: 0
    };
    this.showModal = true;
  }

  editItem(item: FactTarget) {
    this.isEditMode = true;
    this.currentItem = { ...item };
    this.showModal = true;
  }

  async save() {
    // التأكد من تحويل القيم لأرقام قبل الحفظ
    const payload = {
      ...this.currentItem,
      year: Number(this.currentItem.year),
      annual_target: Number(this.currentItem.annual_target),
      quarter: this.currentItem.quarter ? Number(this.currentItem.quarter) : null
    };

    if (this.isEditMode) {
      const { data, error } = await this.dataService.updateTarget(payload);
      if (data) this.showModal = false;
      else if (error) alert('Error updating target');
    } else {
      const { data, error } = await this.dataService.addTarget(payload);
      if (data) this.showModal = false;
      else if (error) alert('Error adding target');
    }
  }
}
