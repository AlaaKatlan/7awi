import { Injectable, signal, computed, inject } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { UserProfile } from '../models/data.models';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private router = inject(Router);

  // Auth state signals
  currentUser = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);
  session = signal<Session | null>(null);
  loading = signal(true);

  // Computed Values
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.userProfile()?.role === 'admin');
  isManager = computed(() => ['admin', 'manager'].includes(this.userProfile()?.role || ''));

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    this.initializeAuth();
  }

  getClient() {
    return this.supabase;
  }

  private async initializeAuth() {
    try {
      this.loading.set(true);

      // 1. استرجاع الجلسة الحالية
      const { data: { session } } = await this.supabase.auth.getSession();

      if (session) {
        this.session.set(session);
        this.currentUser.set(session.user);
        // جلب البروفايل فوراً
        await this.loadUserProfile(session.user.id);
      }

      // 2. الاستماع للتغييرات (تسجيل دخول، خروج، تحديث توكن)
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (session) {
          this.session.set(session);
          this.currentUser.set(session.user);

          // تحديث البروفايل عند تسجيل الدخول
          if (event === 'SIGNED_IN' || !this.userProfile()) {
            await this.loadUserProfile(session.user.id);
          }

        } else {
          // تفريغ البيانات عند الخروج
          this.session.set(null);
          this.currentUser.set(null);
          this.userProfile.set(null);
        }

        this.loading.set(false);
      });

    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadUserProfile(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        this.userProfile.set(data as UserProfile);
      } else if (error) {
        console.warn('Could not load profile:', error.message);
      }
    } catch (err) {
      console.error('Unexpected error loading profile:', err);
    }
  }

  // --- Sign In ---
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        this.session.set(data.session);
        this.currentUser.set(data.user);
        // جلب البروفايل فوراً لضمان ظهور الاسم
        await this.loadUserProfile(data.user.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // --- Sign Out (Optimistic) ---
  async signOut(): Promise<void> {
    // 1. الانتقال فوراً لصفحة الدخول (UI First)
    this.router.navigate(['/login']);

    // 2. تفريغ البيانات محلياً
    this.currentUser.set(null);
    this.session.set(null);
    this.userProfile.set(null);

    // 3. إرسال طلب الخروج للسيرفر في الخلفية
    try {
      await this.supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // --- Sign Up ---
  async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) return { success: false, error: error.message };

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // --- Reset Password ---
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // --- Update Password ---
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
