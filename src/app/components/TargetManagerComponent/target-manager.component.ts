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

  // استخراج السنوات ديناميكياً من قاعدة البيانات
  yearsList = computed(() => {
    const data = this.dataService.targets();
    const currentYear = new Date().getFullYear();
    // جلب السنوات من البيانات + السنة الحالية
    const dbYears = data.map(t => t.year);
    const allYears = Array.from(new Set([...dbYears, currentYear]));
    // ترتيب السنوات تنازلياً (الأحدث أولاً)
    return allYears.sort((a, b) => b - a);
  });

  // الكائن الحالي المستخدم في النموذج
  currentItem: FactTarget = { product_id: 1, year: new Date().getFullYear(), annual_target: 0 };

  filteredTargets = computed(() => {
    let data = this.dataService.targets();
    if (this.selectedYear()) {
      data = data.filter(t => t.year === this.selectedYear());
    }

    const text = this.searchText().toLowerCase();
    if (text) {
      data = data.filter(t =>
        this.dataService.getProductName(t.product_id).toLowerCase().includes(text)
      );
    }
    return data;
  });

  totalTargetAmount = computed(() =>
    this.filteredTargets().reduce((sum, item) => sum + (Number(item.annual_target) || 0), 0)
  );

  openModal() {
    this.isEditMode = false;
    this.currentItem = { product_id: 1, year: new Date().getFullYear(), annual_target: 0 };
    this.showModal = true;
  }

  editItem(item: FactTarget) {
    this.isEditMode = true;
    this.currentItem = { ...item };
    this.showModal = true;
  }

  async save() {
    if (this.isEditMode) {
      const { data, error } = await this.dataService.updateTarget(this.currentItem);
      if (data) this.showModal = false;
      else if (error) alert('Error updating target');
    } else {
      const { data, error } = await this.dataService.addTarget(this.currentItem);
      if (data) this.showModal = false;
      else if (error) alert('Error adding target');
    }
  }
}
