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

  // Signals
  currentUser = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);
  session = signal<Session | null>(null);
  loading = signal(true);

  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.userProfile()?.role === 'admin');
  isManager = computed(() => ['admin', 'manager'].includes(this.userProfile()?.role || ''));
  isFinance = computed(() => ['finance'].includes(this.userProfile()?.role || ''));
isSales = computed(() => ['sales'].includes(this.userProfile()?.role || ''));
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
    this.loading.set(true);
    try {
      // 1. Try to restore session
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        console.warn('Session init warning:', error.message);
      }

      if (data?.session) {
        this.session.set(data.session);
        this.currentUser.set(data.session.user);
        // Load profile immediately
        await this.loadUserProfile(data.session.user.id);
      }

      // 2. Listen for auth changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          this.session.set(session);
          this.currentUser.set(session.user);
          if (!this.userProfile()) {
            await this.loadUserProfile(session.user.id);
          }
        } else {
          this.session.set(null);
          this.currentUser.set(null);
          this.userProfile.set(null);
        }
        this.loading.set(false);
      });

    } catch (error: any) {
      // Ignore AbortError as it doesn't affect functionality
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        console.warn('Supabase fetch aborted (safe to ignore in dev mode).');
      } else {
        console.error('Auth initialization error:', error);
      }
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
      } else {
        // Fallback: Create temporary local profile
        const user = this.currentUser();
        if (user) {
          this.userProfile.set({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.['full_name'] || user.email?.split('@')[0],
            role: 'viewer'
          });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Profile load error:', err);
      }
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      if (data.session && data.user) {
        this.session.set(data.session);
        this.currentUser.set(data.user);
        await this.loadUserProfile(data.user.id);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async signOut(): Promise<void> {
    this.router.navigate(['/login']);
    this.currentUser.set(null);
    this.session.set(null);
    this.userProfile.set(null);
    await this.supabase.auth.signOut();
  }

  async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    return { success: !error, error: error?.message };
  }


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
