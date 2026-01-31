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
      <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl mb-4 border border-white/20 animate-pulse">
            <span class="text-4xl font-black text-white">7</span>
          </div>
          <p class="text-blue-200/70 mt-4">Loading...</p>
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
