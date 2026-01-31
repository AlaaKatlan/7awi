import { Routes } from '@angular/router';
import { authGuard, adminGuard, managerGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./app').then(m => m.AppComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'revenue',
        loadComponent: () => import('./components/revenue-manager/revenue-manager.component').then(m => m.RevenueManagerComponent)
      },
      {
        path: 'pipeline',
        loadComponent: () => import('./components/pipeline-manager/pipeline-manager.component').then(m => m.PipelineManagerComponent)
      },
      {
        path: 'target',
        loadComponent: () => import('./components/target manager/target-manager.component').then(m => m.TargetManagerComponent)
      },
      {
        path: 'cost',
        loadComponent: () => import('./components/cost-manager/cost-manager.component').then(m => m.CostManagerComponent)
      },
      {
        path: 'clients',
        loadComponent: () => import('./components/client-manager/client-manager.component').then(m => m.ClientManagerComponent)
      },
      {
        path: 'employees',
        loadComponent: () => import('./components/employee-manager/employee-manager.component').then(m => m.EmployeeManagerComponent)
      },
      {
        path: 'salaries',
        loadComponent: () => import('./components/salary-manager/salary-manager.component').then(m => m.SalaryManagerComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
