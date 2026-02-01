import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { DataService } from './services/data.service';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, MainLayoutComponent],
  template: `
    <!-- Loading Screen -->
@if (authService.loading()) {
  <div class="min-h-screen bg-white flex flex-col items-center justify-center z-50 relative overflow-hidden">

    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

    <div class="flex flex-col items-center p-8 animate-fade-in">

      <div class="relative mb-8">
        <div class="absolute inset-0 bg-blue-50 rounded-full animate-ping opacity-75"></div>

        <div class="relative z-10 w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center p-4 border border-slate-50">
          <img src="assets/7awi_Logo.jpg" alt="7awi Logo" class="w-full h-full object-contain">
        </div>
      </div>

      <div class="flex flex-col items-center gap-3">
        <div class="w-6 h-6 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>

        <div class="text-center">
           <h3 class="text-slate-900 font-bold text-xl tracking-tight">7awi System</h3>
           <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Loading Data...</p>
        </div>
      </div>

    </div>
  </div>
}
    <!-- Login Screen -->
    @else if (!authService.isAuthenticated()) {
      <app-login></app-login>
    }

    <!-- Main Application -->
    @else {
      <app-main-layout></app-main-layout>
    }
  `
})
export class App implements OnInit {
  authService = inject(AuthService);
  dataService = inject(DataService);

  ngOnInit() {
    // Data will be fetched automatically by DataService
  }
}
