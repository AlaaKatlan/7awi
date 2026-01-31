import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">

      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
      <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>

      <div class="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 p-8 sm:p-12 relative z-10">

        <div class="flex flex-col items-center mb-10">
          <div class="w-24 h-24 mb-6 relative flex items-center justify-center p-2">
            <img src="assets/7awi_Logo.jpg" alt="7awi Logo" class="object-contain w-full h-full">
          </div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
          <p class="text-slate-400 text-sm mt-2 font-medium">7awi Financial System</p>
        </div>

        @if (errorMessage()) {
          <div class="mb-8 p-4 rounded-2xl bg-red-50/50 border border-red-100 flex items-center gap-3 text-red-600 text-sm animate-fade-in">
            <span class="material-icons text-lg">error_outline</span>
            <span class="font-medium">{{ errorMessage() }}</span>
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-6">

          <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700 ml-1">Email</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span class="material-icons text-slate-300 group-focus-within:text-blue-600 transition-colors text-xl">email</span>
              </div>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                class="block w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-lg transition-all duration-300 font-medium"
                placeholder="name@company.com"
                required>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-bold text-slate-700 ml-1">Password</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span class="material-icons text-slate-300 group-focus-within:text-blue-600 transition-colors text-xl">lock</span>
              </div>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                class="block w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-lg transition-all duration-300 font-medium"
                placeholder="••••••••"
                required>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full flex justify-center items-center py-4 px-4 mt-4 rounded-2xl shadow-lg shadow-blue-900/10 text-sm font-bold text-white bg-slate-900 hover:bg-blue-900 hover:shadow-blue-900/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300">
            @if (loading()) {
              <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            } @else {
              Sign In
            }
          </button>
        </form>

        <div class="mt-10 text-center">
          <p class="text-xs text-slate-300 font-medium">
            © 2026 7awi System
          </p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.3s ease-out forwards;
    }
    /* إخفاء خلفية المتصفح الافتراضية للتأكد من البياض */
    :host {
      display: block;
      background-color: white;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal('');

  async onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter both email and password');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const result = await this.authService.signIn(this.email, this.password);

      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set(result.error || 'Invalid credentials');
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An unexpected error occurred');
    } finally {
      this.loading.set(false);
    }
  }
}
