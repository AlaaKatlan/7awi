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
  loading = signal(true); // يبدأ بحالة تحميل لمنع التوجيه الخاطئ

  // Computed Values
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.userProfile()?.role === 'admin');
  isManager = computed(() => ['admin', 'manager'].includes(this.userProfile()?.role || ''));

  constructor() {
    // 1. إعداد العميل مع خيارات حفظ الجلسة
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,       // ضروري لحفظ الدخول عند التحديث
        autoRefreshToken: true,     // تجديد التوكن تلقائياً
        detectSessionInUrl: true    // ضروري لروابط استعادة كلمة المرور
      }
    });

    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // 2. محاولة استرجاع الجلسة المخزنة فوراً
      const { data: { session } } = await this.supabase.auth.getSession();

      if (session) {
        this.session.set(session);
        this.currentUser.set(session.user);
        // تحميل البروفايل في الخلفية
        this.loadUserProfile(session.user.id);
      }

      // 3. الاستماع لأي تغييرات (تسجيل دخول/خروج)
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (session) {
          this.session.set(session);
          this.currentUser.set(session.user);
          // تحميل البروفايل عند تغير الجلسة
          if (!this.userProfile()) {
             await this.loadUserProfile(session.user.id);
          }
        } else {
          // تفريغ البيانات عند تسجيل الخروج
          this.session.set(null);
          this.currentUser.set(null);
          this.userProfile.set(null);
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      // 4. إيقاف حالة التحميل للسماح للتطبيق بالعمل
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

      if (data && !error) {
        this.userProfile.set(data as UserProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
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

      // 5. تحديث الحالة يدوياً وفوراً (Fix Race Condition)
      if (data.session && data.user) {
        this.session.set(data.session);
        this.currentUser.set(data.user);
        // تحميل البروفايل اختياري هنا ولكن مفضل
        await this.loadUserProfile(data.user.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // --- Sign Out ---
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
    this.session.set(null);
    this.userProfile.set(null);
    this.router.navigate(['/login']);
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

  // Helper
  getClient(): SupabaseClient {
    return this.supabase;
  }
}
