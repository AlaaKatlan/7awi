
// ========================================
// 4. components/header/header.component.ts
// ========================================
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo-placeholder">
            <span class="logo-text">7awi</span>
          </div>
          <h1 class="title">نظام إدارة الإيرادات</h1>
        </div>

        <div class="actions">
          <input
            type="file"
            #fileInput
            (change)="onFileSelected($event)"
            accept=".xlsx,.xls"
            style="display: none">

          <button class="btn btn-secondary" (click)="fileInput.click()">
            <span class="icon">📤</span>
            تحميل ملف جديد
          </button>

          <button class="btn btn-primary" (click)="exportClick.emit()">
            <span class="icon">💾</span>
            تصدير Excel
          </button>
        </div>
      </div>

      <nav class="tabs">
        <button
          class="tab"
          [class.active]="activeTab === 'revenue'"
          (click)="changeTab('revenue')">
          📊 الإيرادات
        </button>
        <button
          class="tab"
          [class.active]="activeTab === 'pipeline'"
          (click)="changeTab('pipeline')">
          🎯 Pipeline
        </button>
      </nav>
    </header>
  `,
  styles: [`
    .header {
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-bottom: 4px solid #0078D4;
    }

    .header-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo-placeholder {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #0078D4 0%, #005A9E 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
    }

    .logo-text {
      color: white;
      font-weight: bold;
      font-size: 1.5rem;
    }

    .title {
      font-size: 1.75rem;
      color: #2c3e50;
      font-weight: 700;
      margin: 0;
    }

    .actions {
      display: flex;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #0078D4 0%, #005A9E 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 120, 212, 0.4);
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #495057;
      border: 2px solid #dee2e6;
    }

    .btn-secondary:hover {
      background: #e9ecef;
      border-color: #0078D4;
    }

    .tabs {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      gap: 0.5rem;
    }

    .tab {
      padding: 1rem 2rem;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      font-size: 1.1rem;
      font-weight: 600;
      color: #6c757d;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .tab:hover {
      color: #0078D4;
      background: rgba(0, 120, 212, 0.05);
    }

    .tab.active {
      color: #0078D4;
      border-bottom-color: #0078D4;
      background: rgba(0, 120, 212, 0.1);
    }

    .icon {
      font-size: 1.2rem;
    }
  `]
})
export class HeaderComponent {
  @Output() tabChange = new EventEmitter<string>();
  @Output() fileUpload = new EventEmitter<File>();
  @Output() exportClick = new EventEmitter<void>();

  activeTab = 'revenue';

  changeTab(tab: string) {
    this.activeTab = tab;
    this.tabChange.emit(tab);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileUpload.emit(file);
    }
  }
}
