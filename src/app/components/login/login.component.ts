import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule,  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-5"></div>

      <div class="relative w-full max-w-md">
        <!-- Logo & Title -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl mb-4 border border-white/20">
            <span class="text-4xl font-black text-white">7</span>
          </div>
          <h1 class="text-3xl font-black text-white tracking-tight">7awi System</h1>
          <p class="text-blue-200/70 mt-2">Financial Management Platform</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 class="text-xl font-bold text-white mb-6">
            {{ isSignUp() ? 'Create Account' : 'Welcome Back' }}
          </h2>

          @if (errorMessage()) {
            <div class="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
              <p class="text-red-200 text-sm">{{ errorMessage() }}</p>
            </div>
          }

          @if (successMessage()) {
            <div class="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
              <p class="text-green-200 text-sm">{{ successMessage() }}</p>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-5">
            @if (isSignUp()) {
              <div>
                <label class="block text-xs font-bold text-blue-200/70 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  [(ngModel)]="fullName"
                  name="fullName"
                  placeholder="Enter your full name"
                  class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required>
              </div>
            }

            <div>
              <label class="block text-xs font-bold text-blue-200/70 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="Enter your email"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required>
            </div>

            <div>
              <label class="block text-xs font-bold text-blue-200/70 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter your password"
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                minlength="6">
            </div>

            @if (!isSignUp()) {
              <div class="flex justify-end">
                <button type="button" (click)="forgotPassword()" class="text-sm text-blue-300 hover:text-blue-200 transition">
                  Forgot password?
                </button>
              </div>
            }

            <button
              type="submit"
              [disabled]="loading()"
              class="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              @if (loading()) {
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              } @else {
                <span class="material-icons text-sm">{{ isSignUp() ? 'person_add' : 'login' }}</span>
                <span>{{ isSignUp() ? 'Create Account' : 'Sign In' }}</span>
              }
            </button>
          </form>

          <div class="mt-6 pt-6 border-t border-white/10 text-center">
            <p class="text-blue-200/70 text-sm">
              {{ isSignUp() ? 'Already have an account?' : "Don't have an account?" }}
              <button (click)="toggleMode()" class="text-blue-300 hover:text-blue-200 font-bold ml-1 transition">
                {{ isSignUp() ? 'Sign In' : 'Sign Up' }}
              </button>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <p class="text-center text-blue-200/30 text-sm mt-8">
          © 2026 7awi Financial System. All rights reserved.
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  fullName = '';

  isSignUp = signal(false);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  toggleMode() {
    this.isSignUp.update(v => !v);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  async onSubmit() {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      if (this.isSignUp()) {
        const result = await this.authService.signUp(this.email, this.password, this.fullName);
        if (result.success) {
          this.successMessage.set('Account created! Please check your email to verify your account.');
          this.isSignUp.set(false);
        } else {
          this.errorMessage.set(result.error || 'Failed to create account');
        }
      } else {
        const result = await this.authService.signIn(this.email, this.password);
        if (result.success) {
          this.router.navigate(['/']);
        } else {
          this.errorMessage.set(result.error || 'Invalid email or password');
        }
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An error occurred');
    } finally {
      this.loading.set(false);
    }
  }

  async forgotPassword() {
    if (!this.email) {
      this.errorMessage.set('Please enter your email address first');
      return;
    }

    this.loading.set(true);
    const result = await this.authService.resetPassword(this.email);
    this.loading.set(false);

    if (result.success) {
      this.successMessage.set('Password reset email sent! Check your inbox.');
    } else {
      this.errorMessage.set(result.error || 'Failed to send reset email');
    }
  }
}
