import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { EmployeeChangeLog, SalaryChangeLog, DimEmployee, FactSalary } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class ChangeTrackingService {

  private authService = inject(AuthService);

  // الحقول التي نراقبها في الموظف
  private trackedEmployeeFields: (keyof DimEmployee)[] = [
    'product_id', 'salary', 'salary_aed', 'contract', 'office', 'end_date', 'name'
  ];

  private valueToString(value: any): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  // 1. تتبع تعديلات الموظف
  async trackEmployeeUpdate(oldData: DimEmployee, newData: Partial<DimEmployee>): Promise<void> {
    const user = this.authService.currentUser();
    const userProfile = this.authService.userProfile();

    for (const field of this.trackedEmployeeFields) {
      const newValue = newData[field];
      const oldValue = oldData[field];

      // إذا تغيرت القيمة
      if (newValue !== undefined && newValue != oldValue) {
        const logEntry: EmployeeChangeLog = {
          employee_id: oldData.employee_id,
          field_changed: field,
          old_value: this.valueToString(oldValue),
          new_value: this.valueToString(newValue),
          changed_by_user_id: user?.id,
          changed_by_name: userProfile?.full_name || user?.email || 'Unknown'
        };
        await this.authService.getClient().from('employee_change_log').insert([logEntry]);
      }
    }
  }

  // 2. تسجيل تغيير في الراتب
  async logSalaryChange(salaryId: number, employeeId: number, field: string, oldVal: any, newVal: any, reason?: string): Promise<void> {
    const user = this.authService.currentUser();
    const userProfile = this.authService.userProfile();

    const logEntry: SalaryChangeLog = {
      salary_id: salaryId,
      employee_id: employeeId,
      field_changed: field,
      old_value: this.valueToString(oldVal),
      new_value: this.valueToString(newVal),
      changed_by_user_id: user?.id,
      changed_by_name: userProfile?.full_name || user?.email || 'Unknown',
      change_reason: reason
    };
    await this.authService.getClient().from('salary_change_log').insert([logEntry]);
  }

  // 3. تسجيل إنشاء راتب جديد
  async trackSalaryCreation(salaryId: number, employeeId: number, data: Partial<FactSalary>): Promise<void> {
    await this.logSalaryChange(
      salaryId,
      employeeId,
      'RECORD_CREATED',
      null,
      JSON.stringify(data),
      'Manual Entry'
    );
  }
}
